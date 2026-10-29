import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';
import { randomUUID } from 'crypto';
import type { Multer } from 'multer';
import { detectImageFileType } from '../common/utils/image-type.util';
import {
  ArchiveSanitizerHelper,
  BucketLifecycleHelper,
  PresignedUrlHelper,
  QuarantineStorageHelper,
  SanitizedArchiveResult,
  InspectedArchiveResult,
  LicenseStatusResult,
  UploadPackageArchiveResult,
  UploadSdkArchiveResult,
} from './helpers';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private minioClient: MinioClient;
  readonly assetsBucket: string;
  readonly packageSubmissionsBucket: string;
  readonly sdkSubmissionsBucket: string;
  readonly endUserMediaBucket: string;
  readonly backofficeUserMediaBucket: string;
  private publicUrl: string;
  private apiBaseUrl: string;
  private aistorLicenseKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly sanitizerHelper: ArchiveSanitizerHelper,
    private readonly bucketLifecycleHelper: BucketLifecycleHelper,
    private readonly presignedUrlHelper: PresignedUrlHelper,
    private readonly quarantineHelper: QuarantineStorageHelper,
  ) {
    const endPoint = this.configService.get<string>(
      'MINIO_ENDPOINT',
      'localhost',
    );
    const port = parseInt(
      this.configService.get<string>('MINIO_PORT', '9000'),
      10,
    );
    const useSSL =
      this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const accessKey =
      this.configService.get<string>('MINIO_ACCESS_KEY') ||
      this.configService.get<string>('MINIO_ROOT_USER') ||
      '';
    const secretKey =
      this.configService.get<string>('MINIO_SECRET_KEY') ||
      this.configService.get<string>('MINIO_ROOT_PASSWORD') ||
      '';

    this.assetsBucket = this.configService.get<string>(
      'MINIO_BUCKET_NAME',
      'mini-app-assets',
    );
    this.packageSubmissionsBucket = this.configService.get<string>(
      'MINIO_PACKAGE_SUBMISSIONS_BUCKET',
      'package-submissions',
    );
    this.sdkSubmissionsBucket = this.configService.get<string>(
      'MINIO_SDK_SUBMISSIONS_BUCKET',
      'sdk-submissions',
    );
    this.endUserMediaBucket = this.configService.get<string>(
      'MINIO_END_USER_MEDIA_BUCKET',
      'end-user-media',
    );
    this.backofficeUserMediaBucket = this.configService.get<string>(
      'MINIO_BACKOFFICE_USER_MEDIA_BUCKET',
      'backoffice-user-media',
    );

    this.publicUrl = this.configService
      .get<string>('MINIO_PUBLIC_URL', `http://${endPoint}:${port}`)
      .replace(/\/$/, '');

    this.aistorLicenseKey =
      this.configService.get<string>('MINIO_AISTOR_LICENSE') ||
      this.configService.get<string>('MINIO_SUBNET_LICENSE') ||
      this.configService.get<string>('MINIO_LICENSE') ||
      '';

    this.minioClient = new MinioClient({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });
  }

  getLicenseStatus(): LicenseStatusResult {
    return this.bucketLifecycleHelper.buildLicenseStatus(
      this.aistorLicenseKey,
      `${this.configService.get<string>('MINIO_ENDPOINT', 'localhost')}:${this.configService.get<string>('MINIO_PORT', '9000')}`,
      this.assetsBucket,
    );
  }

  setAistorLicense(licenseKey: string): LicenseStatusResult {
    this.aistorLicenseKey = (licenseKey || '').trim();
    this.logger.log('MinIO AIStor license key updated successfully.');
    return this.getLicenseStatus();
  }

  async onModuleInit(): Promise<void> {
    await this.ensureBucketsAndPolicies();
  }

  /**
   * Ensure standardized architecture exists with proper access policies:
   * 1. mini-app-assets: Public Read Policy (logos, icons, banner images)
   * 2. package-submissions: Strictly Private Quarantine (Flutter .zip packages)
   * 3. sdk-submissions: Strictly Private Quarantine (Native .aar / .xcframework)
   * 4. end-user-media: Strictly Private (end-user avatars; served only through the authenticated API)
   * 5. backoffice-user-media: Public Read Policy (backoffice operator and admin profile avatars)
   */
  private async ensureBucketsAndPolicies(): Promise<void> {
    await this.bucketLifecycleHelper.ensureBucketsAndPolicies(
      this.minioClient,
      [
        this.assetsBucket,
        this.packageSubmissionsBucket,
        this.sdkSubmissionsBucket,
        this.endUserMediaBucket,
        this.backofficeUserMediaBucket,
      ],
    );
    await this.bucketLifecycleHelper.migrateLegacyBuckets(
      this.minioClient,
      this.assetsBucket,
      this.packageSubmissionsBucket,
    );
  }

  /**
   * Generates a presigned GET URL for an object in MinIO.
   */
  async getPresignedUrl(
    bucket: string,
    objectKey: string,
    expirySeconds = 7 * 24 * 60 * 60,
  ): Promise<string> {
    return this.presignedUrlHelper.getPresignedUrl(
      this.minioClient,
      this.publicUrl,
      bucket,
      objectKey,
      expirySeconds,
      this.apiBaseUrl,
    );
  }

  /**
   * Resolves any stored logo key, path, or legacy URL into an active presigned URL.
   */
  async resolveLogoUrl(
    logoUrlOrPath?: string | null,
    expirySeconds = 7 * 24 * 60 * 60,
  ): Promise<string | null> {
    return this.presignedUrlHelper.resolveLogoUrl(
      this.minioClient,
      this.publicUrl,
      this.assetsBucket,
      logoUrlOrPath,
      expirySeconds,
      this.apiBaseUrl,
    );
  }

  /**
   * Deletes a logo object from MinIO by logo URL or storage path.
   */
  async deleteLogo(logoUrlOrPath?: string | null): Promise<void> {
    return this.presignedUrlHelper.deleteLogo(
      this.minioClient,
      this.assetsBucket,
      (bucket, key) => this.deleteObject(bucket, key),
      logoUrlOrPath,
    );
  }

  /**
   * Upload a Multer file to mini-app-assets bucket and return a presigned URL
   */
  async uploadFile(
    file: Express.Multer.File,
  ): Promise<{ url: string; filename: string; size: number }> {
    return this.presignedUrlHelper.uploadFile(
      this.minioClient,
      this.publicUrl,
      this.assetsBucket,
      file,
      this.apiBaseUrl,
    );
  }

  /**
   * Upload a base64 string directly to mini-app-assets and return a presigned URL
   */
  async uploadBase64(
    base64Str: string,
    nameHint = 'logo.png',
  ): Promise<string> {
    return this.presignedUrlHelper.uploadBase64(
      this.minioClient,
      this.publicUrl,
      this.assetsBucket,
      base64Str,
      nameHint,
      this.apiBaseUrl,
    );
  }

  /**
   * Sanitizes a Flutter package zip archive by stripping out local build caches,
   * Gradle daemon files, Pods, Git history, IDE settings, and unneeded binaries.
   */
  sanitizePackageArchive(rawBuffer: Buffer): SanitizedArchiveResult {
    return this.sanitizerHelper.sanitizePackageArchive(rawBuffer);
  }

  /**
   * Inspects a Flutter package archive (.zip / .tar.gz) in-memory without saving to MinIO.
   */
  inspectPackageArchive(file: Express.Multer.File): InspectedArchiveResult {
    return this.sanitizerHelper.inspectPackageArchive(file);
  }

  /**
   * Uploads and inspects a Flutter package archive into package-submissions.
   */
  async uploadPackageArchive(
    file: Express.Multer.File,
    miniAppId = 'draft',
    versionHint = '1.0.0',
  ): Promise<UploadPackageArchiveResult> {
    return this.quarantineHelper.uploadPackageArchive(
      this.minioClient,
      this.publicUrl,
      this.packageSubmissionsBucket,
      file,
      miniAppId,
      versionHint,
    );
  }

  /**
   * Uploads a Native SDK binary archive (.aar / .xcframework / .zip) into sdk-submissions.
   */
  async uploadSdkArchive(
    file: Express.Multer.File,
    miniAppId = 'draft',
    versionHint = '1.0.0',
  ): Promise<UploadSdkArchiveResult> {
    return this.quarantineHelper.uploadSdkArchive(
      this.minioClient,
      this.publicUrl,
      this.sdkSubmissionsBucket,
      file,
      miniAppId,
      versionHint,
    );
  }

  /** Stores an object in a bucket WITHOUT returning or implying a public URL. */
  async putPrivateObject(
    bucket: string,
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.minioClient.putObject(bucket, key, body, body.length, {
      'Content-Type': contentType,
    });
  }

  /**
   * Upload an avatar for a backoffice user to the public backoffice-user-media bucket
   */
  async uploadBackofficeUserAvatar(
    userId: string,
    file:
      | {
          buffer?: Buffer;
          size?: number;
          originalname?: string;
          mimetype?: string;
        }
      | undefined,
  ): Promise<{ url: string; key: string }> {
    const buf = file?.buffer;
    if (!buf || buf.length === 0) {
      throw new BadRequestException('Choose an image to upload');
    }
    if (buf.length > 2 * 1024 * 1024) {
      throw new PayloadTooLargeException('Avatar image must not exceed 2 MB');
    }
    const detected = detectImageFileType(buf);
    if (!detected) {
      throw new BadRequestException(
        'Only JPEG, PNG, or WebP images are permitted',
      );
    }

    const key = `avatars/${userId}/${randomUUID().slice(0, 8)}.${detected.ext}`;
    let bucket = this.backofficeUserMediaBucket || 'backoffice-user-media';

    // Prune existing avatar(s) in this user's dedicated folder (avatars/${userId}/)
    try {
      if (typeof this.minioClient?.listObjectsV2 === 'function') {
        const stream = this.minioClient.listObjectsV2(
          bucket,
          `avatars/${userId}/`,
          true,
        );
        if (stream && typeof stream.on === 'function') {
          const oldKeys: string[] = [];
          await new Promise<void>((resolve) => {
            stream.on('data', (obj: any) => {
              if (obj?.name) oldKeys.push(obj.name);
            });
            stream.on('end', () => resolve());
            stream.on('error', () => resolve());
          });
          for (const oldKey of oldKeys) {
            await this.minioClient.removeObject(bucket, oldKey).catch(() => {});
          }
        }
      }
    } catch (err: any) {
      this.logger.debug(
        `Could not prune existing user avatars for user ${userId}: ${err?.message}`,
      );
    }

    try {
      await this.minioClient.putObject(bucket, key, buf, buf.length, {
        'Content-Type': detected.contentType,
      });
    } catch (err: any) {
      const isAccessOrBucketError =
        err?.message?.includes('Access Denied') ||
        err?.code === 'AccessDenied' ||
        err?.code === 'NoSuchBucket' ||
        err?.message?.includes('does not exist');

      if (isAccessOrBucketError && bucket !== this.assetsBucket) {
        this.logger.warn(
          `Cannot write backoffice avatar to bucket "${bucket}" (${err.message}). Falling back to assets bucket "${this.assetsBucket}".`,
        );
        bucket = this.assetsBucket;
        await this.minioClient.putObject(bucket, key, buf, buf.length, {
          'Content-Type': detected.contentType,
        });
      } else {
        throw err;
      }
    }

    const url = `/api/backoffice-user-media/${key}`;

    this.logger.log(`Uploaded backoffice avatar for user ${userId}: ${key}`);
    return { url, key };
  }

  /**
   * Delete an avatar object for a backoffice user from the backoffice-user-media bucket
   */
  async deleteBackofficeUserAvatar(
    avatarUrlOrKey?: string | null,
  ): Promise<void> {
    if (!avatarUrlOrKey) return;
    const primaryBucket =
      this.backofficeUserMediaBucket || 'backoffice-user-media';
    let key = avatarUrlOrKey.split('?')[0];
    key = decodeURIComponent(key)
      .replace(/^https?:\/\/[^\/]+\//, '')
      .replace(/^\/+/, '')
      .replace(
        /^(?:api\/)?(?:storage\/asset\?key=|backoffice-user-media\/|mini-app-assets\/)/,
        '',
      )
      .replace(/^\/+/, '');

    try {
      await this.minioClient.removeObject(primaryBucket, key);
      this.logger.log(`Deleted backoffice avatar from ${primaryBucket}: ${key}`);
    } catch (err: any) {
      if (primaryBucket !== this.assetsBucket) {
        await this.minioClient
          .removeObject(this.assetsBucket, key)
          .catch(() => {});
      }
      this.logger.debug(
        `Could not delete backoffice avatar ${key}: ${err?.message}`,
      );
    }
  }

  async removeObject(bucket: string, key: string): Promise<void> {
    await this.minioClient.removeObject(bucket, key);
  }

  /**
   * Deletes an object from a MinIO bucket.
   */
  async deleteObject(bucket: string, key: string): Promise<void> {
    return this.quarantineHelper.deleteObject(this.minioClient, bucket, key);
  }

  /**
   * Retrieves an object from MinIO as a Buffer.
   */
  async getObjectBuffer(bucket: string, key: string): Promise<Buffer> {
    return this.quarantineHelper.getObjectBuffer(this.minioClient, bucket, key);
  }

  /**
   * Retrieves an object from MinIO as a readable stream.
   */
  async getObjectStream(
    bucket: string,
    key: string,
  ): Promise<NodeJS.ReadableStream> {
    return this.minioClient.getObject(bucket, key);
  }

  /**
   * Checks if an object exists and returns its stats.
   */
  async statObject(bucket: string, key: string): Promise<any> {
    return this.minioClient.statObject(bucket, key);
  }

  /**
   * Performs a lightweight health check against MinIO.
   */
  async checkHealth(): Promise<boolean> {
    try {
      return await this.minioClient.bucketExists(this.assetsBucket);
    } catch {
      return false;
    }
  }
}
