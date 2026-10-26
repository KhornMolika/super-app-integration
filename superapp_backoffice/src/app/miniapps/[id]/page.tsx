'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import PreviewModal from '@/components/ui/PreviewModal';
import SubmissionModal from '@/components/ui/SubmissionModal';
import BuildProgressModal from '@/components/ui/BuildProgressModal';
import ReasonPromptModal from '@/components/ui/ReasonPromptModal';
import { RevisionReviewModal } from '@/components/review/RevisionReviewModal';
import { IntegrationMethod } from '@/types/miniapp.types';

import {
  MiniAppTabType,
  MiniAppDetailHeader,
  MiniAppLifecycleBanners,
  MiniAppSectionContent,
  MiniAppDetailBottomBar,
  MiniAppNotFound,
  RevisionSubmissionModal,
  useMiniAppDetail,
  useMiniAppLifecycle,
} from '@/components/miniapp-detail';

const TAB_TITLES: Record<MiniAppTabType, string> = {
  overview: 'General Information',
  team: 'Team & Support',
  integration: 'Technical Integration',
  permissions: 'Capabilities',
  versions: 'Versions & Releases',
  report: 'Security & Compliance',
  activity: 'Activity & Audit',
};

function ManageMiniAppContent() {
  const router = useRouter();
  const routeParams = useParams();
  const searchParams = useSearchParams();
  const { user, role, can } = useAuth();

  const id =
    (typeof routeParams?.id === 'string'
      ? routeParams.id
      : Array.isArray(routeParams?.id)
      ? routeParams.id[0]
      : '') || '';

  const rawTab = (searchParams?.get('tab') as MiniAppTabType) || 'overview';
  const validTabs: MiniAppTabType[] = [
    'overview',
    'team',
    'integration',
    'permissions',
    'versions',
    'report',
    'activity',
  ];
  const activeTab: MiniAppTabType = validTabs.includes(rawTab) ? rawTab : 'overview';

  const setActiveTab = (tab: MiniAppTabType) => {
    const currentParams = new URLSearchParams(searchParams?.toString() || '');
    currentParams.set('tab', tab);
    router.replace(`/miniapps/${id}?${currentParams.toString()}`, { scroll: false });
  };

  const {
    formData,
    setFormData,
    isLoading,
    isSubmitting,
    setIsSubmitting,
    fetchError,
    fetchApp,
    allErrors,
    isEditable,
    isEditingUnlocked,
    setIsEditingUnlocked,
    latestTestVersion,
    showPreview,
    setShowPreview,
    previewUrl,
    customPermission,
    setCustomPermission,
    modalState,
    setModalState,
    buildModalState,
    setBuildModalState,
    revisionModalOpen,
    setRevisionModalOpen,
    isReviewDiffOpen,
    setIsReviewDiffOpen,
    handleChange,
    handleWebViewChange,
    handleFlutterChange,
    handleUpdateFlutterConfig,
    handleDeepLinkChange,
    handleNativeSdkChange,
    handleUpdateNativeSdkConfig,
    togglePermission,
    handleDomainVerified,
    handlePermissionFieldChange,
    handleSave,
    executeSave,
    openSandboxPreview,
  } = useMiniAppDetail(id, can);

  const {
    lifecycleReasonModal,
    setLifecycleReasonModal,
    handleLifecycleAction,
    handleDelete,
  } = useMiniAppLifecycle({
    id,
    formData,
    setFormData,
    fetchApp,
    setIsSubmitting,
    setBuildModalState,
    setActiveTab,
  });

  if (isLoading || fetchError || !formData.id) {
    return (
      <MiniAppNotFound
        id={id}
        isLoading={isLoading}
        fetchError={fetchError}
        onRetry={() => fetchApp(false)}
      />
    );
  }

  return (
    <>
      <div className="w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-12">
        {/* Breadcrumb Context */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 px-1">
          <Link href="/miniapps" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
            MiniApps
          </Link>
          <span>/</span>
          <span className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-xs">
            {formData.name || 'Manage MiniApp'}
          </span>
          <span>/</span>
          <span className="text-brand-600 dark:text-brand-400 font-bold capitalize">
            {TAB_TITLES[activeTab] || 'General Information'}
          </span>
        </div>

        {/* Top Header Card */}
        <MiniAppDetailHeader
          formData={formData}
          role={role}
          can={can}
          latestTestVersion={latestTestVersion}
          isEditingUnlocked={isEditingUnlocked}
          onToggleEditing={() => {
            setIsEditingUnlocked(true);
            const el = document.querySelector('form') || document.querySelector('input');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
          onOpenSandbox={openSandboxPreview}
          onLifecycleAction={handleLifecycleAction}
          onDelete={handleDelete}
          isSubmitting={isSubmitting}
        />

        {/* Lifecycle Status Banners */}
        <MiniAppLifecycleBanners
          status={formData.status || 'DRAFT'}
          can={can}
          role={role}
          testVersion={formData.activeTestVersion || latestTestVersion || (formData as any).integrationConfig?.superAppTestVersion || 'v0.0.1'}
          isSubmitting={isSubmitting}
          onLifecycleAction={handleLifecycleAction}
          onOpenSandbox={openSandboxPreview}
          onOpenReviewDiff={() => setIsReviewDiffOpen(true)}
          pendingRevision={formData.pendingRevision}
          buildStages={formData.buildStages}
          buildStatus={formData.buildStatus}
          buildError={formData.buildError}
          currentReleaseVersion={formData.currentReleaseVersion || ((formData as any).versionHistory?.find((v: any) => v.type === 'PRODUCTION' && v.status === 'ACTIVE')?.version)}
          draftVersion={formData.pendingRevision?.version || (formData as any).draftVersion || formData.version}
          hasActiveProduction={Boolean((formData.status === 'ACTIVE' || formData.status === 'Published') && ((formData as any).versionHistory?.some((v: any) => v.type === 'PRODUCTION' && (v.status === 'ACTIVE' || v.status === 'PREVIOUS')) || formData.currentReleaseVersion))}
          onOpenBuildModal={() =>
            setBuildModalState({
              isOpen: true,
              status: (formData.status === 'BUILD_FAILED' || formData.buildStatus === 'FAILED' || Boolean(formData.buildError && formData.status !== 'TESTING'))
                ? 'error'
                : (formData.status === 'TESTING' || formData.buildStatus === 'COMPLETED')
                ? 'success'
                : 'building',
              stages: formData.buildStages || {},
              releaseVersion: formData.activeTestVersion || (formData.integrationConfig as any)?.superAppTestVersion || 'v1.0.0',
              errorMessage: formData.buildError,
              appId: formData.appId,
              appName: formData.name,
            })
          }
        />

        {/* Section Contents Router */}
        <MiniAppSectionContent
          activeTab={activeTab}
          id={id}
          formData={formData}
          setFormData={setFormData}
          handleChange={handleChange}
          allErrors={allErrors}
          isEditable={isEditable}
          handleWebViewChange={handleWebViewChange}
          handleFlutterChange={handleFlutterChange}
          onUpdateFlutterConfig={handleUpdateFlutterConfig}
          handleNativeSdkChange={handleNativeSdkChange}
          onUpdateNativeSdkConfig={handleUpdateNativeSdkConfig}
          handleDeepLinkChange={handleDeepLinkChange}
          onDomainVerified={handleDomainVerified}
          togglePermission={togglePermission}
          handlePermissionFieldChange={handlePermissionFieldChange}
          customPermission={customPermission}
          setCustomPermission={setCustomPermission}
          onRefreshApp={() => fetchApp(false, true)}
        />

        {/* Save Changes Floating Bottom Bar */}
        <MiniAppDetailBottomBar
          isEditable={isEditable}
          activeTab={activeTab}
          isSubmitting={isSubmitting}
          onSaveDraft={(e) => handleSave(e, true)}
          onSaveAndSubmit={(e) => handleSave(e, false)}
        />

        {/* Sandbox Preview Modal */}
        <PreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          url={previewUrl}
          title={formData.name}
          version={
            formData.activeTestVersion ||
            latestTestVersion ||
            (formData as any).integrationConfig?.superAppTestVersion ||
            (formData.integrationConfigFlutter as any)?.packageVersion ||
            formData.integrationConfigFlutter?.versionConstraint ||
            (formData as any).version ||
            'v1.0.0'
          }
          apkUrl={`/api/download-apk?type=test&version=${encodeURIComponent(formData.activeTestVersion || latestTestVersion || (formData as any).integrationConfig?.superAppTestVersion || 'v0.0.1')}`}
          category={formData.category}
          appId={formData.appId || formData.id || (formData as any)._id}
          status={formData.status}
          buildCompletedAt={
            (formData as any).validationReport?.completedAt ||
            (formData as any).validationStages?.RELEASE_ASSEMBLY?.completedAt ||
            (formData as any).validationStages?.BUILD?.completedAt ||
            (formData as any).updatedAt
          }
          isFlutter={formData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE}
          packageName={
            formData.integrationConfigFlutter?.packageName ||
            (formData as any).integrationConfig?.packageName ||
            (formData as any).packageName ||
            formData.name
          }
          integrationMethod={formData.integrationMethod}
        />
      </div>

      {/* Revision Submission Modal for Active MiniApps */}
      <RevisionSubmissionModal
        isOpen={revisionModalOpen}
        onClose={() => setRevisionModalOpen(false)}
        onSubmit={async (changelog, justification) => {
          setRevisionModalOpen(false);
          await executeSave(false, changelog, justification);
        }}
        isSubmitting={isSubmitting}
      />

      {/* Revision Review Diff Modal */}
      {isReviewDiffOpen && (
        <RevisionReviewModal
          isOpen={isReviewDiffOpen}
          onClose={() => setIsReviewDiffOpen(false)}
          miniAppId={id as string}
          miniAppName={formData.name}
          onSuccess={() => {
            setIsReviewDiffOpen(false);
            fetchApp();
          }}
        />
      )}

      {/* Submission & Validation Results Modal */}
      <SubmissionModal
        state={modalState}
        mode="manage"
        securityChecks={formData.securityChecks}
        integrationMethod={formData.integrationMethod}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        onFixLater={() => {
          setModalState((prev) => ({ ...prev, isOpen: false }));
        }}
        onRunInBackground={() => {
          setModalState((prev) => ({ ...prev, isOpen: false }));
        }}
        onSuccessContinue={() => {
          setModalState((prev) => ({ ...prev, isOpen: false }));
          fetchApp();
        }}
      />

      {/* Reason Prompt Dialog for Rejections, Changes, and Discards */}
      {lifecycleReasonModal?.isOpen && (
        <ReasonPromptModal
          isOpen={lifecycleReasonModal.isOpen}
          title={lifecycleReasonModal.title}
          description={lifecycleReasonModal.description}
          placeholder={lifecycleReasonModal.placeholder}
          confirmText={lifecycleReasonModal.confirmText}
          confirmVariant={lifecycleReasonModal.confirmVariant}
          quickSuggestions={lifecycleReasonModal.quickSuggestions}
          isLoading={isSubmitting}
          onClose={() => setLifecycleReasonModal(null)}
          onConfirm={(reason) => {
            const action = lifecycleReasonModal.action;
            setLifecycleReasonModal(null);
            handleLifecycleAction(action, reason);
          }}
        />
      )}

      {/* Fastlane & Jenkins Test Build Progress Modal */}
      <BuildProgressModal
        state={buildModalState}
        onClose={() => {
          setBuildModalState((prev) => ({ ...prev, isOpen: false }));
          fetchApp();
        }}
        onRunInBackground={() => {
          setBuildModalState((prev) => ({ ...prev, isOpen: false }));
        }}
        onRetry={() => {
          setBuildModalState((prev) => ({ ...prev, isOpen: false }));
          handleLifecycleAction('start-testing');
        }}
        onOpenSandbox={openSandboxPreview}
      />
    </>
  );
}

export default function ManageMiniAppPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      }
    >
      <ManageMiniAppContent />
    </Suspense>
  );
}
