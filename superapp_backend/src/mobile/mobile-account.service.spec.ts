import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AuthService,
  END_USER_AUDIENCE,
  END_USER_TYP,
} from '../auth/auth.service';
import { FakeRepo } from './testing/fake-repo';
import { EndUser, EndUserStatus } from './entities/end-user.entity';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { MobileAuthService } from './mobile-auth.service';
import { MobileAccountService } from './mobile-account.service';
import { EndUserAuthGuard } from './end-user-auth.guard';
import { PasswordService } from './password.service';
import { AuthRateLimiter } from './auth-rate-limiter';

export const PW = 'a-very-good-password';
export const NEW_PW = 'another-very-good-password';

export async function buildAccount() {
  const users = new FakeRepo<EndUser>(['email']);
  const rTokens = new FakeRepo<RefreshToken>();
  const passwords = new PasswordService();
  const authService = new AuthService(new JwtService({}), {} as any);
  authService.onModuleInit();
  const mail = {
    sendEmailVerification: jest.fn(async () => undefined),
    sendAccountDeletionScheduled: jest.fn(async () => undefined),
  };
  const auth = new MobileAuthService(
    users as any,
    new FakeRepo() as any,
    new FakeRepo<EmailVerificationToken>() as any,
    rTokens as any,
    passwords,
    authService,
    mail as any,
    new AuthRateLimiter(),
  );
  const user = {
    id: 'u1',
    email: 'jane@example.io',
    name: 'Jane',
    passwordHash: await passwords.hash(PW),
    emailVerifiedAt: new Date(),
    status: EndUserStatus.ACTIVE,
    failedLoginCount: 0,
    lockedUntil: null,
    createdAt: new Date(),
  } as unknown as EndUser;
  users.rows.push(user);
  const account = new MobileAccountService(
    users as any,
    passwords,
    auth,
    mail as any,
  );
  return {
    users,
    rTokens,
    passwords,
    authService,
    auth,
    account,
    mail,
    user,
  };
}

