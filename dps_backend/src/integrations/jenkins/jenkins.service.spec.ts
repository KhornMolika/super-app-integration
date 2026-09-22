import { JenkinsService } from './jenkins.service';

describe('JenkinsService.triggerSuperAppBuild CODEGEN_MR_IID', () => {
  const make = () =>
    new JenkinsService({
      get: (k: string, d?: string) =>
        ({ JENKINS_URL: 'http://jenkins.test' })[k] ?? d,
    } as any);

  let fetchSpy: jest.SpyInstance;
  beforeEach(() => {
    fetchSpy = jest
      .spyOn(global, 'fetch' as any)
      .mockResolvedValue({ status: 201, ok: true, text: async () => '' } as any);
    const svc: any = make();
    jest.spyOn(svc, 'getCrumb').mockResolvedValue(null);
  });
  afterEach(() => jest.restoreAllMocks());

  const triggerUrl = async (codegenMrIid?: string) => {
    const svc = make();
    jest.spyOn(svc as any, 'getCrumb').mockResolvedValue(null);
    await svc.triggerSuperAppBuild({ releaseVersion: 'v1', codegenMrIid });
    const call = fetchSpy.mock.calls.find((c) =>
      String(c[0]).includes('buildWithParameters'),
    );
    return new URL(String(call![0]));
  };

  it('sends CODEGEN_MR_IID when it is digits', async () => {
    expect((await triggerUrl('57')).searchParams.get('CODEGEN_MR_IID')).toBe('57');
  });

  it('omits it when undefined', async () => {
    expect((await triggerUrl()).searchParams.has('CODEGEN_MR_IID')).toBe(false);
  });

  it.each(['abc', '5 7', '1;rm', '', '12345678901'])(
    'omits a non-numeric or oversized value (%p)',
    async (v) => {
      expect((await triggerUrl(v)).searchParams.has('CODEGEN_MR_IID')).toBe(false);
    },
  );

  describe('API_BASE_URL', () => {
    const makeWith = (env: Record<string, string>) => {
      const svc = new JenkinsService({
        get: (k: string, d?: string) =>
          ({ JENKINS_URL: 'http://jenkins.test', ...env })[k] ?? d,
      } as any);
      jest.spyOn(svc as any, 'getCrumb').mockResolvedValue(null);
      return svc;
    };
    const url = async (svc: JenkinsService, buildType?: string, apiBaseUrl?: string) => {
      await svc.triggerSuperAppBuild({ releaseVersion: 'v1', buildType, apiBaseUrl });
      const call = [...fetchSpy.mock.calls]
        .reverse()
        .find((c) => String(c[0]).includes('buildWithParameters'));
      return new URL(String(call![0]));
    };

    it('sends MOBILE_API_BASE_URL (trailing slash trimmed)', async () => {
      const u = await url(makeWith({ MOBILE_API_BASE_URL: 'https://api.example.com/' }), 'release');
      expect(u.searchParams.get('API_BASE_URL')).toBe('https://api.example.com');
    });

    it('allows http for debug builds only', async () => {
      const svc = makeWith({ MOBILE_API_BASE_URL: 'http://10.0.2.2:3000' });
      expect((await url(svc, 'debug')).searchParams.get('API_BASE_URL')).toBe('http://10.0.2.2:3000');
      expect((await url(svc, 'release')).searchParams.has('API_BASE_URL')).toBe(false);
    });

    it('omits it when unset or malformed', async () => {
      expect((await url(makeWith({}), 'debug')).searchParams.has('API_BASE_URL')).toBe(false);
      for (const bad of ['javascript:alert(1)', 'https://a b', 'https://x";rm', 'ftp://x']) {
        expect((await url(makeWith({}), 'debug', bad)).searchParams.has('API_BASE_URL')).toBe(false);
      }
    });
  });
});
