'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { toast } from '@/components/ui/Toast';
import InviteDownloadModal from '@/components/ui/InviteDownloadModal';
import { RevisionReviewModal } from '@/components/review/RevisionReviewModal';
import { miniappsApi } from '@/api';
import { Select } from '@/components/ui/inputs';
import { DotBadge } from '@/components/ui/Icons';
import { useAuth } from '@/lib/auth';
import { copyText } from '@/lib/clipboard';
import { CleanDropdown, CleanDropdownOption } from '@/components/ui/CleanDropdown';

export interface VersionRecord {
  id?: string;
  version: string;
  gitRef?: string;
  packageName?: string;
  /** GIT / ARTIFACT, or the integration method the version was made with. */
  sourceType?: string | null;
  type: 'PRODUCTION' | 'TEST' | 'DRAFT';
  /** Released (ACTIVE, PREVIOUS, DEPRECATED) or the stage of the version being worked on. */
  status:
    | 'ACTIVE' | 'PREVIOUS' | 'DEPRECATED' | 'SUPERSEDED' | 'ARCHIVED'
    | 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'CHANGES_REQUESTED' | 'REJECTED' | 'APPROVED' | 'TESTING' | 'TEST_PASSED';
  changelog?: string;
  artifactUrl?: string;
  apkSize?: string;
  checksum?: string;
  releasedAt: string | null;
  /** DRAFT rows: where the review stands (IN_REVIEW, DRAFT = changes requested, TESTING, ...). */
  reviewStatus?: string | null;
  submittedAt?: string | null;
  createdAt?: string | null;
  releasedBy?: string;
  buildNumber?: number;
  endpointUrl?: string | null;
  urlScheme?: string | null;
  integrationConfig?: any;
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
  ownerName?: string;
  ownerEmail?: string;
  teamName?: string;
  onOpenReviewDiff?: () => void;
  integrationMethod?: string;
  integrationConfig?: any;
}

const SOURCE_LABELS: Record<string, string> = {
  GIT: 'Git',
  ARTIFACT: 'Package',
  FLUTTER_PACKAGE: 'Flutter',
  WEBVIEW: 'WebView',
  NATIVE_SDK: 'Native SDK',
  DEEP_LINK: 'Deep link',
};

/** Stages of the version being worked on, other than IN_REVIEW and TESTING (own badges). */
const OTHER_STAGES = ['DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED', 'REJECTED', 'APPROVED', 'TEST_PASSED'];

/** Label of a version being worked on: its stage (a DRAFT row by its review state, as before). */
function stageLabel(rec: { status: string; reviewStatus?: string | null }): string {
  switch (rec.status) {
    case 'SUBMITTED':
      return 'Submitted';
    case 'CHANGES_REQUESTED':
      return 'Changes requested';
    case 'REJECTED':
      return 'Rejected';
    case 'APPROVED':
      return 'Approved';
    case 'TEST_PASSED':
      return 'Test passed';
    default:
      return draftLabel(rec.reviewStatus);
  }
}

