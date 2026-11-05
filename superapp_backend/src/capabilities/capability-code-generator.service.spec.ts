import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CapabilityCodeGeneratorService } from './capability-code-generator.service';
import { GitLabProvider } from '../integrations/git/providers/gitlab.provider';
import { CapabilityProposal } from '../capability-proposals/entities/capability-proposal.entity';

describe('CapabilityCodeGeneratorService', () => {
  let service: CapabilityCodeGeneratorService;
  let mockConfigService: any;
  let mockGitLabProvider: any;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'CODEGEN_TARGET_BRANCH') return 'development';
        if (key === 'MOBILE_GIT_TOKEN') return 'glpat-test-token';
        if (key === 'GITLAB_BASE_URL') return 'https://git.fintechcenterfsa.com';
        if (key === 'CODEGEN_REPO_SLUG') return 'frontend/super-app';
        return null;
      }),
    };

    mockGitLabProvider = {
      getProjectApiUrl: jest.fn().mockReturnValue('https://git.fintechcenterfsa.com/api/v4/projects/frontend%2Fsuper-app'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CapabilityCodeGeneratorService,
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

    service = module.get<CapabilityCodeGeneratorService>(
      CapabilityCodeGeneratorService,
    );
  });

  describe('resolveCapabilityMapping', () => {
    it('should derive android permission, iOS plist key, and description from key conventions', () => {
      const mapping = service.resolveCapabilityMapping('nfc_reader');
      expect(mapping.android).toBe('android.permission.NFC_READER');
      expect(mapping.iosKey).toBe('NSNfc_readerUsageDescription');
      expect(mapping.iosDescription).toContain('nfc_reader access is required');
    });

    it('should respect custom metadata overrides when provided in proposal', () => {
      const mapping = service.resolveCapabilityMapping('bluetooth', {
        androidPermission: 'android.permission.BLUETOOTH_SCAN',
        iosPlistKey: 'NSBluetoothAlwaysUsageDescription',
        iosUsageDescription: 'Connect to POS card readers via Bluetooth BLE',
        flutterPlugin: 'flutter_blue_plus: ^1.31.0',
      });

      expect(mapping.android).toBe('android.permission.BLUETOOTH_SCAN');
      expect(mapping.iosKey).toBe('NSBluetoothAlwaysUsageDescription');
      expect(mapping.iosDescription).toBe('Connect to POS card readers via Bluetooth BLE');
      expect(mapping.defaultPlugin).toBe('flutter_blue_plus: ^1.31.0');
    });
  });

  describe('preview', () => {
    it('should return preview diffs for AndroidManifest, Info.plist, and pubspec.yaml', () => {
      const preview = service.preview('camera', {
        androidPermission: 'android.permission.CAMERA',
        iosPlistKey: 'NSCameraUsageDescription',
        iosUsageDescription: 'Scan identity QR codes',
        flutterPlugin: 'mobile_scanner: ^6.0.0',
      });

      expect(preview.capabilityKey).toBe('camera');
      expect(preview.androidManifestDiff).toContain('<uses-permission android:name="android.permission.CAMERA"/>');
      expect(preview.iosPlistDiff).toContain('<key>NSCameraUsageDescription</key>');
      expect(preview.iosPlistDiff).toContain('<string>Scan identity QR codes</string>');
      expect(preview.pubspecDiff).toContain('mobile_scanner: ^6.0.0');
    });
  });

  describe('generateCapabilityMr in containerized GitOps mode', () => {
    it('should fall back cleanly to remote GitLab API when no local directory is mounted', async () => {
      jest.spyOn(service, 'getSuperAppDir').mockReturnValue(null);

      // Mock global fetch for GitLab API calls
      const mockFetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/repository/branches')) {
          return Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({ name: 'capa/branch' }) });
        }
        if (url.includes('/raw')) {
          return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('<manifest></manifest>') });
        }
        if (url.includes('/repository/commits')) {
          return Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({ id: 'commit123' }) });
        }
        if (url.includes('/merge_requests')) {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ web_url: 'https://git.fintechcenterfsa.com/frontend/super-app/-/merge_requests/42' }),
          });
        }
        return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') });
      });

      global.fetch = mockFetch;

      const mockProposal = {
        id: 'prop-1',
        capabilityKey: 'bluetooth',
        status: 'PENDING',
        metadata: {
          androidPermission: 'android.permission.BLUETOOTH_CONNECT',
        },
      } as unknown as CapabilityProposal;

      const result = await service.generateCapabilityMr(mockProposal);

      expect(result.success).toBe(true);
      expect(result.branchName).toContain('capa/add-bluetooth');
      expect(result.mrUrl).toBe('https://git.fintechcenterfsa.com/frontend/super-app/-/merge_requests/42');
      expect(result.targetBranch).toBe('development');
    });
  });
});
