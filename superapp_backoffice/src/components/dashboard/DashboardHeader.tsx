"use client";

import React from 'react';
import Link from 'next/link';
import { DashboardHeaderProps } from './types';

export default function DashboardHeader({
  isManager,
  pendingReviews,
  isTelegramConnected,
  canCreateMiniApp,
  canReviewPending,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          {isManager ? 'MiniApp Developer Workspace' : 'SuperApp Administration'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          {isManager
            ? 'Monitor your registered MiniApps, review statuses, security verification, and direct notifications.'
            : 'Global ecosystem metrics, user directory, release versions, and platform infrastructure.'}
        </p>
      </div>

      {/* Action shortcuts */}
      <div className="flex flex-wrap gap-3">
        {canCreateMiniApp && (
          <Link
            href="/miniapps/register"
            className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-semibold rounded-xl shadow-sm text-white bg-brand-600 hover:bg-brand-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Register MiniApp</span>
          </Link>
        )}

        {!isManager && canReviewPending && (
          <Link
            href="/capabilities?tab=proposals"
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-sm font-medium rounded-xl text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Review Pending ({pendingReviews})</span>
          </Link>
        )}

        {isManager && (
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-sm font-medium rounded-xl text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="w-4 h-4 text-sky-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
            <span>{isTelegramConnected ? 'Telegram Active' : 'Setup Telegram Alerts'}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
