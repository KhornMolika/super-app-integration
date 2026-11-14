import { Injectable, Logger, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniApp } from '../../miniapps/entities/miniapp.entity';
import { MiniAppVersionsService } from '../../miniapps/versions/miniapp-versions.service';
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

/** Approval stops with this message when the package cannot be confirmed in Nexus. */
export class PackagePublishError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PackagePublishError';
  }
}

/** Pause between "is the new version listed yet?" checks (tests set it to 0). */
let PUBLISH_VERIFY_DELAY_MS = 1500;
export function setPublishVerifyDelayForTests(ms: number): void {
  PUBLISH_VERIFY_DELAY_MS = ms;
}

/** An uploaded package (not Git source): same rule as the Backoffice form and the submit check. */
export function isFlutterArtifactConfig(config: Record<string, any> | null | undefined): boolean {
  return config?.sourceType === 'ARTIFACT' || (!config?.sourceType && !String(config?.gitUrl || '').trim());
}

/** name and version from the pubspec.yaml in a .zip package archive, or null. */
export function readArchivePubspec(archive: Buffer): { name?: string; version?: string } | null {
  try {
    const AdmZip = require('adm-zip');
    const entries = new AdmZip(archive).getEntries() as Array<{
      entryName: string;
      isDirectory: boolean;
      getData(): Buffer;
    }>;
    // The top-most pubspec.yaml: the package itself, not an example/ app inside it
    const pubspecs = entries
      .filter((e) => !e.isDirectory && /(^|\/)pubspec\.yaml$/i.test(e.entryName.replace(/\\/g, '/')))
      .sort((a, b) => a.entryName.split('/').length - b.entryName.split('/').length);
    if (!pubspecs.length) return null;
    const text = pubspecs[0].getData().toString('utf8');
    const name = /^name:\s*["']?([A-Za-z0-9_]+)/m.exec(text)?.[1];
    const version = /^version:\s*["']?([^\s"'#]+)/m.exec(text)?.[1];
    return name || version ? { name, version } : null;
  } catch {
    return null; // not a zip (e.g. .tar.gz): fall back to the registered name and version
  }
}

/**
 * Publishes a mini app's uploaded package or SDK from MinIO quarantine to Nexus
 * as soon as its security scan passes:
 *
 *   submit -> archive to MinIO -> scan from MinIO -> PASSED -> Nexus
 *                                                 -> FAILED -> stays in MinIO
 *
 * Never throws: a failed publish leaves the scan result as it is and records
 * nexusPublishError on the app. Approval calls ensureFlutterPackagePublished
 * again and stops when the package still cannot be confirmed in Nexus.
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
    @Optional() private readonly versionRows?: MiniAppVersionsService,
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
    // Nothing to publish without a stored archive (Git source); approval reports it
    if (!config.packageStoragePath || !isFlutterArtifactConfig(config)) return;
    try {
      const res = await this.ensureFlutterPackagePublished(app, { config, inRevision });
      if (res?.publishedNow) {
        this.logger.log(`Scan passed: published ${res.packageName} ${res.version} from MinIO to Nexus pub-hosted (${app.id})`);
      }
    } catch (err: any) {
      // Recorded on the app (nexusPublishError); approval tries again and stops if it still fails
      this.logger.warn(`Scan passed, but publishing ${app.appId} to Nexus failed: ${err?.message || err}`);
    }
  }

  /**
   * Makes sure the Flutter package is in Nexus pub-hosted, publishing it from
   * MinIO when it is not, and confirms Nexus then lists that version. Throws a
   * message for the reviewer when it cannot: approval and test builds call this
   * first, so a build never starts for a package that is not there.
   *
   * Returns null for a Git-source package (built from Git, nothing to publish).
   * The name and version are the ones in the archive's pubspec.yaml: that is
   * what Nexus files the package under.
   */
  async ensureFlutterPackagePublished(
    app: MiniApp,
    opts: { config?: Record<string, any>; inRevision?: boolean } = {},
  ): Promise<{ packageName: string; version: string; publishedNow: boolean } | null> {
    const inRevision = opts.inRevision ?? false;
    const config: Record<string, any> = opts.config ?? app.integrationConfig ?? {};
    if (!isFlutterArtifactConfig(config)) return null;

    const fail = async (message: string): Promise<never> => {
      await this.patchConfig(app.id, inRevision, {
        nexusPublishError: message.slice(0, 500),
        nexusPublishCheckedAt: new Date().toISOString(),
      }).catch(() => undefined);
      throw new PackagePublishError(message);
    };

    const declaredName = String(config.packageName || '').trim();
    if (!declaredName) return fail('The package name is missing, so the package cannot be published to Nexus.');
    if (!this.nexusService) return fail('Nexus is not configured on the backend.');

    const storagePath: string | undefined = config.packageStoragePath || config.minioKey || undefined;
    let archive: Buffer | null = null;
    if (storagePath) {
      if (!this.storageService) return fail('MinIO storage is not configured on the backend.');
      try {
        archive = await this.storageService.getObjectBuffer(this.storageService.packageSubmissionsBucket, storagePath);
      } catch (err: any) {
        return fail(`The package archive could not be read from MinIO (${storagePath}): ${err?.message || err}`);
      }
      if (!archive || archive.length === 0) return fail(`The package archive is missing or empty in MinIO (${storagePath}).`);
    }

    const pubspec = archive ? readArchivePubspec(archive) : null;
    const normalize = (n: string) => n.replace(/-/g, '_').toLowerCase();
    const packageName = normalize(pubspec?.name || declaredName);
    if (pubspec?.name && packageName !== normalize(declaredName)) {
      return fail(
        `The archive's pubspec.yaml names the package "${pubspec.name}", but the mini app is registered as ` +
          `"${declaredName}". The Super App build looks it up by the registered name: make them match.`,
      );
    }
    const version = pubspec?.version || declaredPackageVersion(config, app);

    const before = await this.nexusService.hasPackageVersion(packageName, version);
    if (!before.reachable) return fail(before.error || 'Nexus could not be reached.');
    if (before.found) {
      await this.markPublished(app.id, inRevision, packageName, version, config);
      return { packageName, version, publishedNow: false };
    }
    if (!archive) {
      return fail(
        `${packageName} ${version} is not in Nexus and no package archive is stored for this mini app. ` +
          'Request changes so the developer attaches the archive and submits again.',
      );
    }

    try {
      await this.nexusService.publishPubArchive(archive, packageName, version);
    } catch (err: any) {
      return fail(`Nexus refused ${packageName} ${version}: ${err?.message || err}`);
    }

    // Nexus can take a moment to index a new version
    for (let attempt = 0; attempt < 5; attempt++) {
      const after = await this.nexusService.hasPackageVersion(packageName, version);
      if (after.found) {
        await this.markPublished(app.id, inRevision, packageName, version, config);
        return { packageName, version, publishedNow: true };
      }
      if (PUBLISH_VERIFY_DELAY_MS > 0) await new Promise((r) => setTimeout(r, PUBLISH_VERIFY_DELAY_MS));
    }
    return fail(`Nexus accepted the upload, but does not list ${packageName} ${version}. Try publishing again.`);
  }

  private async markPublished(
    id: string,
    inRevision: boolean,
    packageName: string,
    version: string,
    config: Record<string, any>,
  ): Promise<void> {
    const now = new Date().toISOString();
    const patch = {
      nexusPublishedPackage: packageName,
      nexusPublishedVersion: version,
      nexusPublishedAt:
        config.nexusPublishedVersion === version && config.nexusPublishedAt ? config.nexusPublishedAt : now,
      nexusPublishCheckedAt: now,
      nexusPublishError: null,
    };
    Object.assign(config, patch); // a caller that saves the app afterwards keeps it too
    await this.patchConfig(id, inRevision, patch);
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
    // A raw UPDATE skips the entity subscriber: copy the revision to its version row
    if (inRevision) await this.versionRows?.resyncApp(id);
  }
}
