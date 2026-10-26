'use client';

import React from 'react';
import { Button } from '@/components/ui/inputs';
import type { MiniAppTabType } from '@/components/miniapp-detail/MiniAppDetailTabs';

interface MiniAppDetailBottomBarProps {
  isEditable: boolean;
  activeTab: MiniAppTabType;
  isSubmitting: boolean;
  onSaveDraft: (e: React.FormEvent) => void;
  onSaveAndSubmit: (e: React.FormEvent) => void;
}

export function MiniAppDetailBottomBar({
  isEditable,
  activeTab,
  isSubmitting,
  onSaveDraft,
  onSaveAndSubmit,
}: MiniAppDetailBottomBarProps) {
  if (!isEditable || activeTab === 'report' || activeTab === 'activity' || activeTab === 'versions') {
    return null;
  }

  return (
    <div className="sticky bottom-6 z-30 mt-8 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-200">
      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
        Save changes when you are done
      </div>
      <div className="flex items-center gap-2.5">
        <Button
          type="button"
          variant="outline"
          onClick={onSaveDraft}
          disabled={isSubmitting}
          className="h-10 px-5 text-sm font-semibold flex items-center gap-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <span>Save as Draft</span>
        </Button>
        <Button
          type="button"
          onClick={onSaveAndSubmit}
          disabled={isSubmitting}
          className="h-10 px-5 text-sm font-semibold flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20"
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
