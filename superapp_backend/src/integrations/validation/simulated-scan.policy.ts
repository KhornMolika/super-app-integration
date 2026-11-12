/**
 * Whether the backend's built-in scanners may stand in when Jenkins cannot run a
 * scan. They simulate most checks (they never read the package), so a Jenkins
 * outage must not let a package pass in production.
 *
 * LOCAL_SCANNER_FALLBACK=true|false decides; unset, it is allowed only outside
 * production (ENVIRONMENT=DEV, or no ENVIRONMENT and NODE_ENV not production).
 */
export function simulatedScanAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  const flag = String(env.LOCAL_SCANNER_FALLBACK || '').trim().toLowerCase();
  if (['true', '1', 'yes'].includes(flag)) return true;
  if (['false', '0', 'no'].includes(flag)) return false;
  const environment = String(env.ENVIRONMENT || '').trim().toUpperCase();
  if (environment) return environment === 'DEV';
  return env.NODE_ENV !== 'production';
}
