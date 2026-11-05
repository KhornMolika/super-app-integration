/**
 * integrationConfig keys written by the lifecycle, never by the edit form:
 * startTesting sets superAppTestVersion, activate sets superAppReleaseVersion.
 * The DTO whitelist strips them from PATCH bodies, so a staged revision's
 * integrationConfig does not have them.
 */
export const LIFECYCLE_CONFIG_KEYS = [
  'superAppTestVersion',
  'superAppReleaseVersion',
] as const;

type Config = Record<string, unknown>;

const isConfig = (value: unknown): value is Config =>
  typeof value === 'object' && value !== null;

/**
 * `next` with the lifecycle keys of the live config put back (the live row is
 * their source of truth). Keys the live config lacks are left as they are.
 * Idempotent: applying it twice gives the same config.
 */
export function keepLifecycleConfigKeys<T>(next: T, live: unknown): T {
  if (!isConfig(next) || !isConfig(live)) return next;
  const kept: Config = { ...next };
  for (const key of LIFECYCLE_CONFIG_KEYS) {
    if (live[key] !== undefined) kept[key] = live[key];
  }
  return kept as T;
}
