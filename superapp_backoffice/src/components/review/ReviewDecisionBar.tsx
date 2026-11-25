'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Send,
  XCircle,
  Zap,
  ChevronDown,
  Check,
  ArrowRight,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { AppLogoAvatar } from '@/components/ui/AppLogoAvatar';

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

interface UnifiedComparatorProps {
  baseVersion: string;
  targetVersion: string;
  versionsList: VersionOption[];
  onChangeBaseVersion: (ver: string) => void;
  onChangeTargetVersion: (ver: string) => void;
  isHighRiskChange: boolean;
}

function UnifiedComparator({
  baseVersion,
  targetVersion,
  versionsList,
  onChangeBaseVersion,
  onChangeTargetVersion,
  isHighRiskChange,
}: UnifiedComparatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const activeBase = versionsList.find((v) => v.version === baseVersion);
  const activeTarget = versionsList.find((v) => v.version === targetVersion);

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Option 1: Single Unified Capsule Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs transition-all cursor-pointer group"
        title="Open Comparison Version Scope"
      >
        <span className="text-xs font-sans font-extrabold uppercase tracking-wider text-slate-400">
          Compare:
        </span>

        {/* Base Version Chip */}
        <span className="inline-flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>{baseVersion || '1.0.0'}</span>
        </span>

        <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" />

        {/* Target Version Chip */}
        <span className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-300">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>{targetVersion || '1.0.0'}</span>
        </span>

        <span className="text-slate-200 dark:text-slate-700">|</span>

        {/* Delta Risk Pill */}
        <span
          className={`inline-flex items-center gap-1 text-xs font-sans font-bold ${
            isHighRiskChange
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {isHighRiskChange ? (
            <>
              <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
              <span className="hidden xl:inline">High-Risk</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
              <span className="hidden xl:inline">Low-Risk</span>
            </>
          )}
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-slate-700 dark:text-slate-200' : ''
          }`}
        />
      </button>

      {/* Unified Comparison Scope Popover */}
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 z-50 w-[380px] sm:w-[480px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                  Version Comparison Scope
                </h4>
                <p className="text-xs text-slate-500">
                  Select baseline and candidate versions to compute delta
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 2-Column Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3">
            {/* Column 1: Base Version */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Base (Baseline)</span>
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {versionsList.length} total
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 p-1 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 scrollbar-thin">
                {versionsList.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">No versions declared</div>
                ) : (
                  versionsList.map((v) => {
                    const isSelected = v.version === baseVersion;
                    const isProd = v.type === 'PRODUCTION' || v.status === 'ACTIVE';
                    return (
                      <button
                        key={`pop-base-${v.version}`}
                        type="button"
                        onClick={() => onChangeBaseVersion(v.version)}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-mono flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300/80 dark:border-emerald-700/80'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{v.version}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {isProd && (
                            <span className="text-xs font-sans font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                              Active
                            </span>
                          )}
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Column 2: Target Version */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Target (Candidate)</span>
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {versionsList.length} total
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 p-1 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 scrollbar-thin">
                {versionsList.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">No versions declared</div>
                ) : (
                  versionsList.map((v) => {
                    const isSelected = v.version === targetVersion;
                    return (
                      <button
                        key={`pop-target-${v.version}`}
                        type="button"
                        onClick={() => onChangeTargetVersion(v.version)}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-mono flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-bold border border-amber-300/80 dark:border-amber-700/80'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{v.version}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {v.status && (
                            <span className="text-xs font-sans font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                              {v.status}
                            </span>
                          )}
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Footer: Current Summary */}
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-xs">
              Comparing{' '}
              <strong className="text-slate-800 dark:text-slate-200 font-mono">
                {baseVersion}
              </strong>{' '}
              ➔{' '}
              <strong className="text-amber-600 dark:text-amber-400 font-mono">
                {targetVersion}
              </strong>
            </span>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Apply Scope
            </button>
          </div>
        </div>
      )}
    </div>
  );
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
    <div className="fixed top-16 left-0 right-0 z-20 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
      {/* Deck 1: Identity & Decision Actions (Aligned with max-w-[1700px] grid) */}
      <div className="border-b border-slate-100 dark:border-slate-800/70">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
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
              <AppLogoAvatar
                logo={logoUrl}
                name={miniAppName}
                size="md"
                className="shrink-0"
              />

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate leading-tight">
                    {miniAppName || 'MiniApp Review'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold border shrink-0 ${methodBadge.classes}`}
                  >
                    {methodBadge.label}
                  </span>
                </div>
                {appId && (
                  <span className="text-xs font-mono text-slate-400 block truncate max-w-[240px]">
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
      </div>

      {/* Deck 2: Sub-Tabs Navigation & Unified Comparator (Linear/Vercel Clean Style) */}
      {tabs && tabs.length > 0 && (
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 pt-0.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Subnav Tabs: Crisp Underline Navigation with Muted Counters */}
          <div className="flex space-x-1 sm:space-x-2 overflow-x-auto scrollbar-none -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isTabActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectTab && onSelectTab(tab.id)}
                  className={`pb-2.5 pt-2 px-3 border-b-2 text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
                    isTabActive
                      ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400 font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 font-semibold'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-xs font-mono ${
                      isTabActive
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-bold'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Option 1: Single Unified Version Comparator Capsule Button */}
          {onChangeBaseVersion && onChangeTargetVersion && (
            <div className="self-start lg:self-center shrink-0 pb-2 lg:pb-1.5">
              <UnifiedComparator
                baseVersion={baseVersion || '1.0.0'}
                targetVersion={targetVersion || '1.0.0'}
                versionsList={versionsList}
                onChangeBaseVersion={onChangeBaseVersion}
                onChangeTargetVersion={onChangeTargetVersion}
                isHighRiskChange={isHighRiskChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
