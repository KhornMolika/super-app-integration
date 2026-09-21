'use client';

import React from 'react';
import { Label, Select } from '@/components/ui/inputs';
import { ShieldCheckIcon } from '@/components/ui/Icons';
import { IntegrationMethod } from '@/types/miniapp.types';
import WebViewIntegrationForm from './integration/WebViewIntegrationForm';
import FlutterPackageIntegrationForm from './integration/FlutterPackageIntegrationForm';
import DeepLinkIntegrationForm from './integration/DeepLinkIntegrationForm';
import LegalPolicyTabField from './LegalPolicyTabField';

// Re-export utilities for backward compatibility across the codebase
export {
  validateProductionUrlFormat,
  generateClientVerificationToken,
  generateClientRandomSuffix,
  generateClientMiniAppId,
} from '@/lib/integration-utils';

export interface IntegrationFormProps {
  formData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  allErrors?: Record<string, string>;
  handleWebViewChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFlutterChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onUpdateFlutterConfig?: (
    updates: Record<string, any>,
    extraData?: { archiveFile?: File; detectedPermissions?: any[] },
  ) => void;
  handleDeepLinkChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDomainVerified?: (data: any) => void;
  isEditable?: boolean;
}

export default function IntegrationForm({
  formData,
  handleChange,
  allErrors = {},
  handleWebViewChange = () => {},
  handleFlutterChange = () => {},
  onUpdateFlutterConfig,
  handleDeepLinkChange = () => {},
  onDomainVerified,
  isEditable = true,
}: IntegrationFormProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label>Integration Method</Label>
        <Select
          name="integrationMethod"
          value={formData.integrationMethod}
          onChange={handleChange}
          disabled={!isEditable}
        >
          <option value={IntegrationMethod.WEBVIEW}>WebView (Web App)</option>
          <option value={IntegrationMethod.FLUTTER_PACKAGE}>Flutter Package (Super App)</option>
          <option value={IntegrationMethod.NATIVE_SDK}>Native SDK (iOS / Android Framework)</option>
          <option value={IntegrationMethod.DEEP_LINK}>Deep Link (External App / App Links)</option>
        </Select>
      </div>

      {formData.integrationMethod === IntegrationMethod.WEBVIEW && (
        <WebViewIntegrationForm
          formData={formData}
          allErrors={allErrors}
          handleWebViewChange={handleWebViewChange}
          onDomainVerified={onDomainVerified}
          isEditable={isEditable}
        />
      )}

      {(formData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE ||
        formData.integrationMethod === IntegrationMethod.NATIVE_SDK) && (
        <FlutterPackageIntegrationForm
          formData={formData}
          allErrors={allErrors}
          handleFlutterChange={handleFlutterChange}
          onUpdateFlutterConfig={onUpdateFlutterConfig}
          isEditable={isEditable}
        />
      )}

      {formData.integrationMethod === IntegrationMethod.DEEP_LINK && (
        <DeepLinkIntegrationForm
          formData={formData}
          allErrors={allErrors}
          handleDeepLinkChange={handleDeepLinkChange}
          isEditable={isEditable}
        />
      )}

      {/* Legal & Compliance Policies Embedded in Integration Step */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
        <div className="mb-4">
          <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <span>Legal &amp; Compliance Policies</span>
          </h4>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Configure official terms of service and privacy disclosures. Format defaults adapt automatically to your selected integration method.
          </p>
        </div>

        <div className="space-y-4">
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
      </div>
    </div>
  );
}
