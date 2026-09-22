import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NativeSdkCodegenService } from './native-sdk-codegen.service';
import { GitlabMrService } from './gitlab-mr.service';
import { GitLabProvider } from '../integrations/git/providers/gitlab.provider';
import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { NATIVE_SDK_TARGET_FILES } from './renderers';

const IOS_ZIP =
  'http://nexus.test:8081/repository/raw-sdk-artifacts/PermitCheckSDK/1.2.0/PermitCheckSDK.xcframework.zip';
const AAR =
  'http://nexus.test:8081/repository/maven-sdk-hosted/com/fsa/sdk/permit-check-sdk/1.0.0/permit-check-sdk-1.0.0.aar';

const APP_DELEGATE = [
  'import UIKit',
  '// === GENERATED NATIVE SDK IMPORTS — DO NOT EDIT ===',
  '// === END GENERATED NATIVE SDK IMPORTS ===',
  '// === GENERATED NATIVE SDK HANDLERS — DO NOT EDIT ===',
  '// === END GENERATED NATIVE SDK HANDLERS ===',
].join('\n');
const PODFILE = [
  '# === GENERATED NATIVE SDK SOURCES — DO NOT EDIT ===',
  '# === END GENERATED NATIVE SDK SOURCES ===',
  '# === GENERATED NATIVE SDK PODS — DO NOT EDIT ===',
  '# === END GENERATED NATIVE SDK PODS ===',
].join('\n');
const GRADLE = [
  '// === GENERATED NATIVE SDK SOURCES — DO NOT EDIT ===',
  '// === END GENERATED NATIVE SDK SOURCES ===',
  '// === GENERATED NATIVE SDK DEPS — DO NOT EDIT ===',
  '// === END GENERATED NATIVE SDK DEPS ===',
].join('\n');

const files = NATIVE_SDK_TARGET_FILES;
const baselineFiles: Record<string, string> = {
  [files.appDelegate]: APP_DELEGATE,
  [files.mainActivity]: APP_DELEGATE,
  [files.podfile]: PODFILE,
  [files.gradle]: GRADLE,
};

function makeApp(overrides: Partial<MiniApp> = {}): MiniApp {
  return {
    appId: 'permit_check',
    integrationMethod: 'NATIVE_SDK',
    status: 'APPROVED',
    integrationConfig: {
      iosModuleName: 'PermitCheckSDK',
      iosTypeName: 'PermitCheck',
      androidPackageName: 'com.dspvendor.permit',
      androidObjectName: 'PermitCheck',
      androidMavenGroupId: 'com.fsa.sdk',
      androidMavenArtifactId: 'permit-check-sdk',
      androidMavenVersion: '1.0.0',
      iosNexusZipUrl: IOS_ZIP,
      androidNexusMavenUrl: AAR,
    },
    ...overrides,
  } as MiniApp;
}

