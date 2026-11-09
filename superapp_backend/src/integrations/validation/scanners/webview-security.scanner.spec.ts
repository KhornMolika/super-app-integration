import { CapabilityGateService } from '../../../capabilities/capability-gate.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WebViewSecurityScanner } from './webview-security.scanner';
import { MiniApp } from '../../../miniapps/entities/miniapp.entity';
import { NotificationsService, PipelinePacerService } from '../../../notifications';
import { ScanFinalizerService } from '../scan-finalizer.service';

describe('WebViewSecurityScanner', () => {
  let scanner: WebViewSecurityScanner;
  let mockMiniappRepo: any;
  let mockNotificationsService: any;
  let mockPipelinePacerService: any;
  let mockScanFinalizer: any;

  beforeEach(async () => {
    mockMiniappRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((app) => Promise.resolve(app)),
    };

    mockNotificationsService = {
      emitStageUpdate: jest.fn(),
    };

    mockPipelinePacerService = {
      paceValidationStart: jest.fn().mockResolvedValue(undefined),
      paceSecurityScanStep: jest.fn().mockResolvedValue(undefined),
    };

    mockScanFinalizer = {
      finalizeScan: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebViewSecurityScanner,
        { provide: getRepositoryToken(MiniApp), useValue: mockMiniappRepo },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: PipelinePacerService, useValue: mockPipelinePacerService },
        { provide: ScanFinalizerService, useValue: mockScanFinalizer },
        {
          provide: CapabilityGateService,
          // real gate over an empty catalog (no capabilities declared => passes)
          useValue: new CapabilityGateService(
            { find: async () => [] } as any,
            { find: async () => [] } as any,
          ),
        },
      ],
    }).compile();

    scanner = module.get<WebViewSecurityScanner>(WebViewSecurityScanner);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('exits early if miniApp is not found', async () => {
    mockMiniappRepo.findOne.mockResolvedValue(null);
    await scanner.scan('non-existent-id');
    expect(mockScanFinalizer.finalizeScan).not.toHaveBeenCalled();
    expect(mockMiniappRepo.save).not.toHaveBeenCalled();
  });

  it('fails scan immediately with invalid target URL format', async () => {
    const mockApp = {
      id: 'app-invalid-url',
      name: 'Invalid Web App',
      integrationConfig: { productionUrl: 'not_a_valid_url' },
      securityChecks: ['domain_tls_audit'],
    };
    mockMiniappRepo.findOne.mockResolvedValue(mockApp);

    await scanner.scan('app-invalid-url');

    expect(mockScanFinalizer.finalizeScan).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'app-invalid-url' }),
      'WEBVIEW',
      0,
      expect.objectContaining({ ssrf: expect.objectContaining({ passed: false }) }),
      expect.arrayContaining([expect.objectContaining({ id: 'SSRF_INVALID_URL' })]),
      undefined,
    );
  });

  it('identifies private IPv4 addresses correctly in SSRF defense helper', () => {
    const isPrivate = (scanner as any).isPrivateIp.bind(scanner);
    expect(isPrivate('127.0.0.1')).toBe(true);
    expect(isPrivate('localhost')).toBe(true);
    expect(isPrivate('10.0.1.20')).toBe(true);
    expect(isPrivate('172.16.5.1')).toBe(true);
    expect(isPrivate('172.31.255.255')).toBe(true);
    expect(isPrivate('192.168.0.1')).toBe(true);
    expect(isPrivate('169.254.169.254')).toBe(true);

    expect(isPrivate('8.8.8.8')).toBe(false);
    expect(isPrivate('1.1.1.1')).toBe(false);
  });

  it('executes active checks, paces steps, and delegates to scanFinalizer', async () => {
    const mockApp = {
      id: 'app-valid-web',
      name: 'Secure Banking WebApp',
      integrationConfig: { productionUrl: 'https://bank.example.com' },
      securityChecks: ['domain_tls_audit'],
    };
    mockMiniappRepo.findOne.mockResolvedValue(mockApp);

    await scanner.scan('app-valid-web');

    expect(mockPipelinePacerService.paceValidationStart).toHaveBeenCalled();
    expect(mockMiniappRepo.save).toHaveBeenCalled();
    expect(mockScanFinalizer.finalizeScan).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'app-valid-web' }),
      'WEBVIEW',
      expect.any(Number),
      expect.any(Object),
      expect.any(Array),
      undefined,
    );
  });
});
