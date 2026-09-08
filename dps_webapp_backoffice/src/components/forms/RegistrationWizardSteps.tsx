'use client';

import React from 'react';

export interface RegistrationWizardStepsProps {
  currentStep: number;
}

const STEP_LABELS = ['Basic Info', 'Team', 'Integration', 'Permissions', 'Review'];

export default function RegistrationWizardSteps({ currentStep }: RegistrationWizardStepsProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className="flex flex-col items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                currentStep === s
                  ? 'bg-brand-600 text-white shadow-sm'
                  : currentStep > s
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                  : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {currentStep > s ? '✓' : s}
            </div>
            <span className="text-xs mt-2 text-slate-500 hidden sm:block font-medium">
              {STEP_LABELS[s - 1]}
            </span>
          </div>
        ))}
      </div>
      <div className="h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-600 transition-all duration-300 ease-out"
          style={{ width: `${(currentStep / 5) * 100}%` }}
        />
      </div>
    </div>
  );
}
