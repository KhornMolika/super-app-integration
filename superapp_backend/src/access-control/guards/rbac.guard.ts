import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User has no active session');
    }

    if (!userHasPermissions(user, requiredPermissions)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}

/**
 * The permissions a JWT payload carries, or null for SUPER_ADMIN (unrestricted).
 * Shared by RbacGuard and handlers that need a permission only in some cases.
 */
export function effectivePermissions(user: any): Set<string> | null {
  const userRoles: string[] = Array.isArray(user.roles)
    ? user.roles
        .map((r: any) => (typeof r === 'string' ? r : r?.name))
        .filter(Boolean)
    : user.role
      ? [user.role]
      : [];

  const normalizedRoles = userRoles.map((r) => r.toUpperCase().trim());

  // Authority comes from roles and permissions only, never from the email
  // address: anyone can self-register "superadmin.x@..." or "admin.x@...".

  // SUPER_ADMIN role has unrestricted platform-wide access
  if (normalizedRoles.some((r) => r === 'SUPER_ADMIN' || r === 'SUPERADMIN')) {
    return null;
  }

  const userPerms = new Set<string>(
    Array.isArray(user.permissions) ? user.permissions : [],
  );

  // Role-based fallback permissions (for legacy tokens or unseeded DB relations)
  if (normalizedRoles.some((r) => r === 'ADMIN' || r === 'ADMINISTRATOR')) {
    [
      'miniapp:create',
      'miniapp:read',
      'miniapp:update',
      'miniapp:delete',
      'miniapp:suspend',
      'miniapp:submit',
      'miniapp_permission:approve',
      'issue:resolve',
      'permission_proposal:read',
      'super_app:read',
      'user:read',
      'user:manage',
      'role:read',
      'permission:read',
      'organization:read',
      'organization:manage',
      'audit_log:read',
    ].forEach((p) => userPerms.add(p));
  }

  // Exact role names only: a user with no role, or a role that merely
  // contains "DEV" (e.g. DEVOPS), gets no developer rights.
  if (normalizedRoles.some((r) => r === 'MA_DEVELOPER' || r === 'DEVELOPER')) {
    [
      'miniapp:create',
      'miniapp:read',
      'miniapp:update',
      'miniapp:submit',
      'permission_proposal:read',
      'permission_proposal:create',
      'permission:read',
      'super_app:read',
      'organization:read',
    ].forEach((p) => userPerms.add(p));
  }

  // Baseline read permissions granted to any authenticated back-office session
  userPerms.add('miniapp:read');
  userPerms.add('super_app:read');
  userPerms.add('permission:read');
  userPerms.add('organization:read');

  return userPerms;
}

/** True when the user holds every one of the given permissions. */
export function userHasPermissions(user: any, required: string[]): boolean {
  if (!user) return false;
  const perms = effectivePermissions(user);
  return perms === null || required.every((p) => perms.has(p));
}
