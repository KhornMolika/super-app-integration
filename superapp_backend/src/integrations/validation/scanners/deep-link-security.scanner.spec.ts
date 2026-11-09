import { CapabilityGateService } from '../../../capabilities/capability-gate.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeepLinkSecurityScanner } from './deep-link-security.scanner';
import { MiniApp } from '../../../miniapps/entities/miniapp.entity';
import { NotificationsService, PipelinePacerService } from '../../../notifications';
import { ScanFinalizerService } from '../scan-finalizer.service';

describe('DeepLinkSecurityScanner', () => {
  let scanner: DeepLinkSecurityScanner;
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
        DeepLinkSecurityScanner,
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

    scanner = module.get<DeepLinkSecurityScanner>(DeepLinkSecurityScanner);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('exits early without error when miniApp is not found', async () => {
    mockMiniappRepo.findOne.mockResolvedValue(null);
    await scanner.scan('missing-deep-link-app');
    expect(mockScanFinalizer.finalizeScan).not.toHaveBeenCalled();
    expect(mockMiniappRepo.save).not.toHaveBeenCalled();
  });

  it('executes dynamic stages for a Deep Link MiniApp with scheme etax://', async () => {
    const mockApp = {
      id: 'ma-deeplink-tax',
      appId: 'ma_deeplink_tax',
      name: 'Cambodia E-Tax External Link',
      integrationMethod: 'DEEP_LINK',
      securityChecks: ['scheme_audit', 'store_url_audit', 'capability_gate'],
      integrationConfig: {
        urlScheme: 'etax://pay',
        fallbackWebUrl: 'https://tax.gov.kh/download',
      },
    };
    mockMiniappRepo.findOne.mockResolvedValue(mockApp);

    await scanner.scan('ma-deeplink-tax');

    expect(mockNotificationsService.emitStageUpdate).toHaveBeenCalled();
    expect(mockMiniappRepo.save).toHaveBeenCalled();
    expect(mockScanFinalizer.finalizeScan).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ma-deeplink-tax' }),
      'DEEP_LINK',
      100,
      expect.objectContaining({
        scheme_audit: expect.objectContaining({ passed: true }),
        store_url_audit: expect.objectContaining({ passed: true }),
        capability_gate: expect.objectContaining({ passed: true }),
      }),
      expect.any(Array),
      undefined,
    );
  });
});
