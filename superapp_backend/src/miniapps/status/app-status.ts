/**
 * One status per question (schema master plan, Phase 6).
 *
 *   Can users get the app?          mini_apps.status (AppStatus)
 *   Where is this version in review
 *   and release?                    mini_app_versions.status (VersionStage,
 *                                   then ACTIVE / PREVIOUS / DEPRECATED)
 *   Is a build or scan running?     mini_app_builds / mini_app_scans
 *
 * The old fields (lifecycleStatus, availabilityStatus) are worked out from
 * these with lifecycleOf() and availabilityOf(), and a write of an old value
 * is turned into the new ones with appStatusOf() and stageOfLifecycle(), so
 * existing code and API responses keep their meaning.
 *
 * No imports: the entities use this module.
 */

export enum AppStatus {
  /** Never released. */
  DRAFT = 'DRAFT',
  /** A version is live on phones. */
  LIVE = 'LIVE',
  /** Hidden from phones by an admin; Resume brings it back. */
  SUSPENDED = 'SUSPENDED',
  /** Retired; read-only. A Super Admin can restore it as a draft. */
  ARCHIVED = 'ARCHIVED',
}

/** Stages of a version on its way to release (mini_app_versions.status). */
export enum VersionStage {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  IN_REVIEW = 'IN_REVIEW',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  REJECTED = 'REJECTED',
  APPROVED = 'APPROVED',
  TESTING = 'TESTING',
  TEST_PASSED = 'TEST_PASSED',
}

/** Version row statuses once a version left the stages. */
export const RELEASED_VERSION_STATUSES = ['ACTIVE', 'PREVIOUS', 'DEPRECATED'] as const;

/** Statuses of the version being worked on (an unreleased app's row, or a live app's revision row). */
export const IN_PROGRESS_STAGES: readonly string[] = Object.values(VersionStage);

export function isInProgressStage(status: unknown): boolean {
  return typeof status === 'string' && IN_PROGRESS_STAGES.includes(status);
}

/**
 * The version row being worked on (any stage, DRAFT ... TEST_PASSED): a live
 * app's revision row, or an unreleased app's working row. Rows are expected
 * newest first.
 */
export function revisionRowOf<T extends { status?: string | null }>(rows: T[] | null | undefined): T | undefined {
  if (!Array.isArray(rows)) return undefined;
  return rows.find((r) => isInProgressStage(r.status));
}

/** The row an app serves: its ACTIVE row, else the row being worked on. */
export function servingRowOf<T extends { status?: string | null }>(rows: T[] | null | undefined): T | undefined {
  if (!Array.isArray(rows)) return undefined;
  return rows.find((r) => r.status === 'ACTIVE') ?? revisionRowOf(rows);
}

const up = (v: unknown) => (typeof v === 'string' ? v.trim().toUpperCase() : '');

/**
 * The version stage an old lifecycle value stands for, 'ACTIVE' for a
 * released one, or null when it says nothing about the stage (SUSPENDED,
 * ARCHIVED, unknown).
 */
export function stageOfLifecycle(lifecycle: unknown): VersionStage | 'ACTIVE' | null {
  switch (up(lifecycle)) {
    case '':
    case 'DRAFT':
    case 'QUARANTINE':
      return VersionStage.DRAFT;
    case 'SUBMITTED':
      return VersionStage.SUBMITTED;
    case 'IN_REVIEW':
      return VersionStage.IN_REVIEW;
    case 'CHANGES_REQUESTED':
      return VersionStage.CHANGES_REQUESTED;
    case 'REJECTED':
      return VersionStage.REJECTED;
    // Approved, waiting for (or in) its test build: "building" is the build run
    case 'APPROVED':
    case 'APPROVED_FOR_TESTING':
    case 'BUILDING':
    case 'BUILDING_STAGE_1':
    case 'BUILD_FAILED':
      return VersionStage.APPROVED;
    case 'TESTING':
      return VersionStage.TESTING;
    case 'TEST_PASSED':
    case 'BUILDING_STAGE_2':
      return VersionStage.TEST_PASSED;
    case 'ACTIVE':
      return 'ACTIVE';
    default:
      return null;
  }
}

/**
 * The app status the old pair (lifecycleStatus, availabilityStatus) stands
 * for. Same rules as the Phase 6 backfill.
 */
export function appStatusOf(lifecycle: unknown, availability: unknown): AppStatus {
  const l = up(lifecycle);
  const a = up(availability);
  if (l === 'ARCHIVED' || l === 'TERMINATED') return AppStatus.ARCHIVED;
  if (l === 'SUSPENDED' || a === 'SUSPENDED') return AppStatus.SUSPENDED;
  if (l === 'ACTIVE' || a === 'PRODUCTION') return AppStatus.LIVE;
  return AppStatus.DRAFT;
}

const BUILD_RUNNING = new Set(['QUEUED', 'BUILDING', 'RUNNING']);

/**
 * The old lifecycle value for an app: its status, the stage of the version
 * it works on (unreleased apps) and whether a version was ever live
 * (suspended apps keep showing ACTIVE, as before). An approved app whose
 * test build runs or failed shows BUILDING / BUILD_FAILED, from its latest
 * build run.
 */
export function lifecycleOf(input: {
  appStatus?: string | null;
  stage?: string | null;
  everLive?: boolean;
  buildStatus?: string | null;
}): string {
  const status = up(input.appStatus);
  if (status === AppStatus.ARCHIVED) return 'ARCHIVED';
  if (status === AppStatus.LIVE) return 'ACTIVE';
  if (status === AppStatus.SUSPENDED && input.everLive) return 'ACTIVE';
  const stage = up(input.stage) || VersionStage.DRAFT;
  if (stage === VersionStage.APPROVED) {
    const build = up(input.buildStatus);
    if (BUILD_RUNNING.has(build)) return 'BUILDING';
    if (build === 'FAILED') return 'BUILD_FAILED';
  }
  return isInProgressStage(stage) ? stage : VersionStage.DRAFT;
}

/** The old availability value for an app status. */
export function availabilityOf(appStatus: unknown): 'TESTING' | 'PRODUCTION' | 'SUSPENDED' {
  const s = up(appStatus);
  if (s === AppStatus.SUSPENDED || s === AppStatus.ARCHIVED) return 'SUSPENDED';
  if (s === AppStatus.LIVE) return 'PRODUCTION';
  return 'TESTING';
}

/** Live on phones (not suspended or archived). */
export function isLiveStatus(appStatus: unknown): boolean {
  return up(appStatus) === AppStatus.LIVE;
}
