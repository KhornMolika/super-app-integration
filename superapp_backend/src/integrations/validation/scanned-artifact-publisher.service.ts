import { Injectable, Logger, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniApp } from '../../miniapps/entities/miniapp.entity';
import { StorageService } from '../../storage/storage.service';
import { NexusIntegrationService } from '../nexus/nexus-integration.service';
import { SdkArtifactUploadService } from '../../sdk-artifacts/sdk-artifact-upload.service';

/**
 * The package version to publish ("^1.2.0" -> "1.2.0"): the same rule approval
 * uses, so both name the same Nexus version.
 */
export function declaredPackageVersion(
  config: Record<string, any> | null | undefined,
  app?: { currentReleaseVersion?: string | null; version?: string | null } | null,
): string {
  const raw = config?.versionConstraint || app?.currentReleaseVersion || (app as any)?.version || '1.0.0';
  return String(raw).replace(/^[\^~>=<]+/, '').trim() || '1.0.0';
}

/**
 * Publishes a mini app's uploaded package or SDK from MinIO quarantine to Nexus
 * as soon as its security scan passes:
 *
 *   submit -> archive to MinIO -> scan from MinIO -> PASSED -> Nexus
 *                                                 -> FAILED -> stays in MinIO
 *
 * Never throws: a failed publish leaves the scan result as it is, records
 * nexusPublishError on the app, and approval publishes again as before.
 */
@Injectable()
export class ScannedArtifactPublisherService {
  private readonly logger = new Logger(ScannedArtifactPublisherService.name);

  constructor(
    @InjectRepository(MiniApp)
    private readonly miniappRepository: Repository<MiniApp>,
    @Optional() private readonly storageService?: StorageService,
    @Optional() private readonly nexusService?: NexusIntegrationService,
    @Optional() private readonly moduleRef?: ModuleRef,
  ) {}

  async publishAfterPassedScan(miniAppId: string): Promise<void> {
    try {
      const app = await this.miniappRepository.findOne({ where: { id: miniAppId } });
      if (!app) return;
      const method = (app.integrationMethod || '').toUpperCase();
      if (method === 'FLUTTER_PACKAGE') await this.publishFlutterPackage(app);
      else if (method === 'NATIVE_SDK') await this.publishNativeSdk(app);
    } catch (err: any) {
      this.logger.warn(`Publishing the scanned artifact of ${miniAppId} to Nexus failed: ${err?.message || err}`);
    }
  }

  private async publishFlutterPackage(app: MiniApp): Promise<void> {
    // A revision of a live app carries its own config; the live one is untouched until approval
    const inRevision = Boolean(app.pendingRevision?.integrationConfig);
    const config: Record<string, any> = inRevision
      ? app.pendingRevision!.integrationConfig
      : app.integrationConfig || {};
    const storagePath = config.packageStoragePath;
    const packageName = String(config.packageName || '').trim();
    if (!storagePath || !packageName) return; // Git source or a package already in Nexus
    const version = declaredPackageVersion(config, app);
    if (config.nexusPublishedVersion === version) return;
    if (!this.storageService || !this.nexusService) {
      this.logger.warn(`Cannot publish ${packageName} ${version} after the scan: storage or Nexus is not configured`);
      return;
    }

    let patch: Record<string, any>;
    try {
      const archive = await this.storageService.getObjectBuffer(
        this.storageService.packageSubmissionsBucket,
        storagePath,
      );
      if (!archive || archive.length === 0) throw new Error(`archive ${storagePath} is empty or missing in MinIO`);
      await this.nexusService.publishPubArchive(archive, packageName, version);
      this.logger.log(`Scan passed: published ${packageName} ${version} from MinIO to Nexus pub-hosted (${app.id})`);
      patch = { nexusPublishedVersion: version, nexusPublishedAt: new Date().toISOString(), nexusPublishError: null };
    } catch (err: any) {
      this.logger.warn(`Scan passed, but publishing ${packageName} ${version} to Nexus failed: ${err?.message || err}`);
      patch = { nexusPublishError: String(err?.message || err).slice(0, 500) };
    }
    await this.patchConfig(app.id, inRevision, patch);
  }

  private async publishNativeSdk(app: MiniApp): Promise<void> {
    // publishToNexus reads and patches the live config, so a revision waits for approval
    if (app.pendingRevision?.integrationConfig) return;
    const config: Record<string, any> = app.integrationConfig || {};
    const pending =
      (config.androidMinioKey && !config.androidNexusMavenUrl) || (config.iosMinioKey && !config.iosNexusZipUrl);
    if (!pending) return;
    const sdkService = this.moduleRef?.get(SdkArtifactUploadService, { strict: false });
    if (!sdkService) {
      this.logger.warn(`Cannot publish the Native SDK of ${app.id} after the scan: SDK service not available`);
      return;
    }
    try {
      await sdkService.publishToNexus(app.id);
      this.logger.log(`Scan passed: published the Native SDK of ${app.id} from MinIO to Nexus`);
    } catch (err: any) {
      this.logger.warn(`Scan passed, but publishing the Native SDK of ${app.id} to Nexus failed: ${err?.message || err}`);
      await this.patchConfig(app.id, false, { nexusPublishError: String(err?.message || err).slice(0, 500) });
    }
  }

  /** Merges fields into integrationConfig (or the pending revision's) without overwriting other changes. */
  private async patchConfig(id: string, inRevision: boolean, patch: Record<string, any>): Promise<void> {
    const qb = this.miniappRepository.createQueryBuilder().update(MiniApp).where('id = :id', { id });
    if (inRevision) {
      qb.set({
        pendingRevision: () =>
          `jsonb_set(COALESCE("pendingRevision", '{}'::jsonb), '{integrationConfig}', ` +
          `COALESCE("pendingRevision"->'integrationConfig', '{}'::jsonb) || CAST(:patch AS jsonb))`,
      });
    } else {
      qb.set({
        integrationConfig: () => `COALESCE("integrationConfig", '{}'::jsonb) || CAST(:patch AS jsonb)`,
      });
    }
    await qb.setParameters({ patch: JSON.stringify(patch) }).execute();
  }
}
