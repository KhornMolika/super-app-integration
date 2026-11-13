/**
 * Which mini apps a Super App build bundles. One rule for every list the build
 * reads (Flutter packages, Native SDKs, Git credentials).
 *
 *   Test build (debug)  apps users already have (ACTIVE), apps under test
 *                       (TESTING, TEST_PASSED) and the app whose test build is
 *                       running now (APPROVED + build in progress).
 *   Release build       ACTIVE only: what production users may get.
 *
 * Left out of every build: drafts, apps in review, rejected or archived apps,
 * an APPROVED app whose test build failed or never started (it would otherwise
 * ride along in, and can break, everyone else's build), and apps whose security
 * scan failed. Suspended apps stay in: suspension is the runtime gate, so
 * Resume works without a new build.
 */

export type SuperAppBuildType = 'debug' | 'release';

/**
 * Older Jenkins jobs do not send the build type. Default to the test build:
 * its list is a superset of the release list, so nothing a build needed before
 * goes missing.
 */
export function parseBuildType(value: unknown): SuperAppBuildType {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return v === 'release' ? 'release' : 'debug';
}

/** Lifecycle stages a build may include (then filtered by buildExclusionReason). */
const TEST_BUILD_STAGES = [
  'APPROVED',
  'APPROVED_FOR_TESTING',
  'BUILDING',
  'BUILDING_STAGE_1',
  'TESTING',
  'TEST_PASSED',
  'BUILDING_STAGE_2',
  'ACTIVE',
];
const RELEASE_BUILD_STAGES = ['ACTIVE'];

export function buildStagesFor(type: SuperAppBuildType): string[] {
  return type === 'release' ? RELEASE_BUILD_STAGES : TEST_BUILD_STAGES;
}

/** Approved but not yet tested: only included while its own test build runs. */
const AWAITING_TEST_BUILD = new Set([
  'APPROVED',
  'APPROVED_FOR_TESTING',
  'BUILDING',
  'BUILDING_STAGE_1',
]);
const BUILD_IN_PROGRESS = new Set(['BUILDING', 'RUNNING', 'QUEUED']);

export interface BuildCandidate {
  lifecycleStatus?: string | null;
  buildStatus?: string | null;
  validationStatus?: string | null;
}

/**
 * Why an app (already in one of buildStagesFor(type)) stays out of this build,
 * or null when it is included. The reason goes into the build log.
 */
export function buildExclusionReason(
  app: BuildCandidate,
  type: SuperAppBuildType,
): string | null {
  const stage = String(app.lifecycleStatus || '').toUpperCase();
  if (!buildStagesFor(type).includes(stage)) {
    return `${stage || 'no'} stage is not part of a ${type === 'release' ? 'release' : 'test'} build`;
  }

  // A live app stays until someone suspends or archives it: a failed rescan
  // must not silently remove it from users' Super App. (validationStatus is the
  // app's own latest scan; a pending revision's scan is kept apart.)
  if (stage === 'ACTIVE') return null;

  if (String(app.validationStatus || '').toUpperCase() === 'FAILED') {
    return 'security scan failed';
  }

  if (AWAITING_TEST_BUILD.has(stage)) {
    const build = String(app.buildStatus || '').toUpperCase();
    if (BUILD_IN_PROGRESS.has(build)) return null;
    return build === 'FAILED'
      ? 'its last test build failed (retry the test build for this app)'
      : 'approved, but its test build has not been started';
  }
  return null;
}
