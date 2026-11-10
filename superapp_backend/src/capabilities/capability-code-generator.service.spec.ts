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
        { provide: ConfigService, useValue: mockConfigService },
        { provide: GitLabProvider, useValue: mockGitLabProvider },
      ],
    }).compile();

    service = module.get<CapabilityCodeGeneratorService>(CapabilityCodeGeneratorService);
  });

  afterEach(() => {
    delete process.env.LOCAL_BUILDS_ENABLED;
    jest.restoreAllMocks();
  });

  describe('resolveCapabilityMapping', () => {
    it('uses the real platform permissions for known capabilities and other names', () => {
      const nfc = service.resolveCapabilityMapping('nfc_reader');
      expect(nfc.android).toEqual(['android.permission.NFC']);
      expect(nfc.ios.map((e) => e.key)).toEqual(['NFCReaderUsageDescription']);
      expect(nfc.known).toBe(true);

      const loc = service.resolveCapabilityMapping('gps');
      expect(loc.android).toEqual([
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
      ]);
      expect(loc.ios[0].key).toBe('NSLocationWhenInUseUsageDescription');

      expect(service.resolveCapabilityMapping('biometric_auth').android).toEqual([
        'android.permission.USE_BIOMETRIC',
      ]);
    });

    it('invents nothing for an unknown capability', () => {
      const m = service.resolveCapabilityMapping('teleport');
      expect(m).toMatchObject({ android: [], ios: [], known: false, source: 'none' });
      expect(m.plugin).toBeUndefined();
    });

    it('respects explicit platform fields in the proposal metadata', () => {
      const mapping = service.resolveCapabilityMapping('bluetooth', {
        androidPermission: 'android.permission.BLUETOOTH_SCAN',
        iosPlistKey: 'NSBluetoothAlwaysUsageDescription',
        iosUsageDescription: 'Connect to POS card readers via Bluetooth BLE',
        flutterPlugin: 'flutter_blue_plus: ^1.31.0',
      });
      expect(mapping.android).toEqual(['android.permission.BLUETOOTH_SCAN']);
      expect(mapping.ios).toEqual([
        { key: 'NSBluetoothAlwaysUsageDescription', description: 'Connect to POS card readers via Bluetooth BLE' },
      ]);
      expect(mapping.plugin).toBe('flutter_blue_plus: ^1.31.0');
      expect(mapping.source).toBe('metadata');
    });
  });

  describe('preview', () => {
    it('lists the lines per file with plain labels', () => {
      const preview = service.preview('camera', {
        iosUsageDescription: 'Scan identity QR codes',
        flutterPlugin: 'mobile_scanner: ^6.0.0',
      });
      expect(preview.known).toBe(true);
      expect(preview.files.map((f) => f.label)).toEqual([
        'Android permission',
        'iOS permission message',
        'Flutter package',
      ]);
      expect(preview.files[0].lines).toEqual(['<uses-permission android:name="android.permission.CAMERA"/>']);
      expect(preview.files[1].lines).toEqual([
        '<key>NSCameraUsageDescription</key>',
        '<string>Scan identity QR codes</string>',
      ]);
      expect(preview.files[2].lines).toEqual(['mobile_scanner: ^6.0.0']);
    });

    it('explains that nothing is added for an unknown capability', () => {
      const preview = service.preview('teleport');
      expect(preview).toMatchObject({ known: false, files: [] });
      expect(preview.note).toMatch(/nothing will be added/);
    });
  });

  describe('generateCapabilityMr', () => {
    const manifest = '<manifest xmlns:android="x">\n  <application/>\n</manifest>';
    const plist = '<plist><dict>\n\t<key>A</key>\n</dict>\n</plist>';
    const pubspec = 'name: app\ndependencies:\n  flutter:\n    sdk: flutter\n';

    function gitlab(overrides: Record<string, () => unknown> = {}) {
      const calls: string[] = [];
      const fetchMock = jest.fn().mockImplementation((url: string, init?: { method?: string }) => {
        const route = url.includes('/raw')
          ? 'raw'
          : url.includes('/repository/branches')
            ? 'branch'
            : url.includes('/repository/commits')
              ? 'commit'
              : url.includes('/merge_requests')
                ? 'mr'
                : 'other';
        calls.push(`${init?.method || 'GET'} ${route}`);
        if (overrides[route]) return Promise.resolve(overrides[route]());
        if (route === 'raw') {
          const body = url.includes('AndroidManifest') ? manifest : url.includes('Info.plist') ? plist : pubspec;
          return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(body) });
        }
        if (route === 'mr') {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () =>
              Promise.resolve({ web_url: 'https://git.fintechcenterfsa.com/frontend/super-app/-/merge_requests/42', iid: 42 }),
          });
        }
        return Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
      });
      global.fetch = fetchMock as any;
      return { calls, fetchMock };
    }

    const proposal = (key: string, metadata: Record<string, unknown> = {}) =>
      ({ id: 'prop-1', capabilityKey: key, status: 'PENDING_REVIEW', metadata }) as unknown as CapabilityProposal;

    it('adds the real permissions on a branch and opens a review request', async () => {
      jest.spyOn(service, 'getSuperAppDir').mockReturnValue(null);
      const { calls, fetchMock } = gitlab();

      const result = await service.generateCapabilityMr(proposal('bluetooth'));

      expect(result).toMatchObject({
        status: 'created',
        success: true,
        targetBranch: 'development',
        mrUrl: 'https://git.fintechcenterfsa.com/frontend/super-app/-/merge_requests/42',
      });
      expect(result.branchName).toContain('capa/add-bluetooth');
      expect(result.filesModified).toEqual([
        'android/app/src/main/AndroidManifest.xml',
        'ios/Runner/Info.plist',
        'pubspec.yaml',
      ]);
      expect(calls).toEqual(['GET raw', 'GET raw', 'GET raw', 'POST branch', 'POST commit', 'POST mr']);
      const commitCall = fetchMock.mock.calls.find((c: unknown[]) => String(c[0]).includes('/commits'));
      const commitBody = JSON.parse(commitCall[1].body);
      const manifestAction = commitBody.actions.find((a: any) => a.file_path.includes('AndroidManifest'));
      expect(manifestAction.content).toContain('android.permission.BLUETOOTH_SCAN');
      expect(manifestAction.content).toContain('android.permission.BLUETOOTH_CONNECT');
    });

    it('returns not_needed without touching GitLab for an unknown capability', async () => {
      jest.spyOn(service, 'getSuperAppDir').mockReturnValue(null);
      const { calls } = gitlab();
      const result = await service.generateCapabilityMr(proposal('teleport'));
      expect(result.status).toBe('not_needed');
      expect(calls).toEqual([]);
    });

    it('returns not_needed (no branch) when the Super App already has everything', async () => {
      jest.spyOn(service, 'getSuperAppDir').mockReturnValue(null);
      const { calls } = gitlab({
        raw: () => ({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              '<manifest><uses-permission android:name="android.permission.RECORD_AUDIO"/></manifest>' +
                '<plist><dict><key>NSMicrophoneUsageDescription</key></dict></plist>',
            ),
        }),
      });
      const result = await service.generateCapabilityMr(proposal('microphone'));
      expect(result.status).toBe('not_needed');
      expect(calls.some((c) => c.startsWith('POST'))).toBe(false);
    });

    it('reports a GitLab failure clearly instead of claiming success', async () => {
      jest.spyOn(service, 'getSuperAppDir').mockReturnValue(null);
      gitlab({ branch: () => ({ ok: false, status: 403, text: () => Promise.resolve('{"message":"403 Forbidden"}') }) });
      const result = await service.generateCapabilityMr(proposal('nfc'));
      expect(result).toMatchObject({ status: 'failed', success: false });
      expect(result.error).toContain('HTTP 403');
      expect(result.mrUrl).toBeUndefined();
    });

    it('reports an unreachable repository with the network cause', async () => {
      jest.spyOn(service, 'getSuperAppDir').mockReturnValue(null);
      global.fetch = jest
        .fn()
        .mockRejectedValue(Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } })) as any;
      const result = await service.generateCapabilityMr(proposal('nfc'));
      expect(result.status).toBe('failed');
      expect(result.error).toContain('ECONNREFUSED');
    });

    it('never touches a local checkout unless LOCAL_BUILDS_ENABLED=true', async () => {
      jest.spyOn(service, 'getSuperAppDir').mockReturnValue('/some/local/super-app');
      const local = jest.spyOn(service as any, 'generateLocally');
      gitlab();
      const result = await service.generateCapabilityMr(proposal('nfc'));
      expect(local).not.toHaveBeenCalled();
      expect(result.status).toBe('created');
    });
  });

  describe('listTargetBranches', () => {
    it('lists repository branches, hiding the generated capa/ branches', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([{ name: 'main', default: true }, { name: 'development' }, { name: 'capa/add-nfc-x' }]),
      }) as any;
      expect(await service.listTargetBranches()).toEqual({
        branches: ['development', 'main'],
        defaultBranch: 'main',
        source: 'gitlab',
      });
    });

    it('falls back to defaults when the repository cannot be reached', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;
      expect(await service.listTargetBranches()).toMatchObject({
        source: 'fallback',
        branches: ['development', 'main'],
      });
    });
  });
});
