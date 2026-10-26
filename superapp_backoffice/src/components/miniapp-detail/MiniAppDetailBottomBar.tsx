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
  if (!canEdit || activeTab === 'report' || activeTab === 'activity' || activeTab === 'versions') {
    return null;
  }

  return (
    <div className="sticky bottom-6 z-30 mt-8 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-200">
      {isEditingUnlocked ? (
        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Editing configuration unlocked — save changes when you are done</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <svg className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>
            Configuration is locked. Click <span className="font-semibold text-slate-700 dark:text-slate-300">... &gt; Edit Configuration</span> to make changes.
          </span>
        </div>
      )}

      <div className="flex items-center gap-2.5">
        {isEditingUnlocked && onCancelEdit && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancelEdit}
            disabled={isSubmitting}
            className="h-10 px-4 text-sm font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
          >
            Cancel
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={onSaveDraft}
          disabled={!isEditingUnlocked || isSubmitting}
          className="h-10 px-5 text-sm font-semibold flex items-center gap-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent text-slate-700 dark:text-slate-300"
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <span>Save as Draft</span>
        </Button>
        <Button
          type="button"
          onClick={onSaveAndSubmit}
          disabled={!isEditingUnlocked || isSubmitting}
          className="h-10 px-5 text-sm font-semibold flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-brand-600 disabled:shadow-none"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{isSubmitting ? 'Saving...' : 'Save & Submit Changes'}</span>
        </Button>
      </div>
    </div>
  );
}
