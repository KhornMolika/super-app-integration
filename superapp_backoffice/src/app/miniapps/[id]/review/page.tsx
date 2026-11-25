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
import { ReviewOverviewTab } from '@/components/review/ReviewOverviewTab';
import { ReviewPermissionsTab } from '@/components/review/ReviewPermissionsTab';
import { ReviewWebviewTab } from '@/components/review/ReviewWebviewTab';
import { ReviewDeepLinkTab } from '@/components/review/ReviewDeepLinkTab';
import { ReviewSpecsTab } from '@/components/review/ReviewSpecsTab';
import { ReviewDiffViewer } from '@/components/review/ReviewDiffViewer';
import {
  FileCode2,
  KeyRound,
  Globe,
  Radio,
  Package,
  ShieldAlert,
  ArrowLeft,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

type AuditSubTab = 'OVERVIEW' | 'PERMISSIONS' | 'WEBVIEW' | 'DEEPLINK' | 'SPECS' | 'DIFF' | 'NETWORK';

function MiniAppReviewPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, can } = useAuth();

  const id = params?.id as string;

  // Search parameters for deep linking
  const queryBase = searchParams.get('base');
  const queryTarget = searchParams.get('target');
  const queryTab = (searchParams.get('tab') as AuditSubTab) || 'OVERVIEW';
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

  const method = (miniApp.integrationMethod || 'WEBVIEW').toUpperCase();
  const isWebview = method === 'WEBVIEW';
  const isDeepLink = method === 'DEEP_LINK';
  const isFlutter = method === 'FLUTTER_PACKAGE' || method === 'NATIVE_SDK';

  const dynamicTechnicalTab = isWebview
    ? {
        id: 'WEBVIEW' as AuditSubTab,
        label: 'WebView & Endpoints',
        icon: Globe,
        badge: `${addedDomains.length + removedDomains.length} domains`,
      }
    : isDeepLink
    ? {
        id: 'DEEPLINK' as AuditSubTab,
        label: 'Deep Link Routing',
        icon: Radio,
        badge: 'Intent Scheme',
      }
    : {
        id: 'SPECS' as AuditSubTab,
        label: 'Package & Specs',
        icon: Package,
        badge: 'Nexus SHA-256',
      };

  const auditTabs = [
    {
      id: 'OVERVIEW' as AuditSubTab,
      label: 'Overview & Delta Hub',
      icon: Layers,
      badge: `${totalAdditions + totalDeletions} deltas`,
    },
    {
      id: 'PERMISSIONS' as AuditSubTab,
      label: 'Capabilities & Scopes',
      icon: KeyRound,
      badge: `${addedPerms.length + removedPerms.length} deltas`,
    },
    dynamicTechnicalTab,
    {
      id: 'DIFF' as AuditSubTab,
      label: 'Code & Manifest Changes',
      icon: FileCode2,
      badge: `+${totalAdditions} -${totalDeletions}`,
    },
  ];

  return (
    <div className="w-full min-w-0 pb-16">
      {/* 1. Unified 2-Tier Sticky Command Header */}
      <ReviewDecisionBar
        miniAppId={id}
        miniAppName={miniApp.name}
        logoUrl={
          miniApp.logo ||
          miniApp.logoUrl ||
          miniApp.iconUrl ||
          diffData?.differences?.metadata?.logo?.target ||
          diffData?.differences?.metadata?.logo?.base
        }
        appId={miniApp.appId}
        integrationMethod={miniApp.integrationMethod}
        targetVersion={targetVersion}
        securityScore={securityScore}
        scanFailed={scanFailed}
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
        tabs={auditTabs}
        activeTab={activeTab === 'NETWORK' && isWebview ? 'WEBVIEW' : activeTab}
        onSelectTab={(tabId) => handleSelectTab(tabId)}
        baseVersion={baseVersion}
        versionsList={versionsList}
        onChangeBaseVersion={handleChangeBaseVersion}
        onChangeTargetVersion={handleChangeTargetVersion}
        isHighRiskChange={isHighRisk}
      />

      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 pt-[196px] space-y-6 animate-in fade-in duration-300">
        {/* 2. Sub-Tab Panel Content */}
        {diffLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            <span className="text-xs font-semibold text-slate-500">Computing diff comparison...</span>
          </div>
        ) : (
          <>
            {/* Tab 1: Overview & Delta Hub */}
            {activeTab === 'OVERVIEW' && (
              <ReviewOverviewTab
                miniApp={miniApp}
                diffData={diffData}
                baseVersion={baseVersion}
                targetVersion={targetVersion}
                onNavigateTab={(tab) => handleSelectTab(tab)}
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

            {/* Tab 3: Dynamic Integration Tab (WebView / DeepLink / Specs) */}
            {(activeTab === 'WEBVIEW' || (activeTab === 'NETWORK' && isWebview)) && (
              <ReviewWebviewTab
                productionUrlDiff={d?.integration?.productionUrl}
                stagingUrlDiff={d?.integration?.stagingUrl}
                addedDomains={addedDomains}
                removedDomains={removedDomains}
                unchangedDomains={unchangedDomains}
                domainVerified={domainVerified}
                miniApp={miniApp}
              />
            )}

            {activeTab === 'DEEPLINK' && (
              <ReviewDeepLinkTab
                urlSchemeDiff={d?.integration?.urlScheme}
                deepLinkConfig={d?.integration}
                miniApp={miniApp}
              />
            )}

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

            {/* Tab 4: Code & Manifest Diff */}
            {activeTab === 'DIFF' && (
              <ReviewDiffViewer
                files={diffFiles}
                totalAdditions={totalAdditions}
                totalDeletions={totalDeletions}
                viewMode={viewMode}
                onChangeViewMode={handleChangeViewMode}
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
