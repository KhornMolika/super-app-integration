'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/inputs';
import { RegisterWizardHeaderProps } from './types';

export function RegisterWizardHeader({
  step,
  stepTitle,
  stepDescription,
  miniAppName,
  isSubmitting = false,
  onCancel,
  onSaveDraft,
}: RegisterWizardHeaderProps) {
  return (
    <>
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 px-1">
        <Link
          href="/miniapps"
          className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
        >
          MiniApps
        </Link>
        <span>/</span>
        <span className="text-slate-700 dark:text-slate-300 font-semibold">Register MiniApp</span>
        <span>/</span>
        <span className="text-brand-600 dark:text-brand-400 font-bold">
          Step {step} of 6: {stepTitle}
        </span>
      </div>

      {/* Header Card */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all">
        <div className="flex items-center space-x-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {miniAppName || 'Register MiniApp'}
              </h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200 dark:bg-brand-950/40 dark:text-brand-300 dark:border-brand-800">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                <span>Step {step} of 6</span>
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs sm:text-sm">
              {stepDescription}
            </p>
          </div>
        </div>

        {/* Header Action Buttons & Progress */}
        <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium hidden lg:inline-block mr-1">
            Progress:{' '}
            <strong className="text-slate-700 dark:text-slate-300 font-mono">
              {Math.round((step / 6) * 100)}%
            </strong>
          </span>

          <Button
            type="button"
            variant="outline"
            className="h-9 px-4 text-xs sm:text-sm font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-9 px-4 text-xs sm:text-sm font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 text-slate-700 dark:text-slate-300 disabled:opacity-50"
            onClick={onSaveDraft}
            disabled={isSubmitting}
          >
            <svg
              className="w-4 h-4 text-slate-500 dark:text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            <span>Save as Draft</span>
          </Button>
        </div>
      </div>
    </>
  );
}
