'use client';

import React, { useState } from 'react';
import { Input, Label } from '@/components/ui/inputs';
import { AlertCircle, CheckCircle2, ExternalLink, Info, Smartphone } from 'lucide-react';
import { AndroidIcon, AppleIcon } from '@/components/ui/Icons';

export interface DeepLinkIntegrationFormProps {
  formData: any;
  allErrors?: Record<string, string>;
  handleDeepLinkChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isEditable?: boolean;
}

type PlatformTab = 'both' | 'android' | 'ios';

export default function DeepLinkIntegrationForm({
  formData,
  allErrors = {},
  handleDeepLinkChange,
  isEditable = true,
}: DeepLinkIntegrationFormProps) {
  const config = formData.integrationConfigDeepLink || {};
  const [platformTab, setPlatformTab] = useState<PlatformTab>('both');

  // Backend validation errors
  const schemeBackendError = allErrors['integrationConfigDeepLink.urlScheme'];
  const packageBackendError = allErrors['integrationConfigDeepLink.packageName'];
  const appStoreBackendError = allErrors['integrationConfigDeepLink.appStoreUrl'];
  const playStoreBackendError = allErrors['integrationConfigDeepLink.playStoreUrl'];

  // Real-time scheme validation
  const scheme = (config.urlScheme || '').trim();
  const schemeFeedback = React.useMemo(() => {
    if (!scheme) {
      return { valid: false, error: 'URL scheme is required.' };
    }
    const cleanScheme = scheme.split(':')[0].toLowerCase();
    const reserved = ['http', 'https', 'file', 'javascript', 'data', 'about', 'vbscript', 'intent'];
    if (reserved.includes(cleanScheme)) {
      return {
        valid: false,
        error: `Scheme "${cleanScheme}" is a reserved protocol. Custom schemes must use a private protocol (e.g. myapp://).`,
      };
    }
    if (!/^[a-z][a-z0-9+.-]*$/i.test(cleanScheme)) {
      return {
        valid: false,
        error: `Scheme "${cleanScheme}" violates RFC 3986 (must start with a letter and contain only letters, numbers, +, -, .).`,
      };
    }
    if (!scheme.includes('://')) {
      return {
        valid: false,
        error: 'Scheme must include "://" (e.g. myapp://open or myapp://).',
      };
    }
    return { valid: true, error: null };
  }, [scheme]);

  // Real-time Play Store validation
  const playStoreUrl = (config.playStoreUrl || '').trim();
  const playStoreFeedback = React.useMemo(() => {
    if (!playStoreUrl) return { valid: true, error: null };
    if (!playStoreUrl.startsWith('https://')) {
      return { valid: false, error: 'Store link must enforce secure HTTPS transport (https://).' };
    }
    return { valid: true, error: null };
  }, [playStoreUrl]);

  // Real-time App Store validation
  const appStoreUrl = (config.appStoreUrl || '').trim();
  const appStoreFeedback = React.useMemo(() => {
    if (!appStoreUrl) return { valid: true, error: null };
    if (!appStoreUrl.startsWith('https://')) {
      return { valid: false, error: 'Store link must enforce secure HTTPS transport (https://).' };
    }
    return { valid: true, error: null };
  }, [appStoreUrl]);

  const effectiveSchemeError = schemeBackendError || (scheme ? schemeFeedback.error : null);
  const effectivePlayStoreError = playStoreBackendError || playStoreFeedback.error;
  const effectiveAppStoreError = appStoreBackendError || appStoreFeedback.error;

  return (
    <div className="space-y-6">
      {/* Informational Banner */}
      <div className="p-4 rounded-xl border border-sky-100 bg-sky-50/60 dark:border-sky-900/50 dark:bg-sky-950/20 flex items-start gap-3">
        <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <div className="text-xs text-sky-900 dark:text-sky-200 space-y-1">
          <p className="font-semibold">Deep Link Mini App Integration</p>
          <p className="text-slate-600 dark:text-slate-300">
            Deep link apps invoke an external native application directly from the Super App via a custom URI scheme.
            Fallback store links allow users who have not installed the app to download it from Google Play or the Apple App Store.
          </p>
        </div>
      </div>

      {/* 1. Core Scheme Field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="dl-scheme" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Link that opens your app <span className="text-rose-500">*</span>
          </Label>
          {scheme && schemeFeedback.valid && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Valid scheme
            </span>
          )}
        </div>
        <Input
          id="dl-scheme"
          name="urlScheme"
          disabled={!isEditable}
          value={config.urlScheme || ''}
          onChange={handleDeepLinkChange}
          placeholder="myapp://open or cambodia-tax://open"
          className={
            effectiveSchemeError
              ? 'border-rose-500 ring-1 ring-rose-500'
              : scheme && schemeFeedback.valid
              ? 'border-emerald-500'
              : ''
          }
        />
        {effectiveSchemeError ? (
          <p className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 mt-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {effectiveSchemeError}
          </p>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            RFC 3986 custom URI scheme format (e.g. <code className="text-slate-700 dark:text-slate-200 font-mono">myapp://open</code>).
            Reserved system schemes (<code className="font-mono">http</code>, <code className="font-mono">https</code>, <code className="font-mono">file</code>) are not allowed.
          </p>
        )}
      </div>

      {/* 2. Platform Selection Tabs */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-slate-500" />
              Platform Store Fallbacks
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure where to redirect users if your external app is not yet installed.
            </p>
          </div>
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800 text-xs font-medium self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setPlatformTab('both')}
              className={`px-3 py-1 rounded-md transition-colors ${
                platformTab === 'both'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Both Platforms
            </button>
            <button
              type="button"
              onClick={() => setPlatformTab('android')}
              className={`px-3 py-1 rounded-md transition-colors inline-flex items-center gap-1.5 ${
                platformTab === 'android'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <AndroidIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Android Only</span>
            </button>
            <button
              type="button"
              onClick={() => setPlatformTab('ios')}
              className={`px-3 py-1 rounded-md transition-colors inline-flex items-center gap-1.5 ${
                platformTab === 'ios'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <AppleIcon className="w-3.5 h-3.5" />
              <span>iOS Only</span>
            </button>
          </div>
        </div>

        {/* Platform Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Android Section */}
          {(platformTab === 'both' || platformTab === 'android') && (
            <div className={`p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4 ${platformTab === 'android' ? 'md:col-span-2' : ''}`}>
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <AndroidIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Android Configuration
                </span>
              </div>

              <div>
                <Label htmlFor="dl-package" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Android Package Name <span className="text-xs font-normal text-slate-400">Optional</span>
                </Label>
                <Input
                  id="dl-package"
                  name="packageName"
                  disabled={!isEditable}
                  value={config.packageName || ''}
                  onChange={handleDeepLinkChange}
                  placeholder="com.example.myapp"
                  className={packageBackendError ? 'border-rose-500 ring-1 ring-rose-500' : ''}
                />
                {packageBackendError ? (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{packageBackendError}</p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Used on Android to check if the app is installed.</p>
                )}
              </div>

              <div>
                <Label htmlFor="dl-playstore" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Google Play Store Link <span className="text-xs font-normal text-slate-400">Optional</span>
                </Label>
                <Input
                  id="dl-playstore"
                  name="playStoreUrl"
                  disabled={!isEditable}
                  value={config.playStoreUrl || ''}
                  onChange={handleDeepLinkChange}
                  type="url"
                  placeholder="https://play.google.com/store/apps/details?id=com.example.myapp"
                  className={effectivePlayStoreError ? 'border-rose-500 ring-1 ring-rose-500' : ''}
                />
                {effectivePlayStoreError ? (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {effectivePlayStoreError}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Opens Google Play Store when not installed.</p>
                )}
              </div>
            </div>
          )}

          {/* iOS Section */}
          {(platformTab === 'both' || platformTab === 'ios') && (
            <div className={`p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4 ${platformTab === 'ios' ? 'md:col-span-2' : ''}`}>
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0">
                  <AppleIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  iOS Configuration
                </span>
              </div>

              <div>
                <Label htmlFor="dl-appstore" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Apple App Store Link <span className="text-xs font-normal text-slate-400">Optional</span>
                </Label>
                <Input
                  id="dl-appstore"
                  name="appStoreUrl"
                  disabled={!isEditable}
                  value={config.appStoreUrl || ''}
                  onChange={handleDeepLinkChange}
                  type="url"
                  placeholder="https://apps.apple.com/app/id123456789"
                  className={effectiveAppStoreError ? 'border-rose-500 ring-1 ring-rose-500' : ''}
                />
                {effectiveAppStoreError ? (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {effectiveAppStoreError}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Opens Apple App Store when not installed on iOS.</p>
                )}
              </div>

              {/* Backward compatibility notice if older record stored Google Play link in appStoreUrl */}
              {config.appStoreUrl && config.appStoreUrl.includes('play.google.com') && (
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <span>
                    This link points to Google Play. For optimal iOS redirection, use an <code className="font-mono">apps.apple.com</code> link here and place the Play Store link under Android.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