/** Label of a DRAFT row: the version being prepared, by where its review stands. */
function draftLabel(reviewStatus?: string | null): string {
  switch ((reviewStatus || '').toUpperCase()) {
    case 'IN_REVIEW':
    case 'SUBMITTED':
      return 'In review';
    case 'DRAFT':
    case 'CHANGES_REQUESTED':
      return 'Changes requested';
    case 'TESTING':
    case 'APPROVED':
    case 'TEST_PASSED':
      return 'Testing';
    case 'REJECTED':
      return 'Rejected';
    default:
      return 'Draft';
  }
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDeveloperInitials(name: string): string {
  if (!name) return 'DEV';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatShortHash(hash?: string | null): string {
  if (!hash) return '—';
  if (hash.startsWith('sha256:')) {
    const raw = hash.replace('sha256:', '');
    return `sha256:${raw.slice(0, 6)}...${raw.slice(-4)}`;
  }
  if (hash.length > 16) {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  }
  return hash;
}

export default function VersionHistoryTab({
  miniAppId,
  miniAppName,
  appId,
  currentStatus = 'DRAFT',
  teamTelegramChatId,
  pendingRevision,
  ownerName,
  ownerEmail,
  teamName,
  onOpenReviewDiff,
  integrationMethod,
  integrationConfig,
}: VersionHistoryTabProps) {
  // Rolling back changes what users get: admins only, and never on an archived app
  const { role, can } = useAuth();
  const canRollback = (role === 'SUPER_ADMIN' || can?.('miniapp:approve')) && currentStatus !== 'ARCHIVED';
  const [data, setData] = useState<VersionHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [filterType, setFilterType] = useState<'ALL' | 'PRODUCTION' | 'TEST' | 'DRAFT'>('ALL');
  const [selectedChangelog, setSelectedChangelog] = useState<VersionRecord | null>(null);
  const [copiedChecksum, setCopiedChecksum] = useState<string | null>(null);
  const [copiedGitRef, setCopiedGitRef] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
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

  const fetchVersions = useCallback(async () => {
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
  }, [miniAppId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleCopyChecksum = (hash: string) => {
    copyText(hash);
    setCopiedChecksum(hash);
    toast.info(`SHA-256 Checksum copied: ${hash.substring(0, 16)}...`, 'Checksum Copied');
    setTimeout(() => setCopiedChecksum(null), 2500);
  };

  const handleCopyGitRef = (sha: string) => {
    copyText(sha);
    setCopiedGitRef(sha);
    toast.info(`Git commit SHA copied: ${sha.substring(0, 10)}...`, 'Commit SHA Copied');
    setTimeout(() => setCopiedGitRef(null), 2500);
  };

  const handleCopyUrl = (url: string, label: string = 'URL') => {
    copyText(url);
    setCopiedUrl(url);
    toast.info(`${label} copied to clipboard`, 'Copied');
    setTimeout(() => setCopiedUrl(null), 2500);
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

  const versionsList = useMemo(() => data?.versions || [], [data?.versions]);
  const filteredVersions = useMemo(() => {
    if (filterType === 'ALL') return versionsList;
    return versionsList.filter((v) => v.type === filterType);
  }, [versionsList, filterType]);

  const versionFilterOptions: CleanDropdownOption[] = useMemo(() => [
    {
      value: 'ALL',
      label: 'All Versions',
      count: versionsList.length,
      dotColor: 'bg-slate-400',
    },
    {
      value: 'PRODUCTION',
      label: 'Releases',
      count: versionsList.filter((v) => v.type === 'PRODUCTION').length,
      dotColor: 'bg-emerald-500',
    },
    {
      value: 'TEST',
      label: 'Test / Staging',
      count: versionsList.filter((v) => v.type === 'TEST').length,
      dotColor: 'bg-sky-500',
    },
    {
      value: 'DRAFT',
      label: 'Drafts & Revisions',
      count: versionsList.filter((v) => v.type === 'DRAFT').length,
      dotColor: 'bg-amber-500',
    },
  ], [versionsList]);

  const baseOptions = useMemo(() => {
    if (versionsList.length === 0) {
      return [{ value: data?.currentReleaseVersion || '1.0.0', label: `v${data?.currentReleaseVersion || '1.0.0'} (Active)` }];
    }
    return versionsList.map((v) => {
      const isActive = v.type === 'PRODUCTION' && (v.status === 'ACTIVE' || v.status === 'IN_REVIEW');
      const isOld = v.type === 'PRODUCTION' && v.status !== 'ACTIVE' && v.status !== 'IN_REVIEW';
      const tag = isActive ? '(Active)' : isOld ? '(Prev)' : '(Test)';
      return {
        value: v.version,
        label: `v${v.version} ${tag}`,
      };
    });
  }, [versionsList, data?.currentReleaseVersion]);

  const targetOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string }> = [];
    if (pendingRevision?.version) {
      opts.push({
        value: pendingRevision.version,
        label: `${pendingRevision.version} (Draft Revision)`,
      });
    }
    for (const v of versionsList) {
      const isActive = v.type === 'PRODUCTION' && (v.status === 'ACTIVE' || v.status === 'IN_REVIEW');
      const isOld = v.type === 'PRODUCTION' && v.status !== 'ACTIVE' && v.status !== 'IN_REVIEW';
      const tag = isActive ? '(Active)' : isOld ? '(Prev)' : '(Test)';
      opts.push({
        value: v.version,
        label: `v${v.version} ${tag}`,
      });
    }
    if (opts.length === 0) {
      opts.push({ value: '1.0.0', label: 'v1.0.0 (Active)' });
    }
    return opts;
  }, [pendingRevision, versionsList]);

  // Keep compareBase and compareTarget initialized cleanly
  useEffect(() => {
    if (versionsList.length > 0) {
      const live = data?.currentReleaseVersion || versionsList[0]?.version || '1.0.0';
      if (!compareBase) {
        setCompareBase(live);
      }
      if (!compareTarget) {
        if (pendingRevision?.version) {
          setCompareTarget(pendingRevision.version);
        } else if (versionsList.length > 1) {
          setCompareTarget(versionsList[1].version);
        } else {
          setCompareTarget(live);
        }
      }
    }
  }, [versionsList, data?.currentReleaseVersion, pendingRevision, compareBase, compareTarget]);

  const effectiveBase = compareBase || baseOptions[0]?.value || data?.currentReleaseVersion || '1.0.0';
  const effectiveTarget = compareTarget || targetOptions[0]?.value || effectiveBase;

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
        {/* Card A: Current Active MiniApp Version */}
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
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    MiniApp Current Version
                  </span>
                  {data?.packageName && (
                    <span className="px-1.5 py-0.2 rounded text-xs font-mono font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                      {data.packageName}
                    </span>
                  )}
                </div>
                <h4 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-0.5">
                  <span>{data?.currentReleaseVersion || '1.0.0'}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-extrabold uppercase ${
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
            <span className="text-xs text-slate-500 dark:text-slate-400">
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
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-400">
                    Sandbox Test Version
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-xs font-mono font-bold bg-brand-100 dark:bg-brand-900/60 text-brand-800 dark:text-brand-300">
                    STAGING
                  </span>
                </div>
                <h4 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-0.5">
                  <span>{data?.activeTestVersion || 'develop'}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-extrabold uppercase bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-300">
                    <span>TESTING</span>
                  </span>
                </h4>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
            {activeTestRecord?.changelog ||
              (['WEBVIEW', 'DEEP_LINK'].includes(String(integrationMethod || '').toUpperCase())
                ? 'Active dynamic endpoint staged for SuperApp sandbox validation (no native build required).'
                : 'Candidate branch/tag compiled for SuperApp sandbox integration validation.')}
          </p>

          <div className="pt-3 border-t border-brand-100 dark:border-brand-900/40 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
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
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Pending Draft Revision
                </span>
                <h4 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-0.5">
                  <span>{activeDraftVer || 'No Active Draft'}</span>
                  {pendingRevision && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-extrabold uppercase bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                      <span>{pendingRevision.revisionStatus || 'IN REVIEW'}</span>
                    </span>
                  )}
                </h4>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
            {pendingRevision
              ? 'Draft changes saved in isolated staging. Active version continues running undisturbed.'
              : 'All configuration is up-to-date with published production releases.'}
          </p>

          <div className="pt-3 border-t border-amber-100 dark:border-amber-900/40 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
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
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        {/* Row 1: Section Title & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>MiniApp Version History &amp; Release Timeline</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Historical record of package releases, staging builds, and draft revisions for {miniAppName}.
            </p>
          </div>
        </div>

        {/* Row 2: Action & Filter Toolbar (Separate row so Compare Diff and Stage Filter never stack awkwardly) */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/60">
          {/* Left: Filter Dropdown */}
          <div className="flex items-center">
            <CleanDropdown
              label="Type:"
              value={filterType}
              options={versionFilterOptions}
              onChange={(val) => setFilterType(val as 'ALL' | 'PRODUCTION' | 'TEST' | 'DRAFT')}
              align="left"
              dropdownWidth="w-56"
              icon={
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              }
            />
          </div>

          {/* Right: Version Diff Comparator Selector */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-2xs self-start md:self-auto">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 px-1.5 shrink-0">
              <svg className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span>Compare:</span>
            </span>

            <div className="w-32 sm:w-36">
              <Select
                value={effectiveBase}
                onChange={(e) => setCompareBase(e.target.value)}
                className="!py-1.5 !px-2.5 text-xs font-semibold"
              >
                {baseOptions.map((opt) => (
                  <option key={`base-${opt.value}`} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            <span className="text-slate-400 dark:text-slate-500 text-xs font-bold shrink-0">➔</span>

            <div className="w-32 sm:w-36">
              <Select
                value={effectiveTarget}
                onChange={(e) => setCompareTarget(e.target.value)}
                className="!py-1.5 !px-2.5 text-xs font-semibold"
              >
                {targetOptions.map((opt) => (
                  <option key={`target-${opt.value}`} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            <Link
              href={`/miniapps/${miniAppId}/review?base=${encodeURIComponent(effectiveBase)}&target=${encodeURIComponent(effectiveTarget)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition-colors shadow-2xs shrink-0 cursor-pointer"
              title="Open dedicated PR-style diff review workspace"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Review Diff</span>
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/90 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 w-36">Version</th>
                <th className="py-3 px-4 min-w-[240px]">Release Summary</th>
                <th className="py-3 px-4 w-56">Target Source</th>
                <th className="py-3 px-4 w-36">Status</th>
                <th className="py-3 px-4 w-48">Date &amp; Author</th>
                <th className="py-3 px-4 text-right w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
              {filteredVersions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500">
                    No version records found matching this filter.
                  </td>
                </tr>
              ) : (
                filteredVersions.map((rec, idx) => {
                  const resolvedDev =
                    rec.releasedBy ||
                    ownerName ||
                    teamName ||
                    (ownerEmail ? ownerEmail.split('@')[0] : null) ||
                    'Developer';

                  const isCurrentActive =
                    rec.version === data?.currentReleaseVersion &&
                    (rec.status === 'ACTIVE' || rec.type === 'PRODUCTION');

                  return (
                    <tr
                      key={`${rec.version}-${idx}`}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* 1. Version */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-slate-100">
                              v{rec.version}
                            </span>
                            {isCurrentActive && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Current Active Release" />
                            )}
                          </div>
                          <div>
                            {rec.type === 'PRODUCTION' ? (
                              <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                Release
                              </span>
                            ) : rec.type === 'TEST' ? (
                              <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                                Staging
                              </span>
                            ) : (
                              <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                Draft
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Release Summary (Fills flexible table width) */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 max-w-md">
                          <p
                            className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed cursor-pointer hover:text-slate-900 dark:hover:text-white"
                            onClick={() => setSelectedChangelog(rec)}
                            title={rec.changelog || 'Click to view full notes'}
                          >
                            {rec.changelog || (rec.type === 'PRODUCTION' ? `Release package build v${rec.version}` : `Sandbox testing revision v${rec.version}`)}
                          </p>
                          {rec.buildNumber && (
                            <span className="text-xs font-mono font-medium text-slate-400 dark:text-slate-500">
                              Build #{rec.buildNumber}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Polymorphic Target Source */}
                      <td className="py-3.5 px-4">
                        {(() => {
                          const resolvedSource = (rec.sourceType || integrationMethod || 'GIT').toUpperCase();

                          if (resolvedSource === 'WEBVIEW') {
                            const targetUrl =
                              rec.endpointUrl ||
                              rec.integrationConfig?.productionUrl ||
                              rec.integrationConfig?.stagingUrl ||
                              rec.integrationConfig?.webUrl ||
                              integrationConfig?.productionUrl ||
                              integrationConfig?.stagingUrl ||
                              '';
                            return (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                  <svg className="w-3.5 h-3.5 text-sky-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                  </svg>
                                  <span className="font-semibold text-xs text-slate-500 dark:text-slate-400">Web Endpoint</span>
                                </div>
                                {targetUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyUrl(targetUrl, 'Web Endpoint URL')}
                                    className="group inline-flex items-center gap-1.5 font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer max-w-[200px]"
                                    title={`Target URL: ${targetUrl}\nClick to copy`}
                                  >
                                    <span className="truncate">{targetUrl.replace(/^https?:\/\//, '')}</span>
                                    {copiedUrl === targetUrl ? (
                                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold shrink-0">Copied!</span>
                                    ) : (
                                      <svg className="w-2.5 h-2.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">No URL configured</span>
                                )}
                              </div>
                            );
                          }

                          if (resolvedSource === 'DEEP_LINK') {
                            const targetScheme =
                              rec.urlScheme ||
                              rec.integrationConfig?.urlScheme ||
                              rec.integrationConfig?.deepLinkUri ||
                              integrationConfig?.urlScheme ||
                              '';
                            return (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                  <svg className="w-3.5 h-3.5 text-purple-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                  </svg>
                                  <span className="font-semibold text-xs text-slate-500 dark:text-slate-400">App Scheme</span>
                                </div>
                                {targetScheme ? (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyUrl(targetScheme, 'Deep Link Scheme')}
                                    className="group inline-flex items-center gap-1.5 font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer max-w-[200px]"
                                    title={`URI Scheme: ${targetScheme}\nClick to copy`}
                                  >
                                    <span className="truncate">{targetScheme}</span>
                                    {copiedUrl === targetScheme ? (
                                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold shrink-0">Copied!</span>
                                    ) : (
                                      <svg className="w-2.5 h-2.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">No Scheme configured</span>
                                )}
                              </div>
                            );
                          }

                          // Default: Flutter Package, Native SDK, Git
                          const isFullCommit = typeof rec.gitRef === 'string' && /^[0-9a-f]{40}$/i.test(rec.gitRef);
                          const rawChecksum =
                            rec.checksum ||
                            (rec.gitRef ? `sha256:${rec.gitRef.substring(0, 16)}...` : null);

                          return (
                            <div className="flex items-center gap-2 min-w-0">
                              {isFullCommit ? (
                                <button
                                  type="button"
                                  onClick={() => handleCopyGitRef(rec.gitRef!)}
                                  className="group inline-flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer"
                                  title={`Git Commit SHA: ${rec.gitRef}\nClick to copy full hash`}
                                >
                                  <svg className="w-3 h-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="3" strokeWidth="2" />
                                    <path strokeLinecap="round" strokeWidth="2" d="M12 3v6m0 6v6" />
                                  </svg>
                                  <span className="font-semibold">{rec.gitRef!.substring(0, 8)}</span>
                                  {copiedGitRef === rec.gitRef ? (
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Copied!</span>
                                  ) : (
                                    <svg className="w-2.5 h-2.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  )}
                                </button>
                              ) : (
                                <span className="text-xs font-mono text-slate-600 dark:text-slate-400 flex items-center gap-1.5 truncate">
                                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                  </svg>
                                  <span>{rec.gitRef || (rec.type === 'TEST' ? 'develop' : `tag: v${rec.version}`)}</span>
                                </span>
                              )}

                              {rawChecksum && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyChecksum(rec.checksum || rawChecksum)}
                                  className="group p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer shrink-0"
                                  title={`SHA-256 Checksum: ${rec.checksum || rawChecksum}\nClick to copy digest`}
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* 4. Status */}
                      <td className="py-3.5 px-4">
                        {rec.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                            <DotBadge color="bg-emerald-500" pulse />
                            <span>ACTIVE</span>
                          </span>
                        ) : rec.status === 'IN_REVIEW' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <DotBadge color="bg-amber-500" pulse />
                            <span>IN REVIEW</span>
                          </span>
                        ) : rec.status === 'TESTING' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-300 dark:border-brand-800">
                            <DotBadge color="bg-brand-500" />
                            <span>SANDBOX TESTING</span>
                          </span>
                        ) : OTHER_STAGES.includes(rec.status) ? (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                              stageLabel(rec) === 'Changes requested' || stageLabel(rec) === 'Rejected'
                                ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                : 'bg-white text-slate-700 border-dashed border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-600'
                            }`}
                          >
                            <DotBadge
                              color={stageLabel(rec) === 'In review' || stageLabel(rec) === 'Submitted' ? 'bg-amber-500' : 'bg-slate-400'}
                              pulse={stageLabel(rec) === 'In review' || stageLabel(rec) === 'Submitted'}
                            />
                            <span>{stageLabel(rec).toUpperCase()}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                            <DotBadge color="bg-slate-400" />
                            <span>{rec.status === 'DEPRECATED' ? 'RETIRED' : 'PREVIOUS'}</span>
                          </span>
                        )}
                      </td>

                      {/* 5. Date & Author */}
                      <td className="py-3.5 px-4 text-xs">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {rec.releasedAt
                              ? formatDate(rec.releasedAt)
                              : rec.submittedAt
                              ? formatDate(rec.submittedAt)
                              : formatDate(rec.createdAt) || '—'}
                          </span>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                              {getDeveloperInitials(resolvedDev)}
                            </div>
                            <span className="truncate max-w-[110px]" title={resolvedDev}>
                              {resolvedDev}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span className="text-xs text-slate-400">
                              {rec.releasedAt ? 'Released' : rec.submittedAt ? 'Submitted' : 'Created'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 6. Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Review Diff in Dedicated Workspace */}
                          <Link
                            href={`/miniapps/${miniAppId}/review?base=${encodeURIComponent(data?.currentReleaseVersion || '1.0.0')}&target=${encodeURIComponent(rec.version)}`}
                            className="inline-flex items-center justify-center w-7.5 h-7.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/60 transition-colors shadow-2xs cursor-pointer"
                            title={`Review Diff comparison with base (${data?.currentReleaseVersion || '1.0.0'} ➔ ${rec.version})`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                          </Link>

                          {/* Changelog & Release Notes */}
                          <button
                            type="button"
                            onClick={() => setSelectedChangelog(rec)}
                            className="inline-flex items-center justify-center w-7.5 h-7.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs cursor-pointer"
                            title="View Changelog & Release Notes"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>

                          {/* Security Audit Report */}
                          <Link
                            href={`/miniapps/${miniAppId}/security?version=${encodeURIComponent(rec.version)}`}
                            className="inline-flex items-center justify-center w-7.5 h-7.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 transition-colors shadow-2xs cursor-pointer"
                            title={`Security & Compliance Report for ${rec.version}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </Link>

                          {/* Invite Testers & QR */}
                          <button
                            type="button"
                            onClick={() => openInviteModal(rec.version, rec.type === 'PRODUCTION' ? 'release' : 'test')}
                            className="inline-flex items-center justify-center w-7.5 h-7.5 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 dark:hover:bg-brand-900/60 text-brand-600 dark:text-brand-400 border border-brand-200/80 dark:border-brand-800/60 transition-colors shadow-2xs cursor-pointer"
                            title="Invite Testers & Generate QR"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                          </button>

                          {/* Rollback button if applicable */}
                          {canRollback &&
                            rec.version !== data?.currentReleaseVersion &&
                            (rec.status === 'PREVIOUS' || rec.status === 'DEPRECATED') && (
                            <button
                              type="button"
                              onClick={() =>
                                setRollbackModalState({
                                  isOpen: true,
                                  targetVersion: rec.version,
                                  reason: '',
                                })
                              }
                              className="inline-flex items-center justify-center w-7.5 h-7.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60 transition-colors shadow-2xs cursor-pointer"
                              title={`Rollback SuperApp to ${rec.version}`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Changelog Modal (Portaled to document.body for full-screen edge-to-edge backdrop blur) */}
      {mounted && selectedChangelog && createPortal(
        <div className="fixed inset-0 z-[9999] w-screen h-screen min-h-screen flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg my-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
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
                  <span className="text-xs font-bold uppercase text-slate-500 block mb-1">
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
        </div>,
        document.body
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
      {/* Rollback Confirmation Modal (Portaled to document.body for full-screen edge-to-edge backdrop blur) */}
      {mounted && rollbackModalState.isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] w-screen h-screen min-h-screen flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-md my-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden p-6 space-y-4">
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
        </div>,
        document.body
      )}
    </div>
  );
}
