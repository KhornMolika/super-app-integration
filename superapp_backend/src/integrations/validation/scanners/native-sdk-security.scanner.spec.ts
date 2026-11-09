import { CapabilityGateService } from '../../../capabilities/capability-gate.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NativeSdkSecurityScanner } from './native-sdk-security.scanner';
import { MiniApp } from '../../../miniapps/entities/miniapp.entity';
import { NotificationsService, PipelinePacerService } from '../../../notifications';
import { ScanFinalizerService } from '../scan-finalizer.service';

describe('NativeSdkSecurityScanner', () => {
  let scanner: NativeSdkSecurityScanner;
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
        NativeSdkSecurityScanner,
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

    scanner = module.get<NativeSdkSecurityScanner>(NativeSdkSecurityScanner);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('exits early if miniApp is not found', async () => {
    mockMiniappRepo.findOne.mockResolvedValue(null);
    await scanner.scan('missing-native-app');
    expect(mockScanFinalizer.finalizeScan).not.toHaveBeenCalled();
    expect(mockMiniappRepo.save).not.toHaveBeenCalled();
  });

  it('executes dynamic stages for a Native SDK MiniApp', async () => {
    const mockApp = {
      id: 'ma-native-spa',
      appId: 'ma_nativesdk_spa',
      name: 'Lotus Spa Native SDK',
      integrationMethod: 'NATIVE_SDK',
      securityChecks: ['secret_scan', 'malware_scan'],
      integrationConfig: {
        androidArtifactUrl: 'https://nexus.example.com/lotus-spa-1.0.0.aar',
        iosFrameworkUrl: 'https://nexus.example.com/LotusSpa.xcframework.zip',
      },
    };
    mockMiniappRepo.findOne.mockResolvedValue(mockApp);

    await scanner.scan('ma-native-spa');

    expect(mockNotificationsService.emitStageUpdate).toHaveBeenCalled();
    expect(mockMiniappRepo.save).toHaveBeenCalled();
    expect(mockScanFinalizer.finalizeScan).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ma-native-spa' }),
      'NATIVE_SDK',
      100,
      expect.objectContaining({
        ingest: expect.objectContaining({ passed: true }),
        secret_scan: expect.objectContaining({ passed: true }),
      }),
      expect.any(Array),
      undefined,
    );
  });
});
