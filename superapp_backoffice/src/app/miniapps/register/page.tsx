'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import {
  STEP_TITLES,
  STEP_DESCRIPTIONS,
  TOTAL_STEPS,
  RegisterWizardHeader,
  RegisterWizardBottomBar,
  RegisterWizardStepContent,
  RegisterModals,
  useMiniAppRegister,
} from '@/components/miniapp-register';

function RegisterMiniAppContent() {
  const router = useRouter();
  const {
    formData,
    setFormData,
    step,
    setStep,
    nextStep,
    prevStep,
    isCurrentStepComplete,
    missingForStep,
    isSubmitting,
    modalState,
    setModalState,
    allErrors,
    customPermission,
    setCustomPermission,
    showPreview,
    setShowPreview,
    previewUrl,
    showUnsupportedModal,
    setShowUnsupportedModal,
    handleChange,
    handleWebViewChange,
    handleFlutterChange,
    handleUpdateFlutterConfig,
    handleNativeSdkChange,
    handleUpdateNativeSdkConfig,
    handleDeepLinkChange,
    handleDomainVerified,
    togglePermission,
    handlePermissionFieldChange,
    handleSaveDraft,
    handleSubmit,
    handleConfirmUnsupported,
    handleFixLater,
    hasRestoredDraft,
    draftSavedAt,
    handleDiscardDraft,
  } = useMiniAppRegister();

  return (
    <>
      <div className="w-full min-w-0 pb-6">
        {hasRestoredDraft && (
          <div className="mb-4 px-4 py-2.5 rounded-xl border border-sky-200 dark:border-sky-800/60 bg-sky-50 dark:bg-sky-950/30 flex items-center justify-between text-xs text-sky-800 dark:text-sky-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              <span>
                Auto-restored your in-progress draft
                {draftSavedAt ? ` (saved ${new Date(draftSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}.
              </span>
            </div>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer ml-3"
            >
              Discard draft & start fresh
            </button>
          </div>
        )}

        <RegisterWizardHeader
          step={step}
          stepTitle={STEP_TITLES[step - 1]}
          stepDescription={STEP_DESCRIPTIONS[step - 1]}
          miniAppName={formData.name}
          isSubmitting={isSubmitting}
          onCancel={() => router.push('/miniapps')}
          onSaveDraft={handleSaveDraft}
        />

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (step === TOTAL_STEPS) handleSubmit(e);
          }}
        >
          <RegisterWizardStepContent
            step={step}
            formData={formData}
            setFormData={setFormData}
            handleChange={handleChange}
            allErrors={allErrors}
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
            setStep={setStep}
          />

          <RegisterWizardBottomBar
            step={step}
            isSubmitting={isSubmitting}
            isCurrentStepComplete={isCurrentStepComplete}
            missing={missingForStep}
            onPrevStep={prevStep}
            onNextStep={nextStep}
          />
        </form>
      </div>

      <RegisterModals
        showPreview={showPreview}
        setShowPreview={setShowPreview}
        previewUrl={previewUrl}
        formData={formData}
        showUnsupportedModal={showUnsupportedModal}
        setShowUnsupportedModal={setShowUnsupportedModal}
        modalState={modalState}
        setModalState={setModalState}
        onConfirmUnsupported={handleConfirmUnsupported}
        onFixLater={handleFixLater}
      />
    </>
  );
}

export default function RegisterMiniAppPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
        </div>
      }
    >
      <RegisterMiniAppContent />
    </Suspense>
  );
}
