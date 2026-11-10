import { BadRequestException } from '@nestjs/common';
import { MiniappsService } from './miniapps.service';

// The approval gate only reads the app; no other dependency is needed.
const gate = (app: any) =>
  (Object.create(MiniappsService.prototype) as any).assertNativeSdkReady(app);

const androidOnly = {
  androidPackageName: 'com.fintech.vendor.spa',
  androidObjectName: 'SpaBookingSdk',
  androidMinioKey: 'pending/spa/1.0.0/spa.aar',
};

describe('Native SDK approval gate', () => {
  it('ignores other integration methods', () => {
    expect(gate({ integrationMethod: 'WEBVIEW', integrationConfig: {} })).toBe(false);
  });

  it('approves an Android-only SDK with its AAR', () => {
    expect(gate({ integrationMethod: 'NATIVE_SDK', integrationConfig: androidOnly })).toBe(true);
  });

  it('approves an iOS-only SDK already on Nexus', () => {
    expect(
      gate({
        integrationMethod: 'NATIVE_SDK',
        integrationConfig: { iosTypeName: 'SpaSDK', iosNexusZipUrl: 'https://nexus/x.zip' },
      }),
    ).toBe(true);
  });

  it('refuses when no platform has a file', () => {
    expect(() => gate({ integrationMethod: 'NATIVE_SDK', integrationConfig: { androidPackageName: 'com.x' } })).toThrow(
      /at least one platform/,
    );
  });

  it('refuses when a declared platform has no file', () => {
    expect(() =>
      gate({ integrationMethod: 'NATIVE_SDK', integrationConfig: { ...androidOnly, iosTypeName: 'SpaSDK' } }),
    ).toThrow(BadRequestException);
    expect(() =>
      gate({ integrationMethod: 'NATIVE_SDK', integrationConfig: { ...androidOnly, iosTypeName: 'SpaSDK' } }),
    ).toThrow(/missing for: iOS/);
  });

  it('uses the pending revision when there is one', () => {
    expect(
      gate({
        integrationMethod: 'WEBVIEW',
        integrationConfig: {},
        pendingRevision: { integrationMethod: 'NATIVE_SDK', integrationConfig: androidOnly },
      }),
    ).toBe(true);
  });
});
