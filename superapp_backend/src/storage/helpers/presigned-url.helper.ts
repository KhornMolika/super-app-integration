import { Injectable, Logger } from '@nestjs/common';
import { Client as MinioClient } from 'minio';
import { randomUUID } from 'crypto';
import type { Multer } from 'multer';

@Injectable()
export class PresignedUrlHelper {
  private readonly logger = new Logger(PresignedUrlHelper.name);

  /**
   * Generates a presigned GET URL for an object in MinIO (default: 7 days expiry).
   */
  async getPresignedUrl(
    minioClient: MinioClient,
    publicUrl: string,
    bucket: string,
    objectKey: string,
    expirySeconds = 7 * 24 * 60 * 60,
  ): Promise<string> {
    try {
      return await minioClient.presignedGetObject(
        bucket,
        objectKey,
        expirySeconds,
      );
    } catch (err: any) {
      this.logger.warn(
        `Failed to generate presigned URL for ${bucket}/${objectKey}: ${err.message}`,
      );
      return `${publicUrl}/${bucket}/${objectKey}`;
    }
  }

  /**
   * Resolves any stored logo key, path, or legacy URL into an active presigned URL.
   */
  async resolveLogoUrl(
    minioClient: MinioClient,
    publicUrl: string,
    assetsBucket: string,
    logoUrlOrPath?: string | null,
    expirySeconds = 7 * 24 * 60 * 60,
  ): Promise<string | null> {
    if (!logoUrlOrPath) return null;
    if (logoUrlOrPath.startsWith('data:')) return logoUrlOrPath;
    if (
      logoUrlOrPath.includes('X-Amz-Signature') ||
      logoUrlOrPath.includes('X-Amz-Credential')
    ) {
      return logoUrlOrPath;
    }

    let bucket = assetsBucket;
    let key = logoUrlOrPath.split('?')[0];
    key = key.replace(/^https?:\/\/[^\/]+\//, '');

    if (key.startsWith('mini-app-logos/')) {
      bucket = assetsBucket;
      key = key.replace(/^mini-app-logos\//, '');
    } else if (key.startsWith(`${assetsBucket}/`)) {
      bucket = assetsBucket;
      key = key.substring(assetsBucket.length + 1);
    }

    return this.getPresignedUrl(
      minioClient,
      publicUrl,
      bucket,
      key,
      expirySeconds,
    );
  }

  /**
   * Deletes a logo object from MinIO by logo URL or storage path.
   */
  async deleteLogo(
    minioClient: MinioClient,
    assetsBucket: string,
    deleteObjectFn: (bucket: string, key: string) => Promise<void>,
    logoUrlOrPath?: string | null,
  ): Promise<void> {
    if (!logoUrlOrPath || logoUrlOrPath.startsWith('data:')) return;
    let bucket = assetsBucket;
    let key = logoUrlOrPath.split('?')[0];
    key = key.replace(/^https?:\/\/[^\/]+\//, '');

    if (key.startsWith('mini-app-logos/')) {
      bucket = assetsBucket;
      key = key.replace(/^mini-app-logos\//, '');
    } else if (key.startsWith(`${assetsBucket}/`)) {
      bucket = assetsBucket;
      key = key.substring(assetsBucket.length + 1);
    }

    await deleteObjectFn(bucket, key);
  }

  /**
   * Upload a Multer file to mini-app-assets bucket and return a presigned URL
   */
  async uploadFile(
    minioClient: MinioClient,
    publicUrl: string,
    assetsBucket: string,
    file: Express.Multer.File,
  ): Promise<{ url: string; filename: string; size: number }> {
    const ext = file.originalname?.split('.').pop() || 'png';
    const cleanName = (file.originalname || 'image').replace(
      /[^a-zA-Z0-9.-]/g,
      '_',
    );
    const filename = `logos/logo-${Date.now()}-${randomUUID().slice(0, 8)}-${cleanName}`;

    await minioClient.putObject(
      assetsBucket,
      filename,
      file.buffer,
      file.size,
      { 'Content-Type': file.mimetype || 'image/png' },
    );

    const url = await this.getPresignedUrl(
      minioClient,
      publicUrl,
      assetsBucket,
      filename,
    );
    this.logger.log(
      `Uploaded asset to private MinIO storage with presigned URL: ${filename}`,
    );

    return {
      url,
      filename,
      size: file.size,
    };
  }

  /**
   * Upload a base64 string directly to mini-app-assets and return a presigned URL
   */
  async uploadBase64(
    minioClient: MinioClient,
    publicUrl: string,
    assetsBucket: string,
    base64Str: string,
    nameHint = 'logo.png',
  ): Promise<string> {
    const matches = base64Str.match(/^data:([^;]+);base64,(.+)$/);
    let mimeType = 'image/png';
    let buffer: Buffer;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(base64Str, 'base64');
    }

    let ext = 'png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
      ext = 'jpg';
    } else if (mimeType.includes('svg')) {
      ext = 'svg';
    } else if (mimeType.includes('webp')) {
      ext = 'webp';
    } else if (mimeType.includes('gif')) {
      ext = 'gif';
    } else if (mimeType.includes('/')) {
      ext = mimeType.split('/')[1].split('+')[0] || 'png';
    }

    let filename: string;
    if (nameHint && nameHint !== 'logo.png') {
      const cleanPath = nameHint.replace(/\.[^/.]+$/, '');
      filename = `${cleanPath}.${ext}`;
    } else {
      filename = `logos/logo-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
    }

    await minioClient.putObject(
      assetsBucket,
      filename,
      buffer,
      buffer.length,
      { 'Content-Type': mimeType },
    );

    const url = await this.getPresignedUrl(
      minioClient,
      publicUrl,
      assetsBucket,
      filename,
    );
    this.logger.log(
      `Uploaded base64 image to private MinIO storage with presigned URL: ${filename}`,
    );
    return url;
  }
}
