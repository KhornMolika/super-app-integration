export const API_URL = '/api';

/**
 * The organization that runs the platform (FTC). Super Admin is only offered for
 * its members; the backend enforces the same rule (PLATFORM_OWNER_ORG_CODE).
 */
export const PLATFORM_OWNER_ORG_CODE = (
  process.env.NEXT_PUBLIC_PLATFORM_OWNER_ORG_CODE || 'FTC'
)
  .trim()
  .toUpperCase();

export function isPlatformOwnerOrgCode(code?: string | null): boolean {
  return (code || '').trim().toUpperCase() === PLATFORM_OWNER_ORG_CODE;
}
