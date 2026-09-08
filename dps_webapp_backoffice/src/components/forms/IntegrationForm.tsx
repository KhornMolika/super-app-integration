'use client';

import React from 'react';
import { Label, Select } from '@/components/ui/inputs';
import { IntegrationMethod } from '@/types/miniapp.types';
import WebViewIntegrationForm from './integration/WebViewIntegrationForm';
import FlutterPackageIntegrationForm from './integration/FlutterPackageIntegrationForm';
import DeepLinkIntegrationForm from './integration/DeepLinkIntegrationForm';

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
          <option value={IntegrationMethod.DEEP_LINK}>Deep Link (External App / App Links)</option>
          <option value={IntegrationMethod.NATIVE_SDK} disabled>
            Native SDK (Coming Soon)
          </option>
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

      {formData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE && (
        <FlutterPackageIntegrationForm
          formData={formData}
          allErrors={allErrors}
          handleFlutterChange={handleFlutterChange}
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
    </div>
  );
}
