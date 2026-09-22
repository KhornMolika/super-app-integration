'use client';

import React from 'react';
import { Button } from '@/components/ui/inputs';
import { ClipboardCheckIcon, SettingsIcon, PackageIcon } from '@/components/ui/Icons';

export interface MiniAppLifecycleBannersProps {
  status: string;
  can: (action: string) => boolean;
  role?: string;
  testVersion?: string;
  isSubmitting: boolean;
  onLifecycleAction: (action: 'submit' | 'approve' | 'reject' | 'request-changes' | 'start-testing' | 'activate' | 'suspend' | 'publish-revision' | 'discard-revision') => void;
  onOpenSandbox: () => void;
  onOpenReviewDiff?: () => void;
  pendingRevision?: any;
  buildStages?: any;
  buildError?: string;
  onOpenBuildModal?: () => void;
  currentReleaseVersion?: string;
  draftVersion?: string;
  hasActiveProduction?: boolean;
}

export default function MiniAppLifecycleBanners({
  status,
  can,
  role,
  testVersion = 'v0.3.1',
  isSubmitting,
  onLifecycleAction,
  onOpenSandbox,
  onOpenReviewDiff,
  pendingRevision,
  buildStages,
  buildError,
  onOpenBuildModal,
  currentReleaseVersion,
  draftVersion,
  hasActiveProduction,
}: MiniAppLifecycleBannersProps) {
  const stageDefs = [
    { id: 'preflight', name: '1. Pre-Flight & Manifest', icon: <ClipboardCheckIcon className="w-4 h-4 text-indigo-500" />, defaultDetails: 'Verifying dependency checksums and manifest integrity.' },
    { id: 'compile', name: '2. Fastlane APK Packaging', icon: <SettingsIcon className="w-4 h-4 text-amber-500" />, defaultDetails: 'Assembling Flutter Super App container and compiling debug APK.' },
    { id: 'publish', name: '3. Publish to Nexus', icon: <PackageIcon className="w-4 h-4 text-emerald-500" />, defaultDetails: 'Uploading compiled APK artifact to Sonatype Nexus (apk-test-builds).' },
  ];

  const currentStages = buildStages || {};
  const isUpdateProposal = Boolean(
    hasActiveProduction ||
    (pendingRevision && (status === 'ACTIVE' || status === 'Published')) ||
    (status === 'IN_REVIEW' && hasActiveProduction)
  );

  return (
    <>
      {/* 0. Staged Revision in Review Banner for ACTIVE Apps */}
      {status === 'ACTIVE' && pendingRevision && (
        <div className="mb-6 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-amber-900 dark:text-amber-200">
                  Pending Staged Revision
                </h4>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                  Live Version Active in Super App
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                  Revision {pendingRevision.revisionStatus || 'IN_REVIEW'}
                </span>
              </div>
              <p className="text-sm text-amber-800 dark:text-amber-200 mt-1 leading-relaxed">
                You have staged updates pending publication. The current live version remains active for users in the Super App until this revision is published.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenReviewDiff && (
              <Button
                type="button"
                onClick={onOpenReviewDiff}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 font-semibold shadow-sm flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span>Compare &amp; Review Revision</span>
              </Button>
            )}
            {can('miniapp:approve') && (
              <Button
                type="button"
                onClick={() => onLifecycleAction('publish-revision')}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 font-semibold shadow-sm flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Publish Revision to Live</span>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onLifecycleAction('discard-revision')}
              disabled={isSubmitting}
              className="border-rose-300 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-sm px-4 py-2.5 font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all"
            >
              <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Discard Revision</span>
            </Button>
          </div>
        </div>
      )}
      {/* 1. Review & Action Banner for IN_REVIEW (New App vs Update Proposal) */}
      {status === 'IN_REVIEW' && (
        <div className={`mb-6 p-5 rounded-2xl border shadow-sm animate-in fade-in flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isUpdateProposal
            ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/40'
            : 'border-blue-200 dark:border-blue-900/50 bg-blue-50/80 dark:bg-blue-950/40'
        }`}>
          <div className="flex items-start gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
              isUpdateProposal
                ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                : 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
            }`}>
              {isUpdateProposal ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className={`text-base font-bold ${
                  isUpdateProposal ? 'text-amber-900 dark:text-amber-200' : 'text-blue-900 dark:text-blue-200'
                }`}>
                  {isUpdateProposal
                    ? `Mini App Update Proposal${draftVersion ? ` (${draftVersion})` : ''}`
                    : 'New Mini App Initial Submission'}
                </h4>
                {isUpdateProposal && currentReleaseVersion && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                    Live v{currentReleaseVersion} Active
                  </span>
                )}
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  isUpdateProposal
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                }`}>
                  IN REVIEW
                </span>
              </div>
              <p className={`text-sm mt-1 leading-relaxed ${
                isUpdateProposal ? 'text-amber-800 dark:text-amber-200' : 'text-blue-800 dark:text-blue-200'
              }`}>
                {isUpdateProposal
                  ? `Live version v${currentReleaseVersion || '1.0.0'} is currently active and unaffected. Review the configuration, permissions, and security report for candidate version ${draftVersion || 'update'} before approving.`
                  : 'Automated security validation has PASSED. Review the initial configuration, permissions, and security report to approve for Sandbox Testing.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {isUpdateProposal && onOpenReviewDiff && (
              <Button
                type="button"
                onClick={onOpenReviewDiff}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2.5 font-bold rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span>Review Changes Diff</span>
              </Button>
            )}
            {can('miniapp:approve') && (
              <>
                <Button
                  type="button"
                  onClick={() => onLifecycleAction('approve')}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-5 py-2.5 font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{isUpdateProposal ? 'Approve Update' : 'Approve Mini App'}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onLifecycleAction('request-changes')}
                  disabled={isSubmitting}
                  className="border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 bg-amber-50/50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-sm px-4 py-2.5 font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all"
                >
                  <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Request Changes</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onLifecycleAction('reject')}
                  disabled={isSubmitting}
                  className="border-rose-300 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-sm px-4 py-2.5 font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all"
                >
                  <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Reject</span>
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 2. SA Admin Banner for APPROVED */}
      {can('miniapp:approve') && status === 'APPROVED' && (
        <div className="mb-6 p-4 rounded-2xl border border-teal-200 dark:border-teal-900/50 bg-teal-50/80 dark:bg-teal-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-200 dark:border-teal-800">
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
          <div className="flex items-center gap-2 shrink-0">
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
        <div className="mb-6 p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/80 dark:bg-indigo-950/40 shadow-sm animate-in fade-in space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
                <svg className="animate-spin w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
              <div>
                <h4 className="text-base font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                  <span>Super App Fastlane CI Build in Progress...</span>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 animate-pulse">
                    Compiling &amp; Packaging
                  </span>
                </h4>
                <p className="text-sm text-indigo-800 dark:text-indigo-200 mt-1 leading-relaxed">
                  Assembling Flutter Super App container and compiling test APK. Progress updates automatically below.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onOpenBuildModal && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onOpenBuildModal}
                  className="h-10 px-4 text-xs font-bold rounded-xl border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>Open Build Modal</span>
                </Button>
              )}
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-100/80 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-800">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600 dark:bg-indigo-400"></span>
                </span>
                <span>Pipeline Active</span>
              </div>
            </div>
          </div>

          {/* 3-Stage Progress Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            {stageDefs.map((st, idx) => {
              const recorded = currentStages[st.id];
              const isCompleted = recorded?.status === 'COMPLETED';
              const isRunning = recorded?.status === 'RUNNING' || (!recorded && idx === 0);
              const isFailed = recorded?.status === 'FAILED';

              return (
                <div
                  key={st.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isRunning
                      ? 'bg-white dark:bg-slate-900 border-indigo-400 dark:border-indigo-600 shadow-sm ring-1 ring-indigo-500/20'
                      : isCompleted
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                      : isFailed
                      ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                      : 'bg-white/40 dark:bg-slate-900/20 border-slate-200/60 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span>{st.icon}</span>
                      <span>{st.name}</span>
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono uppercase ${
                      isRunning
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 animate-pulse'
                        : isCompleted
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                        : isFailed
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {recorded?.status || (idx === 0 ? 'RUNNING' : 'PENDING')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                    {recorded?.details || st.defaultDetails}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3.5 Build Failed Banner */}
      {status === 'BUILD_FAILED' && (
        <div className="mb-6 p-5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 shadow-sm animate-in fade-in space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h4 className="text-base font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
                  <span>Super App Fastlane Build Failed</span>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300">
                    Packaging Error
                  </span>
                </h4>
                <p className="text-sm text-rose-800 dark:text-rose-200 mt-1 leading-relaxed">
                  The Fastlane CI pipeline was unable to complete APK compilation and upload. Review diagnostic details below.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {can('miniapp:approve') && (
                <Button
                  type="button"
                  onClick={() => onLifecycleAction('start-testing')}
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 font-bold rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Retry Test Build</span>
                </Button>
              )}
            </div>
          </div>

          {/* Diagnostic Reason Box */}
          <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-rose-200 dark:border-rose-900/50 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wide">
              <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Diagnostic Failure Reason</span>
            </div>
            <p className="text-xs font-mono text-rose-700 dark:text-rose-300 leading-relaxed wrap-break-word">
              {buildError || 'Fastlane APK compilation exited with errors. Inspect Jenkins console logs at http://localhost:8085 for details.'}
            </p>
          </div>
        </div>
      )}

      {/* 4. Manual Sandbox Testing Phase Banner */}
      {status === 'TESTING' && (
        <div className="mb-6 p-4 rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/80 dark:bg-purple-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
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
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onOpenSandbox}
              className="border-purple-300 text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950/50 text-sm px-3.5 py-2 font-medium flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>Launch Sandbox</span>
            </Button>
            {can('miniapp:activate') && (
              <Button
                type="button"
                onClick={() => onLifecycleAction('activate')}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 font-semibold shadow-sm flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Activate Mini App</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
