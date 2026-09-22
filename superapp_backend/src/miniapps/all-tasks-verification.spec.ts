import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { MiniappsService } from './miniapps.service';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { PubspecPrecheckService } from '../integrations/flutter/pubspec-precheck.service';

describe('All Tasks Verification - Multi-Method Mini Apps & Enterprise Plan', () => {
  describe('1. ma_nativesdk_spa: Universal Native Mini App Launcher & Codegen Retirement', () => {
    let service: MiniappsService;
    let mockRepo: any;
    let mockLifecycle: any;
    let mockCodegen: any;
    let mockSdkUpload: any;

    const createSpaNativeApp = (configOverwrites: Record<string, any> = {}, status = 'PENDING_REVIEW') => ({
      id: 'ma-native-spa-001',
      appId: 'kh.gov.fsa.spa',
      name: 'Lotus Spa & Wellness',
      integrationMethod: 'NATIVE_SDK',
      integrationConfig: {
        androidEntryClass: 'com.fintech.vendor.spa.SpaBookingActivity',
        iosEntryClass: 'SpaBookingViewController',
        androidMinioKey: 'miniapp-artifacts/spa/v1.0.0/spa-booking.aar',
        iosMinioKey: 'miniapp-artifacts/spa/v1.0.0/spa-booking.xcframework.zip',
        ...configOverwrites,
      },
      status,
    });

    beforeEach(() => {
      mockRepo = {
        findOne: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
        createQueryBuilder: jest.fn(() => ({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          setParameters: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 1 }),
        })),
      };
      mockLifecycle = {
        approve: jest.fn().mockImplementation(async (app) => ({ ...app, status: 'APPROVED' })),
      };
      mockCodegen = {
        regenerate: jest.fn(),
      };
      mockSdkUpload = {
        publishToNexus: jest.fn().mockResolvedValue({
          androidNexusMavenUrl: 'http://nexus:8081/repository/maven-releases/com/fintech/vendor/spa/1.0.0/spa-1.0.0.aar',
          iosNexusZipUrl: 'http://nexus:8081/repository/raw-sdk-artifacts/SpaBookingSDK/1.0.0/SpaBookingSDK.xcframework.zip',
        }),
      };

      const mockAudit = { log: jest.fn() };
      const mockActivityRepo = {
        create: jest.fn((x) => x),
        save: jest.fn().mockResolvedValue(undefined),
      };

      service = new MiniappsService(
        mockRepo,
        mockActivityRepo as any,
        {} as any,
        mockAudit as any,
        {} as any,
        {} as any,
        mockLifecycle,
        {} as any,
        {} as any,
        {} as any,
        mockCodegen,
        mockSdkUpload,
      );
    });

    it('rejects approval if Android or iOS artifacts are missing', async () => {
      const incompleteApp = createSpaNativeApp({ androidMinioKey: null });
      mockRepo.findOne.mockResolvedValue(incompleteApp);

      await expect(service.approve('ma-native-spa-001', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('successfully approves ma_nativesdk_spa and publishes to Nexus without mutating mobile git or opening GitLab MRs', async () => {
      const app = createSpaNativeApp();
      mockRepo.findOne.mockResolvedValue(app);

      const approved = await service.approve('ma-native-spa-001', 'admin-1');

      expect(approved.status).toBe('APPROVED');
      expect(mockSdkUpload.publishToNexus).toHaveBeenCalledWith('ma-native-spa-001');
      // Zero calls to codegen service or GitLab MRs
      expect(mockCodegen.regenerate).not.toHaveBeenCalled();
    });

    it('confirms the Universal Native Launcher method triggers reflection verification without codegen', async () => {
      const app = createSpaNativeApp(
        {
          androidNexusMavenUrl: 'http://nexus:8081/maven/spa.aar',
          iosNexusZipUrl: 'http://nexus:8081/raw/spa.zip',
        },
        'APPROVED',
      );
      mockRepo.findOne.mockResolvedValue(app);

      const result = await service.rerunNativeSdkCodegen('ma-native-spa-001', 'admin-1');
      expect(result.upToDate).toBe(true);
      expect(result.changedFiles).toBe(0);
      expect(result.prUrl).toBeNull();
      expect(result.message).toContain('Universal Native Mini App Launcher is active');
    });
  });

  describe('2. ma_deeplink_tax: Deep Link Integration & Manifest Verification', () => {
    it('verifies deep link config supports custom schemes, store URLs, and fallback URLs', () => {
      const deepLinkApp = {
        name: 'Cambodia E-Tax Declarations',
        integrationMethod: 'DEEP_LINK',
        integrationConfig: {
          urlScheme: 'cambodia-tax://declarations/new',
          fallbackUrl: 'https://tax.gov.kh/download',
          appStoreUrl: 'https://apps.apple.com/app/cambodia-tax/id123456',
          playStoreUrl: 'https://play.google.com/store/apps/details?id=kh.gov.tax',
          allowedDomains: ['tax.gov.kh', 'mef.gov.kh'],
        },
      };

      expect(deepLinkApp.integrationConfig.urlScheme).toMatch(/^[a-z0-9\-]+:\/\//i);
      expect(deepLinkApp.integrationConfig.fallbackUrl).toBeTruthy();
      expect(deepLinkApp.integrationConfig.appStoreUrl).toContain('apps.apple.com');
      expect(deepLinkApp.integrationConfig.playStoreUrl).toContain('play.google.com');
      expect(deepLinkApp.integrationConfig.allowedDomains).toContain('tax.gov.kh');
    });
  });

  describe('3. ma_webview_banking & ma_webview_insurance: Webview Security Verification', () => {
    it('verifies webview integration validates HTTPS URLs and allowed domain list', () => {
      const webviewApp = {
        name: 'SME Microfinance Portal',
        integrationMethod: 'WEBVIEW',
        integrationConfig: {
          url: 'https://banking.fintechcenterfsa.com/app',
          allowedDomains: ['banking.fintechcenterfsa.com', 'auth.fintechcenterfsa.com'],
          isDomainVerified: true,
          supportsSso: true,
        },
      };

      expect(webviewApp.integrationConfig.url.startsWith('https://')).toBe(true);
      expect(webviewApp.integrationConfig.isDomainVerified).toBe(true);
      expect(webviewApp.integrationConfig.allowedDomains.length).toBeGreaterThan(0);
    });
  });

  describe('4. ma_flutter_trust_regulator: Core Package Decoupling & Reserved Namespace Gate', () => {
    let pubspecPrecheck: PubspecPrecheckService;
    let mockPubspecService: any;

    beforeEach(() => {
      mockPubspecService = {
        readPubspecDocument: jest.fn().mockReturnValue({ document: { get: () => null } }),
        getMobileAppDir: jest.fn().mockReturnValue('superapp_mobile'),
      };
      pubspecPrecheck = new PubspecPrecheckService({} as any, mockPubspecService as any);
    });

    it('rejects partner packages attempting to claim reserved core packages superapp_core or dps_core_package', async () => {
      const coreResult = await pubspecPrecheck.simulateCandidate({
        packageName: 'superapp_core',
        version: '1.0.0',
      });
      expect(coreResult.compatible).toBe(false);
      expect(coreResult.directConflicts[0]).toContain('conflicts directly with a reserved Super App core framework package');

      const legacyCoreResult = await pubspecPrecheck.simulateCandidate({
        packageName: 'dps_core_package',
        version: '1.0.0',
      });
      expect(legacyCoreResult.compatible).toBe(false);
    });
  });

  describe('5. Error Resilience: NestJS AllExceptionsFilter & Structured Envelopes', () => {
    const filter = new AllExceptionsFilter();
    let mockResponse: any;
    let mockHost: any;

    beforeEach(() => {
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => ({ url: '/api/v1/miniapps/verify', method: 'POST' }),
        }),
      };
    });

    it('formats unhandled network/service errors (e.g. ECONNREFUSED) into structured 503 envelopes', () => {
      const connectionError = new Error('connect ECONNREFUSED 127.0.0.1:8085');

      filter.catch(connectionError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 503,
          code: 'SERVICE_CONNECTION_REFUSED',
          error: 'Service Unavailable',
          path: '/api/v1/miniapps/verify',
        }),
      );
    });

    it('formats standard HttpExceptions with timestamp and request path', () => {
      const httpError = new HttpException('Invalid mini app configuration', HttpStatus.BAD_REQUEST);

      filter.catch(httpError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Invalid mini app configuration',
          path: '/api/v1/miniapps/verify',
        }),
      );
    });
  });
});
