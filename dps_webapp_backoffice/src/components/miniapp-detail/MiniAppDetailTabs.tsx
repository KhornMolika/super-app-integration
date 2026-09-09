'use client';

import React from 'react';

export type MiniAppTabType = 'overview' | 'team' | 'integration' | 'permissions' | 'report' | 'activity';

export interface MiniAppDetailTabsProps {
  activeTab: MiniAppTabType;
  onSelectTab: (tab: MiniAppTabType) => void;
  allErrors: Record<string, string>;
  issuesCount?: number;
  validationStatus?: string;
}

export default function MiniAppDetailTabs({
  activeTab,
  onSelectTab,
  allErrors,
  issuesCount = 0,
  validationStatus,
}: MiniAppDetailTabsProps) {
  const hasErrorInTab = (tab: MiniAppTabType) => {
    const errorKeys = Object.keys(allErrors);
    if (errorKeys.length === 0) return false;

    switch (tab) {
      case 'overview':
        return errorKeys.some((k) => ['name', 'appId', 'category', 'logo', 'shortDescription', 'fullDescription', 'termsUrl', 'privacyPolicyUrl'].includes(k));
      case 'team':
        return errorKeys.some((k) => ['teamName', 'ownerName', 'ownerEmail', 'supportEmail'].includes(k));
      case 'integration':
        return errorKeys.some((k) => k.startsWith('integrationConfig'));
      case 'permissions':
        return errorKeys.some((k) => k.startsWith('permission') || k.startsWith('permissions.'));
      default:
        return false;
    }
  };

  const tabs: Array<{ id: MiniAppTabType; label: string; icon: React.ReactNode }> = [
    {
      id: 'overview',
      label: 'General Information',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'team',
      label: 'Team & Support',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: 'integration',
      label: 'Technical Integration',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
    },
    {
      id: 'permissions',
      label: 'Permissions & Capabilities',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
        </svg>
      ),
    },
    {
      id: 'report',
      label: 'Security & Compliance Report',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      id: 'activity',
      label: 'Activity & Audit Log',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex border-b border-slate-200/80 dark:border-slate-800 space-x-2 overflow-x-auto pb-px mb-6 scrollbar-none">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const hasIssue = hasErrorInTab(tab.id);

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className={`flex items-center gap-2 py-3 px-4.5 font-semibold text-sm tracking-tight transition-all border-b-2 whitespace-nowrap rounded-t-xl ${
              isActive
                ? 'border-brand-600 text-brand-700 dark:text-brand-300 bg-brand-50/50 dark:bg-brand-950/20'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <span className={isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>

            {/* Error indicator dot */}
            {hasIssue && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="This section has validation issues" />
            )}

            {/* Tab specific badges */}
            {tab.id === 'report' && validationStatus && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                  validationStatus === 'PASSED'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : validationStatus === 'RUNNING'
                    ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-300 animate-pulse'
                    : validationStatus === 'FAILED'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {validationStatus === 'RUNNING' ? 'SCANNING' : validationStatus}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
