import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReleaseAssemblyVerificationService } from './release-assembly-verification.service';
import { NexusIntegrationService } from '../nexus/nexus-integration.service';
import { JenkinsService } from '../jenkins/jenkins.service';
import { NotificationsService, MailService } from '../../notifications';
import { ConfigService } from '@nestjs/config';
import { MiniApp } from '../../miniapps/entities/miniapp.entity';
import { PubspecInjectorService } from '../flutter/pubspec-injector.service';

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
            name: 'ma_flutter_banking',
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
      emitBuildStageUpdate: jest.fn(),
      emitBuildCompleted: jest.fn(),
    };

    mailService = {
      sendTestBuildReadyEmail: jest.fn().mockResolvedValue(true),
    };

    mockMiniappRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'app-1', name: 'Banking Mini App', appId: 'miniapp_banking' }),
      save: jest.fn().mockImplementation((app) => Promise.resolve(app)),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReleaseAssemblyVerificationService,
        { provide: NexusIntegrationService, useValue: nexusService },
        { provide: JenkinsService, useValue: jenkinsService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: MailService, useValue: mailService },
        { provide: ConfigService, useValue: configService },
        {
          provide: PubspecInjectorService,
          useValue: {
            syncAllApprovedMiniApps: jest.fn().mockResolvedValue({ success: true }),
            validateDependencies: jest.fn().mockResolvedValue({ success: true }),
          },
        },
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
          packageName: 'ma_flutter_banking',
          version: '1.0.0',
        },
      ],
    });

    expect(result.status).toBe('PASSED');
    expect(result.passed).toBe(true);
    expect(result.manifest.integrityDigest).toBeDefined();
    expect(result.verifiedApps).toHaveLength(1);
  });

  it('resets buildStages when transitioning apps to BUILDING', async () => {
    mockMiniappRepo.update = jest.fn().mockResolvedValue({});
    await service.verifyAndAssembleRelease({
      releaseVersion: '1.0.0',
      miniApps: [
        {
          id: 'app-1',
          name: 'Banking Mini App',
          packageName: 'ma_flutter_banking',
          version: '1.0.0',
        },
      ],
    });
    expect(mockMiniappRepo.update).toHaveBeenCalledWith('app-1', {
      status: 'BUILDING',
      buildStages: null,
    });
  });

  describe('codegen MR iid passed to Jenkins', () => {
    const release = (id: string) => ({
      releaseVersion: '1.0.0',
      miniApps: [
        { id, name: 'X', packageName: 'p', version: '1.0.0' },
      ],
    });

    it('passes the newest codegen MR iid found in the release apps', async () => {
      mockMiniappRepo.update = jest.fn().mockResolvedValue({});
      mockMiniappRepo.findOne.mockResolvedValue({
        id: 'app-1',
        integrationConfig: {
          codegenPrUrl: 'https://gitlab.com/g/p/-/merge_requests/57',
        },
      });
      await service.verifyAndAssembleRelease(release('app-1'));
      expect(jenkinsService.triggerSuperAppBuild).toHaveBeenCalledWith(
        expect.objectContaining({ codegenMrIid: '57' }),
      );
    });

    it('passes undefined when no app has a codegen MR', async () => {
      mockMiniappRepo.update = jest.fn().mockResolvedValue({});
      await service.verifyAndAssembleRelease(release('app-1'));
      expect(jenkinsService.triggerSuperAppBuild).toHaveBeenCalledWith(
        expect.objectContaining({ codegenMrIid: undefined }),
      );
    });
  });

  describe('handleBuildStageUpdate', () => {
    const dto = {
      appName: 'superapp',
      releaseVersion: 'v1.2.0',
      stageId: 'compile',
      stageName: 'Compile',
      status: 'RUNNING' as const,
      details: 'gradle assembleDebug',
    };
    let qb: any;
    const setup = (raw: any[]) => {
      qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ raw }),
      };
      mockMiniappRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);
    };

    it('runs one atomic jsonb_set UPDATE on BUILDING apps and emits per row', async () => {
      const stages = { compile: { id: 'compile', status: 'RUNNING' } };
      setup([{ id: 'app-1', buildStages: stages }]);

      const res = await service.handleBuildStageUpdate(dto);

      expect(qb.where).toHaveBeenCalledWith("status = 'BUILDING'");
      const setArg = qb.set.mock.calls[0][0];
      expect(setArg.buildStages()).toContain('jsonb_set');
      const params = qb.setParameters.mock.calls[0][0];
      expect(params.stageId).toBe('compile');
      expect(JSON.parse(params.stageJson)).toMatchObject({
        id: 'compile',
        name: 'Compile',
        status: 'RUNNING',
        details: 'gradle assembleDebug',
      });
      expect(JSON.parse(params.stageJson).updatedAt).toBeDefined();
      expect(qb.returning).toHaveBeenCalledWith(['id', 'buildStages']);
      expect(mockMiniappRepo.save).not.toHaveBeenCalled();
      expect(notificationsService.emitBuildStageUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          miniAppId: 'app-1',
          releaseVersion: 'v1.2.0',
          stages,
        }),
      );
      expect(res).toEqual({ ok: true, updated: 1 });
    });

    it('is graceful when no BUILDING apps exist', async () => {
      setup([]);
      const res = await service.handleBuildStageUpdate(dto);
      expect(res).toEqual({ ok: false, updated: 0 });
      expect(notificationsService.emitBuildStageUpdate).not.toHaveBeenCalled();
    });
  });

  describe('handleBuildCallback', () => {
    let execute: jest.Mock;
    beforeEach(() => {
      execute = jest.fn().mockResolvedValue({});
      const qb: any = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute,
      };
      mockMiniappRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);
      mockMiniappRepo.find = jest
        .fn()
        .mockResolvedValue([
          {
            id: 'app-1',
            name: 'Banking',
            ownerId: 'u1',
            ownerEmail: 'o@x.com',
          },
        ]);
    });

    it('moves BUILDING to TESTING, notifies owner and emits build_completed', async () => {
      const res = await service.handleBuildCallback({
        appName: 'superapp',
        releaseVersion: 'v1.2.0',
        status: 'SUCCESS',
        buildType: 'debug',
        apkUrl: 'http://nexus/app-debug.apk',
      });

      expect(execute).toHaveBeenCalled();
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        'u1',
        'Super App Test Build Ready',
        expect.any(String),
        'TEST_BUILD_READY',
        'app-1',
        expect.objectContaining({ apkUrl: 'http://nexus/app-debug.apk' }),
      );
      expect(notificationsService.emitBuildCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          miniAppId: 'app-1',
          releaseVersion: 'v1.2.0',
          apkUrl: 'http://nexus/app-debug.apk',
        }),
      );
      expect(res).toEqual({ success: true });
    });

    it('returns BUILDING apps to APPROVED on a failed build, keeping buildStages', async () => {
      const qb = mockMiniappRepo.createQueryBuilder();
      const res = await service.handleBuildCallback({
        appName: 'superapp',
        releaseVersion: 'v1.2.0',
        status: 'FAILED',
      });
      expect(qb.set).toHaveBeenCalledWith({ status: 'APPROVED' });
      expect(qb.where).toHaveBeenCalledWith("status = 'BUILDING'");
      expect(qb.set).not.toHaveBeenCalledWith(
        expect.objectContaining({ buildStages: expect.anything() }),
      );
      expect(execute).toHaveBeenCalled();
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        'u1',
        'Super App Build Failed',
        expect.any(String),
        'BUILD_FAILED',
        'app-1',
        expect.objectContaining({ releaseVersion: 'v1.2.0' }),
      );
      expect(notificationsService.emitBuildCompleted).toHaveBeenCalledWith(
        expect.objectContaining({ miniAppId: 'app-1', status: 'FAILED' }),
      );
      expect(res).toEqual({ success: true });
    });
  });
});
