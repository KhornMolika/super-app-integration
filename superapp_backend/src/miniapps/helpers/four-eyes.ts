/**
 * Four-eyes approval: whoever approves a mini app for testing or for production
 * is not the person who owns it or the person who submitted it. Someone else
 * has to look at it (another Super Admin, or the right organization admin).
 *
 * On by default. FOUR_EYES_APPROVAL=false turns it off, for a single-person
 * local setup only.
 */

export const FOUR_EYES_SUBMIT_ACTIONS = [
  'SUBMIT_MINI_APP',
  'UPDATE_MINI_APP_REVISION',
];

export function fourEyesEnabled(): boolean {
  return (
    (process.env.FOUR_EYES_APPROVAL || 'true').trim().toLowerCase() !== 'false'
  );
}

/** Why `approverId` may not approve, or null when they may. */
export function fourEyesViolation(
  approverId: string | null | undefined,
  ownerId: string | null | undefined,
  submitterId: string | null | undefined,
): string | null {
  if (!fourEyesEnabled() || !approverId) return null;
  if (ownerId && approverId === ownerId) {
    return 'You own this mini app. Another admin must approve it.';
  }
  if (submitterId && approverId === submitterId) {
    return 'You submitted this mini app. Another admin must approve it.';
  }
  return null;
}
