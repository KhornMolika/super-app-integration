import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import {
  includesSuperAdmin,
  isPlatformOwnerOrg,
  platformOwnerOrgCode,
} from './helpers/platform-admin.helper';
import {
  assertSuperAdminInPlatformOrg,
  BACK_OFFICE_TYP,
} from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/** SUPER_ADMIN belongs to the platform owner organization (FTC) only. */

describe('platform owner organization', () => {
  const saved = process.env.PLATFORM_OWNER_ORG_CODE;
  afterEach(() => {
    if (saved === undefined) delete process.env.PLATFORM_OWNER_ORG_CODE;
    else process.env.PLATFORM_OWNER_ORG_CODE = saved;
  });

  it('is FTC unless configured, compared without case', () => {
    delete process.env.PLATFORM_OWNER_ORG_CODE;
    expect(platformOwnerOrgCode()).toBe('FTC');
    expect(isPlatformOwnerOrg('ftc')).toBe(true);
    expect(isPlatformOwnerOrg('IRC')).toBe(false);
    expect(isPlatformOwnerOrg(null)).toBe(false);
    process.env.PLATFORM_OWNER_ORG_CODE = 'ops';
    expect(isPlatformOwnerOrg('OPS')).toBe(true);
  });

  it('reads role names and role objects', () => {
    expect(includesSuperAdmin(['SUPER_ADMIN'])).toBe(true);
    expect(includesSuperAdmin([{ name: 'super_admin' }])).toBe(true);
    expect(includesSuperAdmin(['ADMIN'])).toBe(false);
  });

  describe('token issuance', () => {
    it('issues a SUPER_ADMIN token to an FTC member', () => {
      expect(() =>
        assertSuperAdminInPlatformOrg(['SUPER_ADMIN'], 'FTC'),
      ).not.toThrow();
    });
    it.each([['IRC'], [null], [undefined]])(
      'refuses a SUPER_ADMIN in %s',
      (code) => {
        expect(() =>
          assertSuperAdminInPlatformOrg(['SUPER_ADMIN'], code),
        ).toThrow(ForbiddenException);
      },
    );
    it('leaves other roles alone', () => {
      expect(() =>
        assertSuperAdminInPlatformOrg(['ADMIN'], 'IRC'),
      ).not.toThrow();
    });
  });

  describe('JwtAuthGuard', () => {
    const guardFor = (payload: Record<string, unknown>) => {
      const guard = new JwtAuthGuard({
        verifyToken: () => ({ typ: BACK_OFFICE_TYP, sub: 'u1', ...payload }),
      } as any);
      const request: any = {
        headers: { authorization: 'Bearer t' },
        query: {},
      };
      const ctx: any = {
        switchToHttp: () => ({ getRequest: () => request }),
        getHandler: () => null,
        getClass: () => null,
      };
      return { run: () => guard.canActivate(ctx), request };
    };

    it('lets an FTC Super Admin through', () => {
      const { run, request } = guardFor({
        roles: ['SUPER_ADMIN'],
        organizationCode: 'FTC',
      });
      expect(run()).toBe(true);
      expect(request.user.sub).toBe('u1');
    });

    it.each([['IRC'], [undefined]])(
      'refuses a Super Admin token from organization %s (or an older token without one)',
      (organizationCode) => {
        const { run } = guardFor({ roles: ['SUPER_ADMIN'], organizationCode });
        expect(run).toThrow(UnauthorizedException);
      },
    );

    it('does not touch an organization admin of a tenant', () => {
      const { run } = guardFor({ roles: ['ADMIN'], organizationCode: 'IRC' });
      expect(run()).toBe(true);
    });
  });
});
