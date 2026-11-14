import React from 'react';

/**
 * One status per question (DATABASE_SCHEMA_MASTER_PLAN.md, Phase 6):
 *
 *   Status    mini_apps.status            can users get the app?
 *                                         Draft, Live, Suspended, Archived
 *   Version   mini_app_versions.status    where the version being worked on is
 *                                         (an unreleased app's version, or a
 *                                         live app's next one): Draft, In
 *                                         review, Approved, Testing, ...
 *   Build     the latest build run        shown on the version while its test
 *                                         build runs or after it failed
 *
 * A live app with a new version in review is Live, and that version is In
 * review. Responses still carry lifecycleStatus / availabilityStatus, so an
 * older response (no appStatus) reads the same.
 *
 * Color (60-30-10): chips are neutral; a small dot carries the meaning, and the
 * brand color marks only the live state.
 */

type Tone = 'neutral' | 'progress' | 'attention' | 'success' | 'danger' | 'muted';

const DOT: Record<Tone, string> = {
  neutral: 'bg-slate-400',
  progress: 'bg-sky-500',
  attention: 'bg-amber-500',
  success: 'bg-brand-500',
  danger: 'bg-rose-500',
  muted: 'bg-slate-300 dark:bg-slate-600',
};

export interface StatusSubject {
  status?: string;
  appStatus?: string;
  versionStage?: string | null;
  lifecycleStatus?: string;
  availabilityStatus?: string;
  buildStatus?: string;
}

const up = (v: unknown) => String(v || '').toUpperCase();

/** The old lifecycle value (still in every response). */
export function lifecycleOf(app: StatusSubject): string {
  return up(app.lifecycleStatus || app.status || 'DRAFT');
}

// ---- Status: can users get the app?

export type AppStatus = 'DRAFT' | 'LIVE' | 'SUSPENDED' | 'ARCHIVED';

export function appStatusOf(app: StatusSubject): AppStatus {
  const s = up(app.appStatus);
  if (s === 'DRAFT' || s === 'LIVE' || s === 'SUSPENDED' || s === 'ARCHIVED') return s;
  // An older response: from the old pair
  const lifecycle = lifecycleOf(app);
  const availability = up(app.availabilityStatus);
  if (lifecycle === 'ARCHIVED') return 'ARCHIVED';
  if (lifecycle === 'SUSPENDED' || availability === 'SUSPENDED') return 'SUSPENDED';
  if (lifecycle === 'ACTIVE' || availability === 'PRODUCTION') return 'LIVE';
  return 'DRAFT';
}

const APP_STATUS: Record<AppStatus, { label: string; tone: Tone; hint: string }> = {
  DRAFT: { label: 'Draft', tone: 'neutral', hint: 'Never released: not available to users yet.' },
  LIVE: { label: 'Live', tone: 'success', hint: 'Users can open it in the Super App.' },
  SUSPENDED: { label: 'Suspended', tone: 'danger', hint: 'Taken down: hidden from users until resumed.' },
  ARCHIVED: { label: 'Archived', tone: 'muted', hint: 'Retired and read-only.' },
};

// ---- Version: the version being worked on

const STAGE: Record<string, { label: string; tone: Tone; pulse?: boolean }> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  SUBMITTED: { label: 'Submitted', tone: 'attention', pulse: true },
  IN_REVIEW: { label: 'In review', tone: 'attention' },
  CHANGES_REQUESTED: { label: 'Changes requested', tone: 'attention' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  APPROVED: { label: 'Approved', tone: 'progress' },
  TESTING: { label: 'Testing', tone: 'progress' },
  TEST_PASSED: { label: 'Test passed', tone: 'progress' },
};

const OLD_LIFECYCLE_STAGE: Record<string, string> = {
  APPROVED_FOR_TESTING: 'APPROVED',
  BUILDING: 'APPROVED',
  BUILDING_STAGE_1: 'APPROVED',
  BUILD_FAILED: 'APPROVED',
  BUILDING_STAGE_2: 'TEST_PASSED',
  QUARANTINE: 'DRAFT',
};

/** Stage of the version being worked on, or null when nothing is in progress. */
export function versionStageOf(app: StatusSubject): string | null {
  if (app.versionStage !== undefined) return app.versionStage ? up(app.versionStage) : null;
  // An older response: an unreleased app's lifecycle is its version's stage
  if (appStatusOf(app) !== 'DRAFT') return null;
  const lifecycle = lifecycleOf(app);
  return OLD_LIFECYCLE_STAGE[lifecycle] ?? (STAGE[lifecycle] ? lifecycle : 'DRAFT');
}

export function versionStageInfo(app: StatusSubject): { label: string; tone: Tone; pulse?: boolean } | null {
  const stage = versionStageOf(app);
  if (!stage) return null;
  // An approved version's test build: the latest build run
  if (stage === 'APPROVED') {
    const build = up(app.buildStatus);
    if (build === 'BUILDING' || build === 'RUNNING' || build === 'QUEUED') {
      return { label: 'Building', tone: 'progress', pulse: true };
    }
    if (build === 'FAILED') return { label: 'Build failed', tone: 'danger' };
  }
  return STAGE[stage] ?? { label: stage.replace(/_/g, ' ').toLowerCase(), tone: 'neutral' };
}

function Chip({
  tone,
  pulse,
  title,
  children,
  size = 'sm',
}: {
  tone: Tone;
  pulse?: boolean;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md';
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap ${
        size === 'md' ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-[11px]'
      }`}
    >
      <span
        aria-hidden="true"
        className={`w-1.5 h-1.5 rounded-full ${DOT[tone]} ${pulse ? 'animate-pulse' : ''}`}
      />
      {children}
    </span>
  );
}

/** Can users get the app? Draft, Live, Suspended or Archived. */
export function AppStatusBadge({ app, size }: { app: StatusSubject; size?: 'sm' | 'md' }) {
  const info = APP_STATUS[appStatusOf(app)];
  return (
    <Chip tone={info.tone} size={size} title={`Status: ${info.hint}`}>
      <span className="sr-only">Status: </span>
      {info.label}
    </Chip>
  );
}

/**
 * Where the version being worked on is (review, approval, test build).
 * `empty` is shown when nothing is in progress (a live app with no new
 * version); omit it to render nothing.
 */
export function VersionStageBadge({
  app,
  size,
  empty,
}: {
  app: StatusSubject;
  size?: 'sm' | 'md';
  empty?: React.ReactNode;
}) {
  const info = versionStageInfo(app);
  if (!info) return <>{empty ?? null}</>;
  const live = appStatusOf(app) !== 'DRAFT';
  return (
    <Chip
      tone={info.tone}
      pulse={info.pulse}
      size={size}
      title={live ? 'Next version: where it is in review, approval and testing' : 'Version: where it is in review, approval and testing'}
    >
      <span className="sr-only">{live ? 'Next version: ' : 'Version: '}</span>
      {live && <span className="font-normal text-slate-500 dark:text-slate-400">Next:</span>}
      {info.label}
    </Chip>
  );
}
