'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { isBackendUnreachableError } from '@/api/client';
import { BackendServiceOfflineNotice } from '@/components/ui/BackendServiceOfflineNotice';
import {
  AlertTriangleIcon,
  RefreshIcon,
  CopyIcon,
  CheckIcon,
} from '@/components/ui/Icons';

interface ErrorProps {
  error: Error & { digest?: string; status?: number; code?: string; data?: any };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error('Unhandled backoffice application error:', error);
  }, [error]);

  const isBackendDown = isBackendUnreachableError(error);

  // If the backend API service is unreachable / 503 / ECONNREFUSED
  if (isBackendDown) {
    return (
      <BackendServiceOfflineNotice
        mode="page"
        title="Backend Service Unreachable"
        message={
          error.message ||
          'Backend service is currently unreachable. It may be starting up or restarting. Please try again shortly.'
        }
        statusCode={error.status || (error as any)?.data?.statusCode || 503}
        code={error.code || (error as any)?.data?.code || 'BACKEND_SERVICE_DOWN'}
        onRetry={reset}
        autoRetrySeconds={5}
        showDiagnosticsButton={true}
        showTroubleshooting={true}
      />
    );
  }

  const handleCopyError = () => {
    const errorDetails = {
      message: error.message,
      name: error.name,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
    };
    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="max-w-xl w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 text-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-5 ring-8 ring-rose-50/50 dark:ring-rose-950/20">
          <AlertTriangleIcon className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 mb-3 border border-rose-200 dark:border-rose-900">
          <span>Client Application Exception</span>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
          Application Error Encountered
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed max-w-md mx-auto">
          {error.message || 'An unexpected runtime error occurred while rendering this page.'}
        </p>

        {error.digest && (
          <div className="mb-6 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs font-mono text-slate-600 dark:text-slate-300 flex items-center justify-between gap-3 text-left">
            <div>
              <span className="font-semibold text-slate-400 block text-[10px] uppercase">Error Digest ID</span>
              <span className="select-all font-bold">{error.digest}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyError}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Copy error details"
            >
              {copied ? <CheckIcon className="w-4 h-4 text-emerald-500" /> : <CopyIcon className="w-4 h-4" />}
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-brand-600 hover:bg-brand-700 active:scale-95 transition-all shadow-sm shadow-brand-500/20 cursor-pointer"
          >
            <RefreshIcon className="w-4 h-4" />
            <span>Try Again</span>
          </button>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
          >
            <RefreshIcon className="w-4 h-4 text-slate-400" />
            <span>Reload Window</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
