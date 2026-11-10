import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CapabilityCodeGeneratorService } from './capability-code-generator.service';
import { GitLabProvider } from '../integrations/git/providers/gitlab.provider';
import { CapabilityProposal } from '../capability-proposals/entities/capability-proposal.entity';

const REGISTRY = 'lib/core/miniapp/bridge/capability_handlers.generated.dart';

/** The Super App's handler registry with the given handlers already registered. */
function registry(registered: Array<{ cls: string; file: string }> = []): string {
  return [
    "import 'capability_bridge.dart';",
    '// GENERATED CAPABILITY HANDLER IMPORTS — DO NOT EDIT BY HAND',
    ...registered.map((h) => `import '${h.file}';`),
    '// END GENERATED CAPABILITY HANDLER IMPORTS',
    '',
    'List<CapabilityHandler> generatedCapabilityHandlers() => [',
    '      // GENERATED CAPABILITY HANDLERS — DO NOT EDIT BY HAND',
    ...registered.map((h) => `      ${h.cls}(),`),
    '      // END GENERATED CAPABILITY HANDLERS',
    '    ];',
    '',
  ].join('\n');
}

describe('CapabilityCodeGeneratorService', () => {
  let service: CapabilityCodeGeneratorService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'CODEGEN_TARGET_BRANCH') return 'development';
        if (key === 'MOBILE_GIT_TOKEN') return 'glpat-test-token';
        if (key === 'GITLAB_BASE_URL') return 'https://git.fintechcenterfsa.com';
        if (key === 'CODEGEN_REPO_SLUG') return 'frontend/super-app';
        return null;
      }),
    };
    const mockGitLabProvider = {
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
      expect(service.resolveCapabilityMapping('biometric_auth').android).toEqual(['android.permission.USE_BIOMETRIC']);
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
    it('lists the lines per file with plain labels, including the bridge registration', () => {
      const preview = service.preview('camera', {
        iosUsageDescription: 'Scan identity QR codes',
        flutterPlugin: 'mobile_scanner: ^6.0.0',
      });
      expect(preview.known).toBe(true);
      expect(preview.files.map((f) => f.label).slice(0, 3)).toEqual([
        'Android permission',
        'iOS permission message',
        'Flutter package',
      ]);
      expect(preview.files[0].lines).toEqual(['<uses-permission android:name="android.permission.CAMERA"/>']);
      expect(preview.files[1].lines).toEqual([
        '<key>NSCameraUsageDescription</key>',
        '<string>Scan identity QR codes</string>',
      ]);
      expect(preview.files[3].label).toMatch(/Bridge registration/);
      expect(preview.files[3].lines).toEqual(["import 'handlers/image_handlers.dart';", 'TakePhotoHandler(),']);
      // Standard handler, no manual setup: approval makes it fully available
      expect(preview.manualSteps).toEqual([]);
    });

    it('an unknown capability gets a registration and a handler skeleton to implement', () => {
      const preview = service.preview('teleport');
      expect(preview.known).toBe(false);
      expect(preview.files.map((f) => f.file)).toEqual([REGISTRY, 'lib/core/miniapp/bridge/handlers/teleport_handler.dart']);
      expect(preview.manualSteps[0]).toMatch(/Decide which device permissions/);
      expect(preview.manualSteps[1]).toMatch(/Implement the bridge handler/);
    });

    it('push notifications: Android permission plus the Xcode and Firebase steps', () => {
      const preview = service.preview('push_notifications');
      expect(preview.files[0].lines).toEqual(['<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>']);
      expect(preview.files.some((f) => f.label === 'iOS permission message')).toBe(false);
      const steps = preview.manualSteps.join(' ');
      expect(steps).toMatch(/Implement the bridge handler/);
      expect(steps).toMatch(/Push Notifications/);
      expect(steps).toMatch(/Remote notifications/);
      expect(steps).toMatch(/GoogleService-Info\.plist/);
    });

    it('a built-in capability has nothing to do', () => {
      const preview = service.preview('webview_runtime');
      expect(preview.files).toEqual([]);
      expect(preview.manualSteps).toEqual([]);
      expect(preview.note).toMatch(/built into the Super App/);
    });
  });

  describe('generateCapabilityMr', () => {
    const manifest = '<manifest xmlns:android="x">\n  <application/>\n</manifest>';
    const plist = '<plist><dict>\n\t<key>A</key>\n</dict>\n</plist>';
    const pubspec = 'name: app\ndependencies:\n  flutter:\n    sdk: flutter\n';

    /**
     * Fake GitLab. `files` overrides a file's content by path suffix
     * (null = 404). Handler files are missing unless given.
     */
    function gitlab(overrides: Record<string, () => unknown> = {}, files: Record<string, string | null> = {}) {
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
                : url.includes('/issues')
                  ? 'issue'
                  : 'other';
        calls.push(`${init?.method || 'GET'} ${route}`);
        if (overrides[route]) return Promise.resolve(overrides[route]());
        if (route === 'raw') {
          const file = decodeURIComponent(url.split('/repository/files/')[1].split('/raw')[0]);
          const override = Object.keys(files).find((k) => file.endsWith(k));
          const body =
            override !== undefined
              ? files[override]
              : file.endsWith('AndroidManifest.xml')
                ? manifest
                : file.endsWith('Info.plist')
                  ? plist
                  : file.endsWith('pubspec.yaml')
                    ? pubspec
                    : file.endsWith('capability_handlers.generated.dart')
                      ? registry()
                      : null;
          return Promise.resolve(
            body === null
              ? { ok: false, status: 404, text: () => Promise.resolve('404 File Not Found') }
              : { ok: true, status: 200, text: () => Promise.resolve(body) },
          );
        }
        if (route === 'mr') {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () =>
              Promise.resolve({ web_url: 'https://git.fintechcenterfsa.com/frontend/super-app/-/merge_requests/42', iid: 42 }),
          });
        }
        if (route === 'issue') {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ web_url: 'https://git.fintechcenterfsa.com/frontend/super-app/-/issues/7' }),
          });
        }
        return Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
      });
      global.fetch = fetchMock as any;
      const commitBody = () => {
        const c = fetchMock.mock.calls.find((call: unknown[]) => String(call[0]).includes('/commits'));
        return c ? JSON.parse(c[1].body) : null;
      };
      return { calls, fetchMock, commitBody };
    }

    const proposal = (key: string, metadata: Record<string, unknown> = {}) =>
      ({ id: 'prop-1', capabilityKey: key, status: 'PENDING_REVIEW', metadata }) as unknown as CapabilityProposal;

    beforeEach(() => jest.spyOn(service, 'getSuperAppDir').mockReturnValue(null));

    it('known capability with a standard handler: permissions + registration, fully automatic (no task)', async () => {
      const { calls, commitBody } = gitlab();
      const result = await service.generateCapabilityMr(proposal('get_location'));

      expect(result).toMatchObject({ status: 'created', success: true, targetBranch: 'development' });
      expect(result.mrUrl).toContain('/merge_requests/42');
      expect(result.issueUrl).toBeUndefined();
      expect(result.remainingSteps).toBeUndefined();
      expect(calls).toEqual(['GET raw', 'GET raw', 'GET raw', 'GET raw', 'POST branch', 'POST commit', 'POST mr']);
      const registryAction = commitBody().actions.find((a: any) => a.file_path === REGISTRY);
      expect(registryAction.action).toBe('update');
      expect(registryAction.content).toContain("import 'handlers/get_location_handler.dart';");
      expect(registryAction.content).toMatch(/GetLocationHandler\(\),\n\s+\/\/ END GENERATED CAPABILITY HANDLERS/);
    });

    it('known capability without a standard handler: permissions + skeleton + registration + task', async () => {
      const { calls, fetchMock, commitBody } = gitlab();
      const result = await service.generateCapabilityMr(proposal('bluetooth'));

      expect(result.status).toBe('created');
      expect(result.issueUrl).toContain('/issues/7');
      expect(calls).toEqual([
        'GET raw', 'GET raw', 'GET raw', 'GET raw', 'GET raw',
        'POST branch', 'POST commit', 'POST mr', 'POST issue',
      ]);
      const actions = commitBody().actions;
      const manifestAction = actions.find((a: any) => a.file_path.includes('AndroidManifest'));
      expect(manifestAction.content).toContain('android.permission.BLUETOOTH_SCAN');
      expect(manifestAction.content).toContain('android.permission.BLUETOOTH_CONNECT');
      const skeleton = actions.find((a: any) => a.file_path.endsWith('handlers/bluetooth_handler.dart'));
      expect(skeleton.action).toBe('create');
      expect(skeleton.content).toContain('class BluetoothHandler extends CapabilityHandler');
      expect(skeleton.content).toContain('bool get implemented => false;');
      const mrCall = fetchMock.mock.calls.find((c: unknown[]) => String(c[0]).includes('/merge_requests'));
      expect(JSON.parse(mrCall[1].body).description).toContain('Still to do by hand');
    });

    it('unknown capability: skeleton + registration + task to decide permissions and implement', async () => {
      const { calls, fetchMock, commitBody } = gitlab();
      const result = await service.generateCapabilityMr(proposal('teleport'));

      expect(result.status).toBe('created');
      expect(calls).toEqual(['GET raw', 'GET raw', 'POST branch', 'POST commit', 'POST mr', 'POST issue']);
      expect(commitBody().actions.map((a: any) => a.file_path)).toEqual([
        REGISTRY,
        'lib/core/miniapp/bridge/handlers/teleport_handler.dart',
      ]);
      const issueCall = fetchMock.mock.calls.find((c: unknown[]) => String(c[0]).includes('/issues'));
      const description = JSON.parse(issueCall[1].body).description;
      expect(description).toContain('- [ ] Decide which device permissions');
      expect(description).toContain('- [ ] Implement the bridge handler');
    });

    it('a built-in capability needs nothing at all (not_needed, no GitLab calls)', async () => {
      const { calls } = gitlab();
      const result = await service.generateCapabilityMr(proposal('webview_runtime'));
      expect(result.status).toBe('not_needed');
      expect(calls).toEqual([]);
    });

    it('everything already in place and no manual work: not_needed, no branch, no task', async () => {
      const { calls } = gitlab({}, {
        'pubspec.yaml': 'dependencies:\n  flutter_secure_storage: ^11.2.0\n',
        'capability_handlers.generated.dart': registry([
          { cls: 'SecureStorageHandler', file: 'handlers/secure_storage_handler.dart' },
        ]),
      });
      const result = await service.generateCapabilityMr(proposal('secure_storage'));
      expect(result.status).toBe('not_needed');
      expect(calls).toEqual(['GET raw', 'GET raw']);
    });

    it('files all in place but manual work remains: only a task (needs_work)', async () => {
      const { calls } = gitlab({}, {
        'AndroidManifest.xml': '<manifest><uses-permission android:name="android.permission.POST_NOTIFICATIONS"/></manifest>',
        'pubspec.yaml': 'dependencies:\n  firebase_messaging: ^15.1.0\n',
        'capability_handlers.generated.dart': registry([
          { cls: 'PushNotificationsHandler', file: 'handlers/push_notifications_handler.dart' },
        ]),
        'handlers/push_notifications_handler.dart': 'class PushNotificationsHandler {}',
      });
      const result = await service.generateCapabilityMr(proposal('push_notifications'));
      expect(result.status).toBe('needs_work');
      expect(result.issueUrl).toContain('/issues/7');
      expect(calls.filter((c) => c.startsWith('POST'))).toEqual(['POST issue']);
    });

    it('fails clearly when the handler registry markers are missing', async () => {
      gitlab({}, { 'capability_handlers.generated.dart': '// no markers here' });
      const result = await service.generateCapabilityMr(proposal('get_location'));
      expect(result.status).toBe('failed');
      expect(result.error).toMatch(/handler markers are missing/);
    });

    it('keeps the merge request link when only the issue could not be created', async () => {
      gitlab({ issue: () => ({ ok: false, status: 403, text: () => Promise.resolve('forbidden') }) });
      const result = await service.generateCapabilityMr(proposal('nfc')); // has a manual Xcode step
      expect(result.status).toBe('failed');
      expect(result.mrUrl).toContain('/merge_requests/42');
      expect(result.error).toContain('code change is ready');
    });

    it('reports a GitLab failure clearly instead of claiming success', async () => {
      gitlab({ branch: () => ({ ok: false, status: 403, text: () => Promise.resolve('{"message":"403 Forbidden"}') }) });
      const result = await service.generateCapabilityMr(proposal('nfc'));
      expect(result).toMatchObject({ status: 'failed', success: false });
      expect(result.error).toContain('HTTP 403');
      expect(result.mrUrl).toBeUndefined();
    });

    it('reports an unreachable repository with the network cause', async () => {
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
      const result = await service.generateCapabilityMr(proposal('get_location'));
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
