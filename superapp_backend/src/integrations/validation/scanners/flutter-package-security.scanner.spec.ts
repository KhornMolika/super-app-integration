import { CapabilityGateService } from '../../../capabilities/capability-gate.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FlutterPackageSecurityScanner } from './flutter-package-security.scanner';
import { MiniApp } from '../../../miniapps/entities/miniapp.entity';
import { MiniAppIssue } from '../../../miniapps/entities/miniapp-issue.entity';
import { NotificationsService, PipelinePacerService } from '../../../notifications';
import { ScanFinalizerService } from '../scan-finalizer.service';
import { PubVulnerabilityScannerService } from '../pub-vulnerability-scanner.service';

describe('FlutterPackageSecurityScanner', () => {
  let scanner: FlutterPackageSecurityScanner;
  let mockMiniappRepo: any;
  let mockIssueRepo: any;
  let mockNotificationsService: any;
  let mockPipelinePacerService: any;
  let mockScanFinalizer: any;
  let mockPubVulnerabilityScanner: any;

  beforeEach(async () => {
    mockMiniappRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((app) => Promise.resolve(app)),
    };

    mockIssueRepo = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation((issue) => Promise.resolve(issue)),
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

    mockPubVulnerabilityScanner = {
      scanPubDependencies: jest.fn().mockResolvedValue({ totalPackages: 10, advisories: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlutterPackageSecurityScanner,
        { provide: getRepositoryToken(MiniApp), useValue: mockMiniappRepo },
        { provide: getRepositoryToken(MiniAppIssue), useValue: mockIssueRepo },
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
        { provide: PubVulnerabilityScannerService, useValue: mockPubVulnerabilityScanner },
      ],
    }).compile();

    scanner = module.get<FlutterPackageSecurityScanner>(FlutterPackageSecurityScanner);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('exits early without exception if MiniApp is not found', async () => {
    mockMiniappRepo.findOne.mockResolvedValue(null);
    await scanner.scan('missing-app-id');
    expect(mockScanFinalizer.finalizeScan).not.toHaveBeenCalled();
    expect(mockMiniappRepo.save).not.toHaveBeenCalled();
  });

  it('executes dynamic stages for a Flutter Package MiniApp', async () => {
    const mockApp = {
      id: 'ma-flutter-kyc',
      appId: 'ma_flutter_kyc',
      name: 'KYC Verifier Package',
      integrationMethod: 'FLUTTER_PACKAGE',
      securityChecks: ['secret_scan', 'dependency_scan', 'malware_scan'],
      integrationConfig: {
        packageName: 'ma_flutter_kyc',
        bundleUrl: 'https://minio.example.com/packages/ma_flutter_kyc.zip',
      },
    };
    mockMiniappRepo.findOne.mockResolvedValue(mockApp);

    await scanner.scan('ma-flutter-kyc');

    expect(mockPipelinePacerService.paceValidationStart).toHaveBeenCalledWith('KYC Verifier Package');
    expect(mockNotificationsService.emitStageUpdate).toHaveBeenCalled();
    expect(mockMiniappRepo.save).toHaveBeenCalled();
    expect(mockScanFinalizer.finalizeScan).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ma-flutter-kyc' }),
      'FLUTTER_PACKAGE',
      100,
      expect.objectContaining({
        secret_scan: expect.objectContaining({ passed: true }),
        dependency_scan: expect.objectContaining({ passed: true }),
      }),
      expect.any(Array),
      undefined,
      undefined,
    );
  });
});
