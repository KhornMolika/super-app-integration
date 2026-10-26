'use client';

import React from 'react';
import { Label, Select } from '@/components/ui/inputs';
import { ZapIcon } from '@/components/ui/Icons';
import { IntegrationMethod } from '@/types/miniapp.types';
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
  // Wizard Auto-Detection Bridge: Determine active package-derived app_id and origin
  let resolvedAppId = formData.appId || '';
  let detectionSourceText = 'Awaiting package info';
  let isAutoDetected = false;

  if (formData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE) {
    const pkg = formData.integrationConfigFlutter?.packageName?.trim();
    if (pkg) {
      resolvedAppId = pkg;
      detectionSourceText = `Auto-Synced: Flutter pubspec.yaml (${pkg})`;
      isAutoDetected = true;
    } else {
      detectionSourceText = 'Waiting for Flutter package name or archive upload';
    }
  } else if (formData.integrationMethod === IntegrationMethod.NATIVE_SDK) {
    const androidPkg = formData.integrationConfigNativeSdk?.androidPackageName?.trim();
    const iosMod = formData.integrationConfigNativeSdk?.iosModuleName?.trim();
    if (androidPkg) {
      resolvedAppId = androidPkg;
      detectionSourceText = `Auto-Synced: Android applicationId (${androidPkg})`;
      isAutoDetected = true;
    } else if (iosMod) {
      resolvedAppId = iosMod;
      detectionSourceText = `Auto-Synced: iOS Module (${iosMod})`;
      isAutoDetected = true;
    } else {
      detectionSourceText = 'Waiting for Android or iOS package identifier';
    }
  } else if (formData.integrationMethod === IntegrationMethod.DEEP_LINK) {
    const deepPkg = formData.integrationConfigDeepLink?.packageName?.trim();
    const scheme = formData.integrationConfigDeepLink?.urlScheme?.trim();
    if (deepPkg) {
      resolvedAppId = deepPkg;
      detectionSourceText = `Auto-Synced: OS Package (${deepPkg})`;
      isAutoDetected = true;
    } else if (scheme) {
      resolvedAppId = `com.fsa.${scheme.replace(/[^a-zA-Z0-9]/g, '_')}`;
      detectionSourceText = `Auto-Derived: URL Scheme (${scheme})`;
      isAutoDetected = true;
    } else {
      detectionSourceText = 'Waiting for external package ID or scheme';
    }
  } else if (formData.integrationMethod === IntegrationMethod.WEBVIEW) {
    const slug = formData.slug || generateClientSlug(formData.name || 'miniapp');
    resolvedAppId = formData.appId || `com.fsa.${slug.replace(/-/g, '_')}`;
    detectionSourceText = `Enterprise Reverse DNS (${resolvedAppId})`;
    isAutoDetected = true;
  }

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
          <option value={IntegrationMethod.FLUTTER_PACKAGE}>Flutter Package (SuperApp)</option>
          <option value={IntegrationMethod.NATIVE_SDK}>Native SDK (iOS / Android Framework)</option>
          <option value={IntegrationMethod.DEEP_LINK}>Deep Link (External App / App Links)</option>
        </Select>
      </div>

      {/* Wizard Auto-Detection Bridge Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-brand-500/10 via-sky-500/5 to-indigo-500/10 border border-brand-500/20 dark:border-brand-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-brand-600 dark:bg-brand-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-brand-500/20">
              <ZapIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Binary MiniApp ID (<code className="lowercase font-mono font-bold">app_id</code>)
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-3xs font-semibold ${isAutoDetected
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25'
                    }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isAutoDetected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                      }`}
                  />
                  {detectionSourceText}
                </span>
              </div>
              <div className="font-mono text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                <code className="bg-white/80 dark:bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
                  {resolvedAppId || 'Awaiting Package Identifier...'}
                </code>
              </div>
            </div>
          </div>
          <div className="text-2xs text-slate-500 dark:text-slate-400 sm:text-right max-w-xs font-medium">
            Auto-detected directly from your code package to eliminate package naming conflicts with Flutter / Android.
          </div>
        </div>
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
    </div>
  );
}
