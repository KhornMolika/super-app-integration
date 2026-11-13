'use client';

import React from 'react';
import SecurityValidationSelector from './SecurityValidationSelector';
import { AlertTriangleIcon } from '@/components/ui/Icons';
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
    <div className="space-y-4">
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
