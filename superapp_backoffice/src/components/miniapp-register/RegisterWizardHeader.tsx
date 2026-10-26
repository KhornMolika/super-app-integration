'use client';

import React from 'react';
import Link from 'next/link';
import { RegisterWizardHeaderProps } from './types';

export function RegisterWizardHeader({
  step,
  stepTitle,
  stepDescription,
  miniAppName,
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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all">
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

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            Progress:{' '}
            <strong className="text-slate-700 dark:text-slate-300 font-mono">
              {Math.round((step / 6) * 100)}%
            </strong>
          </span>
        </div>
      </div>
    </>
  );
}
