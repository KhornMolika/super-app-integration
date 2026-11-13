'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { miniappsApi } from '@/api';

/**
 * Scan and build history of one mini app (mini_app_scans, mini_app_builds),
 * newest first. Neutral surfaces; color only on the status of each run.
 */

interface ScanRun {
  id: string;
  scope: 'APP' | 'REVISION';
  version?: string | null;
  status: string;
  stages?: Record<string, { name?: string; status?: string; details?: string }>;
  report?: { score?: number; findings?: Array<{ severity?: string; title?: string }> } | null;
  errors?: Record<string, string> | string[] | null;
  checks?: string[];
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

interface BuildRun {
  id: string;
  version?: string | null;
  buildType?: 'debug' | 'release' | null;
  buildStatus: string;
  buildStages?: Record<string, { name?: string; status?: string; details?: string }>;
  buildError?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

interface Page<T> {
  rows: T[];
  page: number;
  hasNext: boolean;
  total: number;
}

const PAGE_SIZE = 10;

const TONE: Record<string, string> = {
  PASSED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30',
  COMPLETED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30',
  SUCCESS: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30',
  RUNNING: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-cyan-500/30',
  BUILDING: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-cyan-500/30',
  QUEUED: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-cyan-500/30',
  FAILED: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/30',
  ERROR: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/30',
};
const NEUTRAL = 'bg-slate-500/10 text-slate-600 dark:text-slate-300 ring-slate-500/30';

function StatusPill({ status }: { status: string }) {
  const s = (status || 'PENDING').toUpperCase();
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TONE[s] || NEUTRAL}`}>
      {s.charAt(0) + s.slice(1).toLowerCase()}
    </span>
  );
}

function when(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function duration(start?: string | null, end?: string | null) {
  if (!start || !end) return '';
  const s = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

function errorLines(errors: ScanRun['errors']): string[] {
  if (!errors) return [];
  return Array.isArray(errors) ? errors.map(String) : Object.values(errors).map(String);
}

function Stages({ stages }: { stages?: ScanRun['stages'] }) {
  const list = Object.entries(stages || {});
  if (list.length === 0) return null;
  return (
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {list.map(([key, st]) => (
        <li key={key} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 px-3 py-2">
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{st?.name || key}</div>
            {st?.details && <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{st.details}</div>}
          </div>
          <StatusPill status={st?.status || 'PENDING'} />
        </li>
      ))}
    </ul>
  );
}

function RunRow({
  title,
  meta,
  status,
  children,
}: {
  title: React.ReactNode;
  meta: React.ReactNode;
  status: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className="border-b border-slate-200/70 dark:border-slate-800 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{title}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{meta}</div>
        </div>
        <StatusPill status={status} />
        <svg
          className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </li>
  );
}

function usePaged<T>(load: (page: number) => Promise<any>) {
  const [state, setState] = useState<Page<T>>({ rows: [], page: 0, hasNext: false, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (page: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await load(page);
        const rows: T[] = Array.isArray(res?.data) ? res.data : [];
        const meta = res?.meta || {};
        setState((prev) => ({
          rows: page === 1 ? rows : [...prev.rows, ...rows],
          page,
          hasNext: Boolean(meta.hasNextPage),
          total: Number(meta.totalItems ?? rows.length),
        }));
      } catch (e: any) {
        setError(e?.message || 'Could not load the history.');
      } finally {
        setLoading(false);
      }
    },
    [load],
  );

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  return { ...state, loading, error, more: () => fetchPage(state.page + 1), reload: () => fetchPage(1) };
}

function Section({
  title,
  total,
  loading,
  error,
  empty,
  hasNext,
  onMore,
  onRetry,
  children,
}: {
  title: string;
  total: number;
  loading: boolean;
  error: string | null;
  empty: string;
  hasNext: boolean;
  onMore: () => void;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  const isEmpty = !loading && !error && total === 0;
  return (
    <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200/70 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">{total} run{total === 1 ? '' : 's'}</span>
      </header>
      {error ? (
        <div className="px-4 py-6 text-sm text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-3">
          <span>{error}</span>
          <button type="button" onClick={onRetry} className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline">
            Retry
          </button>
        </div>
      ) : isEmpty ? (
        <p className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">{empty}</p>
      ) : (
        <ul>{children}</ul>
      )}
      {(hasNext || loading) && !error && (
        <div className="px-4 py-3 border-t border-slate-200/70 dark:border-slate-800">
          <button
            type="button"
            disabled={loading}
            onClick={onMore}
            className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Show older runs'}
          </button>
        </div>
      )}
    </section>
  );
}

export function RunHistoryTab({ miniAppId }: { miniAppId: string }) {
  const loadScans = useCallback(
    (page: number) => miniappsApi.getScans(miniAppId, { page, limit: PAGE_SIZE }),
    [miniAppId],
  );
  const loadBuilds = useCallback(
    (page: number) => miniappsApi.getBuilds(miniAppId, { page, limit: PAGE_SIZE }),
    [miniAppId],
  );
  const scans = usePaged<ScanRun>(loadScans);
  const builds = usePaged<BuildRun>(loadBuilds);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section
        title="Security scans"
        total={scans.total}
        loading={scans.loading}
        error={scans.error}
        empty="No scan has run yet. Submitting the app starts one."
        hasNext={scans.hasNext}
        onMore={scans.more}
        onRetry={scans.reload}
      >
        {scans.rows.map((run) => {
          const score = run.report?.score;
          const errs = errorLines(run.errors);
          return (
            <RunRow
              key={run.id}
              status={run.status}
              title={
                <>
                  {run.version ? `v${run.version.replace(/^v/, '')}` : 'Version not recorded'}
                  {run.scope === 'REVISION' && (
                    <span className="ml-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">new version</span>
                  )}
                </>
              }
              meta={[when(run.startedAt || run.createdAt), duration(run.startedAt, run.completedAt), typeof score === 'number' ? `score ${score}/100` : '']
                .filter(Boolean)
                .join(' · ')}
            >
              {errs.length > 0 && (
                <ul className="space-y-1 text-xs text-rose-600 dark:text-rose-400">
                  {errs.slice(0, 5).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
              <Stages stages={run.stages} />
              {run.checks && run.checks.length > 0 && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Checks: {run.checks.join(', ')}</p>
              )}
            </RunRow>
          );
        })}
      </Section>

      <Section
        title="Builds"
        total={builds.total}
        loading={builds.loading}
        error={builds.error}
        empty="No build has run yet. Starting a test build adds one here."
        hasNext={builds.hasNext}
        onMore={builds.more}
        onRetry={builds.reload}
      >
        {builds.rows.map((run) => (
          <RunRow
            key={run.id}
            status={run.buildStatus}
            title={
              <>
                {run.version ? `Super App ${run.version}` : 'Version not recorded'}
                {run.buildType && (
                  <span className="ml-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {run.buildType === 'release' ? 'release build' : 'test build'}
                  </span>
                )}
              </>
            }
            meta={[when(run.startedAt || run.createdAt), duration(run.startedAt, run.completedAt)].filter(Boolean).join(' · ')}
          >
            {run.buildError && <p className="text-xs text-rose-600 dark:text-rose-400 break-words">{run.buildError}</p>}
            <Stages stages={run.buildStages} />
          </RunRow>
        ))}
      </Section>
    </div>
  );
}
