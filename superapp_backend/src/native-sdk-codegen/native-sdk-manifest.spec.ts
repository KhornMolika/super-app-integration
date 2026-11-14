import { BUILD_CANDIDATE_STATUSES } from './build-inclusion';
import { NativeSdkCodegenService } from './native-sdk-codegen.service';

function serviceWith(apps: any[]) {
  const repo = { find: jest.fn(async () => apps) };
  const config = {
    get: (k: string) => ({ NEXUS_BASE_URL: 'https://app.fintechcenterfsa.com/nexus/' } as Record<string, string>)[k],
  };
  const svc = new NativeSdkCodegenService(repo as any, config as any, {} as any, {} as any);
  return { svc, repo };
}

const spa = (over: Record<string, any> = {}) => ({
  appId: 'ma_spa',
  integrationMethod: 'NATIVE_SDK',
  lifecycleStatus: 'TESTING',
  integrationConfig: {
    androidPackageName: 'com.fintech.vendor.spa',
    androidObjectName: 'SpaBookingSdk',
    androidMavenGroupId: 'com.fintech.vendor',
    androidMavenArtifactId: 'spa-booking-sdk',
    androidMavenVersion: '1.0.0',
    androidNexusMavenUrl: 'https://app.fintechcenterfsa.com/nexus/repository/maven-sdk-hosted/x.aar',
  },
  ...over,
});

describe('NativeSdkCodegenService.buildManifest', () => {
  it('lists the Nexus repository and each published SDK', async () => {
    const { svc, repo } = serviceWith([spa()]);
    const m = await svc.buildManifest();
    expect(m).toEqual({
      repositories: ['https://app.fintechcenterfsa.com/nexus/repository/maven-sdk-hosted/'],
      dependencies: ['com.fintech.vendor:spa-booking-sdk:1.0.0'],
      iosPods: [],
      skipped: [],
    });
    // Only apps that belong in a build; archived/rejected/draft are not asked for
    const where = (repo.find.mock.calls[0] as any)[0].where;
    expect(where.integrationMethod).toBe('NATIVE_SDK');
    expect(where.appStatus._value).toEqual(BUILD_CANDIDATE_STATUSES);
  });

  it('skips, with a reason, an SDK not published to Nexus or with bad coordinates', async () => {
    const { svc } = serviceWith([
      spa({ appId: 'a', integrationConfig: { ...spa().integrationConfig, androidNexusMavenUrl: undefined } }),
      spa({ appId: 'b', integrationConfig: { ...spa().integrationConfig, androidMavenVersion: '1.0"; evil' } }),
    ]);
    const m = await svc.buildManifest();
    expect(m.dependencies).toEqual([]);
    expect(m.skipped).toEqual([
      { appId: 'a', reason: 'Android SDK not published to Nexus yet' },
      { appId: 'b', reason: 'invalid characters in Maven coordinates' },
    ]);
  });

  it('leaves out iOS-only SDKs without complaint and lists each coordinate once', async () => {
    const { svc } = serviceWith([
      spa({ appId: 'ios', integrationConfig: { iosModuleName: 'Spa', iosTypeName: 'Spa', iosNexusZipUrl: 'https://n/Spa/1.0.0/Spa.xcframework.zip' } }),
      spa({ appId: 'x' }),
      spa({ appId: 'y' }),
    ]);
    const m = await svc.buildManifest();
    expect(m.dependencies).toEqual(['com.fintech.vendor:spa-booking-sdk:1.0.0']);
    expect(m.skipped).toEqual([]);
  });

  it('lists published iOS pods by their podspec, and skips unpublished ones', async () => {
    const ios = (appId: string, extra: Record<string, any>) =>
      spa({ appId, integrationConfig: { iosModuleName: 'SpaKit', iosTypeName: 'SpaBookingSDK', ...extra } });
    const { svc } = serviceWith([
      ios('pub', { iosVersion: '2.1.0', iosNexusZipUrl: 'https://app.fintechcenterfsa.com/nexus/repository/raw-sdk-artifacts/SpaKit/2.1.0/SpaKit.xcframework.zip' }),
      ios('unpub', {}),
    ]);
    const m = await svc.buildManifest();
    expect(m.iosPods).toEqual([
      {
        name: 'SpaKit',
        podspecUrl: 'https://app.fintechcenterfsa.com/nexus/repository/cocoapods-specs/Specs/SpaKit/2.1.0/SpaKit.podspec',
      },
    ]);
    expect(m.skipped).toEqual([{ appId: 'unpub', reason: 'iOS SDK not published to Nexus yet' }]);
  });

  it('skips an iOS module name that is not a valid identifier', async () => {
    const { svc } = serviceWith([
      spa({ appId: 'bad', integrationConfig: { iosModuleName: 'Spa Kit', iosTypeName: 'X', iosNexusZipUrl: 'https://n/x.zip' } }),
    ]);
    const m = await svc.buildManifest();
    expect(m.iosPods).toEqual([]);
    expect(m.skipped[0].appId).toBe('bad');
  });
});
