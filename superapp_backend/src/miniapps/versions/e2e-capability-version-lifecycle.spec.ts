import { MiniAppVersionsService } from './miniapp-versions.service';
import { MiniappLifecycleHelper } from '../helpers/miniapp-lifecycle.helper';
import { MiniApp, MiniAppLifecycleStatus, MiniAppAvailabilityStatus } from '../entities/miniapp.entity';
import { MiniAppVersion, MiniAppVersionStatus } from '../entities/miniapp-version.entity';
import { VersionCapabilityStatus } from '../entities/miniapp-version-capability.entity';
import { toCatalogItem } from '../../mobile/mobile-catalog.service';

/** In-memory stand-in for TypeORM repository */
function memoryRepo<T>(EntityClass?: new () => T) {
  const rows: any[] = [];
  let seq = 0;
  const test = (row: any, where: Record<string, any>) =>
    Object.entries(where).every(([k, v]) => {
      if (v && typeof v === 'object' && v._type === 'in') return v._value.includes(row[k]);
      if (v && typeof v === 'object' && v._type === 'not') return row[k] !== v._value;
      return row[k] === v;
    });
  const sort = (list: any[], order?: Record<string, string>) => {
    const [[k, dir]] = Object.entries(order || { createdAt: 'ASC' });
    return [...list].sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (dir === 'DESC' ? -1 : 1));
  };
  return {
    rows,
    create: (x: any) => EntityClass ? Object.assign(new EntityClass(), x) : { ...x },
    save: jest.fn(async (x: any) => {
      const entity = EntityClass && !(x instanceof EntityClass) ? Object.assign(new EntityClass(), x) : x;
      if (!entity.id) {
        entity.id = `row-${++seq}`;
        entity.createdAt = new Date(Date.now() + seq * 1000);
        rows.push(entity);
      } else {
        const idx = rows.findIndex((r) => r.id === entity.id);
        if (idx !== -1) rows[idx] = Object.assign(rows[idx], entity);
        else rows.push(entity);
      }
      return entity;
    }),
    find: jest.fn(async ({ where, order }: any = {}) => sort(rows.filter((r) => test(r, where || {})), order)),
    findOne: jest.fn(async ({ where, order }: any = {}) => sort(rows.filter((r) => test(r, where)), order)[0] ?? null),
    update: jest.fn(async (where: any, patch: any) => {
      rows.filter((r) => test(r, where)).forEach((r) => Object.assign(r, patch));
    }),
    delete: jest.fn(async (where: any) => {
      for (let i = rows.length - 1; i >= 0; i--) if (test(rows[i], where)) rows.splice(i, 1);
    }),
  };
}

