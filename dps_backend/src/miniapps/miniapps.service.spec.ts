import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MiniappsService } from './miniapps.service';
import { MiniApp } from './entities/miniapp.entity';
import { MiniAppActivity } from './entities/miniapp-activity.entity';
import { MiniAppIssue } from './entities/miniapp-issue.entity';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PermissionsService } from '../permissions/permissions.service';
import { PermissionProposalsService } from '../permission-proposals/permission-proposals.service';
import { SuperAppService } from '../super-app/super-app.service';
import { GitIntegrationService } from '../integrations/git/git-integration.service';
import { NexusIntegrationService } from '../integrations/nexus/nexus-integration.service';
import { DomainVerificationService } from '../integrations/webview/domain-verification.service';
import { JenkinsService } from '../integrations/jenkins/jenkins.service';
import { StorageService } from '../storage/storage.service';
import { NativeSdkCodegenService } from '../native-sdk-codegen/native-sdk-codegen.service';
import { GithubPrService } from '../native-sdk-codegen/github-pr.service';

describe('MiniappsService.approve — native SDK codegen trigger', () => {
  let service: MiniappsService;
  let miniappRepository: { findOne: jest.Mock; save: jest.Mock };
  let regenerate: jest.Mock;
  let openPrForChanges: jest.Mock;
  let isEnabled: jest.Mock;

  function makeApp(overrides: Partial<MiniApp> = {}): MiniApp {
    return {
      id: 'app-1',
      status: 'IN_REVIEW',
      integrationMethod: 'NATIVE_SDK',
      validationStatus: 'PASSED',
      ...overrides,
    } as MiniApp;
  }

  async function setup(app: MiniApp, options: { codegenAutoPrEnabled?: boolean } = {}) {
    miniappRepository = {
      findOne: jest.fn().mockResolvedValue(app),
      save: jest.fn().mockImplementation((a: MiniApp) => Promise.resolve(a)),
    };
    regenerate = jest.fn();
    openPrForChanges = jest.fn();
    isEnabled = jest.fn().mockReturnValue(options.codegenAutoPrEnabled ?? true);

    const noop = {} as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MiniappsService,
        { provide: getRepositoryToken(MiniApp), useValue: miniappRepository },
        {
          provide: getRepositoryToken(MiniAppActivity),
          useValue: { create: jest.fn(x => x), save: jest.fn().mockResolvedValue({}) },
        },
        { provide: getRepositoryToken(MiniAppIssue), useValue: {} },
        { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue({}) } },
        { provide: MailService, useValue: noop },
        { provide: NotificationsService, useValue: noop },
        { provide: PermissionsService, useValue: noop },
        { provide: PermissionProposalsService, useValue: noop },
        { provide: SuperAppService, useValue: noop },
        { provide: GitIntegrationService, useValue: noop },
        { provide: NexusIntegrationService, useValue: noop },
        { provide: DomainVerificationService, useValue: noop },
        { provide: JenkinsService, useValue: noop },
        { provide: StorageService, useValue: noop },
        { provide: NativeSdkCodegenService, useValue: { regenerate } },
        {
          provide: GithubPrService,
          useValue: { openPrForChanges, isEnabled },
        },
      ],
    }).compile();

    service = module.get<MiniappsService>(MiniappsService);
  }

  it('runs codegen and records the result for a NATIVE_SDK app', async () => {
    await setup(makeApp());
    regenerate.mockResolvedValue({ changedFiles: new Map([['a.swift', 'x']]) });
    openPrForChanges.mockResolvedValue({
      status: 'opened',
      prUrl: 'https://github.com/acme/dsp-poc/pull/1',
      prNumber: 1,
      supersededPrNumbers: [],
    });

    const result = await service.approve('app-1', 'actor-1');

    expect(regenerate).toHaveBeenCalled();
    expect(openPrForChanges).toHaveBeenCalledWith(new Map([['a.swift', 'x']]));
    expect(result.lastCodegenRun!.status).toBe('opened');
    expect(result.lastCodegenRun!.prUrl).toBe('https://github.com/acme/dsp-poc/pull/1');
    expect(miniappRepository.save).toHaveBeenCalledTimes(2); // approval save, then codegen-result save
  });

  it('records an error result and does not throw when codegen fails', async () => {
    await setup(makeApp());
    regenerate.mockRejectedValue(new Error('GitHub API error on /repos/... (500): boom'));

    const result = await service.approve('app-1', 'actor-1');

    expect(result.status).toBe('APPROVED'); // approval itself is not rolled back
    expect(result.lastCodegenRun!.status).toBe('error');
    expect(result.lastCodegenRun!.error).toContain('boom');
    expect(openPrForChanges).not.toHaveBeenCalled();
  });

  it('skips codegen entirely when CODEGEN_AUTO_PR is disabled', async () => {
    await setup(makeApp(), { codegenAutoPrEnabled: false });

    const result = await service.approve('app-1', 'actor-1');

    expect(regenerate).not.toHaveBeenCalled();
    expect(openPrForChanges).not.toHaveBeenCalled();
    expect(result.lastCodegenRun!.status).toBe('skipped');
    expect(miniappRepository.save).toHaveBeenCalledTimes(2); // approval save, then codegen-result save
  });

  it('does not run codegen for a non-NATIVE_SDK app', async () => {
    await setup(makeApp({ integrationMethod: 'WEBVIEW' }));

    const result = await service.approve('app-1', 'actor-1');

    expect(regenerate).not.toHaveBeenCalled();
    expect(openPrForChanges).not.toHaveBeenCalled();
    expect(result.lastCodegenRun).toBeUndefined();
    expect(miniappRepository.save).toHaveBeenCalledTimes(1); // approval save only
  });
});
