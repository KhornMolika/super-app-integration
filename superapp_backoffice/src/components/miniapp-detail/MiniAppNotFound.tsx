'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/inputs';
import { BackendServiceOfflineNotice } from '@/components/ui/BackendServiceOfflineNotice';
import { isBackendUnreachableError } from '@/api';

interface MiniAppNotFoundProps {
  id: string;
  isLoading: boolean;
  fetchError: string | null;
  onRetry: () => void;
}

export function MiniAppNotFound({
  id,
  isLoading,
  fetchError,
  onRetry,
}: MiniAppNotFoundProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center mt-32 space-y-4">
        <svg className="animate-spin h-10 w-10 text-brand-600 dark:text-brand-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <div className="text-slate-500 dark:text-slate-400 font-medium">Loading app configuration...</div>
      </div>
    );
  }

  if (fetchError && isBackendUnreachableError(fetchError)) {
    return (
      <BackendServiceOfflineNotice
        mode="card"
        title="Backend Service Unreachable"
        message={fetchError}
        onRetry={onRetry}
        autoRetrySeconds={5}
        showDiagnosticsButton={true}
        showTroubleshooting={true}
      />
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto mt-24 p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-lg animate-in fade-in">
      <div className="w-16 h-16 mx-auto mb-4 bg-red-50 dark:bg-red-950/40 text-red-500 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">MiniApp Not Found</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
        {fetchError || `Unable to locate mini app with ID "${id}". It may have been deleted or the link is invalid.`}
      </p>
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          onClick={() => router.push('/miniapps')}
          className="flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to MiniApps
        </Button>
        <Button
          variant="primary"
          onClick={onRetry}
          className="flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Retry Loading
        </Button>
      </div>
    </div>
  );
}
