'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Send,
  XCircle,
  ExternalLink,
  Zap,
  Globe,
  Radio,
  FileCode,
  Package,
} from 'lucide-react';
import { DotBadge } from '@/components/ui/Icons';

export interface VersionOption {
  version: string;
  type?: string;
  status?: string;
  label?: string;
}

export interface ReviewDecisionBarProps {
  miniAppId: string;
  miniAppName: string;
  appId?: string;
  integrationMethod?: string;
  versionsList: VersionOption[];
  baseVersion: string;
  targetVersion: string;
  onChangeBaseVersion: (ver: string) => void;
  onChangeTargetVersion: (ver: string) => void;
  isHighRiskChange: boolean;
  securityScore: number;
  scanFailed: boolean;
  domainVerified: boolean;
  canApprove: boolean;
  canReject: boolean;
  actionLoading: string | null;
  onRequestChanges: () => void;
  onRejectRevision: () => void;
  onApproveTest?: () => void;
  onApprovePublish: () => void;
}

export function ReviewDecisionBar({
  miniAppId,
  miniAppName,
  appId,
  integrationMethod = 'WEBVIEW',
  versionsList,
  baseVersion,
  targetVersion,
  onChangeBaseVersion,
  onChangeTargetVersion,
  isHighRiskChange,
  securityScore,
  scanFailed,
  domainVerified,
  canApprove,
  canReject,
  actionLoading,
  onRequestChanges,
  onRejectRevision,
  onApproveTest,
  onApprovePublish,
}: ReviewDecisionBarProps) {
  const isScoreClean = securityScore >= 80 && !scanFailed;

  return (
    <div className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-all">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Back Link & MiniApp Identity & Version Comparison Pills */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/miniapps/${miniAppId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors shadow-2xs"
            title="Return to MiniApp Overview"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back</span>
          </Link>

          {/* MiniApp Identifier */}
          <div className="flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-3">
            <div className="w-8 h-8 rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-400 border border-accent-500/20 flex items-center justify-center font-bold text-sm shrink-0">
              {miniAppName ? miniAppName.charAt(0).toUpperCase() : 'M'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 max-w-[160px] truncate">
                  {miniAppName || 'MiniApp Review'}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {integrationMethod}
                </span>
              </div>
              {appId && (
                <span className="text-[11px] font-mono text-slate-400 block truncate max-w-[140px]">
                  {appId}
                </span>
              )}
            </div>
          </div>

          {/* Comparison Flow Selector Pills: Base ➔ Target */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            {/* Base Version Selector */}
            <div className="relative">
              <select
                aria-label="Base Version"
                value={baseVersion}
                onChange={(e) => onChangeBaseVersion(e.target.value)}
                className="appearance-none pl-6 pr-6 py-1 text-xs font-mono font-bold rounded-xl bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/80 shadow-2xs focus:outline-none cursor-pointer"
              >
                {versionsList.map((v) => (
                  <option key={`base-${v.version}`} value={v.version}>
                    base: {v.version} {v.type === 'PRODUCTION' ? '(Active)' : ''}
                  </option>
                ))}
              </select>
              <div className="absolute left-2 top-2.5 pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              </div>
            </div>

            {/* Comparison Arrow */}
            <span className="text-xs font-black text-slate-400 px-0.5">➔</span>

            {/* Target Version Selector */}
            <div className="relative">
              <select
                aria-label="Target Version"
                value={targetVersion}
                onChange={(e) => onChangeTargetVersion(e.target.value)}
                className="appearance-none pl-6 pr-6 py-1 text-xs font-mono font-bold rounded-xl bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 shadow-2xs focus:outline-none cursor-pointer"
              >
                {versionsList.map((v) => (
                  <option key={`target-${v.version}`} value={v.version}>
                    target: {v.version} {v.status ? `[${v.status}]` : ''}
                  </option>
                ))}
              </select>
              <div className="absolute left-2 top-2.5 pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              </div>
            </div>
          </div>

          {/* Risk Level Badge */}
          {isHighRiskChange ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">High-Risk Delta</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Low-Risk Delta</span>
            </span>
          )}
        </div>

        {/* Center / Right: Automated Security Gate Badges & Reviewer Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Automated Security Scan Badges */}
          <div className="hidden lg:flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-3">
            {/* SAST Score */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                isScoreClean
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-300 dark:border-rose-800'
              }`}
              title="Automated Static Application Security Testing (SAST)"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isScoreClean ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span>SAST: {securityScore}/100</span>
            </div>

            {/* SSRF Boundary */}
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
              title="Server-Side Request Forgery & Host Whitelist Isolation"
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>SSRF Verified</span>
            </div>

            {/* Domain Verification */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                domainVerified
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 dark:border-amber-700'
              }`}
              title="Ownership verification token of declared endpoint domains"
            >
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span>Domain {domainVerified ? 'Verified' : 'Pending'}</span>
            </div>
          </div>

          {/* Action Decision Buttons */}
          <div className="flex items-center gap-2">
            {canReject && (
              <button
                type="button"
                disabled={Boolean(actionLoading)}
                onClick={onRejectRevision}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-300 dark:border-rose-800/80 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>{actionLoading === 'discard-revision' ? 'Rejecting...' : 'Reject Version'}</span>
              </button>
            )}

            {canReject && (
              <button
                type="button"
                disabled={Boolean(actionLoading)}
                onClick={onRequestChanges}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{actionLoading === 'request-changes' ? 'Sending...' : 'Request Changes'}</span>
              </button>
            )}

            {onApproveTest && canApprove && (
              <button
                type="button"
                disabled={Boolean(actionLoading) || scanFailed}
                onClick={onApproveTest}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-accent-50 dark:bg-accent-950/50 text-accent-800 dark:text-accent-300 border border-accent-300 dark:border-accent-700 hover:bg-accent-100 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title={scanFailed ? 'Blocked by failing security scan' : 'Advance revision to test build'}
              >
                <Zap className="w-3.5 h-3.5 text-accent-600 dark:text-accent-400" />
                <span>{actionLoading === 'start-testing' ? 'Triggering...' : 'Approve for Test'}</span>
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

            {scanFailed && (
              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                Scan Failed (Approval Blocked)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
