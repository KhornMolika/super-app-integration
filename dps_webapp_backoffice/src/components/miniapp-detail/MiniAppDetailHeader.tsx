'use client';

import React, { useState, useRef, useEffect } from 'react';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/inputs';
import { IntegrationMethod } from '@/types/miniapp.types';

export interface MiniAppDetailHeaderProps {
  formData: any;
  role?: string;
  can: (action: string) => boolean;
  isEditingUnlocked: boolean;
  onToggleEditing: () => void;
  onOpenSandbox: () => void;
  onLifecycleAction: (action: 'suspend' | 'approve' | 'reject' | 'request-changes' | 'start-testing' | 'activate') => void;
  onDelete: () => void;
  isSubmitting: boolean;
}

export default function MiniAppDetailHeader({
  formData,
  role,
  can,
  isEditingUnlocked,
  onToggleEditing,
  onOpenSandbox,
  onLifecycleAction,
  onDelete,
  isSubmitting,
}: MiniAppDetailHeaderProps) {
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const status = formData.status || 'DRAFT';

  return (
    <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
      <div className="flex items-center space-x-4">
        <BackButton href="/miniapps" />
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {formData.name || 'Manage Mini App'}
            </h2>
            {/* Status Pill Badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold uppercase tracking-wider ${
                status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : status === 'APPROVED'
                  ? 'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800'
                  : status === 'IN_REVIEW'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                  : status === 'TESTING' || status === 'BUILDING'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                  : status === 'REJECTED' || status === 'SUSPENDED'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                  : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  status === 'ACTIVE'
                    ? 'bg-emerald-500'
                    : status === 'APPROVED'
                    ? 'bg-teal-500'
                    : status === 'IN_REVIEW'
                    ? 'bg-blue-500 animate-pulse'
                    : status === 'TESTING' || status === 'BUILDING'
                    ? 'bg-purple-500 animate-pulse'
                    : status === 'REJECTED' || status === 'SUSPENDED'
                    ? 'bg-rose-500'
                    : 'bg-slate-400'
                }`}
              />
              <span>{status}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{formData.appId || 'com.app'}</span>
            <span>•</span>
            <span>
              {formData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE
                ? 'Flutter Package'
                : formData.integrationMethod === IntegrationMethod.DEEP_LINK
                ? 'Deep Link'
                : 'WebView'}
            </span>
            {formData.category && (
              <>
                <span>•</span>
                <span>{formData.category}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center space-x-2.5">
        {/* Sandbox Preview: Available to test browser sandbox container */}
        {(status !== 'TESTING' || role === 'MINI_APP_MANAGER') && (
          <Button
            type="button"
            variant="outline"
            onClick={onOpenSandbox}
            className="h-10 px-4 text-sm font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-sm"
            title="Launch Super App Sandbox Preview"
          >
            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span>Sandbox Preview</span>
          </Button>
        )}

        {/* Download Test APK: ONLY displayed when status is TESTING or ACTIVE */}
        {(status === 'TESTING' || status === 'ACTIVE') && (status !== 'TESTING' || role === 'MINI_APP_MANAGER') && (() => {
          const testVersion = formData.integrationConfig?.superAppTestVersion || 'v1.1.1';
          return (
            <a
              href={`/api/download-apk?type=test&version=${encodeURIComponent(testVersion)}`}
              download={`superapp-test-${testVersion}.apk`}
              className="h-10 px-4 text-sm font-semibold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all flex items-center gap-1.5 shadow-sm"
              title={`Download Super App Test Build APK (${testVersion})`}
            >
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download Test APK ({testVersion})</span>
            </a>
          );
        })()}

        {/* Edit Configuration Toggle */}
        {can('miniapp:update') && (
          <Button
            type="button"
            variant={isEditingUnlocked ? 'primary' : 'outline'}
            onClick={onToggleEditing}
            className={`h-10 px-4 text-sm font-medium transition-all ${
              isEditingUnlocked
                ? 'bg-brand-600 text-white hover:bg-brand-700'
                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {isEditingUnlocked ? (
              <>
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Finish Editing</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 mr-1.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                <span>Edit Configuration</span>
              </>
            )}
          </Button>
        )}

        {/* More Actions Dropdown (...) */}
        {(can('miniapp:approve') || can('miniapp:suspend') || can('miniapp:delete')) && (
          <div className="relative" ref={actionsMenuRef}>
            <button
              type="button"
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm focus:ring-2 focus:ring-brand-500/20"
              aria-label="More actions"
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
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-100 dark:divide-slate-800/60">
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowActionsMenu(false);
                      onOpenSandbox();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2.5 font-medium transition-colors"
                  >
                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span>Super App Sandbox</span>
                  </button>
                  {(status === 'TESTING' || status === 'ACTIVE') && (() => {
                    const testVersion = formData.integrationConfig?.superAppTestVersion || 'v1.1.1';
                    return (
                      <a
                        href={`/api/download-apk?type=test&version=${encodeURIComponent(testVersion)}`}
                        download={`superapp-test-${testVersion}.apk`}
                        onClick={() => setShowActionsMenu(false)}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2.5 font-medium transition-colors"
                      >
                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Download Test APK ({testVersion})</span>
                      </a>
                    );
                  })()}
                </div>

                {can('miniapp:suspend') && (status === 'APPROVED' || status === 'ACTIVE') && (
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionsMenu(false);
                        onLifecycleAction('suspend');
                      }}
                      disabled={isSubmitting}
                      className="w-full text-left px-4 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center space-x-2.5 font-medium transition-colors"
                    >
                      <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Suspend App</span>
                    </button>
                  </div>
                )}

                {can('miniapp:delete') && (
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionsMenu(false);
                        onDelete();
                      }}
                      disabled={isSubmitting}
                      className="w-full text-left px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center space-x-2.5 font-medium transition-colors"
                    >
                      <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <span>Delete App</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
