/**
 * User accounts in the Backoffice: what an organization ADMIN may manage
 * (only their own organization's staff), editing mobile app users, and
 * sign-up answers that do not reveal which emails have an account.
 */
import { MailService } from '../../src/notifications/channels/mail.service';
import { bootApp, E2eApp } from './support/app';
import {
  createStaffUser,
  data,
  orgId,
  PASSWORD,
  staff,
  Staff,
  uniq,
} from './support/fixtures';

describe('User management', () => {
  let e: E2eApp;
  let sa: Staff;
  let admin: Staff;

  beforeAll(async () => {
    e = await bootApp();
    sa = await staff(e, 'SUPER_ADMIN', 'FTC');
    admin = await staff(e, 'ADMIN', 'FTC');
    // Mail is off in the tests: answer as a working mailer would (sent)
    jest
      .spyOn(e.app.get(MailService), 'sendBackofficeEmailVerification')
      .mockResolvedValue({ status: 'sent', id: 'e2e' } as any);
  });
  afterAll(() => e?.close());

  /** The body the Backoffice user edit form sends. */
  const editForm = (
    u: { email: string; orgId?: string },
    extra: Record<string, unknown> = {},
  ) => ({
    name: 'Edited Name',
    email: u.email,
    phoneNumber: '+855 12 345 678',
    roleNames: ['MA_DEVELOPER'],
    organizationId: u.orgId ?? '',
    isActive: true,
    ...extra,
  });

  describe('an organization ADMIN manages only their own organization', () => {
    let own: { id: string; email: string; orgId: string };
    let other: { id: string; email: string; orgId: string };

    beforeAll(async () => {
      own = await createStaffUser(e, 'MA_DEVELOPER', 'FTC');
      other = await createStaffUser(e, 'MA_DEVELOPER', 'SERC');
    });

    it('lists only users of their organization', async () => {
      const res = await e.http().get('/users?limit=100').set(admin.auth);
      expect(res.status).toBe(200);
      const items: any[] = data(res)?.items ?? data(res);
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((u) => u.organizationId === admin.orgId)).toBe(true);
      expect(items.find((u) => u.id === other.id)).toBeUndefined();
    });

    it('edits a user of their organization', async () => {
      expect(
        (
          await e
            .http()
            .put(`/users/${own.id}`)
            .set(admin.auth)
            .send(editForm(own))
        ).status,
      ).toBe(200);
    });

    it('cannot see, edit or delete a user of another organization', async () => {
      expect(
        (await e.http().get(`/users/${other.id}`).set(admin.auth)).status,
      ).toBe(404);
      expect(
        (
          await e
            .http()
            .put(`/users/${other.id}`)
            .set(admin.auth)
            .send({ name: 'Hijack' })
        ).status,
      ).toBe(404);
      expect(
        (await e.http().delete(`/users/${other.id}`).set(admin.auth)).status,
      ).toBe(404);
    });

    it('cannot create or move users into another organization', async () => {
      const serc = await orgId(e.db, 'SERC');
      const create = await e
        .http()
        .post('/users')
        .set(admin.auth)
        .send({
          name: 'Outsider',
          email: `${uniq('out')}@e2e.local`,
          organizationId: serc,
          roleNames: ['MA_DEVELOPER'],
        });
      expect(create.status).toBe(403);
      expect(
        (
          await e
            .http()
            .put(`/users/${own.id}`)
            .set(admin.auth)
            .send({ organizationId: serc })
        ).status,
      ).toBe(403);
    });

    it('cannot grant Super Admin, touch a Super Admin, or manage mobile app users', async () => {
      const grant = await e
        .http()
        .post('/users')
        .set(admin.auth)
        .send({
          name: 'Boss',
          email: `${uniq('boss')}@e2e.local`,
          organizationId: admin.orgId,
          roleNames: ['SUPER_ADMIN'],
        });
      expect(grant.status).toBe(403);
      expect(
        (
          await e
            .http()
            .put(`/users/${sa.id}`)
            .set(admin.auth)
            .send({ isActive: false })
        ).status,
      ).toBe(403);
      const phone = await e
        .http()
        .post('/users')
        .set(admin.auth)
        .send({
          accountType: 'CONSUMER',
          name: 'Phone',
          email: `${uniq('ph')}@e2e.local`,
        });
      expect(phone.status).toBe(403);
    });

    it('cannot set a password hash directly', async () => {
      const before = await e.db.query(
        `SELECT "passwordHash" FROM identities WHERE id = $1`,
        [own.id],
      );
      await e
        .http()
        .put(`/users/${own.id}`)
        .set(admin.auth)
        .send({ passwordHash: 'attacker-chosen' });
      const after = await e.db.query(
        `SELECT "passwordHash" FROM identities WHERE id = $1`,
        [own.id],
      );
      expect(after[0].passwordHash).toBe(before[0].passwordHash);
    });
  });

  it('the edit form saves a mobile app user (no organization or role applies)', async () => {
    const created = await e
      .http()
      .post('/users')
      .set(sa.auth)
      .send({
        accountType: 'CONSUMER',
        name: 'Phone User',
        email: `${uniq('pu')}@e2e.local`,
      });
    const user = data(created);
    const res = await e
      .http()
      .put(`/users/${user.id}`)
      .set(sa.auth)
      .send(editForm({ email: user.email }, { roleNames: ['STAFF'] }));
    expect(res.status).toBe(200);
    const saved = data(res);
    expect(saved.name).toBe('Edited Name');
    expect(saved.accountType).toBe('CONSUMER');
    expect(saved.phoneNumber).toBe('+855 12 345 678');
    const profiles = await e.db.query(
      `SELECT 1 FROM staff_profiles WHERE "identityId" = $1`,
      [user.id],
    );
    expect(profiles).toHaveLength(0);
  });

  describe('sign-up does not reveal which emails have an account', () => {
    const signUp = (email: string) =>
      e
        .http()
        .post('/auth/register')
        .send({ name: 'New Person', email, password: PASSWORD });
    const resend = (email: string) =>
      e
        .http()
        .post('/auth/request-otp')
        .send({ email, purpose: 'EMAIL_VERIFICATION' });
    const shape = (res: { status: number; body: any }) => ({
      status: res.status,
      success: data(res)?.success ?? res.body?.success,
      message: data(res)?.message ?? res.body?.message,
    });

    it('signing up with a registered email answers like a new sign-up, and changes nothing', async () => {
      const existing = await createStaffUser(e, 'MA_DEVELOPER', 'FTC');
      const fresh = await signUp(`${uniq('fresh')}@e2e.local`);
      const taken = await signUp(existing.email);
      expect(shape(taken)).toEqual(shape(fresh));
      // The existing account still signs in with its own password
      expect(
        (
          await e
            .http()
            .post('/auth/login')
            .send({ email: existing.email, password: PASSWORD })
        ).status,
      ).toBe(200);
    });

    it('asking for a verification code: unknown, verified and pending emails get the same answer', async () => {
      const pending = `${uniq('pending')}@e2e.local`;
      await signUp(pending);
      const verified = await createStaffUser(e, 'MA_DEVELOPER', 'FTC');
      const answers = [
        await resend(`${uniq('nobody')}@e2e.local`),
        await resend(verified.email),
        await resend(pending),
      ].map((r) => ({
        status: r.status,
        success: data(r)?.success ?? r.body?.success,
      }));
      expect(answers).toEqual([answers[2], answers[2], answers[2]]);
      expect(answers[2]).toEqual({ status: expect.any(Number), success: true });
    });
  });
});
