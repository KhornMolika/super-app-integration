'use client';

import React from 'react';
import { Input, Label } from '@/components/ui/inputs';

export interface DeepLinkIntegrationFormProps {
  formData: any;
  allErrors?: Record<string, string>;
  handleDeepLinkChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isEditable?: boolean;
}

export default function DeepLinkIntegrationForm({
  formData,
  allErrors = {},
  handleDeepLinkChange,
  isEditable = true,
}: DeepLinkIntegrationFormProps) {
  const deepLinkConfig = formData.integrationConfigDeepLink || {};

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
      <div className="col-span-1 md:col-span-2">
        <div className="flex items-center justify-between mb-1">
          <Label>
            URL Scheme / Deep Link URI <span className="text-rose-500">*</span>
          </Label>
          <span className="text-xs text-slate-400 font-mono">e.g. trustregulator:// or myapp://open</span>
        </div>
        <Input
          name="urlScheme"
          disabled={!isEditable}
          value={deepLinkConfig?.urlScheme || ''}
          onChange={handleDeepLinkChange}
          placeholder="trustregulator://open"
          className={
            allErrors['integrationConfigDeepLink.urlScheme']
              ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50'
              : ''
          }
        />
        {allErrors['integrationConfigDeepLink.urlScheme'] && (
          <p className="mt-1.5 text-xs text-rose-600 font-medium">
            {allErrors['integrationConfigDeepLink.urlScheme']}
          </p>
        )}
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          The custom URI scheme or universal app link invoked by the Super App to launch this Mini App externally.
        </p>
      </div>

      <div>
        <Label>Package Name / Bundle ID (Optional)</Label>
        <Input
          name="packageName"
          disabled={!isEditable}
          value={deepLinkConfig?.packageName || ''}
          onChange={handleDeepLinkChange}
          placeholder="com.fsa.trustregulator"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Android package name or iOS bundle ID for native app installation checks.
        </p>
      </div>

      <div>
        <Label>App Store / Play Store Fallback URL (Optional)</Label>
        <Input
          name="appStoreUrl"
          disabled={!isEditable}
          value={deepLinkConfig?.appStoreUrl || ''}
          onChange={handleDeepLinkChange}
          type="url"
          placeholder="https://play.google.com/store/apps/details?id=..."
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Web store redirect URL if the target app is not installed on the user&apos;s device.
        </p>
      </div>
    </div>
  );
}
