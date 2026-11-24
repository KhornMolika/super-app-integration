'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Send,
  XCircle,
  Zap,
} from 'lucide-react';

export interface VersionOption {
  version: string;
  type?: string;
  status?: string;
  label?: string;
}

export interface ReviewDecisionBarProps {
  miniAppId: string;
  miniAppName: string;
  logoUrl?: string;
  appId?: string;
  integrationMethod?: string;
  targetVersion?: string;
  securityScore: number;
  scanFailed: boolean;
  domainVerified?: boolean;
  canApprove: boolean;
  canReject: boolean;
  actionLoading: string | null;
  onRequestChanges: () => void;
  onRejectRevision: () => void;
  onApproveTest?: () => void;
  onApprovePublish: () => void;
  // Sub-Tabs Navigation & Scope props for Unified Command Header
  tabs?: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge: string;
  }>;
  activeTab?: string;
  onSelectTab?: (tabId: any) => void;
  baseVersion?: string;
  versionsList?: VersionOption[];
  onChangeBaseVersion?: (ver: string) => void;
  onChangeTargetVersion?: (ver: string) => void;
  isHighRiskChange?: boolean;
}

export function ReviewDecisionBar({
  miniAppId,
  miniAppName,
  logoUrl,
  appId,
  integrationMethod = 'WEBVIEW',
  targetVersion,
  securityScore,
  scanFailed,
  canApprove,
  canReject,
  actionLoading,
  onRequestChanges,
  onRejectRevision,
  onApproveTest,
  onApprovePublish,
  tabs,
  activeTab,
  onSelectTab,
  baseVersion,
  versionsList = [],
  onChangeBaseVersion,
  onChangeTargetVersion,
  isHighRiskChange = false,
}: ReviewDecisionBarProps) {
  const getMethodBadge = (method: string) => {
    switch (method?.toUpperCase()) {
      case 'WEBVIEW':
        return {
          label: 'WebView',
          classes: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
        };
      case 'DEEP_LINK':
        return {
          label: 'Deep Link',
          classes: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        };
      case 'FLUTTER_PACKAGE':
        return {
          label: 'Flutter Package',
          classes: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      case 'NATIVE_SDK':
        return {
          label: 'Native SDK',
          classes: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      default:
        return {
          label: method || 'MiniApp',
          classes: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        };
    }
  };

  const methodBadge = getMethodBadge(integrationMethod);
  const isScoreClean = securityScore >= 80;

  return (
    <div className="sticky top-16 z-20 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs transition-all mb-6">
      {/* Deck 1: Identity & Decision Actions */}
      <div className="px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap border-b border-slate-100 dark:border-slate-800/70">
        {/* Left: Identity (Back button + Logo + Title + Method + AppId) */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/miniapps/${miniAppId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs shrink-0"
            title="Return to MiniApp Overview"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back</span>
          </Link>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block shrink-0" />

          {/* Logo & Name */}
          <div className="flex items-center gap-2.5 min-w-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={miniAppName}
                className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 flex items-center justify-center font-bold text-sm shadow-2xs shrink-0">
                {miniAppName ? miniAppName.charAt(0).toUpperCase() : 'M'}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate leading-tight">
                  {miniAppName || 'MiniApp Review'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${methodBadge.classes}`}
                >
                  {methodBadge.label}
                </span>
                {targetVersion && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                    {targetVersion}
                  </span>
                )}
              </div>
              {appId && (
                <span className="text-[11px] font-mono text-slate-400 block truncate max-w-[200px]">
                  {appId}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Security Status & Reviewer Actions */}
        <div className="flex items-center gap-2.5 shrink-0 ml-auto">
          {/* Security Status Badge */}
          {scanFailed ? (
            <div
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-2xs"
              title="Automated security or validation check failed"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>Validation Failed</span>
            </div>
          ) : (
            <div
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs"
              title="Automated Static Application Security Testing (SAST)"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block ring-2 ring-emerald-500/20" />
              <span>SAST: {securityScore}/100</span>
            </div>
          )}

          {/* Action Decision Buttons */}
          <div className="flex items-center gap-2">
            {canReject && (
              <button
                type="button"
                disabled={Boolean(actionLoading)}
                onClick={onRejectRevision}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Reject and discard this revision"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden sm:inline">Reject</span>
              </button>
            )}

            {canReject && (
              <button
                type="button"
                disabled={Boolean(actionLoading)}
                onClick={onRequestChanges}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Send actionable change requests to developer"
              >
                <Send className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline">Request Changes</span>
              </button>
            )}

            {onApproveTest && canApprove && (
              <button
                type="button"
                disabled={Boolean(actionLoading) || scanFailed}
                onClick={onApproveTest}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-accent-50 dark:bg-accent-950/50 text-accent-800 dark:text-accent-300 border border-accent-300 dark:border-accent-700 hover:bg-accent-100 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title={scanFailed ? 'Blocked by failing security validation' : 'Advance revision to test build'}
              >
                <Zap className="w-3.5 h-3.5 text-accent-600 dark:text-accent-400" />
                <span className="hidden md:inline">Approve for Test</span>
              </button>
            )}

            {canApprove && (
              <button
                type="button"
                disabled={Boolean(actionLoading) || scanFailed}
                onClick={onApprovePublish}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={scanFailed ? 'Approvals blocked by failing security scan' : 'Publish revision live to SuperApp'}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span>{actionLoading === 'publish-revision' ? 'Publishing...' : 'Approve Revision'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Deck 2: Sub-Tabs Navigation & Version Comparator (Integrated Seamlessly) */}
      {tabs && tabs.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-8 pt-1 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Subnav Tabs */}
          <div className="flex space-x-1 sm:space-x-2 overflow-x-auto scrollbar-none -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isTabActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectTab && onSelectTab(tab.id)}
                  className={`pb-2.5 pt-2 px-3 border-b-2 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
                    isTabActive
                      ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      isTabActive
                        ? 'bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Version Scope Comparator & Risk Chip */}
          {onChangeBaseVersion && onChangeTargetVersion && (
            <div className="flex items-center gap-2 self-start lg:self-center shrink-0 pb-2 lg:pb-1.5">
              {/* Comparator capsule */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 pl-1.5 hidden xl:inline">
                  Compare:
                </span>

                {/* Base Version */}
                <div className="relative">
                  <select
                    aria-label="Base Version"
                    value={baseVersion}
                    onChange={(e) => onChangeBaseVersion(e.target.value)}
                    className="appearance-none pl-6 pr-7 py-1 text-xs font-mono font-bold rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs focus:outline-none cursor-pointer"
                  >
                    {versionsList.map((v) => (
                      <option key={`base-${v.version}`} value={v.version}>
                        base: {v.version} {v.type === 'PRODUCTION' ? '(Active)' : ''}
                      </option>
                    ))}
                  </select>
                  <div className="absolute left-2.5 top-3 pointer-events-none">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block ring-2 ring-emerald-500/20" />
                  </div>
                </div>

                <span className="text-xs font-black text-slate-400 px-0.5">➔</span>

                {/* Target Version */}
                <div className="relative">
                  <select
                    aria-label="Target Version"
                    value={targetVersion}
                    onChange={(e) => onChangeTargetVersion(e.target.value)}
                    className="appearance-none pl-6 pr-7 py-1 text-xs font-mono font-bold rounded-xl bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 shadow-2xs focus:outline-none cursor-pointer"
                  >
                    {versionsList.map((v) => (
                      <option key={`target-${v.version}`} value={v.version}>
                        target: {v.version} {v.status ? `[${v.status}]` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="absolute left-2.5 top-3 pointer-events-none">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block ring-2 ring-amber-500/20" />
                  </div>
                </div>
              </div>

              {/* Delta Risk Level Chip */}
              {isHighRiskChange ? (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shadow-2xs shrink-0"
                  title="This revision declares high-risk capabilities, modified permissions, or network boundaries."
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="hidden sm:inline">High-Risk</span>
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs shrink-0"
                  title="Low-risk revision without elevated permissions or critical boundary changes."
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="hidden sm:inline">Low-Risk</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
