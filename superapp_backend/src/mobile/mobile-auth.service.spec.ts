import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService, END_USER_AUDIENCE, END_USER_TYP } from '../auth/auth.service';
import { FakeRepo } from './testing/fake-repo';
import { EndUser, EndUserStatus } from './entities/end-user.entity';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import {
  MobileAuthService,
  REGISTER_MESSAGE,
  sha256Hex,
  LOCKOUT_MS,
} from './mobile-auth.service';
import { PasswordService } from './password.service';
import { AuthRateLimiter, RateLimitedException } from './auth-rate-limiter';

const PW = 'a-very-good-password';

function build() {
  const users = new FakeRepo<EndUser>(['email']);
  const vTokens = new FakeRepo<EmailVerificationToken>();
  const rTokens = new FakeRepo<RefreshToken>();
  const sent: { to: string; name: string; url: string }[] = [];
  const mail = {
    sendEmailVerification: jest.fn(async (to: string, name: string, url: string) => {
      sent.push({ to, name, url });
    }),
  };
  const authService = new AuthService(new JwtService({}), {} as any);
  authService.onModuleInit();
  const passwords = new PasswordService();
  const limiter = new AuthRateLimiter();
  const svc = new MobileAuthService(
    users as any,
    vTokens as any,
    rTokens as any,
    passwords,
    authService,
    mail as any,
    limiter,
  );
  const tokenFromUrl = (url: string) => new URL(url).searchParams.get('token')!;
  return { svc, limiter, users, vTokens, rTokens, sent, mail, authService, passwords, tokenFromUrl };
}

async function registerAndVerify(ctx: ReturnType<typeof build>, email = 'Jane@Example.io') {
  await ctx.svc.register({ email, password: PW, name: 'Jane' });
  await ctx.svc.verifyEmail(ctx.tokenFromUrl(ctx.sent[ctx.sent.length - 1].url), PW);
}

