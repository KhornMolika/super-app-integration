'use client';

import React, { useState, useEffect } from 'react';
import { toast } from '@/components/ui/Toast';
import InviteDownloadModal from '@/components/ui/InviteDownloadModal';
import { RevisionReviewModal } from '@/components/review/RevisionReviewModal';
import { DotBadge } from '@/components/ui/Icons';
import { miniappsApi } from '@/api';

export interface VersionRecord {
  version: string;
  gitRef?: string;
  packageName?: string;
  sourceType?: 'GIT' | 'ARTIFACT' | 'WEBVIEW';
  type: 'PRODUCTION' | 'TEST' | 'DRAFT';
  status: 'ACTIVE' | 'TESTING' | 'PREVIOUS' | 'DEPRECATED' | 'SUPERSEDED' | 'ARCHIVED' | 'IN_REVIEW' | 'APPROVED' | 'DRAFT';
  changelog?: string;
  artifactUrl?: string;
  apkSize?: string;
  checksum?: string;
  releasedAt: string;
  releasedBy?: string;
  buildNumber?: number;
}

export interface VersionHistoryData {
  miniAppId: string;
  appName: string;
  appId: string;
  status: string;
  packageName?: string;
  gitRef?: string;
  sourceType?: string;
  currentReleaseVersion: string;
  activeTestVersion: string | null;
  draftVersion: string | null;
  pendingRevision?: any;
  versions: VersionRecord[];
}

export interface VersionHistoryTabProps {
  miniAppId: string;
  miniAppName: string;
  appId?: string;
  currentStatus?: string;
  teamTelegramChatId?: string;
  pendingRevision?: any;
  onOpenReviewDiff?: () => void;
}

