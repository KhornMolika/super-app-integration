'use client';

import React, { useState, useEffect } from 'react';
import { pubspecApi, SandboxBuildStatus } from '@/api/integrations.api';
import { useAuth } from '@/lib/auth';

export default function SandboxBuildStatusIndicator() {
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole('SUPER_ADMIN') || hasRole('ADMIN');

  const [status, setStatus] = useState<SandboxBuildStatus | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await pubspecApi.getSandboxBuildStatus();
      setStatus(res);
    } catch (_) {}
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRebuild = async () => {
    setIsTriggering(true);
    try {
      await pubspecApi.triggerSandboxBuild();
      await fetchStatus();
    } catch (_) {
    } finally {
      setIsTriggering(false);
    }
  };

  if (!status || status.state === 'IDLE') return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all shadow-xs cursor-pointer border ${
          status.state === 'BUILDING'
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse'
            : status.state === 'SUCCESS'
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
        }`}
        title="Click to view Super App Sandbox compilation status and logs"
      >
        {status.state === 'BUILDING' ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Sandbox Compiling...</span>
          </>
        ) : status.state === 'SUCCESS' ? (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Sandbox Ready</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Sandbox Error</span>
          </>
        )}
      </button>

      {/* Logs Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-xl ${
                    status.state === 'BUILDING'
                      ? 'bg-amber-100 text-amber-700'
                      : status.state === 'SUCCESS'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Super App Sandbox Compilation Pipeline
                  </h3>
                  <p className="text-xs text-slate-500">{status.message}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={handleManualRebuild}
                    disabled={isTriggering || status.state === 'BUILDING'}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-1 shadow-xs"
                  >
                    <span>{isTriggering ? 'Starting...' : 'Rebuild Now'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Terminal Output */}
            <div className="p-4 bg-slate-950 font-mono text-xs text-slate-200 max-h-80 overflow-y-auto space-y-1 scrollbar-thin">
              {status.recentLogs.length === 0 ? (
                <div className="text-slate-500 py-6 text-center">No build logs buffered yet.</div>
              ) : (
                status.recentLogs.map((line, idx) => (
                  <div
                    key={idx}
                    className={`leading-relaxed ${
                      line.includes('ERROR') || line.includes('[WARN/ERR]')
                        ? 'text-rose-400 font-semibold'
                        : line.includes('✅')
                        ? 'text-emerald-400 font-semibold'
                        : 'text-slate-300'
                    }`}
                  >
                    {line}
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex justify-between items-center">
              <div>
                Triggered By: <strong className="text-slate-700 dark:text-slate-300">{status.triggeredBy || 'System'}</strong>
                {status.durationMs ? ` • Duration: ${(status.durationMs / 1000).toFixed(1)}s` : ''}
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-750 text-slate-700 dark:text-slate-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
