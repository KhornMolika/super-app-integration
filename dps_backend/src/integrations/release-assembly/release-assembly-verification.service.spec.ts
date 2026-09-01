import { Test, TestingModule } from '@nestjs/testing';
import { ReleaseAssemblyVerificationService } from './release-assembly-verification.service';
import { NexusIntegrationService } from '../nexus/nexus-integration.service';

describe('ReleaseAssemblyVerificationService', () => {
  let service: ReleaseAssemblyVerificationService;
  let nexusService: jest.Mocked<Partial<NexusIntegrationService>>;

  beforeEach(async () => {
    nexusService = {
      getPackageInfo: jest.fn().mockResolvedValue({
        exists: true,
        latest: {
          version: '1.0.0',
          pubspec: {
            name: 'dps_miniapp_banking',
            version: '1.0.0',
            dependencies: { flutter: 'sdk' },
          },
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReleaseAssemblyVerificationService,
        { provide: NexusIntegrationService, useValue: nexusService },
      ],
    }).compile();

    service = module.get<ReleaseAssemblyVerificationService>(ReleaseAssemblyVerificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should verify release and produce integrity digest', async () => {
    const result = await service.verifyAndAssembleRelease({
      releaseVersion: '1.0.0',
      miniApps: [
        {
          id: 'app-1',
          name: 'Banking Mini App',
          packageName: 'dps_miniapp_banking',
          version: '1.0.0',
        },
      ],
    });

    expect(result.status).toBe('PASSED');
    expect(result.passed).toBe(true);
    expect(result.manifest.integrityDigest).toBeDefined();
    expect(result.verifiedApps).toHaveLength(1);
  });
});
