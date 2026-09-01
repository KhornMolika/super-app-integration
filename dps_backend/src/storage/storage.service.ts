import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private minioClient: Minio.Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const endPoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = parseInt(this.configService.get<string>('MINIO_PORT', '9000'), 10);
    const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin');

    this.bucketName = this.configService.get<string>('MINIO_BUCKET_NAME', 'mini-app-logos');
    this.publicUrl = this.configService.get<string>('MINIO_PUBLIC_URL', `http://${endPoint}:${port}`).replace(/\/$/, '');

    this.minioClient = new Minio.Client({
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
        await this.minioClient.setBucketPolicy(this.bucketName, JSON.stringify(policy));
        this.logger.log(`Configured public read policy on bucket "${this.bucketName}"`);
      }
    } catch (err: any) {
      this.logger.error(`MinIO bucket init check failed: ${err.message}`);
    }
  }

  /**
   * Upload a Multer file to MinIO
   */
  async uploadFile(file: Express.Multer.File): Promise<{ url: string; filename: string; size: number }> {
    await this.ensureBucket();

    const ext = file.originalname?.split('.').pop() || 'png';
    const cleanName = (file.originalname || 'image').replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `logo-${Date.now()}-${randomUUID().slice(0, 8)}-${cleanName}`;

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
  async uploadBase64(base64Str: string, nameHint = 'logo.png'): Promise<string> {
    await this.ensureBucket();

    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let mimeType = 'image/png';
    let buffer: Buffer;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(base64Str, 'base64');
    }

    const ext = mimeType.split('/')[1] || 'png';
    const filename = `logo-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;

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
}
