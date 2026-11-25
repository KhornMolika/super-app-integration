'use client';

import React from 'react';

interface SettingsPageHeaderProps {
  section: string;
  title: string;
  description: string;
  badge?: {
    label: string;
    tone?: 'emerald' | 'amber' | 'slate';
    pulse?: boolean;
  };
  rightSlot?: React.ReactNode;
}

const TONE_CLASSES: Record<'emerald' | 'amber' | 'slate', string> = {
  emerald:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80',
  amber:
    'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80',
  slate:
    'bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80',
};

const DOT_CLASSES: Record<'emerald' | 'amber' | 'slate', string> = {
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  slate: 'bg-slate-400',
};

export function SettingsPageHeader({
  section,
  title,
  description,
  badge,
  rightSlot,
}: SettingsPageHeaderProps) {
  const tone = badge?.tone || 'emerald';

  return (
    <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 pb-5 border-b border-slate-200/70 dark:border-slate-800/80">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2 text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest">
          <span>Settings</span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span>{section}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {title}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl leading-relaxed">
          {description}
        </p>
      </div>

      {(badge || rightSlot) && (
        <div className="flex items-center gap-2.5 shrink-0">
          {rightSlot}
          {badge && (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-xs ${TONE_CLASSES[tone]}`}
            >
              <span className="relative flex h-2 w-2">
                {badge.pulse && (
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${DOT_CLASSES[tone]}`}
                  />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${DOT_CLASSES[tone]}`}
                />
              </span>
              <span>{badge.label}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
