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

    // SUPER_ADMIN role has unrestricted platform-wide access
    if (user.roles?.includes('SUPER_ADMIN') || user.role === 'SUPER_ADMIN') {
      return true;
    }

    const userPerms = Array.isArray(user.permissions) ? user.permissions : [];

    // Fallback: If ADMIN role without explicit permissions list in legacy token
    if (user.roles?.includes('ADMIN') || user.role === 'ADMIN') {
      const adminPerms = [
        'miniapp:create',
        'miniapp:read',
        'miniapp:update',
        'miniapp:delete',
        'miniapp:approve',
        'miniapp:reject',
        'miniapp:suspend',
        'miniapp_permission:approve',
        'issue:resolve',
        'permission_proposal:read',
        'permission_proposal:review',
        'super_app:read',
        'user:read',
        'permission:read',
        'organization:read',
      ];
      const hasPermission = requiredPermissions.every((p) =>
        userPerms.includes(p) || adminPerms.includes(p),
      );
      if (hasPermission) return true;
    }

    const hasPermission = requiredPermissions.every((permission) =>
      userPerms.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
