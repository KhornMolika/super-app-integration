import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService, BACK_OFFICE_TYP, hasBackofficeAccess, platformRoles } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { hashPassword } from '../common/utils/password.util';

const EMAIL = 'officer@fsa.gov.kh';
const PASSWORD = 'Correct-horse-9!';

async function service(user: Record<string, unknown> | null) {
  const passwordHash = await hashPassword(PASSWORD);
  const accessControl = {
    findByEmailWithPermissions: jest.fn().mockResolvedValue(user && { id: 'u1', email: EMAIL, status: 'ACTIVE', ...user }),
    getPasswordHash: jest.fn().mockResolvedValue(passwordHash),
    findUserById: jest.fn().mockResolvedValue(user && { id: 'u1', email: EMAIL, status: 'ACTIVE', ...user }),
  };
  const jwt = new JwtService({});
  jest.spyOn(jwt, 'sign').mockReturnValue('signed');
  const svc = new AuthService(jwt, accessControl as any);
  return { svc, jwt };
}

describe('Backoffice access: SUPER_ADMIN, ADMIN and MA_DEVELOPER only', () => {
  afterEach(() => jest.restoreAllMocks());

  it('knows which roles may use the Backoffice', () => {
    expect(hasBackofficeAccess(['SUPER_ADMIN'])).toBe(true);
    expect(hasBackofficeAccess(['ADMIN'])).toBe(true);
    expect(hasBackofficeAccess(['MA_DEVELOPER'])).toBe(true);
    expect(hasBackofficeAccess(platformRoles({ roles: ['MINI_APP_DEVELOPER'] }))).toBe(true); // legacy alias
    expect(hasBackofficeAccess(['STAFF'])).toBe(false);
    expect(hasBackofficeAccess([])).toBe(false);
    expect(hasBackofficeAccess(undefined)).toBe(false);
  });

  it.each(['SUPER_ADMIN', 'ADMIN', 'MA_DEVELOPER'])('%s signs in to the Backoffice', async (role) => {
    const { svc } = await service({ roles: [{ name: role, permissions: [] }] });
    const r = await svc.login({ email: EMAIL, password: PASSWORD } as any);
    expect(r).toMatchObject({ success: true });
  });

  it('STAFF is refused with a pointer to the mobile app, after a correct password only', async () => {
    const { svc, jwt } = await service({ roles: [{ name: 'STAFF', permissions: [] }] });
    const r = await svc.login({ email: EMAIL, password: PASSWORD } as any);
    expect(r).toMatchObject({ success: false, noBackofficeAccess: true });
    expect((r as any).message).toMatch(/Super App/);
    expect(jwt.sign).not.toHaveBeenCalled();

    const wrong = await svc.login({ email: EMAIL, password: 'wrong-password' } as any);
    expect(wrong).toMatchObject({ success: false, message: 'Invalid email or password' });
    expect((wrong as any).noBackofficeAccess).toBeUndefined();
  });

  it('a mobile-only account (no staff role) is refused', async () => {
    const { svc } = await service({ roles: [] });
    expect(await svc.login({ email: EMAIL, password: PASSWORD } as any)).toMatchObject({ noBackofficeAccess: true });
  });

  it('a developer awaiting approval still gets the approval message', async () => {
    const { svc } = await service({ status: 'PENDING_APPROVAL', roles: [{ name: 'MA_DEVELOPER' }] });
    expect(await svc.login({ email: EMAIL, password: PASSWORD } as any)).toMatchObject({ pendingApproval: true });
  });

  it('refresh stops working once the account is STAFF', async () => {
    const { svc } = await service({ roles: [{ name: 'STAFF' }] });
    jest.spyOn(svc, 'verifyToken').mockReturnValue({ sub: 'u1', email: EMAIL, typ: 'refresh' });
    await expect(svc.refreshToken('r')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('no personal access token for STAFF, and no developer fallback role', async () => {
    const { svc } = await service({ roles: [{ name: 'STAFF' }] });
    await expect(svc.createAccessToken('u1', 'ci')).rejects.toBeInstanceOf(ForbiddenException);
  });

  describe('JwtAuthGuard', () => {
    const guardFor = (payload: Record<string, unknown>) => {
      const auth = { verifyToken: jest.fn().mockReturnValue({ typ: BACK_OFFICE_TYP, sub: 'u1', ...payload }) };
      const request: any = { method: 'GET', path: '/api/miniapps', headers: { authorization: 'Bearer t' }, query: {} };
      const ctx: any = { switchToHttp: () => ({ getRequest: () => request }) };
      return () => new JwtAuthGuard(auth as any).canActivate(ctx);
    };

    it('refuses a STAFF token issued before the limit', () => {
      expect(guardFor({ roles: ['STAFF'] })).toThrow(UnauthorizedException);
      expect(guardFor({})).toThrow(UnauthorizedException);
    });

    it('accepts Backoffice roles, including older tokens with the legacy developer name', () => {
      expect(guardFor({ roles: ['SUPER_ADMIN'] })()).toBe(true);
      expect(guardFor({ roles: ['MA_DEVELOPER'] })()).toBe(true);
      expect(guardFor({ roles: ['MINI_APP_DEVELOPER'] })()).toBe(true);
    });
  });
});
