import { integrationConfigFor, normalizeIntegrationMethod } from './integration-config';

describe('integration config by method', () => {
  it('reads the method whatever its case and spacing', () => {
    expect(normalizeIntegrationMethod(' flutter_package ')).toBe('FLUTTER_PACKAGE');
    expect(normalizeIntegrationMethod('WEBVIEW')).toBe('WEBVIEW');
    expect(normalizeIntegrationMethod('PWA')).toBeNull();
    expect(normalizeIntegrationMethod(undefined)).toBeNull();
  });

  it('gives the config typed for its method, and null for another method', () => {
    const app = { integrationMethod: 'flutter_package', integrationConfig: { gitUrl: 'git@x:a/b.git', commitSha: 'a'.repeat(40) } };
    const flutter = integrationConfigFor(app, 'FLUTTER_PACKAGE');
    expect(flutter?.commitSha).toBe('a'.repeat(40));
    expect(integrationConfigFor(app, 'WEBVIEW')).toBeNull();
  });

  it('null without a config or an app', () => {
    expect(integrationConfigFor({ integrationMethod: 'WEBVIEW', integrationConfig: null }, 'WEBVIEW')).toBeNull();
    expect(integrationConfigFor(null, 'DEEP_LINK')).toBeNull();
  });
});
