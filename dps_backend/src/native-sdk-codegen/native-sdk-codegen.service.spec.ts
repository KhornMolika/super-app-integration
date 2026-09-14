import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NativeSdkCodegenService } from './native-sdk-codegen.service';
import { GitHubProvider } from '../integrations/git/providers/github.provider';
import { MiniApp } from '../miniapps/entities/miniapp.entity';

const APP_DELEGATE = [
  'header line',
  '// GENERATED NATIVE SDK IMPORTS —',
  '// END GENERATED NATIVE SDK IMPORTS',
  '// GENERATED NATIVE SDK HANDLERS —',
  '// END GENERATED NATIVE SDK HANDLERS',
  'footer line',
].join('\n');

const MAIN_ACTIVITY = APP_DELEGATE; // same marker shape is fine for this test
const PODFILE = [
  '# GENERATED NATIVE SDK PODS —',
  '# END GENERATED NATIVE SDK PODS',
].join('\n');
const GRADLE = [
  '// GENERATED NATIVE SDK DEPS —',
  '// END GENERATED NATIVE SDK DEPS',
].join('\n');

function makeApprovedNativeSdkApp(overrides: Partial<MiniApp> = {}): MiniApp {
  return {
    appId: 'permit_check',
    integrationMethod: 'NATIVE_SDK',
    status: 'APPROVED',
    integrationConfig: {
      iosModuleName: 'PermitCheckSDK',
      iosTypeName: 'PermitCheck',
      iosArtifactFilename: 'PermitCheckSDK.xcframework',
      androidPackageName: 'com.dspvendor.permit',
      androidObjectName: 'PermitCheck',
      androidArtifactFilename: 'permit-check-sdk-1.0.0.aar',
    },
    ...overrides,
  } as MiniApp;
}

describe('NativeSdkCodegenService', () => {
  let service: NativeSdkCodegenService;
  let miniappFind: jest.Mock;
  let getFileContent: jest.Mock;

  async function setup(apps: MiniApp[], fileContents: Record<string, string>) {
    miniappFind = jest.fn().mockResolvedValue(apps);
    getFileContent = jest.fn().mockImplementation((_slug: string, path: string) => {
      if (path in fileContents) return Promise.resolve(fileContents[path]);
      return Promise.reject(new Error(`File '${path}' not found`));
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NativeSdkCodegenService,
        { provide: getRepositoryToken(MiniApp), useValue: { find: miniappFind } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'CODEGEN_REPO_SLUG') return 'acme/dsp-poc';
              if (key === 'CODEGEN_BASE_BRANCH') return 'main';
              return undefined;
            }),
          },
        },
        { provide: GitHubProvider, useValue: { getFileContent } },
      ],
    }).compile();

    service = module.get<NativeSdkCodegenService>(NativeSdkCodegenService);
  }

  const filePaths = {
    ios: 'dps_mobile_app/ios/Runner/AppDelegate.swift',
    android: 'dps_mobile_app/android/app/src/main/kotlin/com/example/dsp_mobile/MainActivity.kt',
    podfile: 'dps_mobile_app/ios/Podfile',
    gradle: 'dps_mobile_app/android/app/build.gradle.kts',
    artifact: 'vendor-artifacts/PermitCheckSDK.xcframework',
    androidArtifact: 'vendor-artifacts/permit-check-sdk-1.0.0.aar',
  };

  const baselineFiles = {
    [filePaths.ios]: APP_DELEGATE,
    [filePaths.android]: MAIN_ACTIVITY,
    [filePaths.podfile]: PODFILE,
    [filePaths.gradle]: GRADLE,
    [filePaths.artifact]: 'binary-not-read-as-text-but-present',
    [filePaths.androidArtifact]: 'binary-not-read-as-text-but-present',
  };

  it('returns the changed files for a newly approved vendor', async () => {
    await setup([makeApprovedNativeSdkApp()], baselineFiles);

    const { changedFiles } = await service.regenerate();

    expect(changedFiles.size).toBe(4);
    expect(changedFiles.get(filePaths.ios)).toContain('import PermitCheckSDK');
    expect(changedFiles.get(filePaths.android)).toContain(
      'import com.dspvendor.permit.PermitCheck',
    );
    expect(changedFiles.get(filePaths.podfile)).toContain("pod 'PermitCheckSDK'");
    expect(changedFiles.get(filePaths.gradle)).toContain('permit-check-sdk-1.0.0.aar');
  });

  it('returns an empty map when the generated content already matches', async () => {
    // Pre-populate the "current" files with exactly what regeneration would produce.
    await setup([makeApprovedNativeSdkApp()], baselineFiles);
    const first = await service.regenerate();

    const alreadyGenerated = { ...baselineFiles };
    for (const [path, content] of first.changedFiles) {
      alreadyGenerated[path] = content;
    }
    await setup([makeApprovedNativeSdkApp()], alreadyGenerated);

    const { changedFiles } = await service.regenerate();
    expect(changedFiles.size).toBe(0);
  });

  it('throws when a vendor artifact is missing from the repo', async () => {
    const filesWithoutArtifact = { ...baselineFiles };
    delete filesWithoutArtifact[filePaths.artifact];
    await setup([makeApprovedNativeSdkApp()], filesWithoutArtifact);

    await expect(service.regenerate()).rejects.toThrow(/missing artifact/i);
  });

  it('throws when a required integrationConfig field is blank', async () => {
    await setup(
      [makeApprovedNativeSdkApp({ integrationConfig: { iosModuleName: '' } } as any)],
      baselineFiles,
    );

    await expect(service.regenerate()).rejects.toThrow(/iosModuleName/);
  });

  it('throws when two appIds collide on the same generated identifier', async () => {
    await setup(
      [
        makeApprovedNativeSdkApp({ appId: 'parking.pass' }),
        makeApprovedNativeSdkApp({ appId: 'parking_pass' }),
      ],
      baselineFiles,
    );

    await expect(service.regenerate()).rejects.toThrow(/both generate the identifier/i);
  });
});
