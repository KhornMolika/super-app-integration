import { Injectable, Logger } from '@nestjs/common';
import { Client as MinioClient } from 'minio';
import type { Multer } from 'multer';
import { ArchiveSanitizerHelper } from './archive-sanitizer.helper';

export interface UploadPackageArchiveResult {
  success: boolean;
  packageUrl: string;
  packageStoragePath: string;
  minioUrl: string;
  minioKey: string;
  sha256: string;
  filename: string;
  size: number;
  originalSize?: number;
  isSanitized?: boolean;
  strippedFilesCount?: number;
  pubspec: {
    name?: string;
    version?: string;
    description?: string;
    dependencies?: Record<string, any>;
    environment?: Record<string, any>;
  };
}

export interface UploadSdkArchiveResult {
  minioUrl: string;
  minioKey: string;
  sha256: string;
  filename: string;
  size: number;
}

@Injectable()
export class QuarantineStorageHelper {
  private readonly logger = new Logger(QuarantineStorageHelper.name);

  constructor(
    private readonly sanitizerHelper: ArchiveSanitizerHelper,
  ) {}

  /**
   * Uploads and inspects a Flutter package archive (.zip / .tar.gz) into package-submissions.
   * Automatically sanitizes the archive before storage to prevent local build bloat from entering MinIO.
   */
  async uploadPackageArchive(
    minioClient: MinioClient,
    publicUrl: string,
    bucket: string,
    file: Express.Multer.File,
    miniAppId = 'draft',
    versionHint = '1.0.0',
  ): Promise<UploadPackageArchiveResult> {
    // 1. Sanitize in-memory before writing to MinIO
    const {
      cleanBuffer,
      originalSize,
      cleanSize,
      isSanitized,
      strippedFilesCount,
      parsedPubspec,
    } = this.sanitizerHelper.sanitizePackageArchive(file.buffer);

    const sha256 = require('crypto')
      .createHash('sha256')
      .update(cleanBuffer)
      .digest('hex');

    const cleanOrigName = (file.originalname || 'package.zip').replace(
      /[^a-zA-Z0-9.-]/g,
      '_',
    );
    const minioKey = `pending/${miniAppId}/${versionHint}/${cleanOrigName}`;

    // 2. Write ONLY the sanitized clean buffer to MinIO
    await minioClient.putObject(
      bucket,
      minioKey,
      cleanBuffer,
      cleanBuffer.length,
      { 'Content-Type': file.mimetype || 'application/zip' },
    );

    const minioUrl = `${publicUrl}/${bucket}/${minioKey}`;

    const name = parsedPubspec?.name
      ? String(parsedPubspec.name).trim()
      : undefined;
    const version = parsedPubspec?.version
      ? String(parsedPubspec.version).trim()
      : undefined;

    return {
      success: true,
      packageUrl: minioUrl,
      packageStoragePath: minioKey,
      minioUrl,
      minioKey,
      sha256,
      filename: cleanOrigName,
      size: cleanSize,
      originalSize,
      isSanitized,
      strippedFilesCount,
      pubspec: {
        name,
        version,
        description: parsedPubspec?.description,
        dependencies: parsedPubspec?.dependencies,
        environment: parsedPubspec?.environment,
      },
    };
  }

  /**
   * Uploads a Native SDK binary archive (.aar / .xcframework / .zip) into sdk-submissions
   */
  async uploadSdkArchive(
    minioClient: MinioClient,
    publicUrl: string,
    bucket: string,
    file: Express.Multer.File,
    miniAppId = 'draft',
    versionHint = '1.0.0',
  ): Promise<UploadSdkArchiveResult> {
    const sha256 = require('crypto')
      .createHash('sha256')
      .update(file.buffer)
      .digest('hex');
    const cleanOrigName = (file.originalname || 'sdk-package.zip').replace(
      /[^a-zA-Z0-9.-]/g,
      '_',
    );
    const minioKey = `pending/${miniAppId}/${versionHint}/${cleanOrigName}`;

    await minioClient.putObject(
      bucket,
      minioKey,
      file.buffer,
      file.size,
      { 'Content-Type': file.mimetype || 'application/octet-stream' },
    );

    const minioUrl = `${publicUrl}/${bucket}/${minioKey}`;

    return {
      minioUrl,
      minioKey,
      sha256,
      filename: cleanOrigName,
      size: file.size,
    };
  }

  /**
   * Deletes an object from a MinIO bucket.
   */
  async deleteObject(
    minioClient: MinioClient,
    bucket: string,
    key: string,
  ): Promise<void> {
    try {
      await minioClient.removeObject(bucket, key);
      this.logger.log(`Deleted object "${key}" from bucket "${bucket}"`);
    } catch (err: any) {
      this.logger.warn(
        `Failed to delete object "${key}" from "${bucket}": ${err.message}`,
      );
    }
  }

  /**
   * Retrieves an object from MinIO as a Buffer
   */
  async getObjectBuffer(
    minioClient: MinioClient,
    bucket: string,
    key: string,
  ): Promise<Buffer> {
    const stream = await minioClient.getObject(bucket, key);
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: any) =>
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
      );
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', (err: any) => reject(err));
    });
  }
}
