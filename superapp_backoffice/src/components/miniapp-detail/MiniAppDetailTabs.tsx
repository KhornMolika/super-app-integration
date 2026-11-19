'use client';

import React from 'react';
import {
  Info,
  Scale,
  Users,
  Code2,
  KeyRound,
  History,
  ShieldCheck,
  Activity,
  AlertCircle,
} from 'lucide-react';

export type MiniAppTabType =
  | 'overview'
  | 'legal'
  | 'team'
  | 'integration'
  | 'permissions'
  | 'versions'
  | 'report'
  | 'runs'
  | 'activity';

export interface MiniAppDetailTabsProps {
  activeTab: MiniAppTabType;
  onSelectTab: (tab: MiniAppTabType) => void;
  allErrors?: Record<string, string>;
  issuesCount?: number;
  validationStatus?: string;
  currentReleaseVersion?: string;
}

export default function MiniAppDetailTabs({
  activeTab,
  onSelectTab,
  allErrors = {},
  issuesCount = 0,
  validationStatus,
}: MiniAppDetailTabsProps) {
  const hasErrorInTab = (tab: MiniAppTabType) => {
    const errorKeys = Object.keys(allErrors);
    if (errorKeys.length === 0) return false;

    switch (tab) {
      case 'overview':
        return errorKeys.some((k) =>
          ['name', 'appId', 'logo', 'shortDescription', 'fullDescription'].includes(k)
        );
      case 'legal':
        return errorKeys.some((k) =>
          ['termsUrl', 'privacyPolicyUrl', 'termsDescription', 'privacyPolicyDescription'].includes(k)
        );
      case 'team':
        return errorKeys.some((k) =>
          ['teamName', 'ownerName', 'ownerEmail', 'supportEmail'].includes(k)
        );
      case 'integration':
        return errorKeys.some((k) => k.startsWith('integrationConfig'));
      case 'permissions':
        return errorKeys.some((k) => k.startsWith('permission') || k.startsWith('permissions.'));
      default:
        return false;
    }
  };

  const tabs: Array<{
    id: MiniAppTabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'overview', label: 'General Info', icon: Info },
    { id: 'legal', label: 'Legal & Policy', icon: Scale },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'integration', label: 'Integration', icon: Code2 },
    { id: 'permissions', label: 'Capabilities', icon: KeyRound },
    { id: 'versions', label: 'Versions', icon: History },
    { id: 'report', label: 'Security Scan', icon: ShieldCheck },
    { id: 'activity', label: 'Activity Log', icon: Activity },
  ];

  return (
    <nav
      aria-label="MiniApp navigation tabs"
      className="relative mb-6 border-b border-slate-200 dark:border-slate-800"
    >
      {/* Clean Flat Underline Navigation Tabs */}
      <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar -mb-px">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const hasIssue = hasErrorInTab(tab.id);
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectTab(tab.id)}
              className={`group flex items-center gap-2 px-3.5 py-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer select-none border-b-2 shrink-0 ${
                isActive
                  ? 'border-brand-600 dark:border-brand-400 text-brand-700 dark:text-brand-300 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 font-medium'
              }`}
            >
              {/* Vector Icon */}
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                }`}
              />

              {/* Label */}
              <span>{tab.label}</span>

              {/* Validation Error Warning Dot */}
              {hasIssue && (
                <span className="flex items-center gap-0.5" title="Section contains validation errors">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                </span>
              )}

              {/* Security Scan Status Pill */}
              {tab.id === 'report' && validationStatus && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 border ${
                    validationStatus === 'PASSED'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : validationStatus === 'RUNNING'
                      ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-800 animate-pulse'
                      : validationStatus === 'FAILED'
                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {validationStatus === 'RUNNING' ? 'SCANNING' : validationStatus}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
