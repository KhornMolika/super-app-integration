import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';
import type { Multer } from 'multer';
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
  private publicUrl: string;
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
   * Provisions standard buckets and applies legacy migrations
   */
  private async ensureBucketsAndPolicies(): Promise<void> {
    await this.bucketLifecycleHelper.ensureBucketsAndPolicies(
      this.minioClient,
      [
        this.assetsBucket,
        this.packageSubmissionsBucket,
        this.sdkSubmissionsBucket,
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
