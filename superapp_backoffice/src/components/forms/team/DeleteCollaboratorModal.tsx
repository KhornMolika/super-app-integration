'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getAvatarColor } from './team.utils';
import { collaboratorRoleLabel } from '@/lib/miniappAccess';

export interface DeleteCollaboratorModalProps {
  collaborator: any | null;
  /** The collaborator is the signed-in user: the modal becomes "Leave". */
  isSelf?: boolean;
  onClose: () => void;
  onConfirmDelete: () => Promise<void>;
  isRemoving: boolean;
}

export function DeleteCollaboratorModal({
  collaborator,
  isSelf = false,
  onClose,
  onConfirmDelete,
  isRemoving,
}: DeleteCollaboratorModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!collaborator) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isRemoving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [collaborator, isRemoving, onClose]);

  if (!mounted || !collaborator) return null;

  const userObj = collaborator.user || {};
  const displayName = userObj.name || userObj.email || 'Teammate';
  const displayEmail = userObj.email || collaborator.userId;
  const title = isSelf ? 'Leave this MiniApp?' : `Remove ${displayName}?`;
  const body = isSelf
    ? 'You will lose access right away. Only the owner, a maintainer or an organization admin can add you back.'
    : 'They lose access to this MiniApp right away. You can add them again later.';

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center sm:p-6 bg-slate-950/70 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="remove-collaborator-title"
    >
      <div className="absolute inset-0" onClick={() => !isRemoving && onClose()} />

      <div className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 space-y-4">
        <div>
          <h3
            id="remove-collaborator-title"
            className="text-base font-bold text-slate-900 dark:text-slate-100"
          >
            {title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{body}</p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              aria-hidden="true"
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(
                displayName,
              )}`}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {displayName}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{displayEmail}</div>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 shrink-0">
            {collaboratorRoleLabel(collaborator.role)}
          </span>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <button
            type="button"
            disabled={isRemoving}
            onClick={onClose}
            className="h-10 px-4 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isRemoving}
            onClick={onConfirmDelete}
            className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isRemoving ? (isSelf ? 'Leaving...' : 'Removing...') : isSelf ? 'Leave MiniApp' : 'Remove'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
