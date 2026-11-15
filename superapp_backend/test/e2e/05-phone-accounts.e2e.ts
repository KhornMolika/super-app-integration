/**
 * Super App (phone) accounts: sign-up with email verification, sign-in,
 * lockout, sessions, and the wall between phone and Backoffice tokens.
 */
import { MailService } from '../../src/notifications/channels/mail.service';
import { AuthRateLimiter } from '../../src/mobile/auth-rate-limiter';
import { bootApp, E2eApp } from './support/app';
import {
  data,
  PASSWORD,
  phoneUser,
  PhoneUser,
  staff,
  Staff,
  uniq,
} from './support/fixtures';

describe('Phone accounts', () => {
  let e: E2eApp;
  let mails: Array<{ email: string; url: string; otp: string }>;
  let dev: Staff;

  beforeAll(async () => {
    e = await bootApp();
    mails = [];
    jest
      .spyOn(e.app.get(MailService), 'sendEmailVerification')
      .mockImplementation(
        async (email: string, _name: string, url: string, otp: string) => {
          mails.push({ email, url, otp });
          return undefined as any;
        },
      );
    dev = await staff(e, 'MA_DEVELOPER', 'FTC');
  });
  afterAll(() => e?.close());
  // Every request comes from 127.0.0.1: clear the per-IP limits between tests
  const resetLimits = () => e.app.get(AuthRateLimiter).reset();
  beforeEach(() => resetLimits());

  const login = (email: string, password = PASSWORD) =>
    e.http().post('/mobile/auth/login').send({ email, password });

  describe('sign-up', () => {
    const email = `${uniq('signup')}@e2e.local`;

    it('registers and sends a verification code, without a session yet', async () => {
      const res = await e
        .http()
        .post('/mobile/auth/register')
        .send({ email, password: PASSWORD, name: 'New User' });
      expect(res.status).toBe(202);
      expect(data(res).access_token).toBeUndefined();
      expect(mails.find((m) => m.email === email)?.otp).toMatch(/^\d{6}$/);
    });

    it('cannot sign in before the email is verified', async () => {
      expect((await login(email)).status).toBe(401);
    });

    it('a wrong code is refused', async () => {
      const res = await e
        .http()
        .post('/mobile/auth/verify-email')
        .send({ token: '000000' });
      expect(res.status).toBe(400);
    });

    it('the emailed code verifies the account, once', async () => {
      const otp = mails.find((m) => m.email === email)!.otp;
      expect(
        (await e.http().post('/mobile/auth/verify-email').send({ token: otp }))
          .status,
      ).toBe(200);
      expect(
        (await e.http().post('/mobile/auth/verify-email').send({ token: otp }))
          .status,
      ).toBe(400);
      const res = await login(email);
      expect(res.status).toBe(200);
      expect(data(res).access_token).toEqual(expect.any(String));
    });

    it('a weak password is refused', async () => {
      const res = await e
        .http()
        .post('/mobile/auth/register')
        .send({
          email: `${uniq('weak')}@e2e.local`,
          password: '123',
          name: 'Weak',
        });
      expect(res.status).toBe(400);
    });

    it('registering an existing email gives the same answer (no account enumeration)', async () => {
      const res = await e
        .http()
        .post('/mobile/auth/register')
        .send({ email, password: PASSWORD, name: 'Again' });
      expect(res.status).toBe(202);
    });
  });

  describe('sign-in', () => {
    let user: PhoneUser;
    beforeAll(async () => {
      user = await phoneUser(e);
    });

    it('a wrong password and an unknown email get the same answer', async () => {
      const wrong = await login(user.email, 'Wrong-Passw0rd!');
      const unknown = await login('nobody@e2e.local');
      expect([wrong.status, unknown.status]).toEqual([401, 401]);
      expect(wrong.body.message).toBe(unknown.body.message);
    });

    it('locks the account after 5 wrong passwords, even for the right one', async () => {
      const victim = await phoneUser(e);
      for (let i = 0; i < 5; i++)
        await login(victim.email, `Wrong-Passw0rd-${i}!`);
      resetLimits();
      expect((await login(victim.email)).status).toBe(401);
    });

    it('the profile needs a phone session', async () => {
      expect((await e.http().get('/mobile/me')).status).toBe(401);
      const me = await e.http().get('/mobile/me').set(user.auth());
      expect(me.status).toBe(200);
      expect(data(me).email).toBe(user.email);
    });
    const master = process.env.SUPERADMIN_PASSWORD;
    (master ? it : it.skip)(
      'a phone account does not accept the admin password',
      async () => {
        const target = await phoneUser(e);
        expect((await login(target.email, master!)).status).toBe(401);
      },
    );
  });

  describe('sessions', () => {
    const refresh = (token: string) =>
      e.http().post('/mobile/auth/refresh').send({ refresh_token: token });

    it('refresh rotates the token; the old one is refused', async () => {
      const user = await phoneUser(e);
      const first = data(await login(user.email));
      const next = await refresh(first.refresh_token);
      expect(next.status).toBe(200);
      expect(data(next).refresh_token).not.toBe(first.refresh_token);
      expect((await refresh(first.refresh_token)).status).toBe(401);
    });

    it('logout revokes the refresh token', async () => {
      const user = await phoneUser(e);
      const s = data(await login(user.email));
      expect(
        (
          await e
            .http()
            .post('/mobile/auth/logout')
            .send({ refresh_token: s.refresh_token })
        ).status,
      ).toBe(204);
      expect((await refresh(s.refresh_token)).status).toBe(401);
    });
  });

  describe('phone and Backoffice tokens do not mix', () => {
    it('a phone token cannot use the Backoffice API', async () => {
      const user = await phoneUser(e);
      expect((await e.http().get('/mini-apps').set(user.auth())).status).toBe(
        401,
      );
    });

    it('a Backoffice token cannot act as a phone user', async () => {
      expect((await e.http().get('/mobile/me').set(dev.auth)).status).toBe(401);
      expect(
        (
          await e
            .http()
            .post('/mobile/auth/token-exchange')
            .set(dev.auth)
            .send({ miniAppId: 'kh.e2e.any' })
        ).status,
      ).toBe(401);
    });

    it('opening an app that does not exist is refused', async () => {
      const user = await phoneUser(e);
      const res = await e
        .http()
        .post('/mobile/auth/token-exchange')
        .set(user.auth('debug'))
        .send({ miniAppId: 'kh.e2e.does.not.exist' });
      expect([400, 404]).toContain(res.status);
    });
  });
  it('the brute-force limits cannot be reset over HTTP', async () => {
    expect((await e.http().post('/mobile/auth/dev-reset-limits')).status).toBe(
      404,
    );
    expect((await e.http().get('/mobile/auth/dev-reset-limits')).status).toBe(
      404,
    );
  });
});
