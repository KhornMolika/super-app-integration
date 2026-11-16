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
  highlight: string;
  icon: (props: { className?: string }) => React.JSX.Element;
}

const AUDIENCE_OPTIONS: AudienceOption[] = [
  {
    id: 'PUBLIC',
    title: 'Public (Citizens & Consumers)',
    badge: 'General Access',
    badgeColor: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    description: 'Published to the public SuperApp consumer store. Discoverable by all registered citizens, consumers, and staff.',
    highlight: 'Public Store Catalog',
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'ALL_FSA_STAFF',
    title: 'All FSA Staff (Regulatory & Internal)',
    badge: 'Inter-Agency',
    badgeColor: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
    description: 'Restricted to verified regulatory staff across all authorities and FSA agencies. Completely hidden from public consumers.',
    highlight: 'Inter-Agency Regulators',
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    id: 'ORGANIZATION_ONLY',
    title: 'Organization Only (Private Authority)',
    badge: 'Private Authority',
    badgeColor: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    description: 'Strictly confined to authenticated employees and regulators belonging to the publishing organization.',
    highlight: 'Departmental Isolation',
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
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between">
        <Label htmlFor="target-audience-group" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          Target Audience & Visibility Scope <span className="text-rose-500">*</span>
        </Label>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Controls mobile SuperApp store catalog visibility
        </span>
      </div>

      <div
        id="target-audience-group"
        role="radiogroup"
        aria-label="Target Audience Scope"
        className="grid grid-cols-1 lg:grid-cols-3 gap-3.5"
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
              onClick={() => {
                if (!disabled) onChange(opt.id);
              }}
              className={`group relative text-left p-4 rounded-2xl border transition-all duration-200 focus:outline-none ${
                disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
              } ${
                isSelected
                  ? 'bg-brand-50/50 dark:bg-brand-950/20 border-brand-500 ring-2 ring-brand-500/20 shadow-sm'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
              }`}
            >
              {/* Header with Icon, Badge, and Radio */}
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                    isSelected
                      ? 'bg-brand-500 text-white border-brand-600 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200/70 dark:border-slate-700/60 group-hover:text-slate-900 dark:group-hover:text-white'
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border uppercase ${opt.badgeColor}`}
                  >
                    {opt.badge}
                  </span>

                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'border-brand-500 bg-brand-500'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                    }`}
                  >
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
              </div>

              {/* Title */}
              <h4
                className={`text-sm font-bold tracking-tight mb-1 transition-colors ${
                  isSelected
                    ? 'text-brand-900 dark:text-brand-200'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {opt.title}
              </h4>

              {/* Description */}
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {opt.description}
              </p>

              {/* Feature Highlight Pill */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-brand-500' : 'bg-slate-400'}`} />
                <span>{opt.highlight}</span>
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

export default TargetAudienceSelector;
