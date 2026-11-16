'use client';

import React, { useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AccessTokensCard, DomainTokenGeneratorCard } from '@/components/settings';

export default function AccessTokensPage() {
  const [activeTab, setActiveTab] = useState<'tokens' | 'domain'>('tokens');

  return (
    <ProtectedRoute>
      <div className="w-full min-w-0 space-y-6 pb-12 animate-in fade-in duration-300">
        {/* Sleek, Decluttered Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Developer Settings
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-xs sm:text-sm">
              Manage Personal Access Tokens (PAT) for CLI &amp; private SDKs, and pre-verify domains for WebView MiniApps.
            </p>
          </div>

          {/* Clean Segmented Tab Navigation */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('tokens')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'tokens'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Developer Tokens (PAT)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('domain')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'domain'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Domain Pre-Verification
            </button>
          </div>
        </div>

        {/* Tabbed Content View */}
        {activeTab === 'tokens' ? (
          <AccessTokensCard />
        ) : (
          <DomainTokenGeneratorCard />
        )}
      </div>
    </ProtectedRoute>
  );
}
