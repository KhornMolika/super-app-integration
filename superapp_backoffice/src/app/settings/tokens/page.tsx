'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AccessTokensCard } from '@/components/settings';

export default function AccessTokensPage() {
  return (
    <ProtectedRoute>
      <div className="w-full min-w-0 space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-1.5">
              <span>API Security &amp; Automation</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Personal Access Tokens (PAT)
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm max-w-2xl leading-relaxed">
              Generate and manage personal access tokens to securely authenticate with the SuperApp CLI, developer tools, and external automation scripts.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Session Active</span>
            </span>
          </div>
        </div>

        {/* Tokens Content */}
        <div>
          <AccessTokensCard />
        </div>
      </div>
    </ProtectedRoute>
  );
}
