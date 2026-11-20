'use client';

import React from 'react';
import { Button } from '@/components/ui/inputs';
import type { MiniAppTabType } from '@/components/miniapp-detail/MiniAppDetailTabs';

interface MiniAppDetailBottomBarProps {
  isEditingUnlocked: boolean;
  canEdit?: boolean;
  activeTab: MiniAppTabType;
  isSubmitting: boolean;
  onCancelEdit?: () => void;
  onSaveDraft: (e: React.FormEvent) => void;
  onSaveAndSubmit: (e: React.FormEvent) => void;
}

export function MiniAppDetailBottomBar({
  isEditingUnlocked,
  canEdit = true,
  activeTab,
  isSubmitting,
  onCancelEdit,
  onSaveDraft,
  onSaveAndSubmit,
}: MiniAppDetailBottomBarProps) {
  if (!canEdit || activeTab === 'activity' || activeTab === 'versions') {
    return null;
  }

  const isActionDisabled = !isEditingUnlocked || isSubmitting;

  return (
    <div className="sticky bottom-4 sm:bottom-6 z-30 mt-8 p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] animate-in slide-in-from-bottom-2 duration-200">
      {isEditingUnlocked ? (
        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="leading-tight">Editing configuration unlocked — save changes when you are done</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <svg className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="leading-tight">
            Configuration is locked. Click <span className="font-semibold text-slate-700 dark:text-slate-300">... &gt; Edit Configuration</span> to make changes.
          </span>
        </div>
      )}

      <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2 w-full sm:w-auto">
        {isEditingUnlocked && onCancelEdit && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancelEdit}
            disabled={isSubmitting}
            className="h-9 sm:h-10 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors flex-1 sm:flex-none justify-center"
          >
            Cancel
          </Button>
        )}
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isActionDisabled}
          className={`h-9 sm:h-10 px-4 sm:px-5 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 border transition-all flex-1 sm:flex-none ${
            isActionDisabled
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700/60 cursor-not-allowed shadow-none'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs cursor-pointer'
          }`}
        >
          <svg
            className={`w-4 h-4 transition-colors shrink-0 ${
              isActionDisabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 dark:text-slate-400'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <span className="whitespace-nowrap">Save Draft</span>
        </button>
        <button
          type="button"
          onClick={onSaveAndSubmit}
          disabled={isActionDisabled}
          className={`h-9 sm:h-10 px-4 sm:px-5 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 border transition-all flex-1 sm:flex-none ${
            isActionDisabled
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700/60 cursor-not-allowed shadow-none'
              : 'bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white border-transparent shadow-md shadow-brand-500/20 cursor-pointer'
          }`}
        >
          <svg
            className={`w-4 h-4 transition-colors ${
              isActionDisabled ? 'text-slate-400 dark:text-slate-500' : 'text-white'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{isSubmitting ? 'Saving...' : 'Save & Submit Changes'}</span>
        </button>
      </div>
    </div>
  );
}
