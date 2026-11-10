import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { ArtifactScannerService } from './artifact-scanner.service';
import { findSwiftEntryTypes, readJavaClassHeader } from './java-class-header';

// Built from superapp-miniapps/ma_nativesdk_spa/android (object SpaBookingSdk : FSAMiniAppNativeEntry)
const SPA_AAR = fs.readFileSync(path.join(__dirname, '__fixtures__', 'spa-booking-sdk-1.0.0.aar'));

function classesOf(aar: Buffer): Record<string, Buffer> {
  const jar = new AdmZip(new AdmZip(aar).getEntry('classes.jar')!.getData());
  return Object.fromEntries(jar.getEntries().map((e) => [e.entryName, e.getData()]));
}

/** An .aar whose classes.jar holds the given class files. */
function aarWith(classes: Record<string, Buffer>): Buffer {
  const jar = new AdmZip();
  for (const [name, data] of Object.entries(classes)) jar.addFile(name, data);
  const aar = new AdmZip();
  aar.addFile('AndroidManifest.xml', Buffer.from('<manifest package="com.fintech.vendor.spa"/>'));
  aar.addFile('classes.jar', jar.toBuffer());
  return aar.toBuffer();
}

describe('readJavaClassHeader', () => {
  const classes = classesOf(SPA_AAR);

  it('reads the Kotlin object: its name, contract interface and INSTANCE field', () => {
    const h = readJavaClassHeader(classes['com/fintech/vendor/spa/SpaBookingSdk.class'])!;
    expect(h.className).toBe('com.fintech.vendor.spa.SpaBookingSdk');
    expect(h.interfaces).toContain('com.fsasuperapp.miniapp.native_sdk.FSAMiniAppNativeEntry');
    expect(h.hasStaticInstance).toBe(true);
  });

  it('an Activity does not implement the contract', () => {
    const h = readJavaClassHeader(classes['com/fintech/vendor/spa/SpaBookingActivity.class'])!;
    expect(h.interfaces).not.toContain('com.fsasuperapp.miniapp.native_sdk.FSAMiniAppNativeEntry');
    expect(h.hasStaticInstance).toBe(false);
  });

  it('rejects data that is not a class file', () => {
    expect(readJavaClassHeader(Buffer.from('not a class'))).toBeNull();
  });
});

describe('ArtifactScannerService.scanAar entry detection', () => {
  const scanner = new ArtifactScannerService();
  const classes = classesOf(SPA_AAR);

  it('finds the entry object by the contract, not by its name', async () => {
    const r = await scanner.scanAar(SPA_AAR, 'spa-booking-sdk-1.0.0.aar');
    expect(r.androidEntryDetection).toBe('contract');
    expect(r.androidEntryCandidates).toEqual(['com.fintech.vendor.spa.SpaBookingSdk']);
    expect(r.androidPackageName).toBe('com.fintech.vendor.spa');
    expect(r.androidObjectName).toBe('SpaBookingSdk');
  });

  it('lists every class when more than one implements the contract', async () => {
    const sdk = classes['com/fintech/vendor/spa/SpaBookingSdk.class'];
    const aar = aarWith({
      'com/fintech/vendor/spa/SpaBookingSdk.class': sdk,
      'com/fintech/vendor/spa/Copy.class': sdk, // same bytes: same contract, same name inside
    });
    const r = await scanner.scanAar(aar, 'two-1.0.0.aar');
    expect(r.androidEntryDetection).toBe('contract');
    expect(r.androidEntryCandidates!.length).toBeGreaterThanOrEqual(1);
  });

  it('nothing implements the contract: falls back to a guess, marked as such', async () => {
    const aar = aarWith({
      'com/fintech/vendor/spa/SpaBookingActivity.class': classes['com/fintech/vendor/spa/SpaBookingActivity.class'],
    });
    const r = await scanner.scanAar(aar, 'spa-1.0.0.aar');
    expect(r.androidEntryCandidates).toEqual([]);
    expect(['guess', 'none']).toContain(r.androidEntryDetection);
  });
});

describe('findSwiftEntryTypes', () => {
  it('finds conforming classes, structs and extensions, with module names', () => {
    const text = `
      import FSASuperAppMiniAppNativeSDK
      public class SpaBooking : FSASuperAppMiniAppNativeSDK.FSAMiniAppNativeProtocol {
      }
      public struct Helper : Swift.Codable {}
      extension SpaSDK.Loyalty : FSASuperAppMiniAppNativeSDK.FSAMiniAppNativeProtocol {}
      public enum Other : Swift.Error {}
    `;
    expect(findSwiftEntryTypes(text).sort()).toEqual(['Loyalty', 'SpaBooking']);
  });

  it('finds nothing when no type conforms', () => {
    expect(findSwiftEntryTypes('public class A : NSObject {}')).toEqual([]);
  });
});

import { nativeEntryClassProblems } from '../miniapps/helpers/native-sdk-config.helper';

describe('nativeEntryClassProblems', () => {
  const base = {
    androidEntryDetection: 'contract',
    androidEntryCandidates: ['com.fintech.vendor.spa.SpaBookingSdk'],
  };

  it('accepts the detected class', () => {
    expect(nativeEntryClassProblems({ ...base, androidPackageName: 'com.fintech.vendor.spa', androidObjectName: 'SpaBookingSdk' })).toEqual([]);
  });

  it('names the right class when a wrong one is stated', () => {
    const p = nativeEntryClassProblems({ ...base, androidPackageName: 'com.fintech.vendor.spa', androidObjectName: 'SpaBooking' });
    expect(p[0]).toContain('does not implement FSAMiniAppNativeEntry. Found: com.fintech.vendor.spa.SpaBookingSdk');
  });

  it('does not block when the file could only be guessed', () => {
    expect(nativeEntryClassProblems({ androidEntryDetection: 'guess', androidPackageName: 'a', androidObjectName: 'B' })).toEqual([]);
  });
});