describe('E2E Capability Version Upgrade & Zero-Binary Rollback Workflow', () => {
  const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
  const MINI_APP_ID = '22222222-2222-4222-8222-222222222222';

  let versionsRepo: any;
  let capsRepo: any;
  let appsRepo: any;
  let versionsService: MiniAppVersionsService;
  let lifecycleHelper: MiniappLifecycleHelper;
  let loggedActivities: any[];

  beforeEach(() => {
    versionsRepo = memoryRepo(MiniAppVersion);
    capsRepo = memoryRepo();
    appsRepo = memoryRepo(MiniApp);
    loggedActivities = [];

    versionsService = new MiniAppVersionsService(
      versionsRepo as any,
      capsRepo as any,
      appsRepo as any,
    );

    const mockNotifications = { createNotification: jest.fn().mockResolvedValue({}) };
    const mockMail = { sendMiniAppApprovedEmail: jest.fn().mockResolvedValue({}) };
    const mockJenkins = {
      triggerSuperAppBuild: jest.fn().mockResolvedValue({ success: true }),
      triggerSuperAppSandboxBuild: jest.fn().mockResolvedValue({ success: true }),
    };
    const mockSuperApp = {
      getAndRegisterNextVersion: jest.fn().mockResolvedValue('v1.0.0'),
      findLatestCapability: jest.fn().mockResolvedValue({ capabilities: [] }),
    };

    lifecycleHelper = new MiniappLifecycleHelper(
      appsRepo as any,
      mockNotifications as any,
      mockMail as any,
      mockJenkins as any,
      mockSuperApp as any,
      {} as any,
      { paceBuildTrigger: jest.fn().mockResolvedValue(undefined) } as any,
      { getDeployPrivateKey: jest.fn().mockReturnValue('') } as any,
      {
        injectMiniApp: jest.fn().mockResolvedValue({ success: true }),
        validateDependencies: jest.fn().mockResolvedValue({ success: true }),
        regenerateRegistry: jest.fn().mockResolvedValue(undefined),
      } as any,
      {} as any, // storageService
      {} as any, // nexusService
      {} as any, // apkBuildManager
      {} as any, // capabilitiesService
      {} as any, // artifactPublisher
      {} as any, // runs
      versionsService, // versions
    );
  });

  const mockLogActivity = async (
    miniAppId: string,
    actorId: string,
    actionType: string,
    title: string,
    description: string,
    auditAction: string,
    oldVal?: any,
    newVal?: any,
  ) => {
    loggedActivities.push({
      miniAppId,
      actorId,
      actionType,
      title,
      description,
      auditAction,
      oldVal,
      newVal,
    });
  };

  it('executes full sequence: v1.0.0 publish -> v1.1.0 capability proposal -> review -> production release -> instant rollback', async () => {
    // -------------------------------------------------------------------------
    // STEP 1: INITIAL DEPLOYMENT (v1.0.0 with get_location)
    // -------------------------------------------------------------------------
    const bankingApp = Object.assign(new MiniApp(), {
      id: MINI_APP_ID,
      appId: 'kh.gov.fsa.banking',
      name: 'DPS Banking',
      tagline: 'Modern Digital Banking',
      description: 'Full-service financial portal inside FSA SuperApp',
      integrationMethod: 'WEBVIEW',
      integrationConfig: {
        webUrl: 'https://banking.fintechcenterfsa.com',
      },
      currentReleaseVersion: '1.0.0',
      appStatus: 'LIVE',
      status: 'ACTIVE',
      lifecycleStatus: MiniAppLifecycleStatus.ACTIVE,
      availabilityStatus: MiniAppAvailabilityStatus.PRODUCTION,
      capabilities: ['get_location'],
      targetAudience: 'PUBLIC',
      versionHistory: [],
    });

    await appsRepo.save(bankingApp);
    await versionsService.syncFromApp(bankingApp);

    // Initial version row is created as ACTIVE
    const initialVersions = await versionsRepo.find({ where: { miniAppId: MINI_APP_ID } });
    expect(initialVersions).toHaveLength(1);
    expect(initialVersions[0].version).toBe('1.0.0');
    expect(initialVersions[0].status).toBe(MiniAppVersionStatus.ACTIVE);

    // Initial capability row is approved
    await versionsService.approveVersion(initialVersions[0].id, ADMIN_ID);
    const initialCaps = await capsRepo.find({ where: { versionId: initialVersions[0].id } });
    expect(initialCaps).toHaveLength(1);
    expect(initialCaps[0].capabilityKey).toBe('get_location');
    expect(initialCaps[0].status).toBe(VersionCapabilityStatus.APPROVED);

    // Attach version rows and verify catalog projection for mobile phones
    bankingApp.versions = initialVersions;
    bankingApp.versions[0].capabilityRows = initialCaps;
    bankingApp.versions[0].loadPermissions();
    bankingApp.loadPendingRevision();

    const catalogItemV1 = toCatalogItem(bankingApp);
    expect(catalogItemV1.permissions).toEqual(['get_location']);
    expect(catalogItemV1.permissions).not.toContain('biometric_auth');
    expect(catalogItemV1.permissions).not.toContain('secure_storage');

    // -------------------------------------------------------------------------
    // STEP 2: PROPOSE REVISION v1.1.0 WITH EXPANDED CAPABILITIES
    // -------------------------------------------------------------------------
    // Developer submits revision v1.1.0 asking for biometric_auth and secure_storage
    bankingApp.pendingRevision = {
      version: '1.1.0',
      revisionStatus: 'SUBMITTED',
      submittedAt: new Date(),
      changelog: 'Added biometric funds transfer and encrypted local storage',
      capabilities: ['get_location', 'biometric_auth', 'secure_storage'],
    };

    await versionsService.persistRevision(bankingApp);

    // Verify version table now contains 2 rows: v1.0.0 (ACTIVE) and v1.1.0 (SUBMITTED)
    const midVersions = await versionsRepo.find({ where: { miniAppId: MINI_APP_ID } });
    expect(midVersions).toHaveLength(2);
    const liveRow = midVersions.find((v: any) => v.version === '1.0.0');
    const draftRow = midVersions.find((v: any) => v.version === '1.1.0');

    expect(liveRow.status).toBe(MiniAppVersionStatus.ACTIVE);
    expect(draftRow.status).toBe('SUBMITTED');

    // Capabilities for v1.1.0 are created in REQUESTED state
    const draftCaps = await capsRepo.find({ where: { versionId: draftRow.id } });
    expect(draftCaps).toHaveLength(3);
    const capKeys = draftCaps.map((c: any) => c.capabilityKey);
    expect(capKeys).toContain('get_location');
    expect(capKeys).toContain('biometric_auth');
    expect(capKeys).toContain('secure_storage');
    expect(draftCaps.find((c: any) => c.capabilityKey === 'biometric_auth').status).toBe(
      VersionCapabilityStatus.REQUESTED,
    );

    // Crucial Security Gate: Live phones STILL only see v1.0.0 permissions
    bankingApp.versions = midVersions;
    bankingApp.loadPendingRevision();
    const catalogItemWhileUnderReview = toCatalogItem(bankingApp);
    expect(catalogItemWhileUnderReview.permissions).toEqual(['get_location']);
    expect(catalogItemWhileUnderReview.permissions).not.toContain('biometric_auth');

    // -------------------------------------------------------------------------
    // STEP 3: GOVERNANCE APPROVAL FOR v1.1.0
    // -------------------------------------------------------------------------
    // Administrator reviews and approves the capabilities
    await versionsService.approveVersion(draftRow.id, ADMIN_ID);
    const approvedDraftCaps = await capsRepo.find({ where: { versionId: draftRow.id } });
    expect(
      approvedDraftCaps.every((c: any) => c.status === VersionCapabilityStatus.APPROVED),
    ).toBe(true);

    // -------------------------------------------------------------------------
    // STEP 4: PRODUCTION PROMOTION (Publish v1.1.0 to Live)
    // -------------------------------------------------------------------------
    // Publish draft to production
    await versionsService.publishDraft(
      bankingApp,
      '1.1.0',
      ADMIN_ID,
      'Release v1.1.0 with biometrics',
    );
    bankingApp.currentReleaseVersion = '1.1.0';
    bankingApp.pendingRevision = null;
    bankingApp.capabilities = ['get_location', 'biometric_auth', 'secure_storage'];
    await appsRepo.save(bankingApp);

    // Verify version row transitions:
    // v1.0.0 transitioned from ACTIVE -> PREVIOUS
    // v1.1.0 transitioned from SUBMITTED -> ACTIVE
    const publishedVersions = await versionsRepo.find({ where: { miniAppId: MINI_APP_ID } });
    const oldRow = publishedVersions.find((v: any) => v.version === '1.0.0');
    const newActiveRow = publishedVersions.find((v: any) => v.version === '1.1.0');

    expect(oldRow.status).toBe(MiniAppVersionStatus.PREVIOUS);
    expect(newActiveRow.status).toBe(MiniAppVersionStatus.ACTIVE);
    expect(newActiveRow.releasedAt).toBeInstanceOf(Date);

    // Verify phone catalog projection: mobile phones now receive all 3 capabilities!
    bankingApp.versions = publishedVersions;
    bankingApp.versions.forEach((v: any) => {
      v.capabilityRows = approvedDraftCaps.filter((c: any) => c.versionId === v.id);
      v.loadPermissions();
    });
    bankingApp.loadPendingRevision();

    const catalogItemV11 = toCatalogItem(bankingApp);
    expect(catalogItemV11.permissions).toEqual([
      'get_location',
      'biometric_auth',
      'secure_storage',
    ]);

    // -------------------------------------------------------------------------
    // STEP 5: INSTANT ZERO-BINARY ROLLBACK (v1.1.0 -> v1.0.0)
    // -------------------------------------------------------------------------
    // Emergency: A critical crash is reported with biometric scanner on older devices.
    // Super Admin executes one-click rollback in Backoffice to v1.0.0
    await lifecycleHelper.rollbackToVersion(
      bankingApp,
      '1.0.0',
      ADMIN_ID,
      mockLogActivity,
      'Critical biometric scanner crash on older devices',
    );

    // Verify database state after rollback
    expect(bankingApp.currentReleaseVersion).toBe('1.0.0');

    const versionsAfterRollback = await versionsRepo.find({ where: { miniAppId: MINI_APP_ID } });
    const rolledBackActiveRow = versionsAfterRollback.find((v: any) => v.version === '1.0.0');
    const demotedRow = versionsAfterRollback.find((v: any) => v.version === '1.1.0');

    // v1.0.0 is back to ACTIVE
    expect(rolledBackActiveRow.status).toBe(MiniAppVersionStatus.ACTIVE);
    // v1.1.0 is demoted to PREVIOUS
    expect(demotedRow.status).toBe(MiniAppVersionStatus.PREVIOUS);

    // Verify audit log
    expect(loggedActivities).toHaveLength(1);
    expect(loggedActivities[0]).toMatchObject({
      miniAppId: MINI_APP_ID,
      actorId: ADMIN_ID,
      auditAction: 'ROLLBACK_VERSION',
      title: 'Rolled back DPS Banking to 1.0.0',
      description: 'Critical biometric scanner crash on older devices',
    });

    // Verify immediate runtime effect on mobile phones:
    // toCatalogItem instantly returns only v1.0.0 permissions
    bankingApp.versions = versionsAfterRollback;
    bankingApp.versions.forEach((v: any) => {
      v.capabilityRows = (v.version === '1.0.0' ? initialCaps : approvedDraftCaps).filter(
        (c: any) => c.versionId === v.id,
      );
      v.loadPermissions();
    });
    bankingApp.loadPendingRevision();

    const catalogItemAfterRollback = toCatalogItem(bankingApp);
    expect(catalogItemAfterRollback.permissions).toEqual(['get_location']);
    expect(catalogItemAfterRollback.permissions).not.toContain('biometric_auth');
    expect(catalogItemAfterRollback.permissions).not.toContain('secure_storage');

    // The rollback succeeded with zero Jenkins builds and zero binary recompilation!
  });
});
