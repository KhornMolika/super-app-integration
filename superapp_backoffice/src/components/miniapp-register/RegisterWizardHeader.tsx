'use client';

import React from 'react';
import Link from 'next/link';
import { RegisterWizardHeaderProps } from './types';
import { STEP_TITLES } from './constants';

/**
 * One header for the register wizard: where you are, a slim progress bar and
 * the two page actions. Neutral surfaces; the brand colour marks progress only.
 */
export function RegisterWizardHeader({
  step,
  stepTitle,
  stepDescription,
  miniAppName,
  isSubmitting = false,
  onCancel,
  onSaveDraft,
}: RegisterWizardHeaderProps) {
  const total = STEP_TITLES.length;

  return (
    <header className="mb-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/miniapps"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Mini apps
          </Link>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
            {miniAppName?.trim() || 'Register a mini app'}
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-9 px-3.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSubmitting}
            className="h-9 px-3.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            Save draft
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Step {step} of {total} ·{' '}
            </span>
            {stepTitle}
          </p>
        </div>
        <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }} aria-hidden="true">
          {STEP_TITLES.map((t, i) => (
            <span
              key={t}
              className={`h-1 rounded-full transition-colors ${
                i < step ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-800'
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{stepDescription}</p>
      </div>
    </header>
  );
}
