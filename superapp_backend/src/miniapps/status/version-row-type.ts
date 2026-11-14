/**
 * The history label of a version row: PRODUCTION once released (ACTIVE,
 * PREVIOUS, DEPRECATED), TEST while it is in the test build (TESTING,
 * TEST_PASSED), DRAFT before that.
 */
export function versionRowType(status: unknown): 'PRODUCTION' | 'TEST' | 'DRAFT' {
  const s = typeof status === 'string' ? status.toUpperCase() : '';
  if (s === 'ACTIVE' || s === 'PREVIOUS' || s === 'DEPRECATED') return 'PRODUCTION';
  if (s === 'TESTING' || s === 'TEST_PASSED') return 'TEST';
  return 'DRAFT';
}
