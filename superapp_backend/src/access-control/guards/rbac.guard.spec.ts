import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacGuard } from './rbac.guard';
import {
  canActInOrg,
  isOrgAdmin,
  isPlatformAdmin,
} from '../helpers/platform-admin.helper';

function contextFor(user: unknown): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function guardRequiring(...permissions: string[]): RbacGuard {
  const reflector = {
    getAllAndOverride: () => permissions,
  } as unknown as Reflector;
  return new RbacGuard(reflector);
}

describe('RbacGuard', () => {
  it('ignores the email address: a developer named "superadmin" or "admin" gets no admin rights', () => {
    const guard = guardRequiring('super_app:manage');
    for (const email of [
      'superadmin.x@gmail.com',
      'admin.payments@bank.com',
      'admin@partner.com',
    ]) {
      expect(() =>
        guard.canActivate(
          contextFor({ email, roles: ['MA_DEVELOPER'], permissions: [] }),
        ),
      ).toThrow(ForbiddenException);
    }
  });

  it('does not grant developer permissions from an email containing "dev"', () => {
    const guard = guardRequiring('miniapp:create');
    expect(() =>
      guard.canActivate(
        contextFor({ email: 'devon@bank.com', roles: ['VIEWER'], permissions: [] }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('lets a SUPER_ADMIN role through any permission', () => {
    const guard = guardRequiring('super_app:manage', 'settings:manage');
    expect(
      guard.canActivate(
        contextFor({ email: 'ops@fsa.gov.kh', roles: ['SUPER_ADMIN'] }),
      ),
    ).toBe(true);
  });

  it.each(['super_app:manage', 'settings:manage'])(
    'keeps platform-only %s from an ADMIN (organization admin)',
    (permission) => {
      expect(() =>
        guardRequiring(permission).canActivate(
          contextFor({ email: 'a@org.kh', roles: ['ADMIN'], permissions: [] }),
        ),
      ).toThrow(ForbiddenException);
    },
  );

  it('gives an ADMIN role the admin permission set', () => {
    const guard = guardRequiring('audit_log:read');
    expect(
      guard.canActivate(contextFor({ email: 'ops@fsa.gov.kh', roles: ['ADMIN'] })),
    ).toBe(true);
  });

  it('honours explicit permissions on the token', () => {
    const guard = guardRequiring('audit_log:read');
    expect(
      guard.canActivate(
        contextFor({
          email: 'auditor@fsa.gov.kh',
          roles: ['AUDITOR'],
          permissions: ['audit_log:read'],
        }),
      ),
    ).toBe(true);
  });

  it('blocks a developer from settings:manage', () => {
    const guard = guardRequiring('settings:manage');
    expect(() =>
      guard.canActivate(
        contextFor({ email: 'dev@partner.com', roles: ['MA_DEVELOPER'] }),
      ),
    ).toThrow(ForbiddenException);
  });
});

describe('isPlatformAdmin', () => {
  it('is decided by role, not email', () => {
    expect(isPlatformAdmin({ email: 'superadmin@x.com', roles: ['MA_DEVELOPER'] })).toBe(false);
    expect(isPlatformAdmin({ email: 'admin@x.com', roles: [] })).toBe(false);
    expect(isPlatformAdmin({ email: 'a@x.com', roles: ['SUPER_ADMIN'] })).toBe(true);
    expect(isPlatformAdmin(undefined)).toBe(false);
  });

  it('is SUPER_ADMIN only: ADMIN is an organization admin', () => {
    expect(isPlatformAdmin({ roles: [{ name: 'ADMIN' }] })).toBe(false);
    expect(isOrgAdmin({ roles: [{ name: 'ADMIN' }] })).toBe(true);
    expect(isOrgAdmin({ roles: ['SUPER_ADMIN'] })).toBe(false);
  });
});

describe('canActInOrg', () => {
  it('lets SUPER_ADMIN act anywhere and everyone else only in their own org', () => {
    expect(canActInOrg({ roles: ['SUPER_ADMIN'] }, 'org-b')).toBe(true);
    const adminA = { roles: ['ADMIN'], organizationId: 'org-a' };
    expect(canActInOrg(adminA, 'org-a')).toBe(true);
    expect(canActInOrg(adminA, 'org-b')).toBe(false);
  });

  it('denies when either side has no organization', () => {
    expect(canActInOrg({ roles: ['ADMIN'] }, 'org-a')).toBe(false);
    expect(canActInOrg({ roles: ['ADMIN'], organizationId: 'org-a' }, null)).toBe(
      false,
    );
  });
});
