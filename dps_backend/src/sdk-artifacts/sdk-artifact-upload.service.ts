import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import { NexusIntegrationService } from '../integrations/nexus/nexus-integration.service';
import { NativeSdkConfigDto } from '../miniapps/dto/create-miniapp.dto';
import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { ArtifactScannerService, ScannedNativeSdkResult } from './artifact-scanner.service';
import { StorageService } from '../storage/storage.service';

export type SdkPlatform = 'IOS' | 'ANDROID';

export interface SdkUploadRequest {
  miniAppId: string;
  platform: SdkPlatform;
  buffer: Buffer;
  filename: string;
  /** Overrides the detected version (iOS pod version / Maven version). */
  version?: string;
  /** Overrides the Maven groupId (Android only). */
  groupId?: string;
}

export interface SdkUploadResult {
  scannedFields: ScannedNativeSdkResult;
  minioUrl: string;
  minioKey: string;
  sha256: string;
  detectedPermissions?: string[];
}

const DEFAULT_IOS_VERSION = '1.0.0';
const DEFAULT_MAVEN_GROUP_ID = 'com.fsa.sdk';
const SAFE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/;
const SAFE_GROUP = /^[A-Za-z0-9][A-Za-z0-9_-]*(\.[A-Za-z0-9][A-Za-z0-9_-]*)*$/;

@Injectable()
export class SdkArtifactUploadService {
  private readonly logger = new Logger(SdkArtifactUploadService.name);

  constructor(
    private readonly scanner: ArtifactScannerService,
    private readonly nexus: NexusIntegrationService,
    private readonly storage: StorageService,
    private readonly configService: ConfigService,
    @InjectRepository(MiniApp)
    private readonly miniappRepository: Repository<MiniApp>,
  ) {}

  /**
   * STAGE 1: Uploads uploaded SDK artifacts directly to MinIO quarantine (sdk-submissions).
   * Extracts metadata and detected permissions in-memory. ZERO bytes sent to Nexus at this stage.
   */
  async upload(req: SdkUploadRequest): Promise<SdkUploadResult> {
    const sha256 = createHash('sha256').update(req.buffer).digest('hex');

    // 1. Stage in MinIO quarantine bucket (sdk-submissions)
    const minioResult = await this.storage.uploadSdkArchive(
      {
        buffer: req.buffer,
        originalname: req.filename,
        size: req.buffer.length,
        mimetype: req.platform === 'IOS' ? 'application/zip' : 'application/octet-stream',
      } as any,
      req.miniAppId || 'draft',
      req.version || '1.0.0',
    );

    // 2. Scan metadata in-memory
    const scannedFields: ScannedNativeSdkResult =
      req.platform === 'IOS'
        ? await this.scanner.scanXcframework(req.buffer, req.filename)
        : await this.scanner.scanAar(req.buffer, req.filename);

    const urlFields: Record<string, any> =
      req.platform === 'IOS'
        ? {
            iosMinioKey: minioResult.minioKey,
            iosMinioUrl: minioResult.minioUrl,
            iosSha256: sha256,
            iosArtifactFilename: req.filename,
            ...(req.version ? { iosVersion: req.version.trim() } : {}),
          }
        : {
            androidMinioKey: minioResult.minioKey,
            androidMinioUrl: minioResult.minioUrl,
            androidSha256: sha256,
            androidArtifactFilename: req.filename,
            androidMavenGroupId: req.groupId?.trim() || scannedFields.androidMavenGroupId || DEFAULT_MAVEN_GROUP_ID,
            ...(req.version ? { androidMavenVersion: req.version.trim() } : {}),
          };

    // 3. Atomically persist to MiniApp entity if miniAppId is provided and exists
    if (req.miniAppId && req.miniAppId !== 'draft') {
      const miniApp = await this.miniappRepository.findOne({
        where: { id: req.miniAppId },
      });
      if (miniApp) {
        const patch = { ...scannedFields, ...urlFields };
        await this.miniappRepository
          .createQueryBuilder()
          .update(MiniApp)
          .set({
            integrationConfig: () =>
              `COALESCE("integrationConfig", '{}'::jsonb) || CAST(:patch AS jsonb)`,
          })
          .where('id = :id', { id: miniApp.id })
          .setParameters({ patch: JSON.stringify(patch) })
          .execute();
      }
    }

    return {
      scannedFields,
      minioUrl: minioResult.minioUrl,
      minioKey: minioResult.minioKey,
      sha256,
      detectedPermissions: scannedFields.detectedPermissions,
    };
  }

