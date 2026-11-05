'use client';

import React, { useEffect, useRef } from 'react';
import { Input, Label } from '@/components/ui/inputs';
import { HOME_WIDGET_FIELD, IntegrationMethod } from '@/types/miniapp.types';
import type { HomeWidget } from '@/types/miniapp.types';

export interface HomeWidgetFieldProps {
  method: IntegrationMethod | string | undefined;
  value: HomeWidget | null | undefined;
  onChange: (value: HomeWidget | null) => void;
  error?: string;
  isEditable: boolean;
  /** Widget classes found in the Flutter package (FLUTTER_PACKAGE only). */
  detectedClasses?: string[];
  /** Where [detectedClasses] were found: the uploaded archive or the Git repo. */
  detectedFrom?: 'archive' | 'git';
  /** The package is still being searched for widget classes. */
  detecting?: boolean;
}

/** The class to fill in: one named like a Home widget, else the first found. */
function preferredWidgetClass(candidates: string[]): string {
  return (
    candidates.find((c) => c.endsWith('HomeWidget')) ??
    candidates.find((c) => c.endsWith('Widget')) ??
    candidates[0]
  );
}

/**
 * "Has Home widget" checkbox plus the one field that applies to the selected
 * integration method. Checked <=> value != null. For a Flutter package the
 * widget class is filled in from the classes found in the package (archive or
 * Git repo, whichever the app uses); a class the user typed is never replaced.
 */
export default function HomeWidgetField({
  method,
  value,
  onChange,
  error,
  isEditable,
  detectedClasses,
  detectedFrom = 'archive',
  detecting = false,
}: HomeWidgetFieldProps) {
  const field = method ? HOME_WIDGET_FIELD[method as IntegrationMethod] : undefined;
  const isChecked = value != null;
  const showField = isChecked && !!field;
  const isFlutter = method === IntegrationMethod.FLUTTER_PACKAGE;
  const showDetected = isFlutter && !!detectedClasses && detectedClasses.length > 0;
  const foundIn = detectedFrom === 'git' ? 'your repository' : 'your uploaded package';

  // The last class filled in or picked from the list: only that one may be
  // replaced when the package changes.
  const autoFilled = useRef<string | null>(null);
  // The list the field was last filled from: filled once per list and per
  // tick of the box, so a field the user empties stays empty.
  const filledFrom = useRef<string | null>(null);
  const widgetClass = value?.widgetClass?.trim() ?? '';
  useEffect(() => {
    if (!isChecked || !isFlutter) {
      filledFrom.current = null;
      return;
    }
    if (!isEditable || !detectedClasses?.length) return;
    const list = detectedClasses.join(',');
    if (filledFrom.current === list) return;
    filledFrom.current = list;
    if (widgetClass && widgetClass !== autoFilled.current) return; // the user's own
    if (detectedClasses.includes(widgetClass)) return;
    const pick = preferredWidgetClass(detectedClasses);
    autoFilled.current = pick;
    onChange({ widgetClass: pick });
  }, [isChecked, isEditable, isFlutter, widgetClass, detectedClasses, onChange]);

  return (
    <div>
      <label
        className={`flex items-center gap-3 text-[15px] font-semibold text-slate-800 dark:text-slate-200 ${
          !isEditable || !field ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => onChange(e.target.checked ? {} : null)}
          disabled={!isEditable || !field}
          className="w-4 h-4 text-brand-600 rounded border-slate-300 dark:border-slate-600 focus:ring-brand-500 cursor-pointer"
        />
        <span>Has Home widget</span>
      </label>
      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5">
        A compact card your app shows when users drop it into the super app&apos;s Home widget slot. On a live app, a change goes through review.
      </p>

      {showField && field && (
        <div className="mt-4">
          <Label htmlFor="homeWidgetField">{field.label}</Label>
          <Input
            id="homeWidgetField"
            name={field.key}
            disabled={!isEditable}
            value={value?.[field.key] ?? ''}
            onChange={(e) => onChange({ [field.key]: e.target.value })}
            placeholder={field.placeholder}
            className={error ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}
          />
          {error && <p className="mt-1.5 text-sm text-rose-600 font-medium">{error}</p>}
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{field.help}</p>
          {isFlutter && detecting && (
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Looking for widget classes in {foundIn}…</p>
          )}
          {showDetected && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span>Found in {foundIn}:</span>
              {detectedClasses!.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={!isEditable}
                  aria-pressed={c === widgetClass}
                  onClick={() => {
                    // A pick from the list, like a filled-in class, follows the package.
                    autoFilled.current = c;
                    onChange({ widgetClass: c });
                  }}
                  className={`rounded-md border px-2 py-0.5 font-mono text-xs transition-colors disabled:cursor-not-allowed ${
                    c === widgetClass
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                      : 'border-slate-300 text-slate-700 hover:border-brand-400 dark:border-slate-600 dark:text-slate-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          {method !== IntegrationMethod.FLUTTER_PACKAGE && (
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Saved now; the super app will show this widget in a future release.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
