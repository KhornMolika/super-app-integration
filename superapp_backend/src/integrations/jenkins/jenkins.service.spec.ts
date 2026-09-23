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

describe('JenkinsService.triggerMiniAppValidation modular pipelines', () => {
  const make = () =>
    new JenkinsService({
      get: (k: string, d?: string) =>
        ({ JENKINS_URL: 'http://jenkins.test', BACKEND_URL: 'http://backend.test' })[k] ?? d,
    } as any);

  let fetchSpy: jest.SpyInstance;
  beforeEach(() => {
    fetchSpy = jest
      .spyOn(global, 'fetch' as any)
      .mockResolvedValue({ status: 201, ok: true, text: async () => '' } as any);
  });
  afterEach(() => jest.restoreAllMocks());

  it('routes WEBVIEW integration method to miniapp-validation-webview job', async () => {
    const svc = make();
    jest.spyOn(svc as any, 'getCrumb').mockResolvedValue(null);
    const res = await svc.triggerWebViewValidation({
      miniAppId: 'app-web-1',
      targetUrl: 'https://example.com',
    });
    expect(res.success).toBe(true);
    const callUrl = String(fetchSpy.mock.calls[0][0]);
    expect(callUrl).toContain('/job/miniapp-validation-webview/buildWithParameters');
    expect(callUrl).toContain('MINIAPP_ID=app-web-1');
    expect(callUrl).toContain('INTEGRATION_METHOD=WEBVIEW');
  });

  it('routes FLUTTER_PACKAGE integration method to miniapp-validation-flutter-package job', async () => {
    const svc = make();
    jest.spyOn(svc as any, 'getCrumb').mockResolvedValue(null);
    const res = await svc.triggerPackageValidation({
      miniAppId: 'app-pkg-1',
      packageName: 'test_pkg',
    });
    expect(res.success).toBe(true);
    const callUrl = String(fetchSpy.mock.calls[0][0]);
    expect(callUrl).toContain('/job/miniapp-validation-flutter-package/buildWithParameters');
    expect(callUrl).toContain('PACKAGE_NAME=test_pkg');
  });

  it('routes NATIVE_SDK integration method to miniapp-validation-native-sdk job', async () => {
    const svc = make();
    jest.spyOn(svc as any, 'getCrumb').mockResolvedValue(null);
    const res = await svc.triggerNativeSdkValidation({
      miniAppId: 'app-sdk-1',
      packageName: 'PaymentSdk',
    });
    expect(res.success).toBe(true);
    const callUrl = String(fetchSpy.mock.calls[0][0]);
    expect(callUrl).toContain('/job/miniapp-validation-native-sdk/buildWithParameters');
    expect(callUrl).toContain('INTEGRATION_METHOD=NATIVE_SDK');
  });

  it('routes DEEP_LINK integration method to miniapp-validation-deep-link job', async () => {
    const svc = make();
    jest.spyOn(svc as any, 'getCrumb').mockResolvedValue(null);
    const res = await svc.triggerDeepLinkValidation({
      miniAppId: 'app-link-1',
      urlScheme: 'myapp://',
    });
    expect(res.success).toBe(true);
    const callUrl = String(fetchSpy.mock.calls[0][0]);
    expect(callUrl).toContain('/job/miniapp-validation-deep-link/buildWithParameters');
    expect(callUrl).toContain('URL_SCHEME=myapp%3A%2F%2F');
  });

  it('automatically falls back to master miniapp-validation job when dedicated job returns 404', async () => {
    const svc = make();
    jest.spyOn(svc as any, 'getCrumb').mockResolvedValue(null);

    // First call returns 404 (job not found), second call returns 201 (master job found)
    fetchSpy
      .mockResolvedValueOnce({ status: 404, ok: false, text: async () => 'Job not found' } as any)
      .mockResolvedValueOnce({ status: 201, ok: true, text: async () => 'Created' } as any);

    const res = await svc.triggerMiniAppValidation({
      miniAppId: 'app-fallback-1',
      integrationMethod: 'WEBVIEW',
      targetUrl: 'https://example.com',
    });

    expect(res.success).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(String(fetchSpy.mock.calls[0][0])).toContain('/job/miniapp-validation-webview/buildWithParameters');
    expect(String(fetchSpy.mock.calls[1][0])).toContain('/job/miniapp-validation/buildWithParameters');
  });
});
