'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import BasicInfoForm from '@/components/forms/BasicInfoForm';
import LegalPolicyForm from '@/components/forms/LegalPolicyForm';
import IntegrationForm from '@/components/forms/IntegrationForm';
import CapabilitiesForm from '@/components/forms/CapabilitiesForm';
import SecurityForm from '@/components/forms/SecurityForm';
import ReviewSummaryStep from '@/components/forms/ReviewSummaryStep';
import { RegisterWizardStepContentProps } from './types';
import { stepOfSection } from './constants';

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
        <Card>
          <BasicInfoForm formData={formData} handleChange={handleChange} allErrors={allErrors} />
        </Card>
      );

    case 2:
      return (
        <Card>
          <LegalPolicyForm formData={formData} handleChange={handleChange} allErrors={allErrors} />
        </Card>
      );

    case 3:
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

    case 4:
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

    case 5:
      return (
        <Card>
          <SecurityForm formData={formData} setFormData={setFormData} allErrors={allErrors} />
        </Card>
      );

    case 6:
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
