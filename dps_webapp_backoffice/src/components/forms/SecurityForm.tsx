'use client';

import React from 'react';
import SecurityValidationSelector from './SecurityValidationSelector';
import { ShieldCheckIcon, AlertTriangleIcon } from '@/components/ui/Icons';
import { CreateMiniAppDto } from '@/types/miniapp.types';

export interface SecurityFormProps {
  formData: Partial<CreateMiniAppDto>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<CreateMiniAppDto>>>;
  allErrors?: Record<string, string>;
}

export default function SecurityForm({
  formData,
  setFormData,
  allErrors = {},
}: SecurityFormProps) {
  const method = formData.integrationMethod || 'WEBVIEW';
  const securityError = allErrors.securityChecks;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Informative Intro Banner */}
      <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 flex items-start gap-3.5 shadow-xs">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
          <ShieldCheckIcon className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-base font-bold text-indigo-950 dark:text-indigo-200">
            Automated CI/CD Security & Compliance Gates
          </h4>
          <p className="text-sm text-indigo-800/90 dark:text-indigo-300/90 mt-0.5 leading-relaxed">
            Select the active security audit profiles to be executed against this Mini App during automated verification.
            Recommended baseline profiles are pre-selected according to your chosen integration architecture.
          </p>
        </div>
      </div>

      {securityError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2 font-semibold">
          <AlertTriangleIcon className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{securityError}</span>
        </div>
      )}

      {/* Security Validation Selector */}
      <SecurityValidationSelector
        integrationMethod={method}
        selectedChecks={formData.securityChecks || []}
        onChange={(checks) => {
          setFormData((prev) => ({ ...prev, securityChecks: checks }));
        }}
      />
    </div>
  );
}
