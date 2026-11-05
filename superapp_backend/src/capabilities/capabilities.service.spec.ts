import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CapabilitiesService } from './capabilities.service';
import { CapabilityDefinition } from './entities/capability-definition.entity';
import { GitLabProvider } from '../integrations/git/providers/gitlab.provider';

describe('CapabilitiesService', () => {
  let service: CapabilitiesService;
  let mockRepository: any;
  let mockConfigService: any;
  let mockGitLabProvider: any;

  function createMockCapability(overrides: Partial<CapabilityDefinition> = {}): CapabilityDefinition {
    return {
      id: '123e4567-e89b-12d3-a456-426614174000',
      key: 'camera_access',
      name: 'Camera & Document Capture',
      description: 'Capture documents and images',
      category: 'MEDIA_HARDWARE',
      isActive: true,
      minSuperAppVersion: '1.0.0',
      metadata: {
        source: 'gitlab:main',
        commitSha: 'a1b2c3d4e5f6',
        requiredPermissions: ['camera'],
        platform: 'Cross-Platform',
        implementationType: 'FLUTTER_PLUGIN',
        providerPackage: 'image_picker: ^1.1.2',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as CapabilityDefinition;
  }

  beforeEach(async () => {
    mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        andWhere: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[createMockCapability()], 1]),
        getOne: jest.fn().mockResolvedValue(createMockCapability()),
      }),
      findOne: jest.fn(),
      find: jest.fn().mockImplementation(() => Promise.resolve([createMockCapability()])),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'gen-uuid' })),
      save: jest.fn().mockImplementation(async (entity) => entity),
      merge: jest.fn().mockImplementation((orig, patch) => ({ ...orig, ...patch })),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'MOBILE_GIT_REPO_URL') return 'https://git.fintechcenterfsa.com/frontend/super-app.git';
        return null;
      }),
    };

    mockGitLabProvider = {
      getFileContent: jest.fn(),
      resolveCommitSha: jest.fn().mockResolvedValue('a1b2c3d4e5f6'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CapabilitiesService,
        {
          provide: getRepositoryToken(CapabilityDefinition),
          useValue: mockRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: GitLabProvider,
          useValue: mockGitLabProvider,
        },
      ],
    }).compile();

    service = module.get<CapabilitiesService>(CapabilitiesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated capability definitions with active filter', async () => {
      const result = await service.findAll({ page: 1, limit: 10, isActive: true });
      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('cap');
    });

    it('should filter by category when provided and not ALL', async () => {
      const qb = mockRepository.createQueryBuilder();
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ category: 'HARDWARE' });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'LOWER(cap.category) = LOWER(:category)',
        { category: 'HARDWARE' },
      );
    });

    it('should filter by search query with sanitized LIKE escaping', async () => {
      const qb = mockRepository.createQueryBuilder();
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ search: 'camera' });
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LIKE :pattern'),
        { pattern: '%camera%' },
      );
    });
  });

  describe('findOne & findByKey', () => {
    it('should retrieve capability by UUID', async () => {
      const mockCap = createMockCapability();
      mockRepository.findOne.mockResolvedValueOnce(mockCap);
      const result = await service.findOne('123e4567-e89b-12d3-a456-426614174000');
      expect(result).toEqual(mockCap);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
      });
    });

    it('should retrieve capability by string key if not UUID', async () => {
      const mockCap = createMockCapability();
      mockRepository.createQueryBuilder.mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockCap),
      });

      const result = await service.findOne('camera_access');
      expect(result).toEqual(mockCap);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('perm');
    });

    it('should throw NotFoundException if capability does not exist', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);
      mockRepository.createQueryBuilder.mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne('non_existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('syncCapabilitiesFromGitLab', () => {
    const validPubspec = `
name: super_app
version: 1.2.0
dependencies:
  flutter:
    sdk: flutter
  image_picker: ^1.1.2
  local_auth: ^2.3.0
  geolocator: ^13.0.1
  mobile_scanner: ^6.0.0
`;
    const validManifest = `
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <uses-permission android:name="android.permission.CAMERA" />
  <uses-permission android:name="android.permission.USE_BIOMETRIC" />
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
</manifest>
`;
    const validPlist = `
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSCameraUsageDescription</key>
  <string>Scan documents and QR codes</string>
  <key>NSLocationWhenInUseUsageDescription</key>
  <string>Provide branch locator services</string>
</dict>
</plist>
`;

    it('should fetch pubspec, manifest, plist and upsert detected capabilities', async () => {
      mockGitLabProvider.getFileContent
        .mockResolvedValueOnce(validPubspec)
        .mockResolvedValueOnce(validManifest)
        .mockResolvedValueOnce(validPlist);

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.find.mockResolvedValue([createMockCapability()]);

      const result = await service.syncCapabilitiesFromGitLab();

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBeGreaterThan(0);
      expect(result.commitSha).toBe('a1b2c3d4e5f6');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should reconcile and deactivate capabilities missing in GitLab source', async () => {
      mockGitLabProvider.getFileContent
        .mockResolvedValueOnce(validPubspec)
        .mockResolvedValueOnce(validManifest)
        .mockResolvedValueOnce(validPlist);

      const obsoleteCapability = createMockCapability({
        id: 'obsolete-id',
        key: 'deprecated_legacy_nfc',
        name: 'Legacy NFC',
        isActive: true,
        metadata: {},
      });

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.find.mockResolvedValue([createMockCapability(), obsoleteCapability]);

      const result = await service.syncCapabilitiesFromGitLab();

      expect(result.deactivatedCount).toBe(2);
      expect(obsoleteCapability.isActive).toBe(false);
      expect((obsoleteCapability.metadata as any).status).toBe('Deprecated');
    });

    it('should throw BadRequestException if GitLab fails to fetch pubspec.yaml', async () => {
      mockGitLabProvider.getFileContent.mockRejectedValueOnce(
        new Error('404 Not Found from GitLab API'),
      );

      await expect(service.syncCapabilitiesFromGitLab()).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getCapabilities', () => {
    it('should return active dynamic capabilities from PostgreSQL registry', async () => {
      const activeCap = createMockCapability();
      mockRepository.find.mockResolvedValue([activeCap]);

      const caps = await service.getCapabilities();

      expect(caps).toHaveLength(1);
      expect(caps[0].key).toBe('camera_access');
      expect(caps[0].platform).toBe('Cross-Platform');
    });

    it('should automatically deactivate legacy mock capabilities', async () => {
      const mockLegacySeed = createMockCapability({
        id: 'legacy-camera-id',
        key: 'camera',
        name: 'Legacy Mock Camera',
        isActive: true,
        metadata: {
          source: 'seed-mock',
          providerPackage: 'camera',
        },
      });

      const legitimateCap = createMockCapability();
      mockRepository.find.mockResolvedValue([mockLegacySeed, legitimateCap]);

      const caps = await service.getCapabilities();

      expect(mockLegacySeed.isActive).toBe(false);
      expect(mockRepository.save).toHaveBeenCalledWith(mockLegacySeed);
      expect(caps).toHaveLength(1);
      expect(caps[0].id).toBe(legitimateCap.id);
    });

    it('should invoke syncCapabilitiesFromGitLab if database registry is empty', async () => {
      mockRepository.find.mockResolvedValue([]);
      const legitimateCap = createMockCapability();
      jest.spyOn(service, 'syncCapabilitiesFromGitLab').mockResolvedValueOnce({
        success: true,
        syncedCount: 1,
        deactivatedCount: 0,
        targetBranch: 'main',
        repoUrl: 'https://git.fintechcenterfsa.com/frontend/super-app.git',
        syncedAt: new Date().toISOString(),
        capabilities: [legitimateCap as any],
      });

      const caps = await service.getCapabilities();
      expect(service.syncCapabilitiesFromGitLab).toHaveBeenCalled();
      expect(caps).toHaveLength(1);
    });
  });
});