export default function VersionHistoryTab({
  miniAppId,
  miniAppName,
  appId,
  currentStatus = 'DRAFT',
  teamTelegramChatId,
  pendingRevision,
  onOpenReviewDiff,
}: VersionHistoryTabProps) {
  const [data, setData] = useState<VersionHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'PRODUCTION' | 'TEST'>('ALL');
  const [selectedChangelog, setSelectedChangelog] = useState<VersionRecord | null>(null);
  const [copiedChecksum, setCopiedChecksum] = useState<string | null>(null);
  const [compareModalState, setCompareModalState] = useState<{
    isOpen: boolean;
    baseVersion?: string;
    targetVersion?: string;
  }>({
    isOpen: false,
  });
  const [compareBase, setCompareBase] = useState<string>('');
  const [compareTarget, setCompareTarget] = useState<string>('');
  const [inviteModalState, setInviteModalState] = useState<{
    isOpen: boolean;
    version: string;
    buildType: 'test' | 'release';
  }>({
    isOpen: false,
    version: '1.0.0',
    buildType: 'test',
  });
  const [rollbackModalState, setRollbackModalState] = useState<{
    isOpen: boolean;
    targetVersion?: string;
    reason: string;
  }>({
    isOpen: false,
    reason: '',
  });
  const [isRollingBack, setIsRollingBack] = useState(false);

  const handleExecuteRollback = async () => {
    if (!rollbackModalState.targetVersion) return;
    setIsRollingBack(true);
    try {
      await miniappsApi.rollback(
        miniAppId,
        rollbackModalState.targetVersion,
        rollbackModalState.reason || `Rolled back to ${rollbackModalState.targetVersion} by Super Admin`,
      );
      toast.success(
        `Successfully rolled back ${miniAppName} to version ${rollbackModalState.targetVersion}`,
        'Rollback Completed',
      );
      setRollbackModalState({ isOpen: false, reason: '' });
      await fetchVersions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to execute rollback', 'Rollback Failed');
    } finally {
      setIsRollingBack(false);
    }
  };

  const fetchVersions = async () => {
    if (!miniAppId) return;
    setLoading(true);
    try {
      const result = await miniappsApi.getVersions(miniAppId);
      setData(result as any);
    } catch (err) {
      console.error('Failed to load version history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [miniAppId]);

  const handleCopyChecksum = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedChecksum(hash);
    toast.info(`SHA-256 Checksum copied: ${hash.substring(0, 16)}...`, 'Checksum Copied');
    setTimeout(() => setCopiedChecksum(null), 2500);
  };

  const handleDownload = (ver: string, type: 'test' | 'release') => {
    const downloadUrl = `/api/mini-apps/${miniAppId}/artifacts/${type === 'release' ? 'release-apk' : 'test-apk'}?version=${encodeURIComponent(ver)}`;
    window.open(downloadUrl, '_blank');
    toast.info(`Starting download of ${miniAppName} package (${ver})...`, 'Download Started');
  };

  const openInviteModal = (version: string, buildType: 'test' | 'release') => {
    setInviteModalState({
      isOpen: true,
      version,
      buildType,
    });
  };

  const versionsList = data?.versions || [];
  const filteredVersions = versionsList.filter((v) => {
    if (filterType === 'ALL') return true;
    return v.type === filterType;
  });

  const activeProductionRecord = versionsList.find(
    (v) => v.type === 'PRODUCTION' && (v.status === 'ACTIVE' || v.status === 'IN_REVIEW'),
  ) || versionsList.find((v) => v.type === 'PRODUCTION') || versionsList[0];

  const activeTestRecord = versionsList.find(
    (v) => v.type === 'TEST' && v.status === 'TESTING',
  ) || versionsList.find((v) => v.type === 'TEST');

  const activeDraftVer = pendingRevision ? (pendingRevision.version || 'v1.1.0-draft') : null;

  return (
    <div className="space-y-6">
      {/* 1. Header Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card A: Current Active Mini App Version */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/20 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 p-5 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Mini App Current Version
                  </span>
                  {data?.packageName && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                      {data.packageName}
                    </span>
                  )}
                </div>
                <h4 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-0.5">
                  <span>{data?.currentReleaseVersion || '1.0.0'}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    currentStatus === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                      : currentStatus === 'IN_REVIEW'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                      : 'bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-300'
                  }`}>
                    {currentStatus === 'ACTIVE' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    <span>{currentStatus}</span>
                  </span>
                </h4>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
            {activeProductionRecord?.changelog || `Official package release ${data?.currentReleaseVersion || '1.0.0'} for ${miniAppName}`}
          </p>

          <div className="pt-3 border-t border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Ref: <strong className="text-slate-700 dark:text-slate-300 font-mono">{data?.gitRef || 'Tag: ' + (data?.currentReleaseVersion || 'v1.0.0')}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => openInviteModal(data?.currentReleaseVersion || '1.0.0', 'release')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span>Invite</span>
              </button>
              <a
                href="/super-app"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Test Sandbox</span>
              </a>
            </div>
          </div>
        </div>

        {/* Card B: Sandbox Staged Version */}
        <div className="relative overflow-hidden rounded-2xl border border-brand-200/80 dark:border-brand-800/60 bg-gradient-to-br from-brand-50/70 via-white to-brand-50/20 dark:from-brand-950/30 dark:via-slate-900 dark:to-slate-900 p-5 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-400">
                    Sandbox Test Version
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-brand-100 dark:bg-brand-900/60 text-brand-800 dark:text-brand-300">
                    STAGING
                  </span>
                </div>
                <h4 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-0.5">
                  <span>{data?.activeTestVersion || 'develop'}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-300">
                    <span>TESTING</span>
                  </span>
                </h4>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
            {activeTestRecord?.changelog || 'Candidate branch/tag compiled for Super App sandbox integration validation.'}
          </p>

          <div className="pt-3 border-t border-brand-100 dark:border-brand-900/40 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Source: <strong className="text-slate-700 dark:text-slate-300 font-mono">{data?.sourceType || 'Git Repository'}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => openInviteModal(data?.activeTestVersion || 'develop', 'test')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span>Invite Testers</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card C: Pending Revision / Draft Status */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-200/80 dark:border-amber-800/60 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/20 dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900 p-5 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Pending Draft Revision
                </span>
                <h4 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-0.5">
                  <span>{activeDraftVer || 'No Active Draft'}</span>
                  {pendingRevision && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                      <span>{pendingRevision.revisionStatus || 'IN REVIEW'}</span>
                    </span>
                  )}
                </h4>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
            {pendingRevision
              ? 'Draft changes saved in isolated staging. Live version continues running undisturbed.'
              : 'All configuration is up-to-date with published production releases.'}
          </p>

          <div className="pt-3 border-t border-amber-100 dark:border-amber-900/40 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              State: <strong className="text-slate-700 dark:text-slate-300">{pendingRevision ? 'Pending Review' : 'Synced'}</strong>
            </span>
            {pendingRevision ? (
              <button
                type="button"
                onClick={() => {
                  if (onOpenReviewDiff) onOpenReviewDiff();
                  else {
                    setCompareModalState({
                      isOpen: true,
                      baseVersion: data?.currentReleaseVersion || '1.0.0',
                      targetVersion: activeDraftVer || 'v1.1.0-draft',
                    });
                  }
                }}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1"
              >
                <span>Ready to Publish</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Up to Date
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Version History Timeline & Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Mini App Version History &amp; Release Timeline</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Historical record of package versions, Git release tags, commit SHAs, and sandbox revisions for {miniAppName}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Version Diff Comparator Selector */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs">
              <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 px-1">
                <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>Diff:</span>
              </span>
              <select
                value={compareBase || data?.currentReleaseVersion || '1.0.0'}
                onChange={(e) => setCompareBase(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {versionsList.map((v) => {
                  const isLive = v.type === 'PRODUCTION' && (v.status === 'ACTIVE' || v.status === 'IN_REVIEW');
                  const isOld = v.type === 'PRODUCTION' && v.status !== 'ACTIVE' && v.status !== 'IN_REVIEW';
                  const prefix = isLive ? '[Current] ' : isOld ? '[Prev] ' : '[Test] ';
                  const suffix = isLive ? ' (Current Version)' : isOld ? ' (Previous Release)' : ' (Sandbox Staging)';
                  return (
                    <option key={`base-${v.version}`} value={v.version}>
                      {prefix}{v.version}{suffix}
                    </option>
                  );
                })}
              </select>
              <span className="text-slate-400 font-bold px-0.5">vs</span>
              <select
                value={compareTarget || (pendingRevision ? 'v1.1.0-draft' : data?.activeTestVersion || 'develop')}
                onChange={(e) => setCompareTarget(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {pendingRevision && (
                  <option value="v1.1.0-draft">[Draft] Proposed Revision</option>
                )}
                {versionsList.map((v) => {
                  const isLive = v.type === 'PRODUCTION' && (v.status === 'ACTIVE' || v.status === 'IN_REVIEW');
                  const isOld = v.type === 'PRODUCTION' && v.status !== 'ACTIVE' && v.status !== 'IN_REVIEW';
                  const prefix = isLive ? '[Current] ' : isOld ? '[Prev] ' : '[Test] ';
                  const suffix = isLive ? ' (Current Version)' : isOld ? ' (Previous Release)' : ' (Sandbox Staging)';
                  return (
                    <option key={`target-${v.version}`} value={v.version}>
                      {prefix}{v.version}{suffix}
                    </option>
                  );
                })}
              </select>
              <button
                type="button"
                onClick={() => {
                  setCompareModalState({
                    isOpen: true,
                    baseVersion: compareBase || data?.currentReleaseVersion || '1.0.0',
                    targetVersion: compareTarget || (pendingRevision ? 'v1.1.0-draft' : data?.activeTestVersion || 'develop'),
                  });
                }}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 transition-colors shadow-xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span>Compare</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700">
              {(['ALL', 'PRODUCTION', 'TEST'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterType(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterType === mode
                      ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {mode === 'ALL' ? 'All Versions' : mode === 'PRODUCTION' ? 'Releases' : 'Test / Staging'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Version</th>
                <th className="py-3 px-4">Package &amp; Ref</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Published Date</th>
                <th className="py-3 px-4">Developer</th>
                <th className="py-3 px-4">Checksum</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
              {filteredVersions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500">
                    No version records found matching this filter.
                  </td>
                </tr>
              ) : (
                filteredVersions.map((rec, idx) => (
                  <tr
                    key={`${rec.version}-${idx}`}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>{rec.version}</span>
                          {rec.sourceType === 'GIT' ? (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800">
                              📦 Git
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              📁 Pkg
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {rec.packageName || data?.packageName || appId || 'miniapp'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {rec.gitRef || (rec.type === 'TEST' ? 'branch: develop' : `tag: ${rec.version}`)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {rec.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <DotBadge color="emerald" pulse />
                          <span>LIVE ACTIVE</span>
                        </span>
                      ) : rec.status === 'IN_REVIEW' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          <DotBadge color="amber" pulse />
                          <span>IN REVIEW</span>
                        </span>
                      ) : rec.status === 'TESTING' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-brand-100 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-300 dark:border-brand-800">
                          <DotBadge color="blue" />
                          <span>SANDBOX TESTING</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                          <DotBadge color="slate" />
                          <span>PREVIOUS</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(rec.releasedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                      {rec.releasedBy || 'Mini App Developer'}
                    </td>
                    <td className="py-3.5 px-4">
                      {rec.checksum ? (
                        <button
                          type="button"
                          onClick={() => handleCopyChecksum(rec.checksum!)}
                          className="inline-flex items-center gap-1 font-mono text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                          title="Click to copy full SHA-256 checksum"
                        >
                          <span>{rec.checksum.substring(0, 13)}...</span>
                          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedChangelog(rec)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="View Changelog & Release Notes"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCompareModalState({
                              isOpen: true,
                              baseVersion: data?.currentReleaseVersion || '1.0.0',
                              targetVersion: rec.version,
                            });
                          }}
                          className="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                          title={`Compare ${rec.version} with Current Version`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => openInviteModal(rec.version, rec.type === 'PRODUCTION' ? 'release' : 'test')}
                          className="p-1.5 rounded-lg text-brand-600 hover:text-brand-800 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
                          title="Invite Testers & Generate QR"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                        </button>
                        {rec.version !== data?.currentReleaseVersion && (
                          <button
                            type="button"
                            onClick={() =>
                              setRollbackModalState({
                                isOpen: true,
                                targetVersion: rec.version,
                                reason: '',
                              })
                            }
                            className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title={`Rollback Super App to ${rec.version}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Changelog Modal */}
      {selectedChangelog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg text-slate-900 dark:text-slate-100">
                  {selectedChangelog.version}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {selectedChangelog.type}
                </span>
              </div>
              <button
                onClick={() => setSelectedChangelog(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Changelog &amp; Release Notes
                </h5>
                <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selectedChangelog.changelog || 'No detailed changelog provided for this release.'}
                </p>
              </div>

              {selectedChangelog.checksum && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                    SHA-256 Package Checksum
                  </span>
                  <p className="font-mono text-xs text-slate-800 dark:text-slate-200 break-all select-all">
                    {selectedChangelog.checksum}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedChangelog(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version Diff Comparison Modal */}
      {compareModalState.isOpen && (
        <RevisionReviewModal
          isOpen={compareModalState.isOpen}
          onClose={() => setCompareModalState({ isOpen: false })}
          miniAppId={miniAppId}
          miniAppName={miniAppName}
          baseVersion={compareModalState.baseVersion}
          targetVersion={compareModalState.targetVersion}
          onSuccess={() => {
            setCompareModalState({ isOpen: false });
            fetchVersions();
          }}
        />
      )}

      {/* Invite Modal */}
      <InviteDownloadModal
        isOpen={inviteModalState.isOpen}
        onClose={() => setInviteModalState({ ...inviteModalState, isOpen: false })}
        miniAppId={miniAppId}
        miniAppName={miniAppName}
        appId={appId}
        version={inviteModalState.version}
        buildType={inviteModalState.buildType}
        teamTelegramChatId={teamTelegramChatId}
      />
      {/* Rollback Confirmation Modal */}
      {rollbackModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Rollback to Version {rollbackModalState.targetVersion}?
                </h3>
                <p className="text-xs text-slate-500">
                  This will restore historical configuration and re-inject dependencies.
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-200">
              Active production version will be rolled back from <strong>{data?.currentReleaseVersion}</strong> to <strong>{rollbackModalState.targetVersion}</strong>.
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Rollback Justification / Audit Reason
              </label>
              <textarea
                value={rollbackModalState.reason}
                onChange={(e) => setRollbackModalState(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Reason for roll back (e.g. Critical bug in latest release)..."
                rows={3}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRollbackModalState({ isOpen: false, reason: '' })}
                disabled={isRollingBack}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRollback}
                disabled={isRollingBack}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-sm"
              >
                {isRollingBack ? 'Rolling back...' : 'Confirm Rollback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
