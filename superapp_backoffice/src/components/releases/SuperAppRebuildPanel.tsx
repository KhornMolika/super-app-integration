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
    <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Rebuild the Super App</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {web === null
              ? 'Checking the web preview...'
              : web.available
                ? `Web preview: ${web.version || 'build'} #${web.build}${web.builtAt ? `, built ${when(web.builtAt)}` : ''}`
                : 'No web preview is being served. Rebuild it so the Backoffice preview works.'}
          </p>
          {lastResult && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{lastResult}</p>}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <button
            type="button"
            onClick={() => run('web')}
            disabled={busy !== null}
            className="px-3.5 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {busy === 'web' ? 'Starting...' : 'Rebuild web preview'}
          </button>
          <button
            type="button"
            onClick={() => run('test')}
            disabled={busy !== null}
            className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors"
          >
            {busy === 'test' ? 'Starting...' : 'New test build'}
          </button>
        </div>
      </div>
    </section>
  );
}
