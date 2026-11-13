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
  const config = formData.integrationConfigDeepLink || {};
  const schemeError = allErrors['integrationConfigDeepLink.urlScheme'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
      <div className="md:col-span-2">
        <Label htmlFor="dl-scheme">
          Link that opens your app <span className="text-rose-500">*</span>
        </Label>
        <Input
          id="dl-scheme"
          name="urlScheme"
          disabled={!isEditable}
          value={config.urlScheme || ''}
          onChange={handleDeepLinkChange}
          placeholder="myapp://open or https://app.example.com/open"
          className={schemeError ? 'border-rose-500 ring-1 ring-rose-500' : ''}
        />
        {schemeError ? (
          <p className="mt-1.5 text-sm text-rose-600 dark:text-rose-400">{schemeError}</p>
        ) : (
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">A URL scheme or an app link.</p>
        )}
      </div>

      <div>
        <Label htmlFor="dl-package">
          Package or bundle ID <span className="text-xs font-normal text-slate-400">Optional</span>
        </Label>
        <Input
          id="dl-package"
          name="packageName"
          disabled={!isEditable}
          value={config.packageName || ''}
          onChange={handleDeepLinkChange}
          placeholder="com.example.myapp"
        />
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Used to check if the app is installed.</p>
      </div>

      <div>
        <Label htmlFor="dl-store">
          Store link <span className="text-xs font-normal text-slate-400">Optional</span>
        </Label>
        <Input
          id="dl-store"
          name="appStoreUrl"
          disabled={!isEditable}
          value={config.appStoreUrl || ''}
          onChange={handleDeepLinkChange}
          type="url"
          placeholder="https://play.google.com/store/apps/details?id=..."
        />
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Opens when the app isn&apos;t installed.</p>
      </div>
    </div>
  );
}
