'use client';

import React, { useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AccessTokensCard, DomainTokenGeneratorCard, SettingsPageHeader } from '@/components/settings';

export default function AccessTokensPage() {
  const [activeTab, setActiveTab] = useState<'tokens' | 'domain'>('tokens');

  return (
    <ProtectedRoute>
      <div className="w-full min-w-0 space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out">
        <SettingsPageHeader
          section="Developer Credentials"
          title="Developer Tokens (PAT)"
          description="Manage Personal Access Tokens for CLI & private SDKs, and pre-verify domains for WebView MiniApps."
          rightSlot={
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
          }
        />

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
