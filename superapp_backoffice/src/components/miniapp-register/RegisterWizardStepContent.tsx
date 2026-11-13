'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import BasicInfoForm from '@/components/forms/BasicInfoForm';
import LegalPolicyForm from '@/components/forms/LegalPolicyForm';
import IntegrationForm from '@/components/forms/IntegrationForm';
import CapabilitiesForm from '@/components/forms/CapabilitiesForm';
import SecurityForm from '@/components/forms/SecurityForm';
import ReviewSummaryStep from '@/components/forms/ReviewSummaryStep';
import { RegisterWizardStepContentProps } from './types';
import { stepOfSection } from './constants';

const LEGAL_FIELDS = ['termsUrl', 'termsDescription', 'privacyPolicyUrl', 'privacyPolicyDescription'] as const;

/** Terms and privacy, folded under Basics: closed until the developer opens it. */
function LegalSection({
  formData,
  handleChange,
  allErrors,
}: Pick<RegisterWizardStepContentProps, 'formData' | 'handleChange' | 'allErrors'>) {
  const hasValue = LEGAL_FIELDS.some((f) => String((formData as any)[f] || '').trim());
  const hasError = LEGAL_FIELDS.some((f) => allErrors[f]);
  const [open, setOpen] = useState(hasValue || hasError);
  const expanded = open || hasError;

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="block text-base font-semibold text-slate-900 dark:text-slate-100">Terms &amp; privacy</span>
          <span className="block text-sm text-slate-500 dark:text-slate-400">
            {hasValue ? 'Added' : 'Optional. Recommended before the app goes live.'}
          </span>
        </span>
        <svg
          className={`w-5 h-5 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="mt-4">
          <LegalPolicyForm formData={formData} handleChange={handleChange} allErrors={allErrors} />
        </div>
      )}
    </Card>
  );
}

export function RegisterWizardStepContent({
  step,
  formData,
  setFormData,
  handleChange,
  allErrors,
  handleWebViewChange,
  handleFlutterChange,
  onUpdateFlutterConfig,
  handleNativeSdkChange,
  onUpdateNativeSdkConfig,
  handleDeepLinkChange,
  onDomainVerified,
  togglePermission,
  handlePermissionFieldChange,
  customPermission,
  setCustomPermission,
  setStep,
}: RegisterWizardStepContentProps) {
  switch (step) {
    case 1:
      return (
        <div className="space-y-4">
          <Card>
            <BasicInfoForm formData={formData} handleChange={handleChange} allErrors={allErrors} />
          </Card>
          <LegalSection formData={formData} handleChange={handleChange} allErrors={allErrors} />
        </div>
      );

    case 2:
      return (
        <Card>
          <IntegrationForm
            formData={formData}
            handleChange={handleChange}
            allErrors={allErrors}
            handleWebViewChange={handleWebViewChange}
            handleFlutterChange={handleFlutterChange}
            onUpdateFlutterConfig={onUpdateFlutterConfig}
            handleNativeSdkChange={handleNativeSdkChange}
            onUpdateNativeSdkConfig={onUpdateNativeSdkConfig}
            handleDeepLinkChange={handleDeepLinkChange}
            onDomainVerified={onDomainVerified}
          />
        </Card>
      );

    case 3:
      return (
        <Card>
          <CapabilitiesForm
            formData={formData}
            setFormData={setFormData}
            handleChange={handleChange}
            allErrors={allErrors}
            togglePermission={togglePermission}
            handlePermissionFieldChange={handlePermissionFieldChange}
            customPermission={customPermission}
            setCustomPermission={setCustomPermission}
          />
        </Card>
      );

    case 4:
      return (
        <Card>
          <SecurityForm formData={formData} setFormData={setFormData} allErrors={allErrors} />
        </Card>
      );

    case 5:
      return (
        <Card>
          {/* The review's edit links name validation sections; open the step that shows each. */}
          <ReviewSummaryStep formData={formData} onEditStep={(section) => setStep(stepOfSection(section))} />
        </Card>
      );

    default:
      return null;
  }
}
