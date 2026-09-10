'use client';

import React from 'react';
import { Button } from '@/components/ui/inputs';

export interface MiniAppLifecycleBannersProps {
  status: string;
  can: (action: string) => boolean;
  role?: string;
  testVersion?: string;
  isSubmitting: boolean;
  onLifecycleAction: (action: 'submit' | 'approve' | 'reject' | 'request-changes' | 'start-testing' | 'activate' | 'suspend') => void;
  onOpenSandbox: () => void;
}

export default function MiniAppLifecycleBanners({
  status,
  can,
  role,
  testVersion = 'v1.1.1',
  isSubmitting,
  onLifecycleAction,
  onOpenSandbox,
}: MiniAppLifecycleBannersProps) {
  return (
    <>
      {/* 1. SA Admin Review & Action Banner for IN_REVIEW */}
      {can('miniapp:approve') && status === 'IN_REVIEW' && (
        <div className="mb-6 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/80 dark:bg-blue-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 border border-blue-200 dark:border-blue-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <h4 className="text-base font-bold text-blue-900 dark:text-blue-200">SA Admin Review Required</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1 leading-relaxed">
                Automated security validation has <strong>PASSED</strong>. Review the integration configuration,
                permissions, and report below, then Approve or Request Changes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              type="button"
              onClick={() => onLifecycleAction('approve')}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 font-semibold shadow-sm flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Approve Mini App</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onLifecycleAction('request-changes')}
              disabled={isSubmitting}
              className="border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/50 text-sm px-3.5 py-2 font-medium"
            >
              Request Changes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onLifecycleAction('reject')}
              disabled={isSubmitting}
              className="border-rose-300 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-sm px-3.5 py-2 font-medium"
            >
              Reject
            </Button>
          </div>
        </div>
      )}

      {/* 2. SA Admin Banner for APPROVED */}
      {can('miniapp:approve') && status === 'APPROVED' && (
        <div className="mb-6 p-4 rounded-2xl border border-teal-200 dark:border-teal-900/50 bg-teal-50/80 dark:bg-teal-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0 border border-teal-200 dark:border-teal-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h4 className="text-base font-bold text-teal-900 dark:text-teal-200">
                Mini App Approved — Build & Assembly Required
              </h4>
              <p className="text-sm text-teal-800 dark:text-teal-200 mt-1 leading-relaxed">
                Integration review approved by SA Admin. Build and validate the Super App test container before moving
                to the TESTING phase for APK download.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              type="button"
              onClick={() => onLifecycleAction('start-testing')}
              disabled={isSubmitting}
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 font-semibold shadow-sm flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
              <span>Build & Move to Testing</span>
            </Button>
          </div>
        </div>
      )}

      {/* 3. Building & Compiling Banner */}
      {status === 'BUILDING' && (
        <div className="mb-6 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/80 dark:bg-indigo-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 border border-indigo-200 dark:border-indigo-800">
              <svg className="animate-spin w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
            <div>
              <h4 className="text-base font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                <span>Super App Test Build in Progress...</span>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 animate-pulse">
                  Compiling & Validating
                </span>
              </h4>
              <p className="text-sm text-indigo-800 dark:text-indigo-200 mt-1 leading-relaxed">
                The Super App container is assembling dependencies and compiling the test APK. Once validation succeeds,
                the Mini App will automatically advance to <strong>TESTING</strong> where the test APK will be
                available for download.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {can('miniapp:approve') && (
              <Button
                type="button"
                onClick={() => onLifecycleAction('start-testing')}
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 font-semibold shadow-sm flex items-center gap-1.5"
              >
                <span>Advance to Testing</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 4. Manual Sandbox Testing Phase Banner */}
      {status === 'TESTING' && (
        <div className="mb-6 p-4 rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/80 dark:bg-purple-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 border border-purple-200 dark:border-purple-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <div>
              <h4 className="text-base font-bold text-purple-900 dark:text-purple-200">
                Manual Sandbox Testing Phase
              </h4>
              <p className="text-sm text-purple-800 dark:text-purple-200 mt-1 leading-relaxed">
                The test container has been compiled. Test the Mini App using the <strong>Sandbox Preview</strong> or{' '}
                <strong>Download Test APK</strong> on Android devices. When verified, SA Admin can Activate the app.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {(status !== 'TESTING' || role === 'MINI_APP_MANAGER') && (
              <a
                href={`/api/download-apk?type=test&version=${encodeURIComponent(testVersion)}`}
                download={`superapp-test-${testVersion}.apk`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold shadow-sm transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span>Download Test APK ({testVersion})</span>
              </a>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onOpenSandbox}
              className="border-purple-300 text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950/50 text-sm px-3.5 py-2 font-medium"
            >
              Launch Sandbox
            </Button>
            {can('miniapp:activate') && (
              <Button
                type="button"
                onClick={() => onLifecycleAction('activate')}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 font-semibold shadow-sm"
              >
                Activate Mini App
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
