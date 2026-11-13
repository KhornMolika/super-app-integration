'use client';

import React, { useState, useRef, useEffect } from 'react';
import { LifecycleBadge, AvailabilityBadge } from './MiniAppStatusBadges';
import { ACCESS_LEVEL_INFO, toAccessLevel } from '@/lib/miniappAccess';
import { IntegrationMethod } from '@/types/miniapp.types';
import { BuildingIcon } from '@/components/ui/Icons';
import { AppLogoAvatar } from '@/components/ui/AppLogoAvatar';
import { getOrganizationCode, getOrganizationFullName } from '@/api';
import type { MiniAppAllowedActions } from './miniappActions';
import type { LifecycleActionType } from './types';
import { copyText } from '@/lib/clipboard';

export interface MiniAppDetailHeaderProps {
  formData: any;
  role?: string;
  can: (action: string) => boolean;
  latestTestVersion?: string;
  isEditingUnlocked: boolean;
  onToggleEditing: () => void;
  onOpenSandbox?: () => void;
  /** What this user can do now (see getAllowedActions). */
  actions: MiniAppAllowedActions;
  onLifecycleAction: (action: LifecycleActionType) => void;
  onDelete: () => void;
  onDeletePermanently?: () => void;
  isSubmitting: boolean;
}

export default function MiniAppDetailHeader({
  formData,
  role,
  can,
  latestTestVersion,
  isEditingUnlocked,
  onToggleEditing,
  onOpenSandbox,
  actions,
  onLifecycleAction,
  onDelete,
  onDeletePermanently,
  isSubmitting,
}: MiniAppDetailHeaderProps) {
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [copiedAppId, setCopiedAppId] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  const copyAppId = () => {
    if (formData.appId) {
      copyText(formData.appId);
      setCopiedAppId(true);
      setTimeout(() => setCopiedAppId(false), 2000);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const accessInfo = ACCESS_LEVEL_INFO[toAccessLevel((formData as any).myAccess)];
  const testVersion =
    formData.activeTestVersion ||
    formData.integrationConfig?.superAppTestVersion ||
    latestTestVersion ||
    'v0.2.0';

  return (
    <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all">
      <div className="flex items-start sm:items-center gap-4 min-w-0">
        <AppLogoAvatar logo={formData.logo} name={formData.name} size="lg" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight break-words mr-1">
              {formData.name || 'Manage MiniApp'}
            </h2>
            {/* Lifecycle (governance stage) and availability (runtime gate) are separate */}
            <LifecycleBadge app={formData} size="md" />
            <AvailabilityBadge app={formData} size="md" />
            {/* The caller's access on this app (owner / collaborator role / admin) */}
            <span
              title={accessInfo.summary}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap"
            >
              <span className="sr-only">Your access: </span>
              {accessInfo.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {formData.appId && (
              <button
                type="button"
                onClick={copyAppId}
                title="Click to copy App ID"
                className="group inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-mono text-xs transition-colors cursor-pointer"
              >
                <span>{formData.appId}</span>
                {copiedAppId ? (
                  <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
                {copiedAppId && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Copied!</span>}
              </button>
            )}
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-medium text-xs">
              {formData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE || formData.integrationMethod === 'FLUTTER_PACKAGE'
                ? 'Flutter Package'
                : formData.integrationMethod === IntegrationMethod.NATIVE_SDK || formData.integrationMethod === 'NATIVE_SDK'
                ? 'Native SDK'
                : formData.integrationMethod === IntegrationMethod.DEEP_LINK || formData.integrationMethod === 'DEEP_LINK'
                ? 'Deep Link'
                : 'WebView'}
            </span>
            {(formData.organization || formData.category) && (
              <>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span 
                  className="inline-flex items-center gap-1 font-semibold text-sky-600 dark:text-sky-400"
                  title={getOrganizationFullName(formData.organization || formData.category)}
                >
                  <BuildingIcon className="w-3.5 h-3.5" />
                  <span>{getOrganizationCode(formData.organization || formData.category)}</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Header Actions */}
      <div className="flex items-center space-x-2.5">
        {/* More Actions Dropdown (...) */}
        <div className="relative" ref={actionsMenuRef}>
          <button
            type="button"
            onClick={() => setShowActionsMenu(!showActionsMenu)}
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm focus:ring-2 focus:ring-brand-500/20"
            aria-label="More actions"
            title="More Actions"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
              />
            </svg>
          </button>

          {showActionsMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-100 dark:divide-slate-800/60">
              {(actions.edit || (actions.sandbox && onOpenSandbox)) && (
                <div className="py-1">
                  {actions.edit && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionsMenu(false);
                        onToggleEditing();
                      }}
                      disabled={isSubmitting}
                      className="w-full text-left px-3.5 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2.5 font-medium transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isEditingUnlocked ? 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' : 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'} />
                      </svg>
                      <span>{isEditingUnlocked ? 'Lock Configuration' : 'Edit Configuration'}</span>
                    </button>
                  )}
                  {actions.sandbox && onOpenSandbox && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionsMenu(false);
                        onOpenSandbox?.();
                      }}
                      disabled={isSubmitting}
                      className="w-full text-left px-3.5 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2.5 font-medium transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span>Launch Sandbox Preview</span>
                    </button>
                  )}
                </div>
              )}

              {(actions.suspend || actions.requestArchive || actions.archive || actions.delete || actions.deletePermanently) && (
                <div className="py-1">
                  <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Administration
                  </div>
                  {actions.suspend && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionsMenu(false);
                        onLifecycleAction('suspend');
                      }}
                      disabled={isSubmitting}
                      className="w-full text-left px-3.5 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center space-x-2.5 font-medium transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Suspend MiniApp</span>
                    </button>
                  )}
                  {actions.requestArchive && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionsMenu(false);
                        onLifecycleAction('request-archive');
                      }}
                      disabled={isSubmitting}
                      className="w-full text-left px-3.5 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center space-x-2.5 font-medium transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      <span>Ask Super Admin to Archive</span>
                    </button>
                  )}
                  {actions.archive && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionsMenu(false);
                        onLifecycleAction('archive');
                      }}
                      disabled={isSubmitting}
                      className="w-full text-left px-3.5 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center space-x-2.5 font-medium transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      <span>Archive MiniApp</span>
                    </button>
                  )}
                  {actions.delete && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionsMenu(false);
                        onDelete();
                      }}
                      disabled={isSubmitting}
                      className="w-full text-left px-3.5 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center space-x-2.5 font-medium transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete MiniApp</span>
                    </button>
                  )}
                  {actions.deletePermanently && onDeletePermanently && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionsMenu(false);
                        onDeletePermanently();
                      }}
                      disabled={isSubmitting}
                      className="w-full text-left px-3.5 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center space-x-2.5 font-semibold transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete Permanently</span>
                    </button>
                  )}
                </div>
              )}

              {!actions.edit && !(actions.sandbox && onOpenSandbox) && !actions.suspend && !actions.requestArchive && !actions.archive && !actions.delete && !actions.deletePermanently && (
                <div className="px-3.5 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                  No actions available in this status.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
