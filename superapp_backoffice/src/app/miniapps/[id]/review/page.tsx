'use client';

import React, { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { miniappsApi } from '@/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';
import ReasonPromptModal from '@/components/ui/ReasonPromptModal';
import {
  ReviewDecisionBar,
  VersionOption,
} from '@/components/review/ReviewDecisionBar';
import {
  generateReviewDiffFiles,
  ReviewDiffFile,
} from '@/components/review/diffGenerator';
import { ReviewDiffViewer } from '@/components/review/ReviewDiffViewer';
import { ReviewPermissionsTab } from '@/components/review/ReviewPermissionsTab';
import { ReviewNetworkTab } from '@/components/review/ReviewNetworkTab';
import { ReviewSpecsTab } from '@/components/review/ReviewSpecsTab';
import {
  FileCode2,
  KeyRound,
  Globe,
  Package,
  Clock,
  User,
  ShieldAlert,
  ArrowLeft,
  Calendar,
  Layers,
} from 'lucide-react';

type AuditSubTab = 'DIFF' | 'PERMISSIONS' | 'NETWORK' | 'SPECS';

function MiniAppReviewPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, can } = useAuth();

  const id = params?.id as string;

  // Search parameters for deep linking
  const queryBase = searchParams.get('base');
  const queryTarget = searchParams.get('target');
  const queryTab = (searchParams.get('tab') as AuditSubTab) || 'DIFF';
  const queryView = (searchParams.get('view') as 'split' | 'unified') || 'split';

  const [miniApp, setMiniApp] = useState<any>(null);
  const [versionsList, setVersionsList] = useState<VersionOption[]>([]);
  const [diffData, setDiffData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [diffLoading, setDiffLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [baseVersion, setBaseVersion] = useState<string>(queryBase || '');
  const [targetVersion, setTargetVersion] = useState<string>(queryTarget || '');
  const [activeTab, setActiveTab] = useState<AuditSubTab>(queryTab);
  const [viewMode, setViewMode] = useState<'split' | 'unified'>(queryView);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reasonModalState, setReasonModalState] = useState<{
    isOpen: boolean;
    action: 'request-changes' | 'discard-revision';
    title: string;
    description: string;
    confirmText: string;
    confirmVariant: 'danger' | 'warning';
    quickSuggestions: string[];
    placeholder: string;
  } | null>(null);

  // Sync state with URL params
  const updateUrlParams = (
    newBase: string,
    newTarget: string,
    newTab: AuditSubTab,
    newView: 'split' | 'unified',
  ) => {
    const p = new URLSearchParams();
    if (newBase) p.set('base', newBase);
    if (newTarget) p.set('target', newTarget);
    if (newTab) p.set('tab', newTab);
    if (newView) p.set('view', newView);
    router.replace(`/miniapps/${id}/review?${p.toString()}`, { scroll: false });
  };

  // 1. Fetch Version Diff
  const fetchDiff = useCallback(async (appId: string, base: string, target: string) => {
    try {
      setDiffLoading(true);
      const data = await miniappsApi.getDiff(appId, base, target);
      setDiffData(data);
    } catch (err: any) {
      console.error('Failed to compute version delta:', err);
      toast.error(err?.message || 'Error fetching version diff comparison', 'Diff Error');
    } finally {
      setDiffLoading(false);
    }
  }, []);

  // 2. Initial Load: MiniApp and Versions
  const fetchMiniAppAndVersions = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [appData, versData] = await Promise.all([
        miniappsApi.getById(id),
        miniappsApi.getVersions(id).catch(() => []),
      ]);

      setMiniApp(appData);

      // Build version list
      const rawVers: any[] = Array.isArray(versData)
        ? versData
        : Array.isArray((versData as any)?.data)
        ? (versData as any).data
        : [];

      const options: VersionOption[] = rawVers.map((v) => ({
        version: v.version,
        type: v.type,
        status: v.status,
      }));

      // Ensure active live version exists in list
      const liveVer = appData.currentReleaseVersion || '1.0.0';
      if (!options.some((o) => o.version === liveVer)) {
        options.unshift({ version: liveVer, type: 'PRODUCTION', status: 'ACTIVE' });
      }

      // Ensure pending revision or draft exists
      if (appData.pendingRevision?.version) {
        if (!options.some((o) => o.version === appData.pendingRevision.version)) {
          options.push({
            version: appData.pendingRevision.version,
            type: 'REVISION',
            status: appData.pendingRevision.revisionStatus || 'IN_REVIEW',
          });
        }
      } else if (appData.status === 'IN_REVIEW' || appData.status === 'SUBMITTED') {
        const stagedVer = appData.draftVersion || 'v1.1.0-draft';
        if (!options.some((o) => o.version === stagedVer)) {
          options.push({ version: stagedVer, type: 'REVISION', status: appData.status });
        }
      }

      setVersionsList(options);

      // Determine default base and target
      const resolvedBase =
        queryBase ||
        liveVer ||
        options[0]?.version ||
        '1.0.0';

      const resolvedTarget =
        queryTarget ||
        appData.pendingRevision?.version ||
        (appData.status === 'IN_REVIEW' || appData.status === 'SUBMITTED'
          ? appData.draftVersion || 'v1.1.0-draft'
          : options[options.length - 1]?.version || resolvedBase);

      setBaseVersion(resolvedBase);
      setTargetVersion(resolvedTarget);

      // Fetch initial diff
      await fetchDiff(id, resolvedBase, resolvedTarget);
    } catch (err: any) {
      console.error('Failed to load review workspace:', err);
      setError(err?.message || 'Failed to load MiniApp data for review');
    } finally {
      setLoading(false);
    }
  }, [id, queryBase, queryTarget, fetchDiff]);

  useEffect(() => {
    fetchMiniAppAndVersions();
  }, [fetchMiniAppAndVersions]);

  const handleChangeBaseVersion = (newBase: string) => {
    setBaseVersion(newBase);
    updateUrlParams(newBase, targetVersion, activeTab, viewMode);
    fetchDiff(id, newBase, targetVersion);
  };

  const handleChangeTargetVersion = (newTarget: string) => {
    setTargetVersion(newTarget);
    updateUrlParams(baseVersion, newTarget, activeTab, viewMode);
    fetchDiff(id, baseVersion, newTarget);
  };

  const handleSelectTab = (tab: AuditSubTab) => {
    setActiveTab(tab);
    updateUrlParams(baseVersion, targetVersion, tab, viewMode);
  };

  const handleChangeViewMode = (mode: 'split' | 'unified') => {
    setViewMode(mode);
    updateUrlParams(baseVersion, targetVersion, activeTab, mode);
  };

  // Security gate checks
  const scanFailed =
    miniApp?.validationStatus === 'FAILED' ||
    miniApp?.buildStatus === 'FAILED' ||
    diffData?.differences?.security?.validationStatus?.target === 'FAILED';

  const canApprove = can('miniapp:approve') && !scanFailed;
  const canReject = can('miniapp:reject');

  // Reviewer Decision Actions
  const handleAction = async (
    action: 'publish-revision' | 'start-testing' | 'request-changes' | 'discard-revision',
    explicitReason?: string,
  ) => {
    if (action === 'request-changes' && explicitReason === undefined) {
      setReasonModalState({
        isOpen: true,
        action: 'request-changes',
        title: 'Request Changes from Developer',
        description:
          'Specify the required code, capability, or security remediations. The staged revision will remain in draft for the developer.',
        confirmText: 'Send Change Request',
        confirmVariant: 'warning',
        placeholder: 'e.g. Please justify why biometric capability is required, or update domain whitelist...',
        quickSuggestions: [
          'Permission purpose is too vague; provide explicit business context',
          'Domain whitelist includes unverified external domains',
          'Terms of Service / Privacy Policy URL is inaccessible or invalid',
          'Security scan flagged potential SSRF risk on target endpoint',
          'High-risk capabilities declared without required partner certification',
        ],
      });
      return;
    }

    if (action === 'discard-revision' && explicitReason === undefined) {
      setReasonModalState({
        isOpen: true,
        action: 'discard-revision',
        title: 'Reject & Discard Staged Revision',
        description:
          'Are you sure you want to reject this revision? All proposed changes will be discarded while the current live version remains active.',
        confirmText: 'Reject Revision',
        confirmVariant: 'danger',
        placeholder: 'Explain why this revision cannot be accepted...',
        quickSuggestions: [
          'Violates SuperApp platform capability and security policies',
          'High-risk permissions requested without required partner certification',
          'Duplicate or conflicting capability with existing SuperApp core features',
          'Incompatible technical architecture or failed automated security baseline',
        ],
      });
      return;
    }

    const reason = explicitReason || '';
    setActionLoading(action);
    try {
      await miniappsApi.triggerAction(id, action, reason);

      const actionLabels: Record<string, string> = {
        'publish-revision': 'Revision approved and published live to SuperApp!',
        'start-testing': 'Test build triggered and revision advanced to sandbox testing!',
        'request-changes': 'Change request sent to MiniApp developer.',
        'discard-revision': 'Revision rejected and discarded successfully.',
      };
      toast.success(actionLabels[action] || 'Action completed successfully!', 'Review Updated');
      await fetchMiniAppAndVersions();
    } catch (err: any) {
      console.error(`Failed to execute ${action}:`, err);
      toast.error(err?.message || `Failed to execute ${action}.`, 'Action Failed');
    } finally {
      setActionLoading(null);
    }
  };

  // Synthesize Code & Manifest Diffs
  const { files: diffFiles, totalAdditions, totalDeletions } = useMemo(() => {
    return generateReviewDiffFiles(diffData, miniApp);
  }, [diffData, miniApp]);

  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        <span className="text-sm font-semibold text-slate-500">Loading version review workspace...</span>
      </div>
    );
  }

  if (error || !miniApp) {
    return (
      <div className="max-w-2xl mx-auto my-16 p-8 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-rose-900 dark:text-rose-200">
          Review Workspace Unavailable
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {error || 'Unable to retrieve MiniApp version diff data.'}
        </p>
        <Link
          href={`/miniapps/${id}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to MiniApp Overview</span>
        </Link>
      </div>
    );
  }

  const d = diffData?.differences;
  const isHighRisk = diffData?.isHighRiskChange || false;
  const addedPerms = d?.permissions?.added || [];
  const removedPerms = d?.permissions?.removed || [];
  const modifiedPerms = d?.permissions?.modified || [];
  const unchangedPerms = d?.permissions?.unchanged || [];
  const addedDomains = d?.integration?.allowedDomains?.added || [];
  const removedDomains = d?.integration?.allowedDomains?.removed || [];
  const unchangedDomains = d?.integration?.allowedDomains?.unchanged || [];

  const securityScore = d?.security?.scoreDiff?.target ?? 100;
  const domainVerified = Boolean(d?.security?.domainVerification?.target);

  return (
    <div className="w-full min-w-0 pb-16 animate-in fade-in duration-300">
      {/* 1. Sticky Decision Bar */}
      <ReviewDecisionBar
        miniAppId={id}
        miniAppName={miniApp.name}
        appId={miniApp.appId}
        integrationMethod={miniApp.integrationMethod}
        versionsList={versionsList}
        baseVersion={baseVersion}
        targetVersion={targetVersion}
        onChangeBaseVersion={handleChangeBaseVersion}
        onChangeTargetVersion={handleChangeTargetVersion}
        isHighRiskChange={isHighRisk}
        securityScore={securityScore}
        scanFailed={scanFailed}
        domainVerified={domainVerified}
        canApprove={canApprove}
        canReject={canReject}
        actionLoading={actionLoading}
        onRequestChanges={() => handleAction('request-changes')}
        onRejectRevision={() => handleAction('discard-revision')}
        onApproveTest={
          miniApp.status === 'IN_REVIEW' || miniApp.status === 'SUBMITTED'
            ? () => handleAction('start-testing')
            : undefined
        }
        onApprovePublish={() => handleAction('publish-revision')}
      />

      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {/* 2. Developer Submission Context Header (What & Why) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Release Notes */}
          <div className="p-4 rounded-2xl bg-brand-50/40 dark:bg-brand-950/20 border border-brand-200/70 dark:border-brand-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-600" />
                <span>Release Notes &amp; Changelog (What Changed)</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200">
                {diffData?.targetVersion?.version || targetVersion}
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {diffData?.targetVersion?.changelog ||
                miniApp?.pendingRevision?.changelog ||
                'No detailed release notes provided by developer.'}
            </p>
          </div>

          {/* Security Justification */}
          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Security Justification (Why Required)</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                Platform Rationale
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {diffData?.targetVersion?.justification ||
                miniApp?.pendingRevision?.justification ||
                'Updated configuration and capability envelope for SuperApp runtime integration.'}
            </p>
          </div>
        </div>

        {/* 3. Audit Sub-Tabs Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2">
          {[
            {
              id: 'DIFF' as AuditSubTab,
              label: 'Code & Manifest Changes',
              icon: FileCode2,
              badge: `+${totalAdditions} -${totalDeletions}`,
            },
            {
              id: 'PERMISSIONS' as AuditSubTab,
              label: 'Capabilities & Permissions',
              icon: KeyRound,
              badge: `${addedPerms.length + removedPerms.length} deltas`,
            },
            {
              id: 'NETWORK' as AuditSubTab,
              label: 'Network Domain Allowlist',
              icon: Globe,
              badge: `${addedDomains.length + removedDomains.length} deltas`,
            },
            {
              id: 'SPECS' as AuditSubTab,
              label: 'Package & Dependency Specs',
              icon: Package,
              badge: 'Nexus SHA-256',
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                className={`pb-3 px-3.5 border-b-2 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isActive
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

        {/* 4. Sub-Tab Panel Content */}
        {diffLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            <span className="text-xs font-semibold text-slate-500">Computing diff comparison...</span>
          </div>
        ) : (
          <>
            {/* Tab 1: Code & Manifest Diff */}
            {activeTab === 'DIFF' && (
              <ReviewDiffViewer
                files={diffFiles}
                totalAdditions={totalAdditions}
                totalDeletions={totalDeletions}
                viewMode={viewMode}
                onChangeViewMode={handleChangeViewMode}
              />
            )}

            {/* Tab 2: Capabilities & Permissions */}
            {activeTab === 'PERMISSIONS' && (
              <ReviewPermissionsTab
                added={addedPerms}
                removed={removedPerms}
                modified={modifiedPerms}
                unchanged={unchangedPerms}
                isHighRiskChange={isHighRisk}
              />
            )}

            {/* Tab 3: Network Domain Allowlist */}
            {activeTab === 'NETWORK' && (
              <ReviewNetworkTab
                productionUrlDiff={d?.integration?.productionUrl}
                stagingUrlDiff={d?.integration?.stagingUrl}
                urlSchemeDiff={d?.integration?.urlScheme}
                addedDomains={addedDomains}
                removedDomains={removedDomains}
                unchangedDomains={unchangedDomains}
                domainVerified={domainVerified}
              />
            )}

            {/* Tab 4: Package & Dependency Specs */}
            {activeTab === 'SPECS' && (
              <ReviewSpecsTab
                miniAppId={id}
                integrationMethod={miniApp.integrationMethod}
                packageName={
                  d?.integration?.flutterPackageName?.target ||
                  miniApp.integrationConfigFlutter?.packageName ||
                  miniApp.packageName ||
                  miniApp.name
                }
                baseVersion={baseVersion}
                targetVersion={targetVersion}
                versionConstraint={d?.integration?.flutterVersionConstraint}
                checksum={d?.artifacts?.checksums?.target || (miniApp as any).checksum}
                apkSizeDiff={d?.artifacts?.apkSizeDiff}
                testApkUrl={`/api/download-apk?type=test&version=${encodeURIComponent(targetVersion)}`}
              />
            )}
          </>
        )}
      </div>

      {/* Reason Prompt Dialog for Request Changes or Discard */}
      {reasonModalState?.isOpen && (
        <ReasonPromptModal
          isOpen={reasonModalState.isOpen}
          title={reasonModalState.title}
          description={reasonModalState.description}
          placeholder={reasonModalState.placeholder}
          confirmText={reasonModalState.confirmText}
          confirmVariant={reasonModalState.confirmVariant}
          quickSuggestions={reasonModalState.quickSuggestions}
          isLoading={Boolean(actionLoading)}
          onClose={() => setReasonModalState(null)}
          onConfirm={(reason) => {
            const action = reasonModalState.action;
            setReasonModalState(null);
            handleAction(action, reason);
          }}
        />
      )}
    </div>
  );
}

export default function MiniAppReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[75vh] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <MiniAppReviewPageContent />
    </Suspense>
  );
}
