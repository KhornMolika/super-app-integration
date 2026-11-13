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
 */

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
