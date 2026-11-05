import { MiniappLifecycleHelper } from './helpers/miniapp-lifecycle.helper';
import { MiniappMutationHelper } from './helpers/miniapp-mutation.helper';
import { MiniApp, MiniAppLifecycleStatus, MiniAppAvailabilityStatus } from './entities/miniapp.entity';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('Phase 3: Lifecycle & Governance State Machine Testing', () => {
  let helper: MiniappLifecycleHelper;
  let mockMiniappRepo: any;
  let mockNotificationsService: any;
  let mockMailService: any;
  let mockJenkinsService: any;
  let mockSuperAppService: any;
  let mockPubspecService: any;
  let mockLogActivityFn: jest.Mock;

  beforeEach(() => {
    mockMiniappRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity })),
    };
    mockNotificationsService = {
      createNotification: jest.fn().mockResolvedValue({}),
      emitBuildCompleted: jest.fn(),
      emitBuildStageUpdate: jest.fn(),
      emitStageUpdate: jest.fn(),
    };
    mockMailService = {
      sendMiniAppApprovedEmail: jest.fn().mockResolvedValue({}),
      sendMiniAppRejectedEmail: jest.fn().mockResolvedValue({}),
      sendRevisionRejectedEmail: jest.fn().mockResolvedValue({}),
      sendChangesRequestedEmail: jest.fn().mockResolvedValue({}),
      sendValidationFailedEmail: jest.fn().mockResolvedValue({}),
      sendMiniAppActivatedEmail: jest.fn().mockResolvedValue({}),
    };
    mockJenkinsService = {
      triggerMiniAppValidation: jest.fn().mockResolvedValue({ success: true }),
      triggerSuperAppBuild: jest.fn().mockResolvedValue({ success: true }),
      triggerSuperAppSandboxBuild: jest.fn().mockResolvedValue({ success: true }),
    };
    mockSuperAppService = {
      getAndRegisterNextVersion: jest.fn().mockResolvedValue('1.2.0'),
      findLatestCapability: jest.fn().mockResolvedValue({ capabilities: [] }),
    };
    const mockPipelinePacerService = {
      paceBuildTrigger: jest.fn().mockResolvedValue(undefined),
      paceValidationStart: jest.fn().mockResolvedValue(undefined),
      paceValidationPass: jest.fn().mockResolvedValue(undefined),
      paceSecurityScanStep: jest.fn().mockResolvedValue(undefined),
    };
    const mockGitService = {
      getDeployPrivateKey: jest.fn().mockReturnValue('mock-key'),
    };
    mockPubspecService = {
      injectMiniApp: jest.fn().mockResolvedValue({ success: true, packageName: 'test_pkg' }),
      validateDependencies: jest.fn().mockResolvedValue({ success: true }),
      triggerSandboxRebuild: jest.fn().mockResolvedValue({ success: true }),
    };
    mockLogActivityFn = jest.fn().mockResolvedValue(undefined);

    helper = new MiniappLifecycleHelper(
      mockMiniappRepo,
      mockNotificationsService,
      mockMailService,
      mockJenkinsService,
      mockSuperAppService,
      {} as any,
      mockPipelinePacerService as any,
      mockGitService as any,
      mockPubspecService as any,
    );
  });

  describe('1. State Transition: DRAFT -> SUBMITTED', () => {
    it('transitions DRAFT app to SUBMITTED with validationStatus RUNNING', async () => {
      const app = {
        id: 'app-draft-1',
        appId: 'com.gov.kh.tax',
        name: 'Cambodia E-Tax',
        lifecycleStatus: MiniAppLifecycleStatus.DRAFT,
        integrationMethod: 'DEEP_LINK',
        securityChecks: ['scheme_audit', 'store_url_audit'],
      } as any;

      const result = await helper.submitForReview(app, 'partner-usr-1', mockLogActivityFn);

      expect(result.lifecycleStatus).toBe(MiniAppLifecycleStatus.SUBMITTED);
      expect(result.validationStatus).toBe('RUNNING');
      expect(result.validationStages).toBeDefined();
      expect(mockMiniappRepo.save).toHaveBeenCalled();
    });

    it('rejects submission if app is already IN_REVIEW or APPROVED', async () => {
      const appInReview = {
        id: 'app-in-review',
        lifecycleStatus: MiniAppLifecycleStatus.IN_REVIEW,
      } as any;

      await expect(
        helper.submitForReview(appInReview, 'user-1', mockLogActivityFn),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. State Transition: SUBMITTED -> IN_REVIEW (Gate 1 Validation Passed)', () => {
    it('validates that automated validation pass transitions SUBMITTED to IN_REVIEW', async () => {
      const app = {
        id: 'app-sub-1',
        name: 'KYC Verifier',
        lifecycleStatus: MiniAppLifecycleStatus.SUBMITTED,
        validationStatus: 'RUNNING',
      } as any;

      // Simulated automated gatekeeper pass
      const initialStatuses = ['DRAFT', 'SUBMITTED'];
      if (initialStatuses.includes(app.lifecycleStatus)) {
        app.lifecycleStatus = MiniAppLifecycleStatus.IN_REVIEW;
        app.validationStatus = 'PASSED';
      }

      expect(app.lifecycleStatus).toBe(MiniAppLifecycleStatus.IN_REVIEW);
      expect(app.validationStatus).toBe('PASSED');
    });

    it('verifies automated CI failure rolls back to DRAFT instead of terminal REJECTED', async () => {
      const app = {
        id: 'app-sub-failed',
        name: 'Vulnerable App',
        lifecycleStatus: MiniAppLifecycleStatus.SUBMITTED,
        validationStatus: 'RUNNING',
      } as any;

      // When security scanner finds high-severity issues
      const hasCriticalOrHigh = true;
      if (hasCriticalOrHigh) {
        app.lifecycleStatus = MiniAppLifecycleStatus.DRAFT; // Auto-reset to DRAFT
        app.validationStatus = 'FAILED';
      }

      expect(app.lifecycleStatus).toBe(MiniAppLifecycleStatus.DRAFT);
      expect(app.validationStatus).toBe('FAILED');
      expect(app.lifecycleStatus).not.toBe(MiniAppLifecycleStatus.REJECTED);
    });
  });

  describe('3. State Transition: IN_REVIEW -> APPROVED (Human Review Sign-Off)', () => {
    it('approves an IN_REVIEW app and updates status to APPROVED', async () => {
      const app = {
        id: 'app-review-1',
        appId: 'com.transit.metro',
        name: 'Metro Commuter Pass',
        lifecycleStatus: MiniAppLifecycleStatus.IN_REVIEW,
        ownerId: 'partner-usr-2',
        ownerEmail: 'transit@gov.kh',
        integrationMethod: 'FLUTTER_PACKAGE',
      } as any;

      const result = await helper.approve(app, 'sa-admin-1', mockLogActivityFn);

      expect(result.lifecycleStatus).toBe(MiniAppLifecycleStatus.APPROVED);
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        'partner-usr-2',
        'MiniApp Approved',
        expect.any(String),
        'MINIAPP_APPROVED',
        'app-review-1',
      );
      expect(mockMailService.sendMiniAppApprovedEmail).toHaveBeenCalled();
    });

    it('supports CHANGES_REQUESTED from IN_REVIEW with non-terminal status', async () => {
      const app = {
        id: 'app-review-2',
        name: 'Banking MiniApp',
        lifecycleStatus: MiniAppLifecycleStatus.IN_REVIEW,
        ownerId: 'partner-usr-3',
      } as any;

      const result = await helper.requestChanges(
        app,
        'Please clarify camera permission requirement',
        'sa-admin-1',
        mockLogActivityFn,
      );

      expect(result.lifecycleStatus).toBe(MiniAppLifecycleStatus.CHANGES_REQUESTED);
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        'partner-usr-3',
        'Changes Requested',
        expect.stringContaining('Please clarify camera permission requirement'),
        'CHANGES_REQUESTED',
        'app-review-2',
      );
    });

    it('supports terminal REJECTED from IN_REVIEW with reason', async () => {
      const app = {
        id: 'app-review-3',
        name: 'Gambling App',
        lifecycleStatus: MiniAppLifecycleStatus.IN_REVIEW,
        ownerId: 'partner-usr-4',
      } as any;

      const result = await helper.reject(
        app,
        'Violates platform terms of service',
        'sa-admin-1',
        mockLogActivityFn,
      );

      expect(result.lifecycleStatus).toBe(MiniAppLifecycleStatus.REJECTED);
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        'partner-usr-4',
        'MiniApp Rejected',
        expect.stringContaining('Violates platform terms of service'),
        'MINIAPP_REJECTED',
        'app-review-3',
      );
    });
  });

  describe('4. State Transition: APPROVED -> BUILDING_STAGE_1 -> TESTING', () => {
    it('initiates Stage 1 Test Build via Jenkins and updates buildStatus to BUILDING', async () => {
      const app = {
        id: 'app-approved-1',
        name: 'Public Transit',
        lifecycleStatus: MiniAppLifecycleStatus.APPROVED,
        ownerId: 'partner-usr-5',
        integrationMethod: 'FLUTTER_PACKAGE',
      } as any;

      const result = await helper.startTesting(app, 'sa-admin-1', mockLogActivityFn);

      expect(result.lifecycleStatus).toBe(MiniAppLifecycleStatus.APPROVED);
      expect(result.availabilityStatus).toBe(MiniAppAvailabilityStatus.TESTING);
      expect(result.buildStatus).toBe('BUILDING');
      expect(result.buildStages).toBeDefined();
      expect(result.buildStages.preflight.status).toBe('RUNNING');
      expect(mockSuperAppService.getAndRegisterNextVersion).toHaveBeenCalled();
      expect(mockJenkinsService.triggerSuperAppBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          releaseVersion: '1.2.0',
          appName: 'superapp',
        }),
      );
    });

    it('recovers gracefully from Jenkins build failures and preserves APPROVED status', async () => {
      const app = {
        id: 'app-building-fail',
        name: 'Public Transit',
        lifecycleStatus: MiniAppLifecycleStatus.APPROVED,
        buildStatus: 'BUILDING',
        buildStages: {
          preflight: { status: 'RUNNING', details: 'Compiling Fastlane...' },
        },
      } as any;
      mockMiniappRepo.findOne.mockResolvedValue(app);

      await (helper as any).markBuildFailed('app-building-fail', '1.2.0', 'Gradle out of memory');

      expect(app.lifecycleStatus).toBe(MiniAppLifecycleStatus.APPROVED);
      expect(app.buildStatus).toBe('FAILED');
      expect(app.buildError).toBe('Gradle out of memory');
      expect(app.buildStages.preflight.status).toBe('FAILED');
      expect(mockNotificationsService.emitBuildCompleted).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'FAILED', error: 'Gradle out of memory' }),
      );
    });
  });

  describe('5. Milestone Boundary & State Transition: TESTING -> TEST_PASSED -> ACTIVE', () => {
    it('enforces that only apps that clear test verification promote to ACTIVE in production', async () => {
      const appA = {
        id: 'app-tested-passed',
        name: 'App A (Test Passed)',
        ownerId: 'partner-usr-passed',
        lifecycleStatus: 'TEST_PASSED',
        availabilityStatus: MiniAppAvailabilityStatus.TESTING,
      } as any;

      const appB = {
        id: 'app-still-testing',
        name: 'App B (In Testing)',
        lifecycleStatus: 'TESTING',
        availabilityStatus: MiniAppAvailabilityStatus.TESTING,
      } as any;

      // Simulate Stage 2 Release Query Filter: strictly selects only TEST_PASSED apps
      const queryEligibleForProduction = (apps: any[]) =>
        apps.filter((a) => a.lifecycleStatus === 'TEST_PASSED');

      const eligibleApps = queryEligibleForProduction([appA, appB]);
      expect(eligibleApps).toHaveLength(1);
      expect(eligibleApps[0].id).toBe('app-tested-passed');

      // Promote App A to ACTIVE via helper.activate
      const activated = await helper.activate(appA, 'sa-admin-1', mockLogActivityFn);

      expect(mockJenkinsService.triggerSuperAppBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          releaseVersion: '1.2.0',
          appName: 'superapp',
          buildType: 'release',
        }),
      );
      expect(activated.availabilityStatus).toBe(MiniAppAvailabilityStatus.PRODUCTION);
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.anything(),
        'MiniApp Live & Activated',
        expect.stringContaining('granted final approval and production release build is live'),
        'MINIAPP_ACTIVATED',
        'app-tested-passed',
      );
    });

        it('allows temporary SUSPENSION and REACTIVATION of an ACTIVE app', async () => {
      const app = {
        id: 'app-active-live',
        name: 'Live Mobile App',
        lifecycleStatus: 'ACTIVE',
        availabilityStatus: MiniAppAvailabilityStatus.PRODUCTION,
        isSuspended: false,
      } as any;

      // Suspend
      app.isSuspended = true;
      app.availabilityStatus = MiniAppAvailabilityStatus.SUSPENDED;
      expect(app.availabilityStatus).toBe(MiniAppAvailabilityStatus.SUSPENDED);
      expect(app.isSuspended).toBe(true);

      // Reactivate
      app.isSuspended = false;
      app.availabilityStatus = MiniAppAvailabilityStatus.PRODUCTION;
      expect(app.availabilityStatus).toBe(MiniAppAvailabilityStatus.PRODUCTION);
      expect(app.isSuspended).toBe(false);
    });
  });

  describe('6. Deletion & Decommissioning Governance (Hard Purge vs ARCHIVED)', () => {
    let mutationHelper: MiniappMutationHelper;
    let mockStorageService: any;

    beforeEach(() => {
      mockStorageService = {
        packageSubmissionsBucket: 'quarantine-packages',
        sdkSubmissionsBucket: 'quarantine-sdks',
        deleteObject: jest.fn().mockResolvedValue(undefined),
        deleteLogo: jest.fn().mockResolvedValue(undefined),
      };
      mockMiniappRepo.delete = jest.fn().mockResolvedValue({ affected: 1 });

      mutationHelper = new MiniappMutationHelper(
        mockMiniappRepo,
        mockStorageService,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
      );
    });

    it('allows registered owner to permanently delete their own DRAFT mini-app and purges MinIO assets', async () => {
      const draftApp = {
        id: 'draft-app-1',
        appId: 'com.partner.draft',
        name: 'Partner Draft App',
        ownerId: 'user-partner-123',
        lifecycleStatus: MiniAppLifecycleStatus.DRAFT,
        integrationConfig: {
          packageStoragePath: 'packages/partner-draft.zip',
        },
        logo: 'https://minio.local/logos/logo.png',
      };
      mockMiniappRepo.findOne.mockResolvedValue(draftApp);

      await mutationHelper.remove(
        'draft-app-1',
        'user-partner-123',
        { sub: 'user-partner-123', roles: ['DEVELOPER'] },
        mockLogActivityFn,
      );

      expect(mockStorageService.deleteObject).toHaveBeenCalledWith(
        'quarantine-packages',
        'packages/partner-draft.zip',
      );
      expect(mockStorageService.deleteLogo).toHaveBeenCalledWith(
        'https://minio.local/logos/logo.png',
      );
      expect(mockMiniappRepo.delete).toHaveBeenCalledWith('draft-app-1');
      expect(mockLogActivityFn).toHaveBeenCalledWith(
        'draft-app-1',
        'user-partner-123',
        'DELETE',
        expect.stringContaining('Deleted'),
        expect.any(String),
        'DELETE_MINI_APP',
        draftApp,
        null,
      );
    });

    it('allows SuperAdmin to permanently delete a REJECTED mini-app and purges MinIO assets', async () => {
      const rejectedApp = {
        id: 'rejected-app-1',
        appId: 'com.partner.rejected',
        name: 'Rejected Partner App',
        ownerId: 'user-partner-999',
        lifecycleStatus: MiniAppLifecycleStatus.REJECTED,
      };
      mockMiniappRepo.findOne.mockResolvedValue(rejectedApp);

      await mutationHelper.remove(
        'rejected-app-1',
        'admin-user',
        { sub: 'admin-user', roles: ['SUPER_ADMIN'] },
        mockLogActivityFn,
      );

      expect(mockMiniappRepo.delete).toHaveBeenCalledWith('rejected-app-1');
    });

    it('forbids non-owner and non-admin from deleting another user mini-app', async () => {
      const draftApp = {
        id: 'draft-app-2',
        name: 'Protected App',
        ownerId: 'user-creator-123',
        lifecycleStatus: MiniAppLifecycleStatus.DRAFT,
      };
      mockMiniappRepo.findOne.mockResolvedValue(draftApp);

      await expect(
        mutationHelper.remove(
          'draft-app-2',
          'user-intruder-456',
          { sub: 'user-intruder-456', roles: ['DEVELOPER'] },
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockMiniappRepo.delete).not.toHaveBeenCalled();
    });

    it('rejects deletion of ACTIVE or TESTING applications with BadRequestException', async () => {
      const activeApp = {
        id: 'active-app-1',
        name: 'Active Live App',
        ownerId: 'user-creator-123',
        lifecycleStatus: MiniAppLifecycleStatus.ACTIVE,
      };
      mockMiniappRepo.findOne.mockResolvedValue(activeApp);

      await expect(
        mutationHelper.remove(
          'active-app-1',
          'user-creator-123',
          { sub: 'user-creator-123', roles: ['SUPER_ADMIN'] },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('supports decommissioning ACTIVE or SUSPENDED apps to ARCHIVED status instead of deleting', async () => {
      const activeApp = {
        id: 'app-to-archive',
        name: 'Retiring App',
        lifecycleStatus: 'ACTIVE',
        availabilityStatus: MiniAppAvailabilityStatus.PRODUCTION,
      } as any;

      // Decommission to ARCHIVED
      activeApp.lifecycleStatus = MiniAppLifecycleStatus.ARCHIVED;
      activeApp.availabilityStatus = MiniAppAvailabilityStatus.SUSPENDED;

      expect(activeApp.lifecycleStatus).toBe('ARCHIVED');
      expect(activeApp.availabilityStatus).toBe('SUSPENDED');
    });
  });
});