  /**
   * STAGE 3: Promotes & publishes the verified artifact from MinIO quarantine to Nexus.
   * Executed ONLY when the Mini App passes security review and is APPROVED by SA Admin.
   */
  async publishToNexus(miniAppId: string): Promise<{
    androidNexusMavenUrl?: string;
    iosNexusZipUrl?: string;
  }> {
    const miniApp = await this.miniappRepository.findOne({
      where: { id: miniAppId },
    });
    if (!miniApp) {
      throw new NotFoundException(`Mini app ${miniAppId} not found`);
    }

    const config = miniApp.integrationConfig || {};
    const patch: Record<string, any> = {};

    // 1. Publish Android AAR to Nexus maven-sdk-hosted
    if (config.androidMinioKey) {
      try {
        const buffer = await this.storage.getObjectBuffer(
          this.storage.sdkSubmissionsBucket,
          config.androidMinioKey,
        );
        const groupId = config.androidMavenGroupId || DEFAULT_MAVEN_GROUP_ID;
        const artifactId = config.androidMavenArtifactId || miniApp.appId;
        const version = config.androidMavenVersion || '1.0.0';
        const filename = config.androidArtifactFilename || `${artifactId}-${version}.aar`;

        this.assertToken('artifactId', artifactId);
        this.assertToken('version', version);

        const mavenUrl = await this.wrap(() =>
          this.nexus.uploadMavenAar({
            repo: this.repo('NEXUS_MAVEN_SDK_REPO', 'maven-sdk-hosted'),
            groupId,
            artifactId,
            version,
            buffer,
            filename,
          }),
        );
        patch.androidNexusMavenUrl = mavenUrl;
        this.logger.log(`Published Android SDK ${miniApp.name} to Nexus: ${mavenUrl}`);
      } catch (err: any) {
        this.logger.error(`Failed to publish Android SDK to Nexus: ${err.message}`);
        throw new BadGatewayException(`Android Nexus publish failed: ${err.message}`);
      }
    }

    // 2. Publish iOS xcframework.zip to Nexus raw-sdk-artifacts and .podspec to cocoapods-specs
    if (config.iosMinioKey) {
      try {
        const buffer = await this.storage.getObjectBuffer(
          this.storage.sdkSubmissionsBucket,
          config.iosMinioKey,
        );
        const name = config.iosModuleName || miniApp.appId;
        const version = config.iosVersion || DEFAULT_IOS_VERSION;
        this.assertToken('module name', name);
        this.assertToken('version', version);

        const rawRepo = this.repo('NEXUS_RAW_SDK_REPO', 'raw-sdk-artifacts');
        const specsRepo = this.repo('NEXUS_COCOAPODS_SPECS_REPO', 'cocoapods-specs');

        const zipUrl = await this.wrap(() =>
          this.nexus.putRawAsset(
            rawRepo,
            `${name}/${version}/${name}.xcframework.zip`,
            buffer,
            'application/zip',
          ),
        );

        await this.wrap(() =>
          this.nexus.putRawAsset(
            specsRepo,
            `Specs/${name}/${version}/${name}.podspec`,
            Buffer.from(this.renderPodspec(name, version, zipUrl), 'utf8'),
            'text/plain',
          ),
        );

        patch.iosNexusZipUrl = zipUrl;
        this.logger.log(`Published iOS SDK ${miniApp.name} to Nexus: ${zipUrl}`);
      } catch (err: any) {
        this.logger.error(`Failed to publish iOS SDK to Nexus: ${err.message}`);
        throw new BadGatewayException(`iOS Nexus publish failed: ${err.message}`);
      }
    }

    // Persist Nexus URLs atomically
    if (Object.keys(patch).length > 0) {
      await this.miniappRepository
        .createQueryBuilder()
        .update(MiniApp)
        .set({
          integrationConfig: () =>
            `COALESCE("integrationConfig", '{}'::jsonb) || CAST(:patch AS jsonb)`,
        })
        .where('id = :id', { id: miniApp.id })
        .setParameters({ patch: JSON.stringify(patch) })
        .execute();
    }

    return {
      androidNexusMavenUrl: patch.androidNexusMavenUrl,
      iosNexusZipUrl: patch.iosNexusZipUrl,
    };
  }

  /** Status check of SDK artifacts (quarantined in MinIO vs published in Nexus). */
  async getStatus(miniAppId: string) {
    const miniApp = await this.miniappRepository.findOne({
      where: { id: miniAppId },
    });
    if (!miniApp) {
      throw new NotFoundException(`Mini app ${miniAppId} not found`);
    }
    const cfg = miniApp.integrationConfig ?? {};
    return {
      ios: cfg.iosNexusZipUrl
        ? ('published' as const)
        : cfg.iosMinioKey
        ? ('quarantined' as const)
        : ('pending' as const),
      android: cfg.androidNexusMavenUrl
        ? ('published' as const)
        : cfg.androidMinioKey
        ? ('quarantined' as const)
        : ('pending' as const),
      iosMinioKey: cfg.iosMinioKey,
      androidMinioKey: cfg.androidMinioKey,
      iosNexusZipUrl: cfg.iosNexusZipUrl,
      androidNexusMavenUrl: cfg.androidNexusMavenUrl,
    };
  }

  renderPodspec(name: string, version: string, zipUrl: string): string {
    return `Pod::Spec.new do |s|
  s.name             = '${name}'
  s.version          = '${version}'
  s.summary          = '${name} native SDK.'
  s.description      = 'Binary SDK ${name} distributed via Nexus.'
  s.homepage         = 'https://example.com/${name}'
  s.license          = { :type => 'Proprietary', :text => 'Vendor SDK.' }
  s.author           = { 'SDK Vendor' => 'sdk@example.com' }
  s.source           = { :http => '${zipUrl}' }
  s.platform         = :ios, '13.0'
  s.vendored_frameworks = '${name}.xcframework'
end
`;
  }

  private repo(key: string, fallback: string): string {
    return this.configService.get<string>(key) || fallback;
  }

  private assertToken(label: string, value: string) {
    if (!SAFE_TOKEN.test(value)) {
      throw new BadRequestException(`Invalid ${label} '${value}'`);
    }
  }

  private async wrap<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`Nexus operation failed: ${err?.message ?? err}`);
      throw new BadGatewayException(
        `Nexus operation failed: ${err?.message ?? err}`,
      );
    }
  }
}
