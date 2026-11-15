/**
 * Taking a live app off the phones and bringing it back.
 *
 *   suspend / resume              ADMIN of the app's organization or SUPER_ADMIN
 *   request-archive               ADMIN; SUPER_ADMIN archives or declines
 *   archive / restore             SUPER_ADMIN only; archived = read-only
 *
 * Every step is recorded in mini_app_status_events and takes effect on the
 * phones at once (catalog and token exchange, every build).
 */
import { bootApp, E2eApp } from './support/app';
import {
  action,
  appAt,
  appRow,
  events,
  listed,
  opens,
  phoneUser,
  PhoneUser,
  staff,
  Staff,
  scanResult,
  stages,
} from './support/fixtures';

describe('Suspend, archive and restore', () => {
  let e: E2eApp;
  let dev: Staff;
  let sa: Staff;
  let admin: Staff;
  let foreignAdmin: Staff;
  let phone: PhoneUser;

  beforeAll(async () => {
    e = await bootApp();
    dev = await staff(e, 'MA_DEVELOPER', 'FTC');
    sa = await staff(e, 'SUPER_ADMIN', 'FTC');
    admin = await staff(e, 'ADMIN', 'FTC');
    foreignAdmin = await staff(e, 'ADMIN', 'SERC');
    phone = await phoneUser(e);
  });
  afterAll(() => e?.close());

  const onPhones = async (id: string) => ({
    debug: await listed(e, phone, id, 'debug'),
    release: await listed(e, phone, id, 'release'),
    opensDebug: await opens(e, phone, id, 'debug'),
    opensRelease: await opens(e, phone, id, 'release'),
  });
  const GONE = {
    debug: false,
    release: false,
    opensDebug: 403,
    opensRelease: 403,
  };
  const BACK = {
    debug: true,
    release: true,
    opensDebug: 200,
    opensRelease: 200,
  };
  const REASON = { reason: 'Complaints from users about payments' };

  describe('suspend and resume', () => {
    let id: string;
    beforeAll(async () => {
      id = await appAt(e, dev, sa, 'LIVE');
    });

    it('resume refuses an app that is not suspended', async () => {
      const res = await action(e, sa, id, 'resume');
      expect(res.status).toBe(400);
    });

    it('a suspension needs a reason', async () => {
      const res = await action(e, admin, id, 'suspend', { reason: 'x' });
      expect(res.status).toBe(400);
      expect((await appRow(e, id)).status).toBe('LIVE');
    });

    it('an ADMIN of another organization cannot suspend it', async () => {
      const res = await action(e, foreignAdmin, id, 'suspend', REASON);
      expect([403, 404]).toContain(res.status);
      expect((await appRow(e, id)).status).toBe('LIVE');
    });

    it('the organization ADMIN suspends: off every phone at once, event recorded', async () => {
      expect((await action(e, admin, id, 'suspend', REASON)).status).toBe(201);
      expect((await appRow(e, id)).status).toBe('SUSPENDED');
      expect(await stages(e, id)).toEqual(['1.0.0:ACTIVE']);
      expect(await onPhones(id)).toEqual(GONE);
      expect(await events(e, id)).toEqual(['SUSPENDED']);
    });

    it('suspending twice is refused', async () => {
      const res = await action(e, sa, id, 'suspend', REASON);
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already suspended/i);
    });

    it('the Backoffice still shows the suspension details', async () => {
      const res = await e.http().get(`/mini-apps/${id}`).set(admin.auth);
      expect(res.status).toBe(200);
      const app = res.body.data ?? res.body;
      expect(app.availabilityStatus).toBe('SUSPENDED');
      expect(app.suspension).toEqual(
        expect.objectContaining({ reason: REASON.reason }),
      );
    });

    it('resume: back on every phone, event recorded', async () => {
      expect((await action(e, sa, id, 'resume')).status).toBe(201);
      expect((await appRow(e, id)).status).toBe('LIVE');
      expect(await onPhones(id)).toEqual(BACK);
      expect(await events(e, id)).toEqual(['SUSPENDED', 'RESUMED']);
    });
  });

  describe('archive', () => {
    let id: string;
    beforeAll(async () => {
      id = await appAt(e, dev, sa, 'LIVE');
    });

    it('only a SUPER_ADMIN archives directly; an ADMIN asks', async () => {
      const res = await action(e, admin, id, 'archive', REASON);
      expect(res.status).toBe(403);
      expect(
        (await action(e, admin, id, 'request-archive', REASON)).status,
      ).toBe(201);
      expect((await appRow(e, id)).status).toBe('LIVE');
      expect(await events(e, id)).toEqual(['ARCHIVE_REQUESTED']);
    });

    it('a declined request leaves the app live', async () => {
      expect(
        (
          await action(e, sa, id, 'decline-archive', {
            reason: 'Still needed by users',
          })
        ).status,
      ).toBe(201);
      expect((await appRow(e, id)).status).toBe('LIVE');
      expect(await listed(e, phone, id, 'release')).toBe(true);
      expect(await events(e, id)).toEqual([
        'ARCHIVE_REQUESTED',
        'ARCHIVE_DECLINED',
      ]);
    });

    it('archive: off the phones, read-only for everyone', async () => {
      await action(e, admin, id, 'request-archive', REASON);
      expect((await action(e, sa, id, 'archive', REASON)).status).toBe(201);
      expect((await appRow(e, id)).status).toBe('ARCHIVED');
      expect(await onPhones(id)).toEqual(GONE);
      const edit = await e
        .http()
        .patch(`/mini-apps/${id}`)
        .set(dev.auth)
        .send({ tagline: 'changed' });
      expect(edit.status).toBe(400);
      expect(edit.body.message).toMatch(/archived/i);
      expect((await action(e, dev, id, 'submit')).status).toBe(400);
    });

    it('a suspended app can be archived too', async () => {
      const other = await appAt(e, dev, sa, 'LIVE');
      await action(e, sa, other, 'suspend', REASON);
      expect((await action(e, sa, other, 'archive', REASON)).status).toBe(201);
      expect((await appRow(e, other)).status).toBe('ARCHIVED');
    });

    it('only a SUPER_ADMIN restores; a restored app is a draft and off the phones', async () => {
      expect((await action(e, admin, id, 'restore')).status).toBe(403);
      expect((await action(e, sa, id, 'restore')).status).toBe(201);
      expect((await appRow(e, id)).status).toBe('DRAFT');
      expect(await listed(e, phone, id, 'release')).toBe(false);
      expect((await events(e, id)).slice(-2)).toEqual(['ARCHIVED', 'RESTORED']);
    });
    it('a restored app can be submitted for review again', async () => {
      expect((await action(e, dev, id, 'submit')).status).toBe(201);
      expect((await stages(e, id))[0]).toMatch(/:SUBMITTED$/);
    });
  });

  it('rollback is refused on a suspended or archived app (Resume / Restore first)', async () => {
    const id = await appAt(e, dev, sa, 'LIVE');
    await e
      .http()
      .patch(`/mini-apps/${id}`)
      .set(dev.auth)
      .send({ version: '1.1.0', tagline: 'v1.1' });
    await scanResult(e, id, 'PASSED');
    expect((await action(e, sa, id, 'approve')).status).toBe(201);
    await action(e, sa, id, 'suspend', REASON);
    const suspended = await action(e, sa, id, 'rollback', {
      targetVersion: '1.0.0',
    });
    expect(suspended.status).toBe(400);
    expect(suspended.body.message).toMatch(/Resume it first/);
    expect((await appRow(e, id)).status).toBe('SUSPENDED');
    expect(await listed(e, phone, id, 'release')).toBe(false);
    await action(e, sa, id, 'archive', REASON);
    expect(
      (await action(e, sa, id, 'rollback', { targetVersion: '1.0.0' })).status,
    ).toBe(400);
    expect((await appRow(e, id)).status).toBe('ARCHIVED');
    expect(await stages(e, id)).toEqual(['1.1.0:ACTIVE', '1.0.0:PREVIOUS']);
  });

  it('a developer cannot suspend, resume, archive or restore', async () => {
    const id = await appAt(e, dev, sa, 'LIVE');
    for (const name of [
      'suspend',
      'resume',
      'request-archive',
      'archive',
      'decline-archive',
      'restore',
    ]) {
      expect((await action(e, dev, id, name, REASON)).status).toBe(403);
    }
    expect((await appRow(e, id)).status).toBe('LIVE');
  });
});
