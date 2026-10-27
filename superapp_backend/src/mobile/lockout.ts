import { EndUser } from './entities/end-user.entity';

/** Consecutive failed sign-in attempts before a lockout. */
export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

/**
 * The account fields after one more failed sign-in attempt at [now] (ms): the
 * MAX_FAILED_LOGINS-th consecutive failure locks the account for LOCKOUT_MS and
 * restarts the count.
 */
export function failurePatch(
  user: Pick<EndUser, 'failedLoginCount' | 'lockedUntil'>,
  now: number,
): Pick<EndUser, 'failedLoginCount' | 'lockedUntil'> {
  const failedLoginCount = (user.failedLoginCount ?? 0) + 1;
  if (failedLoginCount >= MAX_FAILED_LOGINS) {
    return { failedLoginCount: 0, lockedUntil: new Date(now + LOCKOUT_MS) };
  }
  return { failedLoginCount, lockedUntil: user.lockedUntil ?? null };
}
