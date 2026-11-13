'use client';

import React from 'react';
import { GlobeIcon, PackageIcon, CodeIcon, ExternalLinkIcon } from '@/components/ui/Icons';
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


const METHOD_OPTIONS = [
  { value: IntegrationMethod.WEBVIEW, title: 'WebView', hint: 'A web app you host. Opens inside the Super App.', Icon: GlobeIcon },
  { value: IntegrationMethod.FLUTTER_PACKAGE, title: 'Flutter package', hint: 'Dart code built into the Super App.', Icon: PackageIcon },
  { value: IntegrationMethod.NATIVE_SDK, title: 'Native SDK', hint: 'An Android or iOS library.', Icon: CodeIcon },
  { value: IntegrationMethod.DEEP_LINK, title: 'Deep link', hint: 'Opens your own installed app.', Icon: ExternalLinkIcon },
];

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
      <fieldset>
        <legend className="block text-[15px] font-semibold text-slate-800 dark:text-slate-200 mb-2">How it runs</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup">
          {METHOD_OPTIONS.map(({ value, title, hint, Icon }) => {
            const selected = formData.integrationMethod === value;
            return (
              <label
                key={value}
                className={`relative flex items-start gap-3 rounded-2xl border p-4 transition-colors ${
                  selected
                    ? 'border-brand-500 bg-brand-500/5 ring-1 ring-brand-500'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                } ${isEditable ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
              >
                <input
                  type="radio"
                  name="integrationMethod"
                  value={value}
                  checked={selected}
                  disabled={!isEditable}
                  onChange={(e) => {
                    handleChange(e);
                    // Each method has its own widget field: keep the box ticked, clear the value.
                    if (formData.homeWidget != null) {
                      handleChange({ target: { name: 'homeWidget', value: {} } } as any);
                    }
                  }}
                  className="sr-only"
                />
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    selected
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

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
