import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';
import { randomUUID } from 'crypto';
import type { Multer } from 'multer';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private minioClient: MinioClient;
  private bucketName: string;
  private publicUrl: string;

  constructor(private readonly configService: ConfigService) {
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
    const accessKey = this.configService.get<string>(
      'MINIO_ACCESS_KEY',
      'admin',
    );
    const secretKey = this.configService.get<string>(
      'MINIO_SECRET_KEY',
      'admin1234',
    );

    this.bucketName = this.configService.get<string>(
      'MINIO_BUCKET_NAME',
      'mini-app-logos',
    );
    this.publicUrl = this.configService
      .get<string>('MINIO_PUBLIC_URL', `http://${endPoint}:${port}`)
      .replace(/\/$/, '');

    this.minioClient = new MinioClient({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });
  }

  async onModuleInit() {
    await this.ensureBucket();
  }

  /**
   * Ensure bucket exists and has public read access for served images
   */
  private async ensureBucket() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Created MinIO bucket "${this.bucketName}"`);

        // Set bucket policy to public read
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`],
            },
          ],
        };
        await this.minioClient.setBucketPolicy(
          this.bucketName,
          JSON.stringify(policy),
        );
        this.logger.log(
          `Configured public read policy on bucket "${this.bucketName}"`,
        );
      }
    } catch (err: any) {
      this.logger.error(`MinIO bucket init check failed: ${err.message}`);
    }
  }

  /**
   * Upload a Multer file to MinIO
   */
  async uploadFile(
    file: Express.Multer.File,
  ): Promise<{ url: string; filename: string; size: number }> {
    await this.ensureBucket();

    const ext = file.originalname?.split('.').pop() || 'png';
    const cleanName = (file.originalname || 'image').replace(
      /[^a-zA-Z0-9.-]/g,
      '_',
    );
    const filename = `mini-app-assets/logo-${Date.now()}-${randomUUID().slice(0, 8)}-${cleanName}`;

    await this.minioClient.putObject(
      this.bucketName,
      filename,
      file.buffer,
      file.size,
      { 'Content-Type': file.mimetype || 'image/png' },
    );

    const url = `${this.publicUrl}/${this.bucketName}/${filename}`;
    this.logger.log(`Uploaded file to MinIO: ${url}`);

    return {
      url,
      filename,
      size: file.size,
    };
  }

  /**
   * Upload a base64 string directly to MinIO and return the public URL
   */
  async uploadBase64(
    base64Str: string,
    nameHint = 'logo.png',
  ): Promise<string> {
    await this.ensureBucket();

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
      filename = `mini-app-assets/logo-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
    }

    await this.minioClient.putObject(
      this.bucketName,
      filename,
      buffer,
      buffer.length,
      { 'Content-Type': mimeType },
    );

    const url = `${this.publicUrl}/${this.bucketName}/${filename}`;
    this.logger.log(`Uploaded base64 image to MinIO: ${url}`);
    return url;
  }

  /**
   * Uploads and inspects a Flutter package archive (.zip / .tar.gz)
   */
  async uploadPackageArchive(
    file: Express.Multer.File,
    miniAppId = 'draft',
    versionHint = '1.0.0',
  ): Promise<{
    minioUrl: string;
    minioKey: string;
    sha256: string;
    filename: string;
    size: number;
    pubspec: {
      name?: string;
      version?: string;
      description?: string;
      dependencies?: Record<string, any>;
      environment?: Record<string, any>;
    };
  }> {
    const submissionsBucket = this.configService.get<string>(
      'MINIO_SUBMISSIONS_BUCKET',
      'submissions',
    );

    // Ensure submissions bucket exists
    try {
      const exists = await this.minioClient.bucketExists(submissionsBucket);
      if (!exists) {
        await this.minioClient.makeBucket(submissionsBucket, 'us-east-1');
        this.logger.log(`Created MinIO bucket "${submissionsBucket}"`);
      }
    } catch (err: any) {
      this.logger.warn(`Could not ensure submissions bucket: ${err.message}`);
    }

    const sha256 = require('crypto')
      .createHash('sha256')
      .update(file.buffer)
      .digest('hex');
    const cleanOrigName = (file.originalname || 'package.zip').replace(
      /[^a-zA-Z0-9.-]/g,
      '_',
    );
    const minioKey = `pending/${miniAppId}/${versionHint}/${Date.now()}-${cleanOrigName}`;

    await this.minioClient.putObject(
      submissionsBucket,
      minioKey,
      file.buffer,
      file.size,
      { 'Content-Type': file.mimetype || 'application/zip' },
    );

    const minioUrl = `${this.publicUrl}/${submissionsBucket}/${minioKey}`;

    // Extract pubspec.yaml from zip
    let parsedPubspec: any = {};
    try {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(file.buffer);
      const zipEntries = zip.getEntries();

      // Look for pubspec.yaml either at root or nested one level
      const pubspecEntry = zipEntries.find(
        (entry: any) =>
          entry.entryName.toLowerCase() === 'pubspec.yaml' ||
          entry.entryName.toLowerCase().endsWith('/pubspec.yaml'),
      );

      if (pubspecEntry) {
        const yamlText = pubspecEntry.getData().toString('utf8');
        const yaml = require('yaml');
        parsedPubspec = yaml.parse(yamlText) || {};
      }
    } catch (err: any) {
      this.logger.warn(
        `Could not extract pubspec.yaml from archive: ${err.message}`,
      );
    }

    return {
      minioUrl,
      minioKey,
      sha256,
      filename: cleanOrigName,
      size: file.size,
      pubspec: {
        name: parsedPubspec.name,
        version: parsedPubspec.version,
        description: parsedPubspec.description,
        dependencies: parsedPubspec.dependencies,
        environment: parsedPubspec.environment,
      },
    };
  }
}
