import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReleaseAssemblyVerificationService } from './release-assembly-verification.service';
import { NexusIntegrationService } from '../nexus/nexus-integration.service';
import { JenkinsService } from '../jenkins/jenkins.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { MiniApp } from '../../miniapps/entities/miniapp.entity';

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

    const jenkinsService: jest.Mocked<Partial<JenkinsService>> = {
      triggerSuperAppBuild: jest.fn().mockResolvedValue({ success: true, message: 'triggered' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReleaseAssemblyVerificationService,
        { provide: NexusIntegrationService, useValue: nexusService },
        { provide: JenkinsService, useValue: jenkinsService },
        { provide: NotificationsService, useValue: {} },
        { provide: getRepositoryToken(MiniApp), useValue: { update: jest.fn().mockResolvedValue({}) } },
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
