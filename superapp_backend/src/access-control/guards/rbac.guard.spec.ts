import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacGuard } from './rbac.guard';
import { isPlatformAdmin } from '../helpers/platform-admin.helper';

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
    expect(isPlatformAdmin({ email: 'a@x.com', roles: [{ name: 'ADMIN' }] })).toBe(true);
    expect(isPlatformAdmin(undefined)).toBe(false);
  });
});
