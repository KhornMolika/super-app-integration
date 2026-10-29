'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { User } from '@/api/users.api';
import { MiniApp } from '@/api/miniapps.api';

export interface UserOverviewTabProps {
  user: User;
  miniApps?: MiniApp[];
  miniAppsCount?: number;
  auditLogsCount?: number;
}

export function UserOverviewTab({
  user,
  miniApps = [],
  miniAppsCount = 0,
}: UserOverviewTabProps) {
  const effectiveMiniAppsCount = miniApps.length || miniAppsCount;

  // Sort by most recently registered (createdAt descending)
  const sortedApps = useMemo(() => {
    return [...miniApps].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [miniApps]);

  // Show only 4 most recent registered apps
  const recentApps = sortedApps.slice(0, 4);
  const hasMore = sortedApps.length > 4;

  return (
    <div className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Associated MiniApps
          </h3>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
            {effectiveMiniAppsCount}
          </span>
        </div>

        <Link
          href={`/miniapps?search=${encodeURIComponent(user.email || user.name)}`}
          className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
        >
          <span>See All</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* MiniApps Records (up to 4 most recent registered) */}
      <div className="space-y-3">
        {recentApps.length > 0 ? (
          recentApps.map((app) => (
            <div
              key={app.id}
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 gap-4 transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800/70"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20 flex items-center justify-center font-bold text-brand-600 dark:text-brand-400 shrink-0 text-sm">
                  {app.name?.[0]?.toUpperCase() || 'A'}
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {app.name}
                    </span>
                    {app.version && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                        v{app.version}
                      </span>
                    )}
                    {app.status && (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          app.status === 'PUBLISHED' || app.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {app.status}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate max-w-xl">
                    {app.tagline || app.description || `Application ID: ${app.appId || app.id}`}
                  </p>
                </div>
              </div>

              <Link
                href={`/miniapps/${app.id}`}
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline shrink-0 flex items-center gap-1"
              >
                <span>Inspect</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ))
        ) : (
          <div className="py-10 text-center text-xs text-slate-400 space-y-2">
            <svg className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="font-medium text-slate-600 dark:text-slate-300">No MiniApps Associated</p>
            <p className="text-[11px] text-slate-400">
              This operator account currently does not own or develop any registered applications.
            </p>
          </div>
        )}
      </div>

      {/* Footer when more than 4 apps */}
      {hasMore && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Showing 4 of {sortedApps.length} registered applications</span>
          <Link
            href={`/miniapps?search=${encodeURIComponent(user.email || user.name)}`}
            className="font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
          >
            <span>See All Applications</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
