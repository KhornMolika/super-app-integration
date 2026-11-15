/**
 * Passwords someone else chose: a seed account's first password and accounts
 * created (or reset) by a Super Admin or Admin. After signing in with one the
 * user must choose their own before anything else works, in the Backoffice
 * and on the phone. No shared seed password works as a fallback any more.
 */
import { OFFICIAL_SEEDS } from '../../src/access-control/access-control.service';
import { AuthRateLimiter } from '../../src/mobile/auth-rate-limiter';
import { bootApp, E2eApp } from './support/app';
import {
  createStaffUser,
  data,
  PASSWORD,
  staff,
  Staff,
  uniq,
} from './support/fixtures';

const CHOSEN = 'Own-Chosen-Passw0rd!';

describe('Changing a password someone else chose', () => {
  let e: E2eApp;
  let sa: Staff;
  let admin: Staff;

  beforeAll(async () => {
    e = await bootApp();
    sa = await staff(e, 'SUPER_ADMIN', 'FTC');
    admin = await staff(e, 'ADMIN', 'FTC');
  });
  afterAll(() => e?.close());
  beforeEach(() => e.app.get(AuthRateLimiter).reset());

  const staffLogin = (email: string, password: string) =>
    e.http().post('/auth/login').send({ email, password });
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  describe('a Backoffice account created by an admin', () => {
    const email = `${uniq('created')}@e2e.local`;
    let first: any;

    it('signs in with the given password, flagged must_change_password', async () => {
      const created = await e
        .http()
        .post('/users')
        .set(admin.auth)
        .send({
          name: 'Created By Admin',
          email,
          password: PASSWORD,
          organizationId: admin.orgId,
          roleNames: ['MA_DEVELOPER'],
        });
      expect([200, 201]).toContain(created.status);
      const res = await staffLogin(email, PASSWORD);
      expect(res.status).toBe(200);
      first = data(res);
      expect(first.must_change_password).toBe(true);
    });

    it('can do nothing but read its profile and change the password', async () => {
      const blocked = await e
        .http()
        .get('/mini-apps')
        .set(bearer(first.access_token));
      expect(blocked.status).toBe(403);
      expect(blocked.body.code).toBe('PASSWORD_CHANGE_REQUIRED');
      expect(
        (await e.http().get('/users/me').set(bearer(first.access_token)))
          .status,
      ).toBe(200);
    });

    it('must choose a different password', async () => {
      const same = await e
        .http()
        .post('/auth/change-password')
        .set(bearer(first.access_token))
        .send({ oldPassword: PASSWORD, newPassword: PASSWORD });
      expect(same.status).toBe(400);
    });

    it('after the change: new tokens work, the old session ends, the flag is gone', async () => {
      const res = await e
        .http()
        .post('/auth/change-password')
        .set(bearer(first.access_token))
        .send({ oldPassword: PASSWORD, newPassword: CHOSEN });
      expect([200, 201]).toContain(res.status);
      const fresh = data(res);
      expect(fresh.must_change_password).toBe(false);
      expect(
        (await e.http().get('/mini-apps').set(bearer(fresh.access_token)))
          .status,
      ).toBe(200);
      const oldRefresh = await e
        .http()
        .post('/auth/refresh')
        .send({ refresh_token: first.refresh_token });
      expect(data(oldRefresh)?.access_token).toBeUndefined();
      expect((await staffLogin(email, PASSWORD)).status).toBe(401);
      expect(data(await staffLogin(email, CHOSEN)).must_change_password).toBe(
        false,
      );
    });
  });

  it('a password an admin resets for someone is flagged; one chosen by the user is not', async () => {
    const user = await createStaffUser(e, 'MA_DEVELOPER', 'FTC');
    expect(
      data(await staffLogin(user.email, PASSWORD)).must_change_password,
    ).toBe(false);
    const reset = await e
      .http()
      .put(`/users/${user.id}`)
      .set(admin.auth)
      .send({ password: 'Admin-Reset-Passw0rd!' });
    expect(reset.status).toBe(200);
    expect(
      data(await staffLogin(user.email, 'Admin-Reset-Passw0rd!'))
        .must_change_password,
    ).toBe(true);
  });

  describe('a phone account created by the Super Admin', () => {
    const email = `${uniq('phonecreated')}@e2e.local`;
    let first: any;

    it('signs in flagged; the app can only change the password', async () => {
      const created = await e
        .http()
        .post('/users')
        .set(sa.auth)
        .send({
          accountType: 'CONSUMER',
          name: 'Phone By Admin',
          email,
          password: PASSWORD,
        });
      expect([200, 201]).toContain(created.status);
      const res = await e
        .http()
        .post('/mobile/auth/login')
        .send({ email, password: PASSWORD });
      expect(res.status).toBe(200);
      first = data(res);
      expect(first.must_change_password).toBe(true);
      const blocked = await e
        .http()
        .get('/mobile/mini-apps')
        .set(bearer(first.access_token));
      expect(blocked.status).toBe(403);
      expect(blocked.body.code).toBe('PASSWORD_CHANGE_REQUIRED');
      expect(
        (await e.http().get('/mobile/me').set(bearer(first.access_token)))
          .status,
      ).toBe(200);
    });

    it('after the change the app works', async () => {
      const res = await e
        .http()
        .post('/mobile/me/password')
        .set(bearer(first.access_token))
        .send({ currentPassword: PASSWORD, newPassword: CHOSEN });
      expect(res.status).toBe(200);
      const fresh = data(res);
      expect(fresh.must_change_password).toBe(false);
      expect(
        (
          await e
            .http()
            .get('/mobile/mini-apps')
            .set(bearer(fresh.access_token))
        ).status,
      ).toBe(200);
    });
  });

  describe('official seed accounts', () => {
    const master = process.env.SUPERADMIN_PASSWORD;
    const seedEmail = Object.keys(OFFICIAL_SEEDS).find(
      (k) => OFFICIAL_SEEDS[k].roleName === 'SUPER_ADMIN',
    );

    (master && seedEmail ? it : it.skip)(
      'the first sign-in with the seed password asks for the owner own password',
      async () => {
        const res = await staffLogin(seedEmail!, master!);
        expect(res.status).toBe(200);
        expect(data(res).must_change_password).toBe(true);
        const changed = await e
          .http()
          .post('/auth/change-password')
          .set(bearer(data(res).access_token))
          .send({ oldPassword: master, newPassword: CHOSEN });
        expect([200, 201]).toContain(changed.status);
      },
    );

    (master && seedEmail ? it : it.skip)(
      'once changed, the seed password no longer works anywhere',
      async () => {
        expect((await staffLogin(seedEmail!, master!)).status).toBe(401);
        expect(
          (
            await e
              .http()
              .post('/mobile/auth/login')
              .send({ email: seedEmail, password: master })
          ).status,
        ).toBe(401);
        expect(
          data(await staffLogin(seedEmail!, CHOSEN)).must_change_password,
        ).toBe(false);
      },
    );

    (seedEmail ? it : it.skip)(
      'a deactivated seed account stays out (no forced reactivation)',
      async () => {
        await e.db.query(
          `UPDATE identities SET status = 'INACTIVE' WHERE email = $1`,
          [seedEmail],
        );
        expect((await staffLogin(seedEmail!, CHOSEN)).status).toBe(401);
        const [row] = await e.db.query(
          `SELECT status FROM identities WHERE email = $1`,
          [seedEmail],
        );
        expect(row.status).toBe('INACTIVE');
      },
    );
  });

  it('a self-registered account is never flagged', async () => {
    const res = await e
      .http()
      .post('/mobile/auth/login')
      .send({
        email: (await createStaffUser(e, 'STAFF', 'FTC')).email,
        password: PASSWORD,
      });
    expect(data(res).must_change_password).toBe(false);
  });
});