describe('NativeSdkCodegenService', () => {
  let service: NativeSdkCodegenService;
  let miniappFind: jest.Mock;
  let getFileContent: jest.Mock;
  let resolveCommitSha: jest.Mock;
  let openMrForChanges: jest.Mock;
  let fetchMock: jest.Mock;

  async function setup(
    apps: MiniApp[],
    fileContents: Record<string, string> = baselineFiles,
    extraConfig: Record<string, string> = {},
  ) {
    miniappFind = jest.fn().mockResolvedValue(apps);
    getFileContent = jest
      .fn()
      .mockImplementation((_s: string, path: string) =>
        path in fileContents
          ? Promise.resolve(fileContents[path])
          : Promise.reject(new Error(`File '${path}' not found`)),
      );
    resolveCommitSha = jest.fn().mockResolvedValue('sha-123');
    openMrForChanges = jest.fn().mockResolvedValue({
      status: 'opened',
      prUrl: 'https://gitlab.com/acme/mobile-super-app/-/merge_requests/7',
      mrIid: 7,
    });
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    (global as any).fetch = fetchMock;

    const config: Record<string, string> = {
      CODEGEN_REPO_SLUG: 'acme/mobile-super-app',
      CODEGEN_BASE_BRANCH: 'main',
      NEXUS_BASE_URL: 'http://nexus.test:8081',
      NEXUS_ADMIN_USER: 'admin',
      NEXUS_ADMIN_PASSWORD: 'secret',
      ...extraConfig,
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NativeSdkCodegenService,
        {
          provide: getRepositoryToken(MiniApp),
          useValue: { find: miniappFind },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((k: string) => config[k]) },
        },
        {
          provide: GitLabProvider,
          useValue: { getFileContent, resolveCommitSha },
        },
        { provide: GitlabMrService, useValue: { openMrForChanges } },
      ],
    }).compile();
    service = module.get(NativeSdkCodegenService);
  }

  it('renders all 8 regions into the 4 repo-root-relative files and opens a merge request', async () => {
    await setup([makeApp()]);

    const { changedFiles, prUrl } = await service.regenerate();

    expect(prUrl).toBe(
      'https://gitlab.com/acme/mobile-super-app/-/merge_requests/7',
    );
    expect(changedFiles.size).toBe(4);
    expect([...changedFiles.keys()].sort()).toEqual(
      Object.values(files).sort(),
    );
    for (const path of changedFiles.keys()) {
      expect(path.startsWith('dps_mobile_app/')).toBe(false);
    }
    expect(resolveCommitSha).toHaveBeenCalledWith(
      'acme/mobile-super-app',
      'main',
    );
    expect(getFileContent).toHaveBeenCalledWith(
      'acme/mobile-super-app',
      files.podfile,
      'sha-123',
    );
    const podfile = changedFiles.get(files.podfile)!;
    expect(podfile).toContain(
      "pod 'PermitCheckSDK', :podspec => 'http://nexus.test:8081/repository/cocoapods-specs/Specs/PermitCheckSDK/1.2.0/PermitCheckSDK.podspec'",
    );
    expect(podfile).not.toContain("source 'http://nexus.test");
    const gradle = changedFiles.get(files.gradle)!;
    expect(gradle).toContain(
      'http://nexus.test:8081/repository/maven-sdk-hosted/',
    );
    expect(gradle).toContain(
      'implementation("com.fsa.sdk:permit-check-sdk:1.0.0")',
    );
    expect(changedFiles.get(files.appDelegate)).toContain(
      'import PermitCheckSDK',
    );
    expect(changedFiles.get(files.mainActivity)).toContain(
      'import com.dspvendor.permit.PermitCheck',
    );
    expect(openMrForChanges).toHaveBeenCalledWith(changedFiles, 'sha-123');
  });

  it('selects APPROVED and ACTIVE NATIVE_SDK apps', async () => {
    await setup([makeApp()]);
    await service.regenerate();
    const where = miniappFind.mock.calls[0][0].where;
    expect(where.integrationMethod).toBe('NATIVE_SDK');
    expect(where.status.value).toEqual(['APPROVED', 'ACTIVE']);
  });

  it('returns no changed files when the generated content already matches', async () => {
    await setup([makeApp()]);
    const first = await service.regenerate();
    await setup([makeApp()], {
      ...baselineFiles,
      ...Object.fromEntries(first.changedFiles),
    });

    const { changedFiles } = await service.regenerate();
    expect(changedFiles.size).toBe(0);
  });

  it('HEAD-checks each artifact with credentials on the Nexus origin only', async () => {
    await setup([makeApp()]);
    await service.regenerate();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([u]) => u)).toContain(
      'http://nexus.test:8081/repository/cocoapods-specs/Specs/PermitCheckSDK/1.2.0/PermitCheckSDK.podspec',
    );
    for (const [, init] of fetchMock.mock.calls) {
      expect(init.method).toBe('HEAD');
      expect(init.redirect).toBe('manual');
      expect(init.headers.Authorization).toMatch(/^Basic /);
    }
  });

  it('rejects an artifact URL on a foreign host without contacting it', async () => {
    await setup([
      makeApp({
        integrationConfig: {
          ...makeApp().integrationConfig,
          iosNexusZipUrl: 'http://evil.example.com/x.zip',
        },
      } as any),
    ]);
    await expect(service.regenerate()).rejects.toThrow(
      /not under the configured Nexus/,
    );
    expect(fetchMock.mock.calls.map(([u]) => u)).not.toContain(
      'http://evil.example.com/x.zip',
    );
    expect(openMrForChanges).not.toHaveBeenCalled();
  });

  it('lists every unreachable artifact in the error', async () => {
    await setup([makeApp()]);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const err = await service.regenerate().catch((e) => e);
    expect(err.message).toMatch(/permit_check iOS zip.*HTTP 404/);
    expect(err.message).toMatch(/permit_check Android AAR.*ECONNREFUSED/);
    expect(openMrForChanges).not.toHaveBeenCalled();
  });

  it('throws naming the app when a required config field is blank', async () => {
    await setup([makeApp({ integrationConfig: { iosModuleName: '' } } as any)]);
    await expect(service.regenerate()).rejects.toThrow(
      /permit_check.*iosModuleName/,
    );
  });

  it('throws when a NATIVE_SDK app has no integrationConfig', async () => {
    await setup([makeApp({ integrationConfig: null } as any)]);
    await expect(service.regenerate()).rejects.toThrow(
      /has no integrationConfig/i,
    );
  });

  it('throws when an unsafe vendor value reaches the renderers', async () => {
    await setup([
      makeApp({
        integrationConfig: {
          ...makeApp().integrationConfig,
          iosModuleName: 'Bad Name',
        },
      } as any),
    ]);
    await expect(service.regenerate()).rejects.toThrow(/iosModuleName/);
  });

  it('throws when two appIds collide on the same generated identifier', async () => {
    await setup([
      makeApp({ appId: 'parking.pass' }),
      makeApp({ appId: 'parking_pass' }),
    ]);
    await expect(service.regenerate()).rejects.toThrow(
      /both generate the identifier/i,
    );
  });

  it('throws when CODEGEN_REPO_SLUG is missing', async () => {
    await setup([makeApp()], baselineFiles, { CODEGEN_REPO_SLUG: '' });
    await expect(service.regenerate()).rejects.toThrow(/CODEGEN_REPO_SLUG/);
  });

  it('treats a redirect response as a failure', async () => {
    await setup([makeApp()]);
    fetchMock.mockResolvedValue({ ok: false, status: 302 });
    await expect(service.regenerate()).rejects.toThrow(/HTTP 302/);
  });

  it('serialises concurrent regenerate() calls', async () => {
    await setup([makeApp()]);
    const events: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    let call = 0;
    openMrForChanges.mockImplementation(async () => {
      const n = ++call;
      events.push(`start${n}`);
      if (n === 1) await gate;
      events.push(`end${n}`);
      return { status: 'opened', prUrl: `u${n}` };
    });

    const a = service.regenerate();
    const b = service.regenerate();
    await new Promise((r) => setTimeout(r, 20));
    expect(events).toEqual(['start1']); // second run has not started
    release();
    await Promise.all([a, b]);
    expect(events).toEqual(['start1', 'end1', 'start2', 'end2']);
  });

  it('keeps the queue alive after a failed run', async () => {
    await setup([makeApp()]);
    openMrForChanges.mockRejectedValueOnce(new Error('boom'));
    await expect(service.regenerate()).rejects.toThrow('boom');
    await expect(service.regenerate()).resolves.toBeDefined();
  });
});