describe('MobileAccountService.changePassword', () => {
  const realNow = Date.now;
  afterEach(() => (Date.now = realNow));

  it('rejects a wrong current password, a policy violation and reuse of the current password', async () => {
    const c = await buildAccount();
    await expect(
      c.account.changePassword('u1', {
        currentPassword: 'wrong-password-1',
        newPassword: NEW_PW,
      }),
    ).rejects.toThrow('Current password is incorrect');
    await expect(
      c.account.changePassword('u1', {
        currentPassword: PW,
        newPassword: 'short',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      c.account.changePassword('u1', { currentPassword: PW, newPassword: PW }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('changes the hash, revokes every other session and starts a fresh one', async () => {
    const c = await buildAccount();
    const base = realNow();
    Date.now = () => base;
    const other = await c.auth.login({
      email: 'jane@example.io',
      password: PW,
    });
    Date.now = () => base + 2000;
    const fresh = await c.account.changePassword(
      'u1',
      { currentPassword: PW, newPassword: NEW_PW },
      'UA/2',
    );
    expect(await c.passwords.verify(NEW_PW, c.users.rows[0].passwordHash)).toBe(
      true,
    );
    expect(c.users.rows[0].sessionsRevokedAt).toBeInstanceOf(Date);
    await expect(c.auth.refresh((other as any).refresh_token)).rejects.toThrow(
      'Invalid refresh token',
    );
    const rotated = await c.auth.refresh(fresh.refresh_token);
    expect(rotated.access_token).toBeTruthy();
    const claims = c.authService.verifyToken(fresh.access_token, {
      audience: END_USER_AUDIENCE,
      typ: END_USER_TYP,
    });
    expect(claims.iat).toBeGreaterThanOrEqual(
      Math.floor(c.users.rows[0].sessionsRevokedAt!.getTime() / 1000),
    );
  });
});

describe('MobileAccountService.requestDeletion', () => {
  const realNow = Date.now;
  afterEach(() => {
    Date.now = realNow;
    delete process.env.MOBILE_ACCOUNT_DELETION_GRACE_DAYS;
  });

  it('requires the password, schedules purge in 30 days, revokes sessions, mails', async () => {
    const c = await buildAccount();
    const session: any = await c.auth.login({
      email: 'jane@example.io',
      password: PW,
    });
    await expect(
      c.account.requestDeletion('u1', { password: 'wrong-password-1' }),
    ).rejects.toThrow('Password is incorrect');
    const res = await c.account.requestDeletion('u1', { password: PW });
    const u = c.users.rows[0];
    expect(u.status).toBe(EndUserStatus.PENDING_DELETION);
    const days = (new Date(res.purgeAfter).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThanOrEqual(30);
    expect(u.sessionsRevokedAt).toBeInstanceOf(Date);
    await expect(c.auth.refresh(session.refresh_token)).rejects.toThrow(
      'Invalid refresh token',
    );
    expect(c.mail.sendAccountDeletionScheduled).toHaveBeenCalledWith(
      'jane@example.io',
      'Jane',
      expect.any(Date),
    );
  });

  it('never overwrites an account disabled after it was loaded: 401, no revocation, no mail', async () => {
    const c = await buildAccount();
    const findOne = c.users.findOne.bind(c.users);
    jest.spyOn(c.users, 'findOne').mockImplementationOnce(async (opts) => {
      const live = (await findOne(opts))!;
      const loaded = { ...live }; // what the service read
      live.status = EndUserStatus.DISABLED; // an admin disables the account right after
      return loaded;
    });
    await expect(
      c.account.requestDeletion('u1', { password: PW }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(c.users.rows[0]).toMatchObject({ status: EndUserStatus.DISABLED });
    expect(c.users.rows[0].purgeAfter).toBeUndefined();
    expect(c.users.rows[0].sessionsRevokedAt).toBeUndefined();
    expect(c.mail.sendAccountDeletionScheduled).not.toHaveBeenCalled();
  });

  it('honours MOBILE_ACCOUNT_DELETION_GRACE_DAYS', async () => {
    process.env.MOBILE_ACCOUNT_DELETION_GRACE_DAYS = '7';
    const c = await buildAccount();
    const res = await c.account.requestDeletion('u1', { password: PW });
    const days = (new Date(res.purgeAfter).getTime() - Date.now()) / 86_400_000;
    expect(Math.round(days)).toBe(7);
  });

  it('signing in inside the window restores the account; after it, generic 401', async () => {
    const c = await buildAccount();
    const guard = new EndUserAuthGuard(c.authService, c.users as any);
    const canActivate = (accessToken: string) =>
      guard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: `Bearer ${accessToken}` },
          }),
        }),
      } as any);
    const base = realNow();
    Date.now = () => base; // the session and the deletion share one second
    const before: any = await c.auth.login({
      email: 'jane@example.io',
      password: PW,
    });
    await c.account.requestDeletion('u1', { password: PW });
    Date.now = () => base + 2000;
    await expect(
      c.auth.login({ email: 'jane@example.io', password: 'wrong-password-1' }),
    ).rejects.toThrow('Invalid credentials');
    const restored: any = await c.auth.login({
      email: 'jane@example.io',
      password: PW,
    });
    expect(restored.account_restored).toBe(true);
    expect(c.users.rows[0]).toMatchObject({
      status: EndUserStatus.ACTIVE,
      purgeAfter: null,
      deletionRequestedAt: null,
    });
    // Sessions from before the deletion stay dead after the restore; the new one works.
    await expect(canActivate(before.access_token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(c.auth.refresh(before.refresh_token)).rejects.toThrow(
      'Invalid refresh token',
    );
    await expect(canActivate(restored.access_token)).resolves.toBe(true);
    expect(
      (await c.auth.refresh(restored.refresh_token)).access_token,
    ).toBeTruthy();
    const normal: any = await c.auth.login({
      email: 'jane@example.io',
      password: PW,
    });
    expect(normal.account_restored).toBeUndefined();

    await c.account.requestDeletion('u1', { password: PW });
    Date.now = () => base + 31 * 86_400_000;
    await expect(
      c.auth.login({ email: 'jane@example.io', password: PW }),
    ).rejects.toThrow('Invalid credentials');
  });

  it('a restore that loses a race (account no longer pending deletion) issues no session', async () => {
    const disableAfterLoad = (c: Awaited<ReturnType<typeof buildAccount>>) => {
      const findOne = c.users.findOne.bind(c.users);
      jest.spyOn(c.users, 'findOne').mockImplementationOnce(async (opts) => {
        const live = (await findOne(opts))!;
        const loaded = { ...live };
        live.status = EndUserStatus.DISABLED;
        return loaded;
      });
    };
    const alive = (c: Awaited<ReturnType<typeof buildAccount>>) =>
      c.rTokens.rows.filter((r) => !r.revokedAt);

    const c = await buildAccount();
    await c.account.requestDeletion('u1', { password: PW });
    disableAfterLoad(c);
    await expect(
      c.auth.login({ email: 'jane@example.io', password: PW }),
    ).rejects.toThrow('Invalid credentials');
    expect(c.users.rows[0].status).toBe(EndUserStatus.DISABLED);
    expect(alive(c)).toHaveLength(0);
  });
});