describe('MobileAuthService', () => {
  const realNow = Date.now;
  afterEach(() => {
    Date.now = realNow;
    delete process.env.MOBILE_VERIFY_URL_BASE;
  });

  describe('register', () => {
    it('stores lowercased email, hashed password, sends link with default deep-link base', async () => {
      const c = build();
      const res = await c.svc.register({ email: ' Jane@Example.io ', password: PW, name: ' Jane ' });
      expect(res).toEqual({ message: REGISTER_MESSAGE });
      expect(c.users.rows).toHaveLength(1);
      expect(c.users.rows[0].email).toBe('jane@example.io');
      expect(c.users.rows[0].name).toBe('Jane');
      expect(c.users.rows[0].passwordHash.startsWith('scrypt$')).toBe(true);
      expect(c.users.rows[0].passwordHash).not.toContain(PW);
      expect(c.sent[0].url).toMatch(/^superapp:\/\/verify-email\?token=/);
      // Only the hash of the emailed token is stored.
      const token = c.tokenFromUrl(c.sent[0].url);
      expect(c.vTokens.rows[0].tokenHash).toBe(sha256Hex(token));
      expect(JSON.stringify(c.vTokens.rows)).not.toContain(token);
    });

    it('honours MOBILE_VERIFY_URL_BASE', async () => {
      process.env.MOBILE_VERIFY_URL_BASE = 'https://app.example.io/verify';
      const c = build();
      await c.svc.register({ email: 'a@example.io', password: PW, name: 'A' });
      expect(c.sent[0].url).toMatch(/^https:\/\/app\.example\.io\/verify\?token=/);
    });

    it('returns the identical response for new, unverified-existing and verified-existing emails', async () => {
      const c = build();
      const first = await c.svc.register({ email: 'a@example.io', password: PW, name: 'A' });
      const again = await c.svc.register({ email: 'a@example.io', password: PW, name: 'A' });
      await c.svc.verifyEmail(c.tokenFromUrl(c.sent[1].url), PW);
      const verified = await c.svc.register({ email: 'a@example.io', password: 'other-password-1', name: 'B' });
      expect(again).toEqual(first);
      expect(verified).toEqual(first);
      expect(c.users.rows).toHaveLength(1);
    });

    it('a VERIFIED account is never modified and gets no mail on re-register', async () => {
      const c = build();
      await registerAndVerify(c, 'a@example.io');
      const hash = c.users.rows[0].passwordHash;
      await c.svc.register({ email: 'a@example.io', password: 'attacker-pass-1', name: 'Evil' });
      expect(c.users.rows[0].passwordHash).toBe(hash);
      expect(c.users.rows[0].name).toBe('Jane');
      expect(c.sent).toHaveLength(1);
    });

    it('re-registering an UNVERIFIED email replaces name+hash, kills older tokens, issues a fresh one', async () => {
      const c = build();
      await c.svc.register({ email: 'a@example.io', password: 'attacker-pass-1', name: 'Evil' });
      await c.svc.register({ email: 'a@example.io', password: PW, name: 'Victim' });
      expect(c.sent).toHaveLength(2);
      expect(c.users.rows[0].name).toBe('Victim');
      expect(await c.passwords.verify(PW, c.users.rows[0].passwordHash)).toBe(true);
      expect(c.vTokens.rows.filter((t) => !t.usedAt)).toHaveLength(1);
      await expect(c.svc.verifyEmail(c.tokenFromUrl(c.sent[0].url), 'attacker-pass-1')).rejects.toBeInstanceOf(BadRequestException);
      await expect(c.svc.verifyEmail(c.tokenFromUrl(c.sent[0].url), PW)).rejects.toBeInstanceOf(BadRequestException);
      await c.svc.verifyEmail(c.tokenFromUrl(c.sent[1].url), PW);
      expect(c.users.rows[0].emailVerifiedAt).toBeInstanceOf(Date);
    });

    it('squatting: attacker registers victim email with pw A; victim clicking the link with any other password fails, token+A succeeds only if supplied', async () => {
      const c = build();
      await c.svc.register({ email: 'victim@example.io', password: 'attacker-pass-A', name: 'Evil' });
      const token = c.tokenFromUrl(c.sent[0].url); // lands in the victim's mailbox
      for (const wrong of ['victim-own-pass-1', 'attacker-pass-a', PW]) {
        await expect(c.svc.verifyEmail(token, wrong)).rejects.toThrow('Invalid or expired token');
      }
      expect(c.users.rows[0].emailVerifiedAt).toBeNull();
      // Attacker cannot log in either (unverified).
      await expect(c.svc.login({ email: 'victim@example.io', password: 'attacker-pass-A' })).rejects.toThrow('Invalid credentials');
      // Token was not burnt by the failures; mailbox owner supplying A activates.
      await c.svc.verifyEmail(token, 'attacker-pass-A');
      expect(c.users.rows[0].emailVerifiedAt).toBeInstanceOf(Date);
    });

    it('per-email mail bucket: 6th registration within the hour returns the same 202 but sends/changes nothing', async () => {
      const c = build();
      const results: unknown[] = [];
      for (let i = 0; i < 6; i++) {
        results.push(await c.svc.register({ email: 'bomb@example.io', password: `password-num-${i}x`, name: `N${i}` }));
      }
      expect(new Set(results.map((r) => JSON.stringify(r))).size).toBe(1);
      expect(c.sent).toHaveLength(5);
      expect(c.users.rows[0].name).toBe('N4'); // 6th attempt changed nothing
      const base = Date.now();
      Date.now = () => base + 3_600_001;
      await c.svc.register({ email: 'bomb@example.io', password: PW, name: 'Later' });
      expect(c.sent).toHaveLength(6);
    });

    it('bucket is per address, not global', async () => {
      const c = build();
      for (let i = 0; i < 6; i++) await c.svc.register({ email: 'x@example.io', password: PW, name: 'X' });
      await c.svc.register({ email: 'y@example.io', password: PW, name: 'Y' });
      expect(c.sent.filter((m) => m.to === 'y@example.io')).toHaveLength(1);
    });

    it('rejects policy violations without touching storage', async () => {
      const c = build();
      await expect(c.svc.register({ email: 'a@example.io', password: 'short', name: 'A' })).rejects.toBeInstanceOf(BadRequestException);
      await expect(c.svc.register({ email: 'a@example.io', password: 'a@example.io', name: 'A' })).rejects.toBeInstanceOf(BadRequestException);
      // 10 fullwidth chars normalise to 10 ASCII -> ok; a decomposed 9-char string is not.
      expect(c.users.rows).toHaveLength(0);
    });
  });

  describe('verifyEmail', () => {
    it('verifies with token+password once; reuse, garbage, wrong password and expired give the same generic error', async () => {
      const c = build();
      await c.svc.register({ email: 'a@example.io', password: PW, name: 'A' });
      const token = c.tokenFromUrl(c.sent[0].url);
      const errs: string[] = [];
      await c.svc.verifyEmail(token, 'not-the-password').catch((e) => errs.push(e.message));
      expect(c.users.rows[0].emailVerifiedAt).toBeNull();
      expect(await c.svc.verifyEmail(token, PW)).toEqual({ message: 'Email verified' });
      expect(c.users.rows[0].emailVerifiedAt).toBeInstanceOf(Date);
      await c.svc.verifyEmail(token, PW).catch((e) => errs.push(e.message));
      await c.svc.verifyEmail('nope', PW).catch((e) => errs.push(e.message));
      const d = build();
      await d.svc.register({ email: 'b@example.io', password: PW, name: 'B' });
      const base = Date.now();
      Date.now = () => base + 25 * 3600 * 1000;
      await d.svc.verifyEmail(d.tokenFromUrl(d.sent[0].url), PW).catch((e) => errs.push(e.message));
      expect(errs).toEqual(Array(4).fill('Invalid or expired token'));
      expect(d.users.rows[0].emailVerifiedAt).toBeNull();
    });

    it('token holder cannot use verify-email as a password oracle: dead after 5 wrong passwords, always the same generic 400', async () => {
      const c = build();
      await c.svc.register({ email: 'a@example.io', password: PW, name: 'A' });
      const token = c.tokenFromUrl(c.sent[0].url);
      for (let i = 0; i < 5; i++) {
        await expect(c.svc.verifyEmail(token, `guess-number-${i}x`)).rejects.toThrow('Invalid or expired token');
      }
      expect(c.vTokens.rows[0].failedAttempts).toBe(5);
      expect(c.vTokens.rows[0].usedAt).toBeInstanceOf(Date);
      // Even the correct password is now refused, same generic error.
      await expect(c.svc.verifyEmail(token, PW)).rejects.toThrow('Invalid or expired token');
      expect(c.users.rows[0].emailVerifiedAt).toBeNull();
      // A fresh registration issues a fresh token that works.
      await c.svc.register({ email: 'a@example.io', password: PW, name: 'A' });
      await c.svc.verifyEmail(c.tokenFromUrl(c.sent[1].url), PW);
      expect(c.users.rows[0].emailVerifiedAt).toBeInstanceOf(Date);
    });

    it('4 wrong attempts then the right password still verifies', async () => {
      const c = build();
      await c.svc.register({ email: 'a@example.io', password: PW, name: 'A' });
      const token = c.tokenFromUrl(c.sent[0].url);
      for (let i = 0; i < 4; i++) await c.svc.verifyEmail(token, `guess-number-${i}x`).catch(() => undefined);
      await expect(c.svc.verifyEmail(token, PW)).resolves.toEqual({ message: 'Email verified' });
    });

    it('a failing dummy scrypt never becomes a 500 (login -> 401, verify -> 400)', async () => {
      const c = build();
      jest.spyOn(c.passwords, 'verifyDummy').mockRejectedValue(new Error('boom'));
      await expect(c.svc.login({ email: 'ghost@example.io', password: PW })).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(c.svc.verifyEmail('nope', PW)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('register throws a 429 RateLimitedException (not a silent 202) when the limiter is out of capacity', async () => {
      const c = build();
      c.limiter.maxKeys = 0;
      const err: any = await c.svc.register({ email: 'a@example.io', password: PW, name: 'A' }).catch((e) => e);
      expect(err).toBeInstanceOf(RateLimitedException);
      expect(err.getStatus()).toBe(429);
      expect(err.retryAfterSeconds).toBeGreaterThan(0);
      expect(c.users.rows).toHaveLength(0);
    });

    it('burns a dummy scrypt when the token is unknown/used/expired (timing parity)', async () => {
      const c = build();
      const dummy = jest.spyOn(c.passwords, 'verifyDummy');
      await c.svc.verifyEmail('nope', PW).catch(() => undefined);
      expect(dummy).toHaveBeenCalledTimes(1);
    });
  });

  describe('login', () => {
    it('succeeds for a verified user and returns tokens + profile', async () => {
      const c = build();
      await registerAndVerify(c);
      const res = await c.svc.login({ email: 'JANE@example.io', password: PW }, 'UA/1');
      expect(res.expires_in).toBe(900);
      expect(res.user).toEqual({ id: c.users.rows[0].id, email: 'jane@example.io', name: 'Jane' });
      const payload = c.authService.verifyToken(res.access_token, { audience: END_USER_AUDIENCE, typ: END_USER_TYP });
      expect(payload.sub).toBe(res.user.id);
      expect(JSON.stringify(res)).not.toMatch(/passwordHash|scrypt/);
      // Refresh token is opaque, stored hashed only.
      expect(c.rTokens.rows[0].tokenHash).toBe(sha256Hex(res.refresh_token));
      expect(JSON.stringify(c.rTokens.rows)).not.toContain(res.refresh_token);
      expect(c.rTokens.rows[0].userAgent).toBe('UA/1');
    });

    it('honours configured TTLs', async () => {
      process.env.MOBILE_ACCESS_TOKEN_TTL_SECONDS = '60';
      process.env.MOBILE_REFRESH_TOKEN_TTL_DAYS = '1';
      try {
        const c = build();
        await registerAndVerify(c);
        const res = await c.svc.login({ email: 'jane@example.io', password: PW });
        expect(res.expires_in).toBe(60);
        const ttl = c.rTokens.rows[0].expiresAt.getTime() - Date.now();
        expect(ttl).toBeLessThanOrEqual(86_400_000);
        expect(ttl).toBeGreaterThan(86_000_000);
      } finally {
        delete process.env.MOBILE_ACCESS_TOKEN_TTL_SECONDS;
        delete process.env.MOBILE_REFRESH_TOKEN_TTL_DAYS;
      }
    });

    it('clamps TTL env values', async () => {
      const c = build();
      process.env.MOBILE_ACCESS_TOKEN_TTL_SECONDS = '99999999';
      process.env.MOBILE_REFRESH_TOKEN_TTL_DAYS = '9999';
      expect(c.svc.accessTtlSeconds).toBe(86_400);
      expect(c.svc.refreshTtlMs).toBe(90 * 86_400_000);
      process.env.MOBILE_ACCESS_TOKEN_TTL_SECONDS = '1';
      process.env.MOBILE_REFRESH_TOKEN_TTL_DAYS = '0.1';
      expect(c.svc.accessTtlSeconds).toBe(60);
      expect(c.svc.refreshTtlMs).toBe(86_400_000);
      delete process.env.MOBILE_ACCESS_TOKEN_TTL_SECONDS;
      delete process.env.MOBILE_REFRESH_TOKEN_TTL_DAYS;
    });

    it('gives the identical generic 401 for unknown, wrong password, unverified and disabled', async () => {
      const c = build();
      await registerAndVerify(c);
      await c.svc.register({ email: 'unv@example.io', password: PW, name: 'U' });
      await registerAndVerify(c, 'dis@example.io');
      c.users.rows.find((u) => u.email === 'dis@example.io')!.status = EndUserStatus.DISABLED;
      const dummy = jest.spyOn(c.passwords, 'verifyDummy');

      const attempts = [
        { email: 'ghost@example.io', password: PW },
        { email: 'jane@example.io', password: 'wrong-password-x' },
        { email: 'unv@example.io', password: PW },
        { email: 'dis@example.io', password: PW },
      ];
      for (const a of attempts) {
        const err: any = await c.svc.login(a).catch((e) => e);
        expect(err).toBeInstanceOf(UnauthorizedException);
        expect(err.message).toBe('Invalid credentials');
      }
      expect(dummy).toHaveBeenCalledTimes(1); // unknown email burns a dummy scrypt
    });

    it('locks out after 5 consecutive failures for 15 minutes (generic message), then recovers', async () => {
      const c = build();
      await registerAndVerify(c);
      for (let i = 0; i < 5; i++) {
        await expect(c.svc.login({ email: 'jane@example.io', password: 'wrong-password-x' })).rejects.toThrow('Invalid credentials');
      }
      expect(c.users.rows[0].lockedUntil).toBeInstanceOf(Date);
      // Correct password is still refused while locked, with the same message.
      await expect(c.svc.login({ email: 'jane@example.io', password: PW })).rejects.toThrow('Invalid credentials');
      const base = Date.now();
      Date.now = () => base + LOCKOUT_MS + 1000;
      const ok = await c.svc.login({ email: 'jane@example.io', password: PW });
      expect(ok.access_token).toBeTruthy();
      expect(c.users.rows[0].failedLoginCount).toBe(0);
      expect(c.users.rows[0].lockedUntil).toBeNull();
    });

    it('a success resets the consecutive-failure counter', async () => {
      const c = build();
      await registerAndVerify(c);
      for (let i = 0; i < 4; i++) {
        await c.svc.login({ email: 'jane@example.io', password: 'wrong-password-x' }).catch(() => undefined);
      }
      await c.svc.login({ email: 'jane@example.io', password: PW });
      await c.svc.login({ email: 'jane@example.io', password: 'wrong-password-x' }).catch(() => undefined);
      expect(c.users.rows[0].failedLoginCount).toBe(1);
      expect(c.users.rows[0].lockedUntil).toBeNull();
    });
  });

  describe('refresh / logout', () => {
    it('rotates: new pair works, old token is single-use', async () => {
      const c = build();
      await registerAndVerify(c);
      const first = await c.svc.login({ email: 'jane@example.io', password: PW });
      const second = await c.svc.refresh(first.refresh_token);
      expect(second.refresh_token).not.toBe(first.refresh_token);
      expect(second.access_token).toBeTruthy();
      expect(c.rTokens.rows).toHaveLength(2);
      expect(new Set(c.rTokens.rows.map((r) => r.familyId)).size).toBe(1);
      const third = await c.svc.refresh(second.refresh_token);
      expect(third.refresh_token).toBeTruthy();
    });

    it('replay within the 10s grace window: plain 401, family NOT revoked', async () => {
      const c = build();
      await registerAndVerify(c);
      const first = await c.svc.login({ email: 'jane@example.io', password: PW });
      const second = await c.svc.refresh(first.refresh_token);
      await expect(c.svc.refresh(first.refresh_token)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(c.rTokens.rows.some((r) => r.revokedAt)).toBe(false);
      expect((await c.svc.refresh(second.refresh_token)).access_token).toBeTruthy();
    });

    it('reuse of a rotated token older than the grace window revokes the whole family (including the newest token)', async () => {
      const c = build();
      await registerAndVerify(c);
      const first = await c.svc.login({ email: 'jane@example.io', password: PW });
      const second = await c.svc.refresh(first.refresh_token);
      const base = Date.now();
      Date.now = () => base + 11_000;
      await expect(c.svc.refresh(first.refresh_token)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(c.rTokens.rows.every((r) => r.revokedAt)).toBe(true);
      await expect(c.svc.refresh(second.refresh_token)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('does not touch other families (other devices)', async () => {
      const c = build();
      await registerAndVerify(c);
      const a = await c.svc.login({ email: 'jane@example.io', password: PW });
      const b = await c.svc.login({ email: 'jane@example.io', password: PW });
      const a2 = await c.svc.refresh(a.refresh_token);
      const base = Date.now();
      Date.now = () => base + 11_000;
      await c.svc.refresh(a.refresh_token).catch(() => undefined); // reuse -> revoke A
      await expect(c.svc.refresh(a2.refresh_token)).rejects.toThrow();
      expect((await c.svc.refresh(b.refresh_token)).access_token).toBeTruthy();
    });

    it('rejects unknown, expired, and disabled-user refresh tokens with one generic 401', async () => {
      const c = build();
      await registerAndVerify(c);
      const t = await c.svc.login({ email: 'jane@example.io', password: PW });
      await expect(c.svc.refresh('unknown')).rejects.toThrow('Invalid refresh token');
      c.users.rows[0].status = EndUserStatus.DISABLED;
      await expect(c.svc.refresh(t.refresh_token)).rejects.toThrow('Invalid refresh token');
      c.users.rows[0].status = EndUserStatus.ACTIVE;
      await expect(c.svc.refresh(t.refresh_token)).rejects.toThrow(); // family already revoked
      const u = await c.svc.login({ email: 'jane@example.io', password: PW });
      const base = Date.now();
      Date.now = () => base + 31 * 86_400_000;
      await expect(c.svc.refresh(u.refresh_token)).rejects.toThrow('Invalid refresh token');
    });

    it('logout revokes the family, is idempotent and silent for unknown tokens', async () => {
      const c = build();
      await registerAndVerify(c);
      const t = await c.svc.login({ email: 'jane@example.io', password: PW });
      const t2 = await c.svc.refresh(t.refresh_token);
      await expect(c.svc.logout(t2.refresh_token)).resolves.toBeUndefined();
      await expect(c.svc.logout(t2.refresh_token)).resolves.toBeUndefined();
      await expect(c.svc.logout('never-issued')).resolves.toBeUndefined();
      await expect(c.svc.logout(undefined)).resolves.toBeUndefined();
      await expect(c.svc.logout('')).resolves.toBeUndefined();
      await expect(c.svc.refresh(t2.refresh_token)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
