/**
 * Who has authority over what:
 *
 *   SUPER_ADMIN  the platform admin: every organization, platform settings and
 *                Super App build infrastructure.
 *   ADMIN        an organization admin: their own organization only (its users,
 *                its mini apps, its audit trail, its organization profile).
 *
 * Decided by role only, never by the email address: anyone can self-register an
 * address such as "admin.x@example.com" or "superadmin@example.com".
 *
 * SUPER_ADMIN belongs to the platform owner organization (FTC, which runs the
 * Super App) and nowhere else. Every other organization is a tenant. Enforced
 * when the role or organization is assigned (AccessControlService), when a
 * token is issued (AuthService) and on every Backoffice request (JwtAuthGuard),
 * so `isPlatformAdmin` below can trust the role it reads from the token.
 */

/** Code of the organization that runs the platform (env PLATFORM_OWNER_ORG_CODE). */
export function platformOwnerOrgCode(): string {
  return (process.env.PLATFORM_OWNER_ORG_CODE || 'FTC').trim().toUpperCase();
}

export function isPlatformOwnerOrg(code: unknown): boolean {
  return (
    typeof code === 'string' &&
    code.trim().toUpperCase() === platformOwnerOrgCode()
  );
}

/** True when a list of role names (or role objects) contains SUPER_ADMIN. */
export function includesSuperAdmin(roles: unknown): boolean {
  return roleNamesOf({ roles }).includes('SUPER_ADMIN');
}

export const SUPER_ADMIN_OUTSIDE_PLATFORM_ORG = `Super Admin is reserved for the platform owner organization (${platformOwnerOrgCode()}).`;

function roleNamesOf(requester: unknown): string[] {
  const roles = (requester as { roles?: unknown } | null | undefined)?.roles;
  if (!Array.isArray(roles)) return [];
  return roles
    .map((r: unknown) =>
      typeof r === 'string' ? r : (r as { name?: unknown } | null)?.name,
    )
    .filter((n): n is string => typeof n === 'string')
    .map((n) => n.toUpperCase().trim());
}

/** True for SUPER_ADMIN only: authority over every organization. */
export function isPlatformAdmin(requester: unknown): boolean {
  return roleNamesOf(requester).includes('SUPER_ADMIN');
}

/** True for ADMIN (organization admin). Scope it with `requesterOrgId`. */
export function isOrgAdmin(requester: unknown): boolean {
  return roleNamesOf(requester).includes('ADMIN');
}

/** The organization a requester belongs to, from the JWT payload. */
export function requesterOrgId(requester: unknown): string | null {
  const org = (requester as { organizationId?: unknown } | null | undefined)
    ?.organizationId;
  return typeof org === 'string' && org.length > 0 ? org : null;
}

/**
 * True when the requester may act on something that belongs to `orgId`:
 * SUPER_ADMIN always, anyone else only inside their own organization.
 * Deny by default when either side has no organization.
 */
export function canActInOrg(
  requester: unknown,
  orgId: string | null | undefined,
): boolean {
  if (isPlatformAdmin(requester)) return true;
  const mine = requesterOrgId(requester);
  return Boolean(mine && orgId && mine === orgId);
}
