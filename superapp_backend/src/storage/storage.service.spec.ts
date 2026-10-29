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
        MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY || 'test-storage-access-key',
        MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY || 'test-storage-secret-key',
        MINIO_BUCKET_NAME: 'mini-app-assets',
        MINIO_PACKAGE_SUBMISSIONS_BUCKET: 'package-submissions',
        MINIO_SDK_SUBMISSIONS_BUCKET: 'sdk-submissions',
        MINIO_BACKOFFICE_USER_MEDIA_BUCKET: 'backoffice-user-media',
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
    expect(service.backofficeUserMediaBucket).toBe('backoffice-user-media');
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

  describe('Backoffice User Avatar Management', () => {
    const pngMagicHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

    it('successfully uploads valid PNG avatar and prunes existing avatars in user folder', async () => {
      const putSpy = jest.spyOn((service as any).minioClient, 'putObject').mockResolvedValue(undefined as any);
      const removeSpy = jest.spyOn((service as any).minioClient, 'removeObject').mockResolvedValue(undefined as any);

      // Mock listObjectsV2 stream
      const mockStream = {
        on: jest.fn((event: string, cb: Function) => {
          if (event === 'data') cb({ name: 'avatars/user-123/old-avatar.png' });
          if (event === 'end') cb();
          return mockStream;
        }),
      };
      jest.spyOn((service as any).minioClient, 'listObjectsV2').mockReturnValue(mockStream as any);

      const result = await service.uploadBackofficeUserAvatar('user-123', {
        buffer: pngMagicHeader,
        size: pngMagicHeader.length,
        originalname: 'profile.png',
        mimetype: 'image/png',
      });

      expect(removeSpy).toHaveBeenCalledWith('backoffice-user-media', 'avatars/user-123/old-avatar.png');
      expect(result.url).toMatch(/^\/api\/backoffice-user-media\/avatars\/user-123\//);
      expect(result.key).toMatch(/^avatars\/user-123\/[a-f0-9-]+\.png$/);
      expect(putSpy).toHaveBeenCalledWith(
        'backoffice-user-media',
        expect.stringMatching(/^avatars\/user-123\//),
        pngMagicHeader,
        pngMagicHeader.length,
        { 'Content-Type': 'image/png' },
      );
    });

    it('rejects uploads exceeding 2MB limit', async () => {
      const bigBuffer = Buffer.alloc(2 * 1024 * 1024 + 1);
      await expect(
        service.uploadBackofficeUserAvatar('user-123', {
          buffer: bigBuffer,
          size: bigBuffer.length,
        }),
      ).rejects.toThrow('Avatar image must not exceed 2 MB');
    });

    it('rejects non-image payloads', async () => {
      const invalidBuffer = Buffer.from('this is plain text, not an image');
      await expect(
        service.uploadBackofficeUserAvatar('user-123', {
          buffer: invalidBuffer,
          size: invalidBuffer.length,
        }),
      ).rejects.toThrow('Only JPEG, PNG, or WebP images are permitted');
    });

    it('successfully deletes avatar object from backoffice-user-media', async () => {
      const removeSpy = jest.spyOn((service as any).minioClient, 'removeObject').mockResolvedValue(undefined as any);

      await service.deleteBackofficeUserAvatar('/api/backoffice-user-media/avatars/user-123/abc.png');
      expect(removeSpy).toHaveBeenCalledWith('backoffice-user-media', 'avatars/user-123/abc.png');
    });
  });
});
