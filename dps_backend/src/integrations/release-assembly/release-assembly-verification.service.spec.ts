import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReleaseAssemblyVerificationService } from './release-assembly-verification.service';
import { NexusIntegrationService } from '../nexus/nexus-integration.service';
import { JenkinsService } from '../jenkins/jenkins.service';
import { NotificationsService, MailService } from '../../notifications';
import { ConfigService } from '@nestjs/config';
import { MiniApp } from '../../miniapps/entities/miniapp.entity';

describe('ReleaseAssemblyVerificationService', () => {
  let service: ReleaseAssemblyVerificationService;
  let nexusService: jest.Mocked<Partial<NexusIntegrationService>>;
  let jenkinsService: jest.Mocked<Partial<JenkinsService>>;
  let notificationsService: jest.Mocked<Partial<NotificationsService>>;
  let mailService: jest.Mocked<Partial<MailService>>;
  let configService: jest.Mocked<Partial<ConfigService>>;
  let mockMiniappRepo: any;

  beforeEach(async () => {
    configService = {
      get: jest.fn().mockImplementation((key: string, def?: any) => def || ''),
    };

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

    jenkinsService = {
      triggerSuperAppBuild: jest.fn().mockResolvedValue({ queueId: 101, buildNumber: 42 }),
      triggerSuperAppSandboxBuild: jest.fn().mockResolvedValue({ queueId: 102, buildNumber: 43 }),
    };

    notificationsService = {
      createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    mailService = {
      sendTestBuildReadyEmail: jest.fn().mockResolvedValue(true),
    };

    mockMiniappRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'app-1', name: 'Banking Mini App', appId: 'miniapp_banking' }),
      save: jest.fn().mockImplementation((app) => Promise.resolve(app)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReleaseAssemblyVerificationService,
        { provide: NexusIntegrationService, useValue: nexusService },
        { provide: JenkinsService, useValue: jenkinsService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: MailService, useValue: mailService },
        { provide: ConfigService, useValue: configService },
        { provide: getRepositoryToken(MiniApp), useValue: mockMiniappRepo },
      ],
    }).compile();

    service = module.get<ReleaseAssemblyVerificationService>(
      ReleaseAssemblyVerificationService,
    );
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
