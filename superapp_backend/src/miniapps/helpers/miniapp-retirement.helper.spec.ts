import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MiniappRetirementHelper, RetirementActor } from './miniapp-retirement.helper';

const superAdmin: RetirementActor = { id: 'sa-1', name: 'Super', roles: ['SUPER_ADMIN'] };
const admin: RetirementActor = { id: 'ad-1', name: 'Regulator', roles: ['ADMIN'] };

function setup() {
  const repo = { save: jest.fn(async (a) => a) };
  const notifications = {
    createNotification: jest.fn(async () => ({})),
    notifyAdmins: jest.fn(async () => ({})),
  };
  const log = jest.fn(async () => undefined);
  const helper = new MiniappRetirementHelper(repo as any, notifications as any);
  return { helper, repo, notifications, log };
}

const app = (over: Record<string, any> = {}): any => ({
  id: 'app-1',
  appId: 'ma_test',
  name: 'Test',
  ownerId: 'dev-1',
  lifecycleStatus: 'TESTING',
  availabilityStatus: 'TESTING',
  ...over,
});

describe('MiniappRetirementHelper', () => {
  describe('suspend', () => {
    it('needs a reason', async () => {
      const { helper, log } = setup();
      await expect(helper.suspend(app(), admin, { reason: ' ' }, log)).rejects.toThrow(BadRequestException);
    });

    it('hides the app and remembers where it was', async () => {
      const { helper, log, notifications } = setup();
      const res = await helper.suspend(app({ availabilityStatus: 'PRODUCTION', lifecycleStatus: 'ACTIVE' }), admin, { reason: 'Fraud reports' }, log);
      expect(res.availabilityStatus).toBe('SUSPENDED');
      expect(res.suspension).toMatchObject({ reason: 'Fraud reports', suspendedById: 'ad-1', previousAvailability: 'PRODUCTION' });
      expect(res.archiveRequest).toBeUndefined();
      expect(notifications.notifyAdmins).not.toHaveBeenCalled();
    });

    it('an ADMIN can ask a Super Admin to archive in the same step', async () => {
      const { helper, log, notifications } = setup();
      const res = await helper.suspend(app(), admin, { reason: 'Data leak found', requestArchive: true }, log);
      expect(res.archiveRequest).toMatchObject({ reason: 'Data leak found', requestedById: 'ad-1' });
      expect(notifications.notifyAdmins).toHaveBeenCalledWith(
        'Archive requested', expect.any(String), 'MINIAPP_ARCHIVE_REQUESTED', 'app-1', expect.anything(), { roles: ['SUPER_ADMIN'] },
      );
    });

    it('refuses drafts and apps already suspended', async () => {
      const { helper, log } = setup();
      await expect(helper.suspend(app({ lifecycleStatus: 'DRAFT' }), admin, { reason: 'Some reason' }, log)).rejects.toThrow(BadRequestException);
      await expect(helper.suspend(app({ availabilityStatus: 'SUSPENDED' }), admin, { reason: 'Some reason' }, log)).rejects.toThrow(BadRequestException);
    });
  });

  describe('resume', () => {
    it('puts availability back and clears the suspension and any request', async () => {
      const { helper, log } = setup();
      const res = await helper.resume(
        app({ availabilityStatus: 'SUSPENDED', suspension: { reason: 'x', suspendedAt: 'now', previousAvailability: 'PRODUCTION' }, archiveRequest: { reason: 'x', requestedAt: 'now' } }),
        admin,
        log,
      );
      expect(res.availabilityStatus).toBe('PRODUCTION');
      expect(res.suspension).toBeNull();
      expect(res.archiveRequest).toBeNull();
    });

    it('does not resume an archived app', async () => {
      const { helper, log } = setup();
      await expect(helper.resume(app({ lifecycleStatus: 'ARCHIVED', availabilityStatus: 'SUSPENDED' }), superAdmin, log)).rejects.toThrow(BadRequestException);
    });
  });

  describe('archive', () => {
    it('is for Super Admins only', async () => {
      const { helper, log } = setup();
      await expect(helper.archive(app(), admin, 'Retired by agency', log)).rejects.toThrow(ForbiddenException);
    });

    it('archives, keeps the App ID, and tells the requester', async () => {
      const { helper, log, notifications } = setup();
      const res = await helper.archive(
        app({ availabilityStatus: 'SUSPENDED', archiveRequest: { reason: 'Data leak found', requestedById: 'ad-1', requestedAt: 'now' } }),
        superAdmin,
        undefined,
        log,
      );
      expect(res.lifecycleStatus).toBe('ARCHIVED');
      expect(res.availabilityStatus).toBe('SUSPENDED');
      expect(res.appId).toBe('ma_test');
      expect(res.archiveRequest).toBeNull();
      expect(res.suspension).toMatchObject({ reason: 'Data leak found', archivedAt: expect.any(String) });
      expect(notifications.createNotification).toHaveBeenCalledWith('ad-1', 'Archive approved', expect.any(String), 'MINIAPP_ARCHIVED', 'app-1');
    });

    it('tells you to delete drafts and rejected apps instead', async () => {
      const { helper, log } = setup();
      await expect(helper.archive(app({ lifecycleStatus: 'DRAFT' }), superAdmin, 'No longer needed', log)).rejects.toThrow(/delete it instead/);
    });
  });

  it('decline clears the request and tells the requester', async () => {
    const { helper, log, notifications } = setup();
    const res = await helper.declineArchive(
      app({ archiveRequest: { reason: 'x', requestedById: 'ad-1', requestedAt: 'now' } }),
      superAdmin,
      'Fixed by the partner',
      log,
    );
    expect(res.archiveRequest).toBeNull();
    expect(notifications.createNotification).toHaveBeenCalledWith('ad-1', 'Archive declined', expect.stringContaining('Fixed by the partner'), 'MINIAPP_ARCHIVE_DECLINED', 'app-1');
  });

  describe('restore', () => {
    it('brings an archived app back as a draft', async () => {
      const { helper, log } = setup();
      const res = await helper.restore(app({ lifecycleStatus: 'ARCHIVED', availabilityStatus: 'SUSPENDED', suspension: { reason: 'x', suspendedAt: 'now' } }), superAdmin, log);
      expect(res.lifecycleStatus).toBe('DRAFT');
      expect(res.availabilityStatus).toBe('TESTING');
      expect(res.suspension).toBeNull();
    });

    it('only works on archived apps, for Super Admins', async () => {
      const { helper, log } = setup();
      await expect(helper.restore(app(), superAdmin, log)).rejects.toThrow(BadRequestException);
      await expect(helper.restore(app({ lifecycleStatus: 'ARCHIVED' }), admin, log)).rejects.toThrow(ForbiddenException);
    });
  });
});
