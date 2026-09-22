import {
  BadGatewayException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { SdkArtifactUploadService } from './sdk-artifact-upload.service';

describe('SdkArtifactUploadService (MinIO Quarantine & Nexus Flow)', () => {
  let scanner: { scanXcframework: jest.Mock; scanAar: jest.Mock };
  let nexus: { putRawAsset: jest.Mock; uploadMavenAar: jest.Mock };
  let storage: {
    uploadSdkArchive: jest.Mock;
    getObjectBuffer: jest.Mock;
    sdkSubmissionsBucket: string;
  };
  let repo: {
    findOne: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let patches: any[];
  let dbConfig: any;
  let service: SdkArtifactUploadService;
  let miniApp: any;
  const buffer = Buffer.from('artifact-bytes');
  const sha = createHash('sha256').update(buffer).digest('hex');

  beforeEach(() => {
    scanner = { scanXcframework: jest.fn(), scanAar: jest.fn() };
    nexus = {
      putRawAsset: jest.fn(
        async (r: string, p: string) => `http://n/repository/${r}/${p}`,
      ),
      uploadMavenAar: jest.fn().mockResolvedValue('http://n/maven/url.aar'),
    };
    storage = {
      uploadSdkArchive: jest.fn().mockImplementation(async (file, appId, version) => ({
        minioKey: `pending/${appId}/${version || 'draft'}/test-${file.originalname}`,
        minioUrl: `http://localhost:9000/sdk-submissions/pending/${appId}/${version || 'draft'}/test-${file.originalname}`,
        sha256: sha,
        filename: file.originalname,
        size: file.buffer.length,
      })),
      getObjectBuffer: jest.fn().mockResolvedValue(buffer),
      sdkSubmissionsBucket: 'sdk-submissions',
    };
    miniApp = {
      id: 'm1',
      name: 'Spa Booking',
      appId: 'spabooking',
      integrationConfig: { keep: 'me' },
    };
    patches = [];
    dbConfig = { ...miniApp.integrationConfig };
    const qb: any = {
      update: jest.fn(() => qb),
      set: jest.fn(() => qb),
      where: jest.fn(() => qb),
      setParameters: jest.fn((p: any) => {
        const patch = JSON.parse(p.patch);
        patches.push(patch);
        dbConfig = { ...dbConfig, ...patch };
        return qb;
      }),
      execute: jest.fn(async () => ({ affected: 1 })),
    };
    repo = {
      findOne: jest.fn().mockResolvedValue(miniApp),
      save: jest.fn(async (x) => x),
      createQueryBuilder: jest.fn(() => qb),
    };
    const config = {
      get: jest.fn().mockImplementation((k: string, d?: string) => d),
    };
    service = new SdkArtifactUploadService(
      scanner as any,
      nexus as any,
      storage as any,
      config as any,
      repo as any,
    );
  });

  describe('STAGE 1: upload() into MinIO quarantine', () => {
    it('uploads iOS xcframework to MinIO and extracts metadata without touching Nexus', async () => {
      scanner.scanXcframework.mockResolvedValue({
        iosModuleName: 'SpaBookingSDK',
        iosTypeName: 'SpaBookingSDKView',
        iosArtifactFilename: 'SpaBookingSDK.xcframework.zip',
        detectedPermissions: ['camera'],
      });

      const res = await service.upload({
        miniAppId: 'm1',
        platform: 'IOS',
        buffer,
        filename: 'SpaBookingSDK.xcframework.zip',
        version: '1.0.0',
      });

      expect(storage.uploadSdkArchive).toHaveBeenCalled();
      expect(nexus.putRawAsset).not.toHaveBeenCalled();
      expect(res.minioKey).toContain('SpaBookingSDK.xcframework.zip');
      expect(res.sha256).toBe(sha);
      expect(res.detectedPermissions).toEqual(['camera']);
      expect(dbConfig.iosMinioKey).toBeDefined();
      expect(dbConfig.iosNexusZipUrl).toBeUndefined(); // Zero bytes to Nexus at upload
    });

    it('uploads Android aar to MinIO and extracts metadata without touching Nexus', async () => {
      scanner.scanAar.mockResolvedValue({
        androidPackageName: 'com.example.vendor',
        androidObjectName: 'VendorSDK',
        androidArtifactFilename: 'vendor-1.0.0.aar',
        androidMavenArtifactId: 'vendor-sdk',
        androidMavenVersion: '1.0.0',
      });

      const res = await service.upload({
        miniAppId: 'm1',
        platform: 'ANDROID',
        buffer,
        filename: 'vendor-1.0.0.aar',
      });

      expect(storage.uploadSdkArchive).toHaveBeenCalled();
      expect(nexus.uploadMavenAar).not.toHaveBeenCalled();
      expect(res.minioKey).toContain('vendor-1.0.0.aar');
      expect(dbConfig.androidMinioKey).toBeDefined();
      expect(dbConfig.androidNexusMavenUrl).toBeUndefined(); // Zero bytes to Nexus at upload
    });

    it('works during registration when miniAppId is "draft"', async () => {
      scanner.scanAar.mockResolvedValue({
        androidPackageName: 'com.example.vendor',
        androidObjectName: 'VendorSDK',
      });

      const res = await service.upload({
        miniAppId: 'draft',
        platform: 'ANDROID',
        buffer,
        filename: 'vendor-1.0.0.aar',
      });

      expect(storage.uploadSdkArchive).toHaveBeenCalled();
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
      expect(res.minioKey).toBeDefined();
    });
  });

  describe('STAGE 3: publishToNexus() on Approval', () => {
    it('promotes quarantined artifacts from MinIO to Nexus and updates integrationConfig', async () => {
      miniApp.integrationConfig = {
        androidMinioKey: 'pending/m1/1.0.0/vendor-1.0.0.aar',
        androidMavenGroupId: 'com.fsa.sdk',
        androidMavenArtifactId: 'vendor-sdk',
        androidMavenVersion: '1.0.0',
        iosMinioKey: 'pending/m1/1.0.0/VendorSDK.xcframework.zip',
        iosModuleName: 'VendorSDK',
        iosVersion: '1.0.0',
      };
      repo.findOne.mockResolvedValue(miniApp);

      const result = await service.publishToNexus('m1');

      expect(storage.getObjectBuffer).toHaveBeenCalledTimes(2);
      expect(nexus.uploadMavenAar).toHaveBeenCalled();
      expect(nexus.putRawAsset).toHaveBeenCalledTimes(2); // xcframework.zip + podspec
      expect(result.androidNexusMavenUrl).toBe('http://n/maven/url.aar');
      expect(result.iosNexusZipUrl).toContain('raw-sdk-artifacts');
      expect(dbConfig.androidNexusMavenUrl).toBe('http://n/maven/url.aar');
      expect(dbConfig.iosNexusZipUrl).toBeDefined();
    });

    it('throws NotFoundException if miniApp does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.publishToNexus('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('wraps Nexus failure in BadGatewayException', async () => {
      miniApp.integrationConfig = {
        androidMinioKey: 'pending/m1/1.0.0/vendor-1.0.0.aar',
        androidMavenGroupId: 'com.fsa.sdk',
        androidMavenArtifactId: 'vendor-sdk',
        androidMavenVersion: '1.0.0',
      };
      repo.findOne.mockResolvedValue(miniApp);
      nexus.uploadMavenAar.mockRejectedValue(new Error('Nexus connection timeout'));

      await expect(service.publishToNexus('m1')).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });
  });

  describe('getStatus()', () => {
    it('reports quarantined when staged in MinIO and published when in Nexus', async () => {
      miniApp.integrationConfig = {
        androidMinioKey: 'pending/m1/1.0.0/vendor.aar',
        iosMinioKey: 'pending/m1/1.0.0/vendor.zip',
        iosNexusZipUrl: 'http://nexus/vendor.zip',
      };
      repo.findOne.mockResolvedValue(miniApp);

      const status = await service.getStatus('m1');
      expect(status.android).toBe('quarantined');
      expect(status.ios).toBe('published');
    });

    it('reports pending when no artifacts are uploaded', async () => {
      miniApp.integrationConfig = {};
      repo.findOne.mockResolvedValue(miniApp);

      const status = await service.getStatus('m1');
      expect(status.android).toBe('pending');
      expect(status.ios).toBe('pending');
    });
  });
});
