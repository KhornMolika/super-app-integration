import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import {
  ArchiveSanitizerHelper,
  BucketLifecycleHelper,
  PresignedUrlHelper,
  QuarantineStorageHelper,
} from './helpers';

describe('StorageService & Helpers', () => {
  let service: StorageService;
  let sanitizerHelper: ArchiveSanitizerHelper;
  let bucketLifecycleHelper: BucketLifecycleHelper;
  let presignedUrlHelper: PresignedUrlHelper;
  let quarantineHelper: QuarantineStorageHelper;

  const mockConfigService = {
    get: jest.fn((key: string, defaultVal?: string) => {
      const config: Record<string, string> = {
        MINIO_ENDPOINT: 'localhost',
        MINIO_PORT: '9000',
        MINIO_USE_SSL: 'false',
        MINIO_ACCESS_KEY: 'minioadmin',
        MINIO_SECRET_KEY: 'minioadmin',
        MINIO_BUCKET_NAME: 'mini-app-assets',
        MINIO_PACKAGE_SUBMISSIONS_BUCKET: 'package-submissions',
        MINIO_SDK_SUBMISSIONS_BUCKET: 'sdk-submissions',
        MINIO_PUBLIC_URL: 'http://localhost:9000',
      };
      return config[key] ?? defaultVal;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        ArchiveSanitizerHelper,
        BucketLifecycleHelper,
        PresignedUrlHelper,
        QuarantineStorageHelper,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    sanitizerHelper = module.get<ArchiveSanitizerHelper>(ArchiveSanitizerHelper);
    bucketLifecycleHelper = module.get<BucketLifecycleHelper>(BucketLifecycleHelper);
    presignedUrlHelper = module.get<PresignedUrlHelper>(PresignedUrlHelper);
    quarantineHelper = module.get<QuarantineStorageHelper>(QuarantineStorageHelper);
  });

  it('should be defined and initialize bucket configurations', () => {
    expect(service).toBeDefined();
    expect(service.assetsBucket).toBe('mini-app-assets');
    expect(service.packageSubmissionsBucket).toBe('package-submissions');
    expect(service.sdkSubmissionsBucket).toBe('sdk-submissions');
  });

  describe('License Management', () => {
    it('returns license status correctly', () => {
      const status = service.getLicenseStatus();
      expect(status.configured).toBe(false);
      expect(status.licenseType).toBe('Community / Free Edition');
      expect(status.bucket).toBe('mini-app-assets');
    });

    it('updates license key and masks it', () => {
      const status = service.setAistorLicense('AIStor-Secret-Key-1234567890');
      expect(status.configured).toBe(true);
      expect(status.licenseType).toBe('MinIO AIStor Enterprise');
      expect(status.maskedKey).toContain('AIStor');
      expect(status.maskedKey).toContain('7890');
    });
  });

  describe('ArchiveSanitizerHelper', () => {
    it('sanitizes buffer and handles non-zip buffers gracefully', () => {
      const raw = Buffer.from('hello world plain text');
      const result = sanitizerHelper.sanitizePackageArchive(raw);
      expect(result.cleanBuffer).toBeDefined();
      expect(result.isSanitized).toBe(false);
      expect(result.originalSize).toBe(raw.length);
    });

    it('inspects package archive correctly', () => {
      const file = {
        originalname: 'my-app.zip',
        buffer: Buffer.from('mock zip content'),
      } as Express.Multer.File;
      const inspected = sanitizerHelper.inspectPackageArchive(file);
      expect(inspected.success).toBe(true);
      expect(inspected.filename).toBe('my-app.zip');
      expect(inspected.sha256).toBeDefined();
    });
  });

  describe('PresignedUrlHelper', () => {
    it('resolves raw local logo key to presigned url', async () => {
      jest
        .spyOn(presignedUrlHelper, 'getPresignedUrl')
        .mockResolvedValue('http://localhost:9000/mini-app-assets/logo.png?X-Amz-Signature=123');

      const url = await service.resolveLogoUrl('mini-app-assets/my-app/logo.png');
      expect(url).toContain('X-Amz-Signature');
    });

    it('preserves existing presigned url with signature', async () => {
      const existing = 'https://app.fintechcenterfsa.com/minio/mini-app-assets/logo.png?X-Amz-Signature=existing';
      const url = await service.resolveLogoUrl(existing);
      expect(url).toBe(existing);
    });

    it('handles null/undefined logo gracefully', async () => {
      expect(await service.resolveLogoUrl(null)).toBeNull();
      expect(await service.resolveLogoUrl(undefined)).toBeNull();
    });
  });
});
