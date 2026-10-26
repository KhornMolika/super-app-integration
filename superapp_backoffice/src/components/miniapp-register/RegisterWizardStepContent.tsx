'use client';

import React from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import BasicInfoForm from '@/components/forms/BasicInfoForm';
import LegalPolicyForm from '@/components/forms/LegalPolicyForm';
import IntegrationForm from '@/components/forms/IntegrationForm';
import CapabilitiesForm from '@/components/forms/CapabilitiesForm';
import SecurityForm from '@/components/forms/SecurityForm';
import ReviewSummaryStep from '@/components/forms/ReviewSummaryStep';
import { RegisterWizardStepContentProps } from './types';

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
  if (step === 1) {
    return (
      <Card>
        <CardHeader
          title="General Information"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <BasicInfoForm formData={formData} handleChange={handleChange} allErrors={allErrors} />
      </Card>
    );
  }

  if (step === 2) {
    return (
      <Card>
        <CardHeader
          title="Legal & Compliance Policies"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          }
        />
        <LegalPolicyForm
          formData={formData}
          handleChange={handleChange}
          allErrors={allErrors}
        />
      </Card>
    );
  }

  if (step === 3) {
    return (
      <Card>
        <CardHeader
          title="Technical Integration"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          }
        />
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
  }

  if (step === 4) {
    return (
      <Card>
        <CardHeader
          title="Capabilities"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
              />
            </svg>
          }
        />
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
  }

  if (step === 5) {
    return (
      <Card>
        <CardHeader
          title="Security Validation Profile"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          }
        />
        <SecurityForm
          formData={formData}
          setFormData={setFormData}
          allErrors={allErrors}
        />
      </Card>
    );
  }

  if (step === 6) {
    return (
      <Card>
        <CardHeader
          title="Review Registration"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <ReviewSummaryStep formData={formData} onEditStep={setStep} />
      </Card>
    );
  }

  return null;
}
