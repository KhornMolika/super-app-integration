'use client';

import React from 'react';
import LegalPolicyTabField from './LegalPolicyTabField';
import { CreateMiniAppDto } from '@/types/miniapp.types';

export interface LegalPolicyFormProps {
  formData: Partial<CreateMiniAppDto>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  allErrors?: Record<string, string>;
  isEditable?: boolean;
}

export default function LegalPolicyForm({
  formData,
  handleChange,
  allErrors = {},
  isEditable = true,
}: LegalPolicyFormProps) {
  return (
    <div className="space-y-4">
      {/* 1. Terms of Service Field */}
      <LegalPolicyTabField
        title="Terms of Service"
        urlFieldName="termsUrl"
        descFieldName="termsDescription"
        urlValue={formData.termsUrl || ''}
        descValue={formData.termsDescription || ''}
        onChangeUrl={(val) => handleChange({ target: { name: 'termsUrl', value: val } } as any)}
        onChangeDesc={(val) => handleChange({ target: { name: 'termsDescription', value: val } } as any)}
        integrationMethod={formData.integrationMethod}
        urlError={allErrors.termsUrl}
        descError={allErrors.termsDescription}
        isEditable={isEditable}
      />

      {/* 2. Privacy Policy Field */}
      <LegalPolicyTabField
        title="Privacy Policy"
        urlFieldName="privacyPolicyUrl"
        descFieldName="privacyPolicyDescription"
        urlValue={formData.privacyPolicyUrl || ''}
        descValue={formData.privacyPolicyDescription || ''}
        onChangeUrl={(val) => handleChange({ target: { name: 'privacyPolicyUrl', value: val } } as any)}
        onChangeDesc={(val) => handleChange({ target: { name: 'privacyPolicyDescription', value: val } } as any)}
        integrationMethod={formData.integrationMethod}
        urlError={allErrors.privacyPolicyUrl}
        descError={allErrors.privacyPolicyDescription}
        isEditable={isEditable}
      />
    </div>
  );
}
