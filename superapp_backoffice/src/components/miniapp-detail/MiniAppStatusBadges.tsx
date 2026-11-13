import React from 'react';

/**
 * Two separate status dimensions of a MiniApp (DATABASE_SCHEMA_MASTER_PLAN.md §3):
 *
 *   Lifecycle     mini_apps.lifecycleStatus   where the app is in governance:
 *                 draft -> review -> test build -> testing -> release -> active
 *   Availability  mini_apps.availabilityStatus whether users can reach it right
 *                 now: the runtime gate (live, suspended, not released)
 *
 * They answer different questions, so the UI shows them as two badges. A
 * suspended app keeps its lifecycle stage (e.g. ACTIVE) while availability is
 * SUSPENDED.
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

const LIFECYCLE: Record<string, { label: string; tone: Tone; pulse?: boolean }> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  SUBMITTED: { label: 'Submitted', tone: 'attention', pulse: true },
  IN_REVIEW: { label: 'In review', tone: 'attention' },
  CHANGES_REQUESTED: { label: 'Changes requested', tone: 'attention' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  APPROVED: { label: 'Approved', tone: 'progress' },
  APPROVED_FOR_TESTING: { label: 'Approved for testing', tone: 'progress' },
  BUILDING: { label: 'Building', tone: 'progress', pulse: true },
  BUILDING_STAGE_1: { label: 'Building test', tone: 'progress', pulse: true },
  BUILD_FAILED: { label: 'Build failed', tone: 'danger' },
  TESTING: { label: 'Testing', tone: 'progress' },
  TEST_PASSED: { label: 'Test passed', tone: 'progress' },
  BUILDING_STAGE_2: { label: 'Building release', tone: 'progress', pulse: true },
  ACTIVE: { label: 'Active', tone: 'success' },
  SUSPENDED: { label: 'Suspended', tone: 'danger' },
  ARCHIVED: { label: 'Archived', tone: 'muted' },
};

export interface StatusSubject {
  status?: string;
  lifecycleStatus?: string;
  availabilityStatus?: string;
  buildStatus?: string;
}

export function lifecycleOf(app: StatusSubject): string {
  return String(app.lifecycleStatus || app.status || 'DRAFT').toUpperCase();
}

export function lifecycleInfo(app: StatusSubject) {
  const key = lifecycleOf(app);
  return LIFECYCLE[key] ?? { label: key.replace(/_/g, ' ').toLowerCase(), tone: 'neutral' as Tone };
}

export type Availability = 'live' | 'suspended' | 'not-live';

/** The runtime gate: can users reach the app right now? */
export function availabilityOf(app: StatusSubject): Availability {
  const availability = String(app.availabilityStatus || '').toUpperCase();
  if (availability === 'SUSPENDED') return 'suspended';
  if (lifecycleOf(app) === 'ACTIVE' || availability === 'PRODUCTION') return 'live';
  return 'not-live';
}

const AVAILABILITY: Record<Availability, { label: string; tone: Tone; hint: string }> = {
  live: { label: 'Live', tone: 'success', hint: 'Users can open it in the Super App.' },
  suspended: { label: 'Suspended', tone: 'danger', hint: 'Taken down: hidden from users.' },
  'not-live': { label: 'Not released', tone: 'muted', hint: 'Not available to users yet.' },
};

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

export function LifecycleBadge({ app, size }: { app: StatusSubject; size?: 'sm' | 'md' }) {
  const info = lifecycleInfo(app);
  return (
    <Chip tone={info.tone} pulse={info.pulse} size={size} title="Lifecycle: where the app is in review, build and release">
      <span className="sr-only">Lifecycle: </span>
      {info.label}
    </Chip>
  );
}

export function AvailabilityBadge({ app, size }: { app: StatusSubject; size?: 'sm' | 'md' }) {
  const info = AVAILABILITY[availabilityOf(app)];
  return (
    <Chip tone={info.tone} size={size} title={`Availability: ${info.hint}`}>
      <span className="sr-only">Availability: </span>
      {info.label}
    </Chip>
  );
}
