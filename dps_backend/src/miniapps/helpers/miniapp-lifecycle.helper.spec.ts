import { MiniappLifecycleHelper } from './miniapp-lifecycle.helper';
import { MiniApp } from '../entities/miniapp.entity';

describe('MiniappLifecycleHelper - Revision & Approval Lifecycle', () => {
  let helper: MiniappLifecycleHelper;
  let mockMiniappRepo: any;
  let mockNotificationsService: any;
  let mockMailService: any;
  let mockJenkinsService: any;
  let mockSuperAppService: any;
  let mockLocalSecurityScannerService: any;
  let mockLogActivityFn: jest.Mock;

  beforeEach(() => {
    mockMiniappRepo = {
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };
    mockNotificationsService = {
      createNotification: jest.fn().mockResolvedValue({}),
    };
    mockMailService = {
      sendMiniAppApprovedEmail: jest.fn().mockResolvedValue({}),
      sendMiniAppRejectedEmail: jest.fn().mockResolvedValue({}),
      sendRevisionRejectedEmail: jest.fn().mockResolvedValue({}),
      sendChangesRequestedEmail: jest.fn().mockResolvedValue({}),
    };
    mockJenkinsService = {
      triggerMiniAppValidation: jest.fn().mockResolvedValue({ success: true }),
      triggerSuperAppBuild: jest.fn().mockResolvedValue({ success: true }),
      triggerSuperAppSandboxBuild: jest.fn().mockResolvedValue({ success: true }),
    };
    mockSuperAppService = {
      getAndRegisterNextVersion: jest.fn().mockResolvedValue('v1.1.1'),
    };
    mockLocalSecurityScannerService = {};
    mockLogActivityFn = jest.fn().mockResolvedValue(undefined);

    helper = new MiniappLifecycleHelper(
      mockMiniappRepo,
      mockNotificationsService,
      mockMailService,
      mockJenkinsService,
      mockSuperAppService,
      mockLocalSecurityScannerService,
    );
  });

  describe('1. Initial Submission & Approval', () => {
    it('should submit DRAFT app for review and set status to SUBMITTED', async () => {
      const app: MiniApp = {
        id: 'app-1',
        appId: 'com.test.app',
        name: 'Test App',
        status: 'DRAFT',
        integrationMethod: 'WEBVIEW',
        securityChecks: [],
      } as any;

      const result = await helper.submitForReview(app, 'user-1', mockLogActivityFn);

      expect(result.status).toBe('SUBMITTED');
      expect(result.validationStatus).toBe('RUNNING');
      expect(mockMiniappRepo.save).toHaveBeenCalled();
    });

    it('should approve an IN_REVIEW app and set status to APPROVED without leaving pending revision', async () => {
      const app: MiniApp = {
        id: 'app-1',
        appId: 'com.test.app',
        name: 'Test App',
        status: 'IN_REVIEW',
        ownerId: 'user-1',
        ownerEmail: 'owner@test.com',
      } as any;

      const result = await helper.approve(app, 'admin-1', mockLogActivityFn);

      expect(result.status).toBe('APPROVED');
      expect(result.pendingRevision).toBeFalsy();
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        'user-1',
        'Mini App Approved',
        expect.any(String),
        'MINIAPP_APPROVED',
        'app-1',
      );
      expect(mockMailService.sendMiniAppApprovedEmail).toHaveBeenCalled();
    });
  });

  describe('2. Active App Revision: Approval & Publish', () => {
    it('should automatically publish staged revision on an ACTIVE app and clear pendingRevision', async () => {
      const app: MiniApp = {
        id: 'app-active-1',
        appId: 'com.test.ss',
        name: 'SS Banking (Original)',
        status: 'ACTIVE',
        currentReleaseVersion: '1.0.0',
        version: '1.0.0',
        permissions: ['camera'],
        versionHistory: [
          {
            version: '1.0.0',
            type: 'PRODUCTION',
            status: 'ACTIVE',
            releasedAt: new Date().toISOString(),
          },
        ],
        pendingRevision: {
          name: 'SS Banking (Updated)',
          permissions: ['camera', 'biometrics'],
          changelog: 'Added biometric authentication capability',
          revisionStatus: 'IN_REVIEW',
        },
      } as any;

      const result = await helper.approve(app, 'admin-1', mockLogActivityFn);

      // Verify that status remains ACTIVE
      expect(result.status).toBe('ACTIVE');
      // Verify pendingRevision is completely cleared
      expect(result.pendingRevision).toBeNull();
      // Verify proposed revision fields are merged into live entity
      expect(result.name).toBe('SS Banking (Updated)');
      expect(result.permissions).toEqual(['camera', 'biometrics']);
      // Verify version bump
      expect(result.currentReleaseVersion).toBe('1.1.0');
      // Verify versionHistory has new active release and previous superseded
      expect(result.versionHistory?.length).toBe(2);
      expect(result.versionHistory?.[0].version).toBe('1.1.0');
      expect(result.versionHistory?.[0].status).toBe('ACTIVE');
      expect(result.versionHistory?.[1].status).toBe('PREVIOUS');
    });
  });

  describe('3. Active App Revision: Reject & Discard', () => {
    it('should reject & discard staged revision while keeping the live app ACTIVE', async () => {
      const app: MiniApp = {
        id: 'app-active-2',
        appId: 'com.test.ss',
        name: 'SS Banking Live',
        status: 'ACTIVE',
        currentReleaseVersion: '1.0.0',
        permissions: ['camera'],
        ownerId: 'user-1',
        ownerEmail: 'owner@test.com',
        pendingRevision: {
          name: 'SS Banking Malicious Update',
          permissions: ['camera', 'contacts_access_all'],
          revisionStatus: 'IN_REVIEW',
        },
      } as any;

      const result = await helper.reject(
        app,
        'High-risk contacts permission rejected',
        'admin-1',
        mockLogActivityFn,
      );

      // Status MUST stay ACTIVE
      expect(result.status).toBe('ACTIVE');
      // Pending revision must be discarded
      expect(result.pendingRevision).toBeNull();
      // Live permissions must NOT be modified
      expect(result.permissions).toEqual(['camera']);
      // Discard notification must be dispatched
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        'user-1',
        'Revision Rejected & Discarded',
        expect.stringContaining('High-risk contacts permission rejected'),
        'REVISION_DISCARDED',
        'app-active-2',
      );
    });
  });

  describe('4. Active App Revision: Request Changes', () => {
    it('should set staged revision to DRAFT with reason, while keeping live app ACTIVE', async () => {
      const app: MiniApp = {
        id: 'app-active-3',
        appId: 'com.test.ss',
        name: 'SS Banking Live',
        status: 'ACTIVE',
        currentReleaseVersion: '1.0.0',
        ownerId: 'user-1',
        ownerEmail: 'owner@test.com',
        pendingRevision: {
          name: 'SS Banking Proposed Revision',
          permissions: ['camera', 'storage'],
          revisionStatus: 'IN_REVIEW',
        },
      } as any;

      const result = await helper.requestChanges(
        app,
        'Please clarify storage permission use-case',
        'admin-1',
        mockLogActivityFn,
      );

      // Status MUST stay ACTIVE
      expect(result.status).toBe('ACTIVE');
      // Staged revision remains but moved to DRAFT for developer remediation
      expect(result.pendingRevision).toBeDefined();
      expect(result.pendingRevision.revisionStatus).toBe('DRAFT');
      expect(result.pendingRevision.changesRequestedReason).toBe(
        'Please clarify storage permission use-case',
      );
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        'user-1',
        'Changes Requested on Staged Revision',
        expect.stringContaining('Please clarify storage permission use-case'),
        'CHANGES_REQUESTED',
        'app-active-3',
      );
    });
  });
});
