/** Role names that carry platform-wide (all organizations) authority. */
const PLATFORM_ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN']);

/**
 * True when the JWT payload holds a SUPER_ADMIN or ADMIN role. Decided by role
 * only, never by the email address: anyone can self-register an address such
 * as "admin.x@example.com" or "superadmin@example.com".
 */
export function isPlatformAdmin(requester: unknown): boolean {
  const roles = (requester as { roles?: unknown } | null | undefined)?.roles;
  if (!Array.isArray(roles)) return false;
  return roles.some((r: unknown) => {
    const name =
      typeof r === 'string' ? r : (r as { name?: unknown } | null)?.name;
    return (
      typeof name === 'string' &&
      PLATFORM_ADMIN_ROLES.has(name.toUpperCase().trim())
    );
  });
}
