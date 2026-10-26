'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import {
  STEP_TITLES,
  STEP_DESCRIPTIONS,
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
  } = useMiniAppRegister();

  return (
    <>
      <div className="w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-12">
        <RegisterWizardHeader
          step={step}
          stepTitle={STEP_TITLES[step - 1]}
          stepDescription={STEP_DESCRIPTIONS[step - 1]}
          miniAppName={formData.name}
        />

        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 6) handleSubmit(e);
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
            onCancelOrBack={step === 1 ? () => router.push('/miniapps') : prevStep}
            onSaveDraft={handleSaveDraft}
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
