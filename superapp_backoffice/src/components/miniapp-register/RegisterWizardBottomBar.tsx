'use client';

import React from 'react';
import { RegisterWizardBottomBarProps } from './types';
import { STEP_TITLES } from './constants';
import { joinMissing } from './utils/stepValidation.utils';

/**
 * Back / Continue, pinned to the bottom. When Continue is blocked it says what
 * is missing instead of only greying out.
 */
export function RegisterWizardBottomBar({
  step,
  isSubmitting,
  isCurrentStepComplete = true,
  missing = [],
  onPrevStep,
  onNextStep,
}: RegisterWizardBottomBarProps) {
  const last = step >= STEP_TITLES.length;
  const blocked = !isCurrentStepComplete;
  const hint = blocked && missing.length > 0 ? `Add ${joinMissing(missing)} to continue.` : '';

  return (
    <div className="sticky bottom-3 sm:bottom-4 z-30 mt-6 px-4 py-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200/80 dark:border-slate-800 shadow-lg">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="text-xs text-slate-500 dark:text-slate-400 min-h-[1rem] sm:order-none order-first" aria-live="polite">
          {hint}
        </p>

        <div className="flex items-center gap-2 sm:shrink-0">
          <button
            type="button"
            onClick={onPrevStep}
            disabled={step === 1 || isSubmitting}
            className="h-10 px-4 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Back
          </button>

          {last ? (
            <button
              type="submit"
              disabled={blocked || isSubmitting}
              className="flex-1 sm:flex-none h-10 px-5 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit for review'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onNextStep}
              disabled={blocked || isSubmitting}
              className="flex-1 sm:flex-none h-10 px-5 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white inline-flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Checking...' : 'Continue'}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
