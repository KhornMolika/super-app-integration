import { Test, TestingModule } from '@nestjs/testing';
import {
  LocalSecurityScannerService,
  getDefaultChecksForMethod,
  buildDynamicValidationStages,
  SECURITY_CHECK_METADATA,
} from './local-security-scanner.service';
import { WebViewSecurityScanner } from './scanners/webview-security.scanner';
import { FlutterPackageSecurityScanner } from './scanners/flutter-package-security.scanner';
import { NativeSdkSecurityScanner } from './scanners/native-sdk-security.scanner';
import { DeepLinkSecurityScanner } from './scanners/deep-link-security.scanner';

describe('LocalSecurityScannerService & 12 Security Engines Catalog', () => {
  let service: LocalSecurityScannerService;
  let webViewScanner: jest.Mocked<WebViewSecurityScanner>;
  let flutterPackageScanner: jest.Mocked<FlutterPackageSecurityScanner>;
  let nativeSdkScanner: jest.Mocked<NativeSdkSecurityScanner>;
  let deepLinkScanner: jest.Mocked<DeepLinkSecurityScanner>;

  beforeEach(async () => {
    const mockScanner = () => ({
      scan: jest.fn().mockResolvedValue(undefined),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalSecurityScannerService,
        { provide: WebViewSecurityScanner, useValue: mockScanner() },
        { provide: FlutterPackageSecurityScanner, useValue: mockScanner() },
        { provide: NativeSdkSecurityScanner, useValue: mockScanner() },
        { provide: DeepLinkSecurityScanner, useValue: mockScanner() },
      ],
    }).compile();

    service = module.get<LocalSecurityScannerService>(
      LocalSecurityScannerService,
    );
    webViewScanner = module.get(WebViewSecurityScanner);
    flutterPackageScanner = module.get(FlutterPackageSecurityScanner);
    nativeSdkScanner = module.get(NativeSdkSecurityScanner);
    deepLinkScanner = module.get(DeepLinkSecurityScanner);
  });

  describe('12 Security Scanner Engines Catalog Verification', () => {
    it('should define all 12 platform security check engines with appropriate tools and icons', () => {
      const expectedEngines = [
        'dependency_scan',
        'secret_scan',
        'sast',
        'sbom',
        'domain_tls_audit',
        'csp_headers_audit',
        'dast_zap',
        'malware_scan',
        'license_compliance',
        'capability_gate',
        'ssrf',
        'ingest',
      ];

      for (const engineId of expectedEngines) {
        const metadata = SECURITY_CHECK_METADATA[engineId];
        expect(metadata).toBeDefined();
        expect(metadata.id).toBe(engineId);
        expect(metadata.tool).toBeTruthy();
        expect(metadata.description).toBeTruthy();
        expect(metadata.methods.length).toBeGreaterThan(0);
      }
    });

    it('should assign SSRF and secret scanning to Web and DeepLink methods', () => {
      expect(SECURITY_CHECK_METADATA.ssrf.methods).toEqual(
        expect.arrayContaining(['WEBVIEW', 'DEEP_LINK']),
      );
      expect(SECURITY_CHECK_METADATA.secret_scan.methods).toEqual(
        expect.arrayContaining([
          'WEBVIEW',
          'FLUTTER_PACKAGE',
          'NATIVE_SDK',
          'DEEP_LINK',
        ]),
      );
    });

    it('should return valid default checks for each integration tier', () => {
      const webviewChecks = getDefaultChecksForMethod('WEBVIEW');
      expect(webviewChecks).toContain('domain_tls_audit');
      expect(webviewChecks).toContain('csp_headers_audit');
      expect(webviewChecks).toContain('dast_zap');

      const flutterChecks = getDefaultChecksForMethod('FLUTTER_PACKAGE');
      expect(flutterChecks).toContain('secret_scan');
      expect(flutterChecks).toContain('dependency_scan');
      expect(flutterChecks).toContain('sast');
      expect(flutterChecks).toContain('license_compliance');

      const nativeChecks = getDefaultChecksForMethod('NATIVE_SDK');
      expect(nativeChecks).toContain('secret_scan');
      expect(nativeChecks).toContain('sast');
      expect(nativeChecks).toContain('license_compliance');

      const deepLinkChecks = getDefaultChecksForMethod('DEEP_LINK');
      expect(deepLinkChecks).toContain('capability_gate');
    });

    it('should construct valid dynamic validation stages dictionary with order metadata', () => {
      const stages = buildDynamicValidationStages('WEBVIEW', [
        'ssrf',
        'domain_tls_audit',
      ]);
      expect(stages).toBeDefined();
      expect(stages.ssrf).toBeDefined();
      expect(stages.ssrf.order).toBe(1);
      expect(stages.domain_tls_audit).toBeDefined();
      expect(stages.domain_tls_audit.order).toBe(2);
    });
  });

  describe('Universal Scanner Dispatcher (scanMiniApp)', () => {
    it('should dispatch to webViewScanner for WEBVIEW tier', async () => {
      await service.scanMiniApp('app-1', 'WEBVIEW', { fallbackReason: 'test' });
      expect(webViewScanner.scan).toHaveBeenCalledWith('app-1', {
        fallbackReason: 'test',
      });
    });

    it('should dispatch to flutterPackageScanner for FLUTTER_PACKAGE tier', async () => {
      await service.scanMiniApp('app-2', 'FLUTTER_PACKAGE');
      expect(flutterPackageScanner.scan).toHaveBeenCalledWith('app-2', undefined);
    });

    it('should dispatch to nativeSdkScanner for NATIVE_SDK tier', async () => {
      await service.scanMiniApp('app-3', 'NATIVE_SDK');
      expect(nativeSdkScanner.scan).toHaveBeenCalledWith('app-3', undefined);
    });

    it('should dispatch to deepLinkScanner for DEEP_LINK tier', async () => {
      await service.scanMiniApp('app-4', 'DEEP_LINK');
      expect(deepLinkScanner.scan).toHaveBeenCalledWith('app-4', undefined);
    });
  });
});
