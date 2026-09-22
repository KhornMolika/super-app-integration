import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EndUserAuthGuard } from './end-user-auth.guard';
import { EndUserStatus } from './entities/end-user.entity';

describe('EndUserAuthGuard', () => {
  let authService: AuthService;
  let status: EndUserStatus | null;
  let guard: EndUserAuthGuard;
  const jwt = new JwtService({});

  beforeEach(() => {
    authService = new AuthService(jwt, {
      findByEmailWithPermissions: async () => ({
        id: 'admin-1',
        email: 'admin@x.io',
        name: 'Admin',
        roles: [{ name: 'ADMIN', permissions: [{ name: 'p' }] }],
      }),
    } as any);
    authService.onModuleInit();
    status = EndUserStatus.ACTIVE;
    const users = {
      findOne: async ({ where }: any) =>
        status === null ? null : { id: where.id, email: 'jane@example.io', status },
    };
    guard = new EndUserAuthGuard(authService, users as any);
  });

  const ctx = (headers: any = {}, query: any = {}) => {
    const req: any = { headers, query };
    return { req, ctx: { switchToHttp: () => ({ getRequest: () => req }) } as any };
  };
  const bearer = (t: string) => ({ authorization: `Bearer ${t}` });
  const endUserToken = (ttl = 900, extra: any = {}) =>
    authService.signEndUserToken({ sub: 'u-1', email: 'jane@example.io', ...extra }, ttl);

  it('accepts a valid end-user token and sets request.endUser', async () => {
    const { req, ctx: c } = ctx(bearer(endUserToken()));
    await expect(guard.canActivate(c)).resolves.toBe(true);
    expect(req.endUser).toEqual({ id: 'u-1', email: 'jane@example.io' });
  });

  it('rejects missing header, non-bearer scheme and query-param tokens', async () => {
    const t = endUserToken();
    await expect(guard.canActivate(ctx().ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(guard.canActivate(ctx({ authorization: `Basic ${t}` }).ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(guard.canActivate(ctx({}, { access_token: t, token: t }).ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects back-office tokens', async () => {
    const login: any = await authService.login({ email: 'admin@x.io' });
    await expect(guard.canActivate(ctx(bearer(login.access_token)).ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('back-office guard rejects end-user tokens (symmetry)', () => {
    const bo = new JwtAuthGuard(authService);
    expect(() => bo.canActivate(ctx(bearer(endUserToken())).ctx)).toThrow(UnauthorizedException);
    expect(() => bo.canActivate(ctx({}, { access_token: endUserToken() }).ctx)).toThrow(UnauthorizedException);
  });

  it('rejects tampered signature, tampered payload, alg=none, and expired tokens', async () => {
    const t = endUserToken();
    const [h, p, s] = t.split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(p, 'base64url').toString()), sub: 'u-2' }),
    ).toString('base64url');
    const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${p}.`;
    const flipped = s.slice(0, -2) + (s.endsWith('AA') ? 'BB' : 'AA');
    for (const bad of [`${h}.${p}.${flipped}`, `${h}.${forgedPayload}.${s}`, none, 'garbage']) {
      await expect(guard.canActivate(ctx(bearer(bad)).ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    }
    const expired = jwt.sign(
      { sub: 'u-1', typ: 'end_user' },
      { privateKey: (authService as any).privateKey, algorithm: 'RS256', issuer: 'super-app-backend', audience: 'super-app-mobile', expiresIn: -10 },
    );
    await expect(guard.canActivate(ctx(bearer(expired)).ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a correctly signed token with the wrong audience or typ', async () => {
    const key = (authService as any).privateKey;
    const sign = (o: any, aud?: string) =>
      jwt.sign({ sub: 'u-1', ...o }, { privateKey: key, algorithm: 'RS256', issuer: 'super-app-backend', ...(aud ? { audience: aud } : {}), expiresIn: 60 });
    for (const t of [sign({ typ: 'end_user' }), sign({ typ: 'end_user' }, 'other'), sign({ typ: 'back_office' }, 'super-app-mobile'), sign({}, 'super-app-mobile')]) {
      await expect(guard.canActivate(ctx(bearer(t)).ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    }
  });

  it('rejects disabled or deleted users even with a valid token', async () => {
    const t = endUserToken();
    status = EndUserStatus.DISABLED;
    await expect(guard.canActivate(ctx(bearer(t)).ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    status = null;
    await expect(guard.canActivate(ctx(bearer(t)).ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
