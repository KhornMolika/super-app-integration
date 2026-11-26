'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { superAppApi } from '@/api';
import { useConfirm } from '@/components/ui/ConfirmationProvider';
import { toast } from '@/components/ui/Toast';

/**
 * Super Admin: rebuild the Super App on demand, e.g. after testing every case.
 * A test build makes a new APK and web preview from the same source; the web
 * rebuild refreshes only the preview. Neither changes any mini app's stage.
 */

interface WebBuildInfo {
  available: boolean;
  build?: number;
  version?: string;
  commit?: string;
  builtAt?: string;
}

const unwrap = <T,>(res: any): T => (res && res.data !== undefined && res.available === undefined ? res.data : res);

function when(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function SuperAppRebuildPanel() {
  const confirm = useConfirm();
  const [web, setWeb] = useState<WebBuildInfo | null>(null);
  const [busy, setBusy] = useState<'test' | 'web' | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const loadWeb = useCallback(async () => {
    try {
      setWeb(unwrap<WebBuildInfo>(await superAppApi.getWebBuildInfo()));
    } catch {
      setWeb({ available: false });
    }
  }, []);

  useEffect(() => {
    loadWeb();
  }, [loadWeb]);

  const run = async (kind: 'test' | 'web') => {
    const ok = await confirm(
      kind === 'test'
        ? {
            title: 'Start a new test build?',
            message:
              'Builds a new Super App test APK and web preview with every app a test build includes right now: live apps, apps under test and apps being built. Apps with a failed build or a failed scan stay out. No mini app changes stage.',
            confirmText: 'Start test build',
          }
        : {
            title: 'Rebuild the web preview?',
            message:
              'Rebuilds only the web Super App used by the Backoffice preview and /preview/. The test APK stays as it is.',
            confirmText: 'Rebuild preview',
          },
    );
    if (!ok) return;
    setBusy(kind);
    setLastResult(null);
    try {
      const res: any = unwrap(kind === 'test' ? await superAppApi.rebuildTestBuild() : await superAppApi.rebuildWebPreview());
      if (res?.success === false) throw new Error(res?.message || 'Jenkins did not accept the build.');
      const msg =
        kind === 'test'
          ? `Test build ${res?.version || ''} started. The APK and preview update when Jenkins finishes.`
          : 'Web preview build started. The preview switches to it within a minute of finishing.';
      setLastResult(msg);
      toast.success(msg, 'Build started');
    } catch (e: any) {
      toast.error(e?.message || 'Could not start the build', 'Build not started');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative rounded-xl border border-dashed border-sky-300/90 dark:border-sky-800/70 bg-gradient-to-r from-sky-50/80 via-slate-50/60 to-transparent dark:from-sky-950/30 dark:via-slate-900/40 dark:to-transparent px-4 py-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-sky-500" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Test &amp; Preview Builds
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/80">
              Non-Production
            </span>
            {web?.available && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
                <span>{web.version || 'build'}</span>
                <span className="text-slate-400">#{web.build}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {web === null
              ? 'Checking the web preview status...'
              : web.available
                ? `Latest web preview${web.builtAt ? ` built ${when(web.builtAt)}` : ''} — triggers QA/sandbox builds without changing any MiniApp stage.`
                : 'No web preview is currently served. Rebuild the web preview so Backoffice Sandbox Preview works.'}
          </p>
          {lastResult && (
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{lastResult}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => run('web')}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-300 dark:hover:border-sky-700 hover:text-sky-700 dark:hover:text-sky-300 disabled:opacity-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{busy === 'web' ? 'Starting...' : 'Rebuild Web Preview'}</span>
          </button>
          <button
            type="button"
            onClick={() => run('test')}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-sm disabled:opacity-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <span>{busy === 'test' ? 'Starting...' : 'New Test Build'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
