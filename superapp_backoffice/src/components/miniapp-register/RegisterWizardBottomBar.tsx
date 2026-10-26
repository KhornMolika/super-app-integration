'use client';

import React from 'react';
import { Button } from '@/components/ui/inputs';
import { RegisterWizardBottomBarProps } from './types';

export function RegisterWizardBottomBar({
  step,
  isSubmitting,
  isCurrentStepComplete = true,
  onPrevStep,
  onNextStep,
}: RegisterWizardBottomBarProps) {
  return (
    <div className="sticky bottom-6 z-30 mt-8 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-200">
      {/* Previous Step */}
      <Button
        type="button"
        variant="outline"
        className="h-10 px-5 text-sm font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={onPrevStep}
        disabled={step === 1 || isSubmitting}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        <span>Previous Step</span>
      </Button>

      {/* Next Step / Submit */}
      <div>
        {step < 6 ? (
          <Button
            type="button"
            className="h-10 px-6 text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            onClick={onNextStep}
            disabled={!isCurrentStepComplete || isSubmitting}
            title={!isCurrentStepComplete ? 'Please complete all required fields to advance' : undefined}
          >
            <span>{isSubmitting ? 'Validating...' : 'Next Step'}</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Button>
        ) : (
          <Button
            type="submit"
            className="h-10 px-6 text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            disabled={!isCurrentStepComplete || isSubmitting}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>{isSubmitting ? 'Submitting...' : 'Register MiniApp'}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
