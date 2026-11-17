'use client';

import React from 'react';
import { Label } from '@/components/ui/inputs';

export type TargetAudienceType = 'PUBLIC' | 'ALL_FSA_STAFF' | 'ORGANIZATION_ONLY';

export interface TargetAudienceSelectorProps {
  value?: string | null;
  onChange: (value: TargetAudienceType) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
}

interface AudienceOption {
  id: TargetAudienceType;
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  icon: (props: { className?: string }) => React.JSX.Element;
}

const AUDIENCE_OPTIONS: AudienceOption[] = [
  {
    id: 'PUBLIC',
    title: 'Public',
    badge: 'Citizens & Consumers',
    badgeColor: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/60',
    description: 'Available to all citizens and consumers on the SuperApp store.',
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'ALL_FSA_STAFF',
    title: 'All FSA Staff',
    badge: 'Regulators & Staff',
    badgeColor: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200/80 dark:border-indigo-800/60',
    description: 'Restricted to verified regulatory staff across all FSA authorities.',
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    id: 'ORGANIZATION_ONLY',
    title: 'Organization Only',
    badge: 'Private Authority',
    badgeColor: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/60',
    description: 'Strictly confined to authenticated employees in your organization.',
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
];

export function TargetAudienceSelector({
  value,
  onChange,
  disabled = false,
  error,
  className = '',
}: TargetAudienceSelectorProps) {
  const selectedAudience: TargetAudienceType =
    (value as TargetAudienceType) || 'PUBLIC';

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <Label htmlFor="target-audience-group" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          Target Audience & Visibility Scope <span className="text-rose-500">*</span>
        </Label>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Controls mobile store catalog visibility
        </span>
      </div>

      <div
        id="target-audience-group"
        role="radiogroup"
        aria-label="Target Audience Scope"
        className="grid grid-cols-1 md:grid-cols-3 gap-3"
      >
        {AUDIENCE_OPTIONS.map((opt) => {
          const isSelected = selectedAudience === opt.id;
          const IconComponent = opt.icon;

          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              title={disabled ? 'Click Edit MiniApp above to change visibility scope' : undefined}
              onClick={() => {
                if (!disabled) onChange(opt.id);
              }}
              className={`group relative text-left p-3.5 rounded-xl border transition-all duration-150 focus:outline-none ${
                disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
              } ${
                isSelected
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500 ring-1 ring-emerald-500/25 shadow-2xs'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
              }`}
            >
              {/* Header with Icon, Badge, and Radio */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200/80 dark:border-slate-700/60 group-hover:text-slate-800 dark:group-hover:text-white'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${opt.badgeColor}`}
                  >
                    {opt.badge}
                  </span>

                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-600'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                    }`}
                  >
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
              </div>

              {/* Title */}
              <h4
                className={`text-xs font-bold tracking-tight mb-1 transition-colors ${
                  isSelected
                    ? 'text-emerald-950 dark:text-emerald-300 font-bold'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {opt.title}
              </h4>

              {/* Description */}
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                {opt.description}
              </p>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

export default TargetAudienceSelector;
