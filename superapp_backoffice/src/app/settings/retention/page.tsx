'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ArtifactRetentionCard } from '@/components/settings';

export default function StorageRetentionPage() {
  return (
    <ProtectedRoute requiredRole="SUPER_ADMIN">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out space-y-6 pb-16">
        {/* Page Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-200/70 dark:border-slate-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[11px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest">
              <span>Settings</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span>Platform Infrastructure</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-slate-500 dark:text-slate-400">Artifact Retention</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Storage Retention &amp; Cleanup Policies
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm max-w-3xl leading-relaxed">
              Configure automated artifact lifecycle rules, scheduled background pruning for CI/CD test builds, and execute on-demand storage reclamation with guaranteed protection for official releases.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Super Admin Restricted</span>
            </span>
          </div>
        </div>

        {/* Main Content */}
        <ArtifactRetentionCard />
      </div>
    </ProtectedRoute>
  );
}

