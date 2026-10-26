'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/inputs';
import { getAvatarColor } from './team.utils';

export interface DeleteCollaboratorModalProps {
  collaborator: any | null;
  onClose: () => void;
  onConfirmDelete: () => Promise<void>;
  isRemoving: boolean;
}

export function DeleteCollaboratorModal({
  collaborator,
  onClose,
  onConfirmDelete,
  isRemoving,
}: DeleteCollaboratorModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !collaborator) return null;

  const userObj = collaborator.user || {};
  const displayName = userObj.name || userObj.email || 'Teammate';
  const displayEmail = userObj.email || collaborator.userId;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={() => !isRemoving && onClose()}
      />

      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 my-auto -translate-y-6 sm:-translate-y-10 transition-all">
        {/* Modal Header */}
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-xs border border-rose-200/80 dark:border-rose-900/60">
            <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Remove Collaborator?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Are you sure you want to remove this collaborator from this MiniApp?
            </p>
          </div>
        </div>

        {/* Collaborator Card Preview */}
        <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/70 border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-xs ${getAvatarColor(
                displayName,
              )}`}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {displayName}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {displayEmail}
              </div>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
            {collaborator.role || 'DEVELOPER'}
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          They will immediately lose access to co-develop, push revisions, trigger test builds, and inspect security telemetry.
        </p>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="secondary"
            disabled={isRemoving}
            onClick={onClose}
            className="text-xs px-4 h-9 font-medium cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isRemoving}
            onClick={onConfirmDelete}
            className="text-xs px-4 h-9 font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isRemoving ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Removing...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Remove Collaborator</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
