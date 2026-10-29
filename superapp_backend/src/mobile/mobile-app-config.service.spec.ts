import { Logger } from '@nestjs/common';
import {
  MOBILE_APP_CONFIG_KEY,
  MobileAppConfigService,
  inspectMobileAppConfig,
  sanitizeMobileAppConfig,
} from './mobile-app-config.service';

const DEFAULTS = {
  ios: { minVersion: '0.0.0', latestVersion: '0.0.0', storeUrl: null },
  android: { minVersion: '0.0.0', latestVersion: '0.0.0', storeUrl: null },
  updateMessage: { en: null, km: null },
  legal: {
    privacyPolicyUrl: { en: null, km: null },
    termsUrl: { en: null, km: null },
  },
};

describe('sanitizeMobileAppConfig', () => {
  it('passes a valid config through', () => {
    const cfg = sanitizeMobileAppConfig({
      ios: {
        minVersion: '1.0.0',
        latestVersion: '1.0.6',
        storeUrl: 'https://apps.apple.com/app/id1',
      },
      android: {
        minVersion: '1.0',
        latestVersion: '2',
        storeUrl: 'https://play.google.com/store/apps/details?id=x',
      },
      updateMessage: {
        en: ' Please update ',
        km: '???????????????????????????????????????????????????????????????',
      },
      legal: {
        privacyPolicyUrl: {
          en: 'https://fsa.gov.kh/privacy',
          km: 'https://fsa.gov.kh/km/privacy',
        },
        termsUrl: { en: 'https://fsa.gov.kh/terms' },
      },
    });
    expect(cfg.ios).toEqual({
      minVersion: '1.0.0',
      latestVersion: '1.0.6',
      storeUrl: 'https://apps.apple.com/app/id1',
    });
    expect(cfg.android.minVersion).toBe('1.0');
    expect(cfg.android.latestVersion).toBe('2');
    expect(cfg.updateMessage).toEqual({
      en: 'Please update',
      km: '???????????????????????????????????????????????????????????????',
    });
    expect(cfg.legal.privacyPolicyUrl.km).toBe('https://fsa.gov.kh/km/privacy');
    expect(cfg.legal.termsUrl).toEqual({
      en: 'https://fsa.gov.kh/terms',
      km: null,
    });
  });

  it('fails open: anything malformed becomes "no update" / null', () => {
    for (const raw of [undefined, null, 'x', 42, [], { ios: 'nope' }]) {
      expect(sanitizeMobileAppConfig(raw)).toEqual(DEFAULTS);
    }
    const cfg = sanitizeMobileAppConfig({
      ios: {
        minVersion: '1.0.0-beta',
        latestVersion: 'latest',
        storeUrl: 'http://insecure.example',
      },
      android: { minVersion: 3, storeUrl: 'javascript:alert(1)' },
      legal: {
        privacyPolicyUrl: { en: 'ftp://x' },
        termsUrl: 'https://not-an-object',
      },
    });
    expect(cfg.ios).toEqual({
      minVersion: '0.0.0',
      latestVersion: '0.0.0',
      storeUrl: null,
    });
    expect(cfg.android).toEqual({
      minVersion: '0.0.0',
      latestVersion: '0.0.0',
      storeUrl: null,
    });
    expect(cfg.legal.privacyPolicyUrl.en).toBeNull();
    expect(cfg.legal.termsUrl).toEqual({ en: null, km: null });
  });

  it('caps update message length', () => {
    const cfg = sanitizeMobileAppConfig({
      updateMessage: { en: 'a'.repeat(600) },
    });
    expect(cfg.updateMessage.en).toHaveLength(500);
  });
});

describe('inspectMobileAppConfig', () => {
  it('returns the same config as sanitizeMobileAppConfig', () => {
    const raw = {
      ios: { minVersion: '1.2.3', storeUrl: 'http://bad' },
      updateMessage: { en: 'Hi' },
    };
    expect(inspectMobileAppConfig(raw).config).toEqual(
      sanitizeMobileAppConfig(raw),
    );
  });

  it('reports nothing for absent, valid or intentionally-default fields', () => {
    expect(inspectMobileAppConfig(undefined).rejected).toEqual([]);
    expect(inspectMobileAppConfig(null).rejected).toEqual([]);
    expect(inspectMobileAppConfig('x').rejected).toEqual([]); // non-object root is reported by the service
    expect(
      inspectMobileAppConfig({ ios: null, android: undefined, legal: null })
        .rejected,
    ).toEqual([]);
    expect(
      inspectMobileAppConfig({
        ios: { minVersion: '0.0.0', latestVersion: '1.0.0', storeUrl: null },
        updateMessage: { en: 'a'.repeat(600), km: null },
        legal: { privacyPolicyUrl: { en: 'https://fsa.gov.kh/privacy' } },
      }).rejected,
    ).toEqual([]);
  });

  it('reports the path of every provided-but-rejected field, never values', () => {
    const { rejected } = inspectMobileAppConfig({
      ios: {
        minVersion: '1.0.0-beta',
        latestVersion: '1.0.0',
        storeUrl: 'http://insecure.example',
      },
      android: { minVersion: 3, latestVersion: '' },
      updateMessage: { en: 42, km: 'ok' },
      legal: {
        privacyPolicyUrl: { en: 'ftp://x', km: 'https://fsa.gov.kh/km' },
        termsUrl: 'https://not-an-object',
      },
    });
    expect(rejected).toEqual([
      'ios.minVersion',
      'ios.storeUrl',
      'android.minVersion',
      'android.latestVersion',
      'updateMessage.en',
      'legal.privacyPolicyUrl.en',
      'legal.termsUrl',
    ]);
  });

  it('reports a provided section that is not an object', () => {
    expect(
      inspectMobileAppConfig({ ios: 'nope', legal: 7, updateMessage: [] })
        .rejected,
    ).toEqual(['ios', 'updateMessage', 'legal']);
  });
});

