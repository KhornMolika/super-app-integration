import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { CollaboratorRole } from '../entities/miniapp-collaborator.entity';

/**
 * Who may see or change which Mini App. One place for the rule; controllers and
 * services ask here instead of checking roles themselves.
 *
 *   SUPER_ADMIN          every app, every action.
 *   ADMIN                every app of their own organization.
 *   anyone else          apps of their own organization that they own, or on
 *                        which they hold a collaborator row:
 *                          VIEWER     -> VIEW
 *                          DEVELOPER  -> EDIT
 *                          MAINTAINER -> MAINTAIN
 *
 * Deny by default: a caller without an organization, or an app without one, is
 * visible to SUPER_ADMIN only. Collaboration never crosses organizations.
 *
 * The RBAC permission on the route (miniapp:approve, miniapp:update, ...) still
 * decides *which kind* of action a role may take; this policy decides *which
 * apps* it may take it on.
 */
export enum MiniAppAccess {
  NONE = 0,
  /** Read the app, its builds, issues, versions; download test builds. */
  VIEW = 1,
  /** Edit metadata, URLs and versions, upload artifacts, rescan. */
  EDIT = 2,
  /** Change requested permissions, submit, roll back, manage collaborators. */
  MAINTAIN = 3,
  /** Delete, transfer ownership. */
  OWN = 4,
  /** Governance actions (approve, reject, suspend...) within the admin's scope. */
  ADMIN = 5,
}

export interface AccessSubject {
  sub?: string;
  id?: string;
  roles?: unknown;
  organizationId?: string | null;
}

export interface AccessTarget {
  ownerId?: string | null;
  organizationId?: string | null;
}

const COLLABORATOR_ACCESS: Record<string, MiniAppAccess> = {
  [CollaboratorRole.VIEWER]: MiniAppAccess.VIEW,
  [CollaboratorRole.DEVELOPER]: MiniAppAccess.EDIT,
  [CollaboratorRole.MAINTAINER]: MiniAppAccess.MAINTAIN,
  // Rows written before the rename to MAINTAINER (migration 1794800000000).
  ADMIN: MiniAppAccess.MAINTAIN,
};

export function roleNames(user: AccessSubject | null | undefined): string[] {
  const roles = user?.roles;
  if (!Array.isArray(roles)) return [];
  return roles
    .map((r: unknown) =>
      typeof r === 'string' ? r : (r as { name?: unknown } | null)?.name,
    )
    .filter((n): n is string => typeof n === 'string')
    .map((n) => n.toUpperCase().trim());
}

export function subjectId(user: AccessSubject | null | undefined): string {
  return (user?.sub || user?.id || '') as string;
}

export function isSuperAdmin(user: AccessSubject | null | undefined): boolean {
  return roleNames(user).includes('SUPER_ADMIN');
}

export function isOrgAdmin(user: AccessSubject | null | undefined): boolean {
  return roleNames(user).includes('ADMIN');
}

/**
 * The caller's access to one app. `collaboratorRole` is the caller's own row on
 * that app, if any (look it up with the caller's id; never trust the request).
 */
export function resolveMiniAppAccess(
  user: AccessSubject | null | undefined,
  app: AccessTarget | null | undefined,
  collaboratorRole?: string | null,
): MiniAppAccess {
  if (!user || !app) return MiniAppAccess.NONE;
  if (isSuperAdmin(user)) return MiniAppAccess.ADMIN;

  const userOrg = user.organizationId || null;
  const appOrg = app.organizationId || null;
  if (!userOrg || !appOrg || userOrg !== appOrg) return MiniAppAccess.NONE;

  if (isOrgAdmin(user)) return MiniAppAccess.ADMIN;

  const me = subjectId(user);
  if (me && app.ownerId && app.ownerId === me) return MiniAppAccess.OWN;

  if (collaboratorRole) {
    return (
      COLLABORATOR_ACCESS[collaboratorRole.toUpperCase()] ?? MiniAppAccess.NONE
    );
  }
  return MiniAppAccess.NONE;
}

/**
 * Narrows a Mini App list query to the apps the caller may VIEW. `alias` is the
 * mini_apps alias in the query. Returns false when the caller can see nothing
 * (the caller should then return an empty page without running the query).
 */
export function scopeMiniAppQuery<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  user: AccessSubject | null | undefined,
): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;

  const userOrg = user.organizationId || null;
  if (!userOrg) return false;

  // Property paths (alias.prop): TypeORM quotes them, so mixed-case aliases work.
  qb.andWhere(`${alias}.organizationId = :accessOrgId`, {
    accessOrgId: userOrg,
  });
  if (isOrgAdmin(user)) return true;

  const me = subjectId(user);
  if (!me) return false;
  qb.andWhere(
    `(${alias}.ownerId = :accessUserId OR EXISTS (` +
      `SELECT 1 FROM "mini_app_collaborators" access_c ` +
      `WHERE access_c."miniAppId" = ${alias}.id AND access_c."identityId" = :accessUserId))`,
    { accessUserId: me },
  );
  return true;
}

/** Capability types an app (or a request body) asks for, for change detection. */
export function capabilityTypes(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return Array.from(
    new Set(
      list
        .map((p: any) => (typeof p === 'string' ? p : p?.type))
        .filter((t): t is string => typeof t === 'string' && t.length > 0),
    ),
  ).sort();
}
