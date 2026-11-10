'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  X,
  Circle,
  Loader2,
  MinusCircle,
  HelpCircle,
  ExternalLink,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  PermissionProposal,
  ProgressState,
  ProgressStep,
  ProposalProgressInfo,
  permissionsApi,
} from '@/api/permissions.api';
import { Button } from '@/components/ui/inputs';

const STATE_STYLE: Record<ProgressState, { ring: string; text: string; line: string }> = {
  done: {
    ring: 'bg-emerald-500 border-emerald-500 text-white',
    text: 'text-slate-900 dark:text-slate-100',
    line: 'bg-emerald-400/70',
  },
  current: {
    ring: 'bg-white dark:bg-slate-900 border-brand-500 text-brand-600 dark:text-brand-400',
    text: 'text-slate-900 dark:text-slate-100',
    line: 'bg-slate-200 dark:bg-slate-700',
  },
  pending: {
    ring: 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-300 dark:text-slate-600',
    text: 'text-slate-400 dark:text-slate-500',
    line: 'bg-slate-200 dark:bg-slate-700',
  },
  failed: {
    ring: 'bg-rose-500 border-rose-500 text-white',
    text: 'text-rose-700 dark:text-rose-300',
    line: 'bg-slate-200 dark:bg-slate-700',
  },
  skipped: {
    ring: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400',
    text: 'text-slate-400 dark:text-slate-500',
    line: 'bg-slate-200 dark:bg-slate-700',
  },
  unknown: {
    ring: 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-600 dark:text-amber-400',
    text: 'text-slate-700 dark:text-slate-300',
    line: 'bg-slate-200 dark:bg-slate-700',
  },
};

function StepIcon({ state }: { state: ProgressState }) {
  const cls = 'w-3 h-3';
  switch (state) {
    case 'done':
      return <Check className={cls} strokeWidth={3} />;
    case 'failed':
      return <X className={cls} strokeWidth={3} />;
    case 'current':
      return <Loader2 className={`${cls} animate-spin`} />;
    case 'skipped':
      return <MinusCircle className={cls} />;
    case 'unknown':
      return <HelpCircle className={cls} />;
    default:
      return <Circle className="w-2 h-2" />;
  }
}

const formatTime = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const STATE_WORD: Record<ProgressState, string> = {
  done: 'done',
  current: 'in progress',
  pending: 'not started',
  failed: 'stopped',
  skipped: 'skipped',
  unknown: 'unknown',
};

function StepRow({ step, last }: { step: ProgressStep; last: boolean }) {
  const style = STATE_STYLE[step.state];
  const when = formatTime(step.at);
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!last && <span aria-hidden className={`absolute left-[9px] top-5 bottom-0 w-0.5 ${style.line}`} />}
      <span
        className={`relative z-10 mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center ${style.ring}`}
        aria-hidden
      >
        <StepIcon state={step.state} />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <span className={`text-xs font-semibold ${style.text}`}>
            {step.label}
            <span className="sr-only"> ({STATE_WORD[step.state]})</span>
          </span>
          {when && <span className="text-[10px] text-slate-400 tabular-nums">{when}</span>}
        </div>
        {step.detail && (
          <p
            className={`text-[11px] leading-relaxed break-words ${
              step.state === 'failed' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {step.detail}
          </p>
        )}
        {!!step.links?.length && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
            {step.links.map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                {l.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

/** Steps from request to release for one capability request, loaded from the backend. */
export function ProposalProgress({ proposalId, refreshKey }: { proposalId: string; refreshKey?: unknown }) {
  const [progress, setProgress] = useState<ProposalProgressInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProgress(await permissionsApi.getProposalProgress(proposalId));
    } catch (err: any) {
      setError(err?.message || 'Could not load the progress.');
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return (
    <section aria-label="Progress" className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Progress</h3>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer disabled:opacity-50"
          aria-label="Refresh progress"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      {error ? (
        <p className="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      ) : !progress ? (
        <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading...
        </p>
      ) : (
        <ol className="pt-0.5">
          {progress.steps.map((s, i) => (
            <StepRow key={s.key} step={s} last={i === progress.steps.length - 1} />
          ))}
        </ol>
      )}
    </section>
  );
}

/** Read-only view of a request's progress, for people who cannot review it. */
export function ProposalProgressModal({
  proposal,
  onClose,
}: {
  proposal: PermissionProposal | null;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!proposal) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [proposal, onClose]);

  if (!mounted || !proposal) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposal-progress-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="proposal-progress-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {proposal.permissionName || proposal.permissionKey}
            </h2>
            <p className="font-mono text-[11px] text-slate-500">{proposal.permissionKey}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <ProposalProgress proposalId={proposal.id} />
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose} className="text-xs font-semibold px-4 py-2 rounded-xl">
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default ProposalProgress;
