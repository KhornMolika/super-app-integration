'use client';

import React from 'react';
import { Label, Select } from '@/components/ui/inputs';
import { IntegrationMethod, SourceType } from '@/types/miniapp.types';
import HomeWidgetField from './HomeWidgetField';
import WebViewIntegrationForm from './integration/WebViewIntegrationForm';
import FlutterPackageIntegrationForm from './integration/FlutterPackageIntegrationForm';
import NativeSdkIntegrationForm from './integration/NativeSdkIntegrationForm';
import DeepLinkIntegrationForm from './integration/DeepLinkIntegrationForm';
import { generateClientSlug } from '@/lib/integration-utils';

// Re-export utilities for backward compatibility across the codebase
export {
  validateProductionUrlFormat,
  generateClientVerificationToken,
  generateClientRandomSuffix,
  generateClientSlug,
  generateClientMiniAppId,
  deriveNativeSdkDefaults,
} from '@/lib/integration-utils';


export interface IntegrationFormProps {
  formData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  allErrors?: Record<string, string>;
  handleWebViewChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFlutterChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onUpdateFlutterConfig?: (
    updates: Record<string, any>,
    extraData?: { archiveFile?: File; detectedPermissions?: any[] },
  ) => void;
  handleNativeSdkChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdateNativeSdkConfig?: (
    updates: Record<string, any>,
    extraData?: { iosFile?: File; androidFile?: File; detectedPermissions?: any[] },
  ) => void;
  handleDeepLinkChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDomainVerified?: (data: any) => void;
  isEditable?: boolean;
}

export default function IntegrationForm({
  formData,
  handleChange,
  allErrors = {},
  handleWebViewChange = () => { },
  handleFlutterChange = () => { },
  onUpdateFlutterConfig,
  handleNativeSdkChange,
  onUpdateNativeSdkConfig,
  handleDeepLinkChange = () => { },
  onDomainVerified,
  isEditable = true,
}: IntegrationFormProps) {
  // Home widget classes found in the Flutter package: in its Git repo or its uploaded archive.
  const flutterConfig = formData.integrationConfigFlutter;
  const widgetFromGit = flutterConfig?.sourceType === SourceType.GIT;
  return (
    <div className="space-y-6">
      <div>
        <Label>Integration Method</Label>
        <Select
          name="integrationMethod"
          value={formData.integrationMethod}
          onChange={(e) => {
            handleChange(e);
            // Each method has its own widget field: keep the box ticked, clear the value.
            if (formData.homeWidget != null) {
              handleChange({ target: { name: 'homeWidget', value: {} } } as any);
            }
          }}
          disabled={!isEditable}
        >
          <option value={IntegrationMethod.WEBVIEW}>WebView (Web App)</option>
          <option value={IntegrationMethod.FLUTTER_PACKAGE}>Flutter Package (SuperApp)</option>
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

      {formData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE && (
        <FlutterPackageIntegrationForm
          formData={formData}
          allErrors={allErrors}
          handleFlutterChange={handleFlutterChange}
          onUpdateFlutterConfig={onUpdateFlutterConfig}
          isEditable={isEditable}
        />
      )}

      {formData.integrationMethod === IntegrationMethod.NATIVE_SDK && (
        <NativeSdkIntegrationForm
          formData={formData}
          allErrors={allErrors}
          handleNativeSdkChange={handleNativeSdkChange}
          onUpdateNativeSdkConfig={onUpdateNativeSdkConfig}
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
      {/* Home widget: owned by the mini-app, one field per integration method */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
        <HomeWidgetField
          method={formData.integrationMethod}
          value={formData.homeWidget}
          onChange={(v) => handleChange({ target: { name: 'homeWidget', value: v } } as any)}
          error={allErrors?.homeWidget}
          isEditable={isEditable}
          detectedClasses={widgetFromGit ? flutterConfig?.gitWidgetCandidates : flutterConfig?.widgetCandidates}
          detectedFrom={widgetFromGit ? 'git' : 'archive'}
          detecting={widgetFromGit && Boolean(flutterConfig?.isScanningGitWidgets)}
        />
      </div>
    </div>
  );
}
