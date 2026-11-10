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
      skipped: [],
    });
    // Only apps that belong in a build; archived/rejected/draft are not asked for
    const where = (repo.find.mock.calls[0] as any)[0].where;
    expect(where.integrationMethod).toBe('NATIVE_SDK');
    expect(where.lifecycleStatus._value).toEqual(['APPROVED', 'BUILDING', 'BUILD_FAILED', 'TESTING', 'ACTIVE']);
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
      spa({ appId: 'ios', integrationConfig: { iosModuleName: 'Spa', iosTypeName: 'Spa' } }),
      spa({ appId: 'x' }),
      spa({ appId: 'y' }),
    ]);
    const m = await svc.buildManifest();
    expect(m.dependencies).toEqual(['com.fintech.vendor:spa-booking-sdk:1.0.0']);
    expect(m.skipped).toEqual([]);
  });
});