describe('MobileAppConfigService', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });
  afterEach(() => warn.mockRestore());

  const serviceReturning = (value: unknown) =>
    new MobileAppConfigService({ getSetting: async () => value } as any);

  it('reads the mobile_app_config setting', async () => {
    const keys: string[] = [];
    const svc = new MobileAppConfigService({
      getSetting: async (k: string) => {
        keys.push(k);
        return { ios: { minVersion: '2.0.0' } };
      },
    } as any);
    expect((await svc.get()).ios.minVersion).toBe('2.0.0');
    expect(keys).toEqual([MOBILE_APP_CONFIG_KEY]);
  });

  it('serves defaults when the settings store throws', async () => {
    const svc = new MobileAppConfigService({
      getSetting: async () => {
        throw new Error('db down');
      },
    } as any);
    expect(await svc.get()).toEqual(DEFAULTS);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(MOBILE_APP_CONFIG_KEY),
    );
  });

  it('warns once per process when the setting is absent, not per request', async () => {
    const svc = serviceReturning(undefined);
    expect(await svc.get()).toEqual(DEFAULTS);
    expect(await svc.get()).toEqual(DEFAULTS);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(MOBILE_APP_CONFIG_KEY),
    );

    const nullSvc = serviceReturning(null);
    await nullSvc.get();
    await nullSvc.get();
    expect(warn).toHaveBeenCalledTimes(2); // one more, for the new instance
  });

  it('warns when the setting is not an object', async () => {
    expect(await serviceReturning('oops').get()).toEqual(DEFAULTS);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('not an object'));
  });

  it('warns with the rejected field paths, never their values', async () => {
    const svc = serviceReturning({
      ios: { minVersion: '1.0.0-beta', latestVersion: '1.0.0' },
      android: { minVersion: '1.0.0', storeUrl: 'http://secret.example/store' },
      legal: { termsUrl: 'https://not-an-object' },
    });
    const cfg = await svc.get();
    expect(cfg.ios.minVersion).toBe('0.0.0');
    expect(warn).toHaveBeenCalledTimes(1);
    const msg = String(warn.mock.calls[0][0]);
    expect(msg).toContain(MOBILE_APP_CONFIG_KEY);
    expect(msg).toContain('ios.minVersion');
    expect(msg).toContain('android.storeUrl');
    expect(msg).toContain('legal.termsUrl');
    expect(msg).not.toContain('1.0.0-beta');
    expect(msg).not.toContain('secret.example');
    expect(msg).not.toContain('not-an-object');
  });

  it('warns about the same rejected fields once, again when they change or recur after a valid config', async () => {
    let setting: unknown = { ios: { minVersion: 'bad' } };
    const svc = new MobileAppConfigService({
      getSetting: async () => setting,
    } as any);
    const warned = () => warn.mock.calls.map((c) => String(c[0]));

    await svc.get();
    await svc.get();
    expect(warned()).toHaveLength(1);
    expect(warned()[0]).toContain('ios.minVersion');

    setting = { android: { storeUrl: 'http://bad' } }; // a different bad field
    await svc.get();
    await svc.get();
    expect(warned()).toHaveLength(2);
    expect(warned()[1]).toContain('android.storeUrl');
    expect(warned()[1]).not.toContain('ios.minVersion');

    setting = {
      android: { storeUrl: 'https://play.google.com/store/apps/details?id=x' },
    }; // valid again
    await svc.get();
    expect(warned()).toHaveLength(2);

    setting = { android: { storeUrl: 'http://bad' } }; // the same bad field recurs
    await svc.get();
    await svc.get();
    expect(warned()).toHaveLength(3);
    expect(warned()[2]).toContain('android.storeUrl');
  });

  it('logs nothing for a fully valid config', async () => {
    const svc = serviceReturning({
      ios: {
        minVersion: '1.0.0',
        latestVersion: '1.0.6',
        storeUrl: 'https://apps.apple.com/app/id1',
      },
      android: {
        minVersion: '1.0',
        latestVersion: '2',
        storeUrl: 'https://play.google.com/store/apps/details?id=x',
      },
      updateMessage: {
        en: 'Please update',
        km: '???????????????????????????????????????????????????????????????',
      },
      legal: {
        privacyPolicyUrl: {
          en: 'https://fsa.gov.kh/privacy',
          km: 'https://fsa.gov.kh/km/privacy',
        },
        termsUrl: {
          en: 'https://fsa.gov.kh/terms',
          km: 'https://fsa.gov.kh/km/terms',
        },
      },
    });
    await svc.get();
    await svc.get();
    expect(warn).not.toHaveBeenCalled();
  });
});
