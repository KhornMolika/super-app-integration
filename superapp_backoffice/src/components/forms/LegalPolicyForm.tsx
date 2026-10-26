'use client';

import React from 'react';
import { ShieldCheckIcon, AlertTriangleIcon, CheckCircleIcon } from '@/components/ui/Icons';
import LegalPolicyTabField from './LegalPolicyTabField';
import { CreateMiniAppDto } from '@/types/miniapp.types';

export interface LegalPolicyFormProps {
  formData: Partial<CreateMiniAppDto>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  allErrors?: Record<string, string>;
  isEditable?: boolean;
}

export default function LegalPolicyForm({
  formData,
  handleChange,
  allErrors = {},
  isEditable = true,
}: LegalPolicyFormProps) {
  const hasTerms = Boolean(formData.termsUrl?.trim() || formData.termsDescription?.trim());
  const hasPrivacy = Boolean(formData.privacyPolicyUrl?.trim() || formData.privacyPolicyDescription?.trim());

  return (
    <div className="space-y-6">
      {/* Informational Guidance Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-indigo-50/40 to-slate-50 dark:from-sky-950/30 dark:via-indigo-950/20 dark:to-slate-900 border border-sky-100 dark:border-sky-900/40">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0">
            <ShieldCheckIcon className="w-5 h-5" />
          </div>
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1">
            <div className="font-bold text-slate-800 dark:text-slate-100">
              Regulatory Disclosure &amp; Compliance Requirement
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              In accordance with SuperApp governance and FSA guidelines, all published mini applications must provide transparent Terms of Service and Privacy disclosures. You can provide a hosted HTTPS URL or insert bundled legal document markdown text.
            </p>
          </div>
        </div>
      </div>

      {/* Status Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
          hasTerms
            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
        }`}>
          <div className="flex items-center gap-2">
            {hasTerms ? (
              <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600" />
            )}
            <span>Terms of Service</span>
          </div>
          <span className="text-[11px] font-medium">
            {hasTerms ? 'Configured' : 'Optional / Recommended'}
          </span>
        </div>

        <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
          hasPrivacy
            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
        }`}>
          <div className="flex items-center gap-2">
            {hasPrivacy ? (
              <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600" />
            )}
            <span>Privacy Policy</span>
          </div>
          <span className="text-[11px] font-medium">
            {hasPrivacy ? 'Configured' : 'Optional / Recommended'}
          </span>
        </div>
      </div>

      {/* 1. Terms of Service Field */}
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

      {/* 2. Privacy Policy Field */}
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
  );
}
