import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';
import { randomUUID } from 'crypto';
import type { Multer } from 'multer';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private minioClient: MinioClient;
  readonly assetsBucket: string;
  readonly packageSubmissionsBucket: string;
  readonly sdkSubmissionsBucket: string;
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

  private aistorLicenseKey: string;

  getLicenseStatus() {
    const hasLicense = Boolean(this.aistorLicenseKey && this.aistorLicenseKey.trim());
    return {
      configured: hasLicense,
      maskedKey: hasLicense
        ? `${this.aistorLicenseKey.substring(0, 6)}...${this.aistorLicenseKey.substring(Math.max(0, this.aistorLicenseKey.length - 4))}`
        : null,
      licenseType: hasLicense ? 'MinIO AIStor Enterprise' : 'Community / Free Edition',
      endpoint: `${this.configService.get<string>('MINIO_ENDPOINT', 'localhost')}:${this.configService.get<string>('MINIO_PORT', '9000')}`,
      bucket: this.assetsBucket,
    };
  }

  setAistorLicense(licenseKey: string) {
    this.aistorLicenseKey = (licenseKey || '').trim();
    this.logger.log('MinIO AIStor license key updated successfully.');
    return this.getLicenseStatus();
  }

  async onModuleInit() {
    await this.ensureBucketsAndPolicies();
  }

  /**
   * Ensure standardized 3-bucket architecture exists with proper access policies:
   * 1. mini-app-assets: Public Read Policy (logos, icons, banner images)
   * 2. package-submissions: Strictly Private Quarantine (Flutter .zip packages)
   * 3. sdk-submissions: Strictly Private Quarantine (Native .aar / .xcframework)
   */
  private async ensureBucketsAndPolicies() {
    const bucketsToCreate = [
      { name: this.assetsBucket, isPublic: true },
      { name: this.packageSubmissionsBucket, isPublic: false },
      { name: this.sdkSubmissionsBucket, isPublic: false },
    ];


    for (const b of bucketsToCreate) {
      try {
        const exists = await this.minioClient.bucketExists(b.name);
        if (!exists) {
          await this.minioClient.makeBucket(b.name, 'us-east-1');
          this.logger.log(`Created MinIO bucket "${b.name}"`);
        }

        if (b.isPublic) {
          // Configure public read policy for assets bucket
          const publicPolicy = {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: '*',
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${b.name}/*`],
              },
            ],
          };
          await this.minioClient.setBucketPolicy(
            b.name,
            JSON.stringify(publicPolicy),
          );
          this.logger.log(`Configured public read policy on "${b.name}"`);
        }
      } catch (err: any) {
        this.logger.warn(`MinIO bucket init check failed for "${b.name}": ${err.message}`);
      }
    }

    // Auto-migrate legacy buckets (mini-app-logos, submissions) if they exist
    await this.migrateLegacyBuckets();
  }

  /**
   * Migrate objects from legacy buckets to new standardized buckets if present
   */
  private async migrateLegacyBuckets() {
    try {
      // 1. Check legacy mini-app-logos
      const hasLegacyLogos = await this.minioClient.bucketExists('mini-app-logos').catch(() => false);
      if (hasLegacyLogos && this.assetsBucket !== 'mini-app-logos') {
        const stream = this.minioClient.listObjectsV2('mini-app-logos', '', true);
        stream.on('data', async (obj) => {
          if (obj.name) {
            try {
              const conds = new (require('minio').CopyConditions)();
              await this.minioClient.copyObject(this.assetsBucket, obj.name, `/mini-app-logos/${obj.name}`, conds);
              this.logger.log(`Migrated ${obj.name} from mini-app-logos to ${this.assetsBucket}`);
            } catch (_) {}
          }
        });
      }

      // 2. Check legacy submissions
      const hasLegacySubmissions = await this.minioClient.bucketExists('submissions').catch(() => false);
      if (hasLegacySubmissions && this.packageSubmissionsBucket !== 'submissions') {
        const stream = this.minioClient.listObjectsV2('submissions', '', true);
        stream.on('data', async (obj) => {
          if (obj.name) {
            try {
              const conds = new (require('minio').CopyConditions)();
              await this.minioClient.copyObject(this.packageSubmissionsBucket, obj.name, `/submissions/${obj.name}`, conds);
              this.logger.log(`Migrated ${obj.name} from submissions to ${this.packageSubmissionsBucket}`);
            } catch (_) {}
          }
        });
      }
    } catch (err: any) {
      this.logger.warn(`Legacy bucket migration check skipped: ${err.message}`);
    }
  }

  /**
   * Upload a Multer file to mini-app-assets bucket
   */
  async uploadFile(
    file: Express.Multer.File,
  ): Promise<{ url: string; filename: string; size: number }> {
    const ext = file.originalname?.split('.').pop() || 'png';
    const cleanName = (file.originalname || 'image').replace(
      /[^a-zA-Z0-9.-]/g,
      '_',
    );
    const filename = `mini-app-assets/logo-${Date.now()}-${randomUUID().slice(0, 8)}-${cleanName}`;

    await this.minioClient.putObject(
      this.assetsBucket,
      filename,
      file.buffer,
      file.size,
      { 'Content-Type': file.mimetype || 'image/png' },
    );

    const url = `${this.publicUrl}/${this.assetsBucket}/${filename}`;
    this.logger.log(`Uploaded asset to MinIO: ${url}`);

    return {
      url,
      filename,
      size: file.size,
    };
  }

  /**
   * Upload a base64 string directly to mini-app-assets and return the public URL
   */
  async uploadBase64(
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
      filename = `mini-app-assets/logo-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
    }

    await this.minioClient.putObject(
      this.assetsBucket,
      filename,
      buffer,
      buffer.length,
      { 'Content-Type': mimeType },
    );

    const url = `${this.publicUrl}/${this.assetsBucket}/${filename}`;
    this.logger.log(`Uploaded base64 image to MinIO: ${url}`);
    return url;
  }

  /**
   * Sanitizes a Flutter package zip archive by stripping out local build caches,

   * Gradle daemon files, Pods, Git history, IDE settings, and unneeded binaries
   * before storing in MinIO or triggering security scans.
   */
  sanitizePackageArchive(rawBuffer: Buffer): {
    cleanBuffer: Buffer;
    originalSize: number;
    cleanSize: number;
    isSanitized: boolean;
    strippedFilesCount: number;
    parsedPubspec: any;
  } {
    const originalSize = rawBuffer.length;
    let parsedPubspec: any = {};

    try {
      const AdmZip = require('adm-zip');
      const yaml = require('yaml');
      const sourceZip = new AdmZip(rawBuffer);
      const cleanZip = new AdmZip();

      const junkPrefixes = [
        'build/',
        '.dart_tool/',
        '.git/',
        '.gradle/',
        'android/.gradle/',
        'android/app/build/',
        'ios/Pods/',
        '.idea/',
        '.vscode/',
        'node_modules/',
        '__MACOSX/',
      ];

      const junkSuffixes = [
        '.apk',
        '.aar',
        '.ipa',
        '.tmp',
        '.log',
        '.DS_Store',
        'Thumbs.db',
      ];

      let strippedFilesCount = 0;
      const entries = sourceZip.getEntries();

      for (const entry of entries) {
        const normName = entry.entryName.replace(/\\/g, '/');
        const lowerName = normName.toLowerCase();

        // Check if pubspec.yaml
        if (
          lowerName === 'pubspec.yaml' ||
          lowerName.endsWith('/pubspec.yaml')
        ) {
          try {
            const yamlText = entry.getData().toString('utf8');
            parsedPubspec = yaml.parse(yamlText) || {};
          } catch (e: any) {
            this.logger.warn(`Failed to parse pubspec.yaml: ${e.message}`);
          }
        }

        // Check for junk directories or files
        const isJunk =
          junkPrefixes.some(
            (p) => lowerName.startsWith(p) || lowerName.includes('/' + p),
          ) ||
          junkSuffixes.some((s) => lowerName.endsWith(s)) ||
          lowerName.includes('/.dart_tool/') ||
          lowerName.includes('/build/') ||
          lowerName.includes('/.git/') ||
          lowerName.includes('/.gradle/');

        if (isJunk) {
          strippedFilesCount++;
          continue;
        }

        if (!entry.isDirectory) {
          cleanZip.addFile(normName, entry.getData(), entry.comment);
        }
      }

      const cleanBuffer = cleanZip.toBuffer();
      const isSanitized = strippedFilesCount > 0;

      if (isSanitized) {
        const origMb = (originalSize / (1024 * 1024)).toFixed(2);
        const cleanKb = (cleanBuffer.length / 1024).toFixed(1);
        const reduction = (
          (1 - cleanBuffer.length / originalSize) *
          100
        ).toFixed(1);
        this.logger.log(
          `[Sanitize] Package archive: ${origMb} MB -> ${cleanKb} KB (${reduction}% reduction, stripped ${strippedFilesCount} cache/build entries)`,
        );
      }

      // Safe fallback if pubspec was not parsed via entries
      if (!parsedPubspec?.name) {
        try {
          const sampleText = rawBuffer.toString('utf8', 0, Math.min(rawBuffer.length, 500000));
          const nameMatch = sampleText.match(/(?:^|\n)\s*name:\s*([a-zA-Z0-9_-]+)/);
          const verMatch = sampleText.match(/(?:^|\n)\s*version:\s*([^\s#]+)/);
          if (nameMatch) {
            parsedPubspec.name = nameMatch[1].trim();
          }
          if (verMatch) {
            parsedPubspec.version = verMatch[1].trim();
          }
        } catch (_) {}
      }

      if (parsedPubspec?.name) {
        parsedPubspec.name = String(parsedPubspec.name).trim();
      }
      if (parsedPubspec?.version) {
        parsedPubspec.version = String(parsedPubspec.version).trim();
      }

      return {
        cleanBuffer: cleanBuffer.length > 0 ? cleanBuffer : rawBuffer,
        originalSize,
        cleanSize: cleanBuffer.length > 0 ? cleanBuffer.length : originalSize,
        isSanitized,
        strippedFilesCount,
        parsedPubspec,
      };
    } catch (err: any) {
      this.logger.warn(
        `Package archive sanitization warning: ${err.message}. Preserving original archive.`,
      );
      return {
        cleanBuffer: rawBuffer,
        originalSize,
        cleanSize: originalSize,
        isSanitized: false,
        strippedFilesCount: 0,
        parsedPubspec,
      };
    }
  }

  /**
   * Inspects a Flutter package archive (.zip / .tar.gz) in-memory without saving to MinIO.
   * Strips build caches, parses pubspec.yaml, computes clean SHA-256 and size metrics.
   */
  inspectPackageArchive(file: Express.Multer.File): {
    success: boolean;
    sha256: string;
    filename: string;
    size: number;
    originalSize: number;
    isSanitized: boolean;
    strippedFilesCount: number;
    pubspec: {
      name?: string;
      version?: string;
      description?: string;
      dependencies?: Record<string, any>;
      environment?: Record<string, any>;
    };
  } {
    const {
      cleanBuffer,
      originalSize,
      cleanSize,
      isSanitized,
      strippedFilesCount,
      parsedPubspec,
    } = this.sanitizePackageArchive(file.buffer);

    const sha256 = require('crypto')
      .createHash('sha256')
      .update(cleanBuffer)
      .digest('hex');

    const cleanOrigName = (file.originalname || 'package.zip').replace(
      /[^a-zA-Z0-9.-]/g,
      '_',
    );

    const name = parsedPubspec?.name ? String(parsedPubspec.name).trim() : undefined;
    const version = parsedPubspec?.version ? String(parsedPubspec.version).trim() : undefined;

    return {
      success: true,
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
   * Uploads and inspects a Flutter package archive (.zip / .tar.gz) into package-submissions.
   * Automatically sanitizes the archive before storage to prevent local build bloat from entering MinIO.
   */
  async uploadPackageArchive(
    file: Express.Multer.File,
    miniAppId = 'draft',
    versionHint = '1.0.0',
  ): Promise<{
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
  }> {
    // 1. Sanitize in-memory before writing to MinIO
    const {
      cleanBuffer,
      originalSize,
      cleanSize,
      isSanitized,
      strippedFilesCount,
      parsedPubspec,
    } = this.sanitizePackageArchive(file.buffer);

    const sha256 = require('crypto')
      .createHash('sha256')
      .update(cleanBuffer)
      .digest('hex');

    const cleanOrigName = (file.originalname || 'package.zip').replace(
      /[^a-zA-Z0-9.-]/g,
      '_',
    );
    const minioKey = `pending/${miniAppId}/${versionHint}/${Date.now()}-${cleanOrigName}`;

    // 2. Write ONLY the sanitized clean buffer to MinIO
    await this.minioClient.putObject(
      this.packageSubmissionsBucket,
      minioKey,
      cleanBuffer,
      cleanBuffer.length,
      { 'Content-Type': file.mimetype || 'application/zip' },
    );

    const minioUrl = `${this.publicUrl}/${this.packageSubmissionsBucket}/${minioKey}`;

    const name = parsedPubspec?.name ? String(parsedPubspec.name).trim() : undefined;
    const version = parsedPubspec?.version ? String(parsedPubspec.version).trim() : undefined;

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
    file: Express.Multer.File,
    miniAppId = 'draft',
    versionHint = '1.0.0',
  ): Promise<{
    minioUrl: string;
    minioKey: string;
    sha256: string;
    filename: string;
    size: number;
  }> {
    const sha256 = require('crypto')
      .createHash('sha256')
      .update(file.buffer)
      .digest('hex');
    const cleanOrigName = (file.originalname || 'sdk-package.zip').replace(
      /[^a-zA-Z0-9.-]/g,
      '_',
    );
    const minioKey = `pending/${miniAppId}/${versionHint}/${Date.now()}-${cleanOrigName}`;

    await this.minioClient.putObject(
      this.sdkSubmissionsBucket,
      minioKey,
      file.buffer,
      file.size,
      { 'Content-Type': file.mimetype || 'application/octet-stream' },
    );

    const minioUrl = `${this.publicUrl}/${this.sdkSubmissionsBucket}/${minioKey}`;

    return {
      minioUrl,
      minioKey,
      sha256,
      filename: cleanOrigName,
      size: file.size,
    };
  }

  /**
   * Retrieves an object from MinIO as a Buffer
   */
  async getObjectBuffer(bucket: string, key: string): Promise<Buffer> {
    const stream = await this.minioClient.getObject(bucket, key);
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
