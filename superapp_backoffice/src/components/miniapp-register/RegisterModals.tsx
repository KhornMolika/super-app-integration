'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import PreviewModal from '@/components/ui/PreviewModal';
import SubmissionModal from '@/components/ui/SubmissionModal';
import UnsupportedCapabilitiesModal from '@/components/forms/UnsupportedCapabilitiesModal';
import { IntegrationMethod } from '@/types/miniapp.types';
import {
  WHITELISTED_HOST_CAPABILITIES,
  normalizeCapabilityKey,
} from '@/components/forms/CapabilitiesForm';
import { RegisterModalsProps } from './types';

export function RegisterModals({
  showPreview,
  setShowPreview,
  previewUrl,
  formData,
  showUnsupportedModal,
  setShowUnsupportedModal,
  modalState,
  setModalState,
  onConfirmUnsupported,
  onFixLater,
}: RegisterModalsProps) {
  const router = useRouter();

  return (
    <>
      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        url={previewUrl}
        title={formData.name}
        version={
          (formData.integrationConfigFlutter as any)?.packageVersion ||
          formData.integrationConfigFlutter?.versionConstraint ||
          'v1.0.0'
        }
        category={formData.category}
        appId={formData.appId}
        status={(formData as any).status || 'DRAFT'}
        isFlutter={formData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE}
        packageName={
          formData.integrationConfigFlutter?.packageName ||
          (formData as any).integrationConfig?.packageName ||
          formData.name
        }
        integrationMethod={formData.integrationMethod}
      />

      <UnsupportedCapabilitiesModal
        isOpen={showUnsupportedModal}
        unsupportedPermissions={(formData.permissions || []).filter(
          (p: any) =>
            !WHITELISTED_HOST_CAPABILITIES.includes(normalizeCapabilityKey(p.type || ''))
        )}
        onConfirm={onConfirmUnsupported}
        onCancel={() => setShowUnsupportedModal(false)}
      />

      <SubmissionModal
        state={modalState}
        mode="register"
        securityChecks={formData.securityChecks}
        integrationMethod={formData.integrationMethod}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        onFixLater={onFixLater}
        onRunInBackground={() => {
          setModalState((prev) => ({ ...prev, isOpen: false }));
          router.push('/miniapps');
        }}
        onSuccessContinue={() => {}}
      />
    </>
  );
}
