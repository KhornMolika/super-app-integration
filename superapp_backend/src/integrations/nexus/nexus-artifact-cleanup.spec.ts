import { NexusIntegrationService } from './nexus-integration.service';

describe('NexusIntegrationService.deleteMiniAppArtifacts', () => {
  const config = {
    get: (key: string, fallback?: string) =>
      ({ NEXUS_BASE_URL: 'http://nexus:8081', NEXUS_ADMIN_PASSWORD: 'pw' } as Record<string, string>)[key] ?? fallback,
  };
  let calls: { method: string; url: string }[];
  let fail = false;

  beforeEach(() => {
    calls = [];
    fail = false;
    global.fetch = jest.fn(async (url: any, init: any = {}) => {
      const method = init.method || 'GET';
      calls.push({ method, url: String(url) });
      if (fail) return { ok: false, status: 500, json: async () => ({}) } as any;
      if (method === 'DELETE') return { ok: true, status: 204 } as any;
      const u = new URL(String(url));
      const id = `${u.searchParams.get('repository')}|${u.searchParams.get('name')}`;
      return { ok: true, status: 200, json: async () => ({ items: [{ id, version: '1.0.0' }], continuationToken: null }) } as any;
    }) as any;
  });

  const svc = () => new NexusIntegrationService(config as any);

  it('looks up and deletes the Flutter package, Android SDK and iOS SDK', async () => {
    const res = await svc().deleteMiniAppArtifacts({
      pubPackage: 'My-Pkg',
      maven: { groupId: 'com.v', artifactId: 'spa' },
      ios: { module: 'Spa', version: '2.0.0' },
    });
    const searches = calls.filter((c) => c.method === 'GET').map((c) => decodeURIComponent(c.url));
    expect(searches).toEqual([
      expect.stringContaining('/service/rest/v1/search?repository=pub-hosted&name=my_pkg'),
      expect.stringContaining('/service/rest/v1/search?repository=maven-sdk-hosted&group=com.v&name=spa'),
      expect.stringContaining('/service/rest/v1/search/assets?repository=raw-sdk-artifacts&name=Spa/2.0.0/Spa.xcframework.zip'),
      expect.stringContaining('/service/rest/v1/search/assets?repository=cocoapods-specs&name=Specs/Spa/2.0.0/Spa.podspec'),
    ]);
    expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(4);
    expect(res.failed).toEqual([]);
    expect(res.removed).toHaveLength(4);
  });

  it('never touches the shared Super App APK repositories', async () => {
    await svc().deleteMiniAppArtifacts({
      pubPackage: 'p',
      maven: { groupId: 'g', artifactId: 'a' },
      ios: { module: 'M', version: '1' },
    });
    expect(calls.some((c) => /apk-(test-builds|releases)/.test(c.url))).toBe(false);
  });

  it('reports a Nexus error instead of throwing', async () => {
    fail = true;
    const res = await svc().deleteMiniAppArtifacts({ maven: { groupId: 'g', artifactId: 'a' } });
    expect(res.removed).toEqual([]);
    expect(res.failed[0]).toContain('HTTP 500');
  });
});
