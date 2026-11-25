'use client';

import React from 'react';
import { Button } from '@/components/ui/inputs';
import {
  ClipboardCheckIcon,
  SettingsIcon,
  PackageIcon,
  AlertTriangleIcon,
  WrenchIcon,
  ShieldIcon,
  RefreshIcon,
} from '@/components/ui/Icons';
import { classifyDiagnosticError } from '@/lib/diagnostic-classifier';
import type { MiniAppAllowedActions } from './miniappActions';
import type { LifecycleActionType, MiniAppDetailFormData } from './types';

function formatWhen(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}

export interface MiniAppLifecycleBannersProps {
  status: string;
  can: (action: string) => boolean;
  role?: string;
  testVersion?: string;
  isSubmitting: boolean;
  /** What this user can do now (see getAllowedActions). */
  actions: MiniAppAllowedActions;
  suspension?: MiniAppDetailFormData['suspension'];
  archiveRequest?: MiniAppDetailFormData['archiveRequest'];
  onLifecycleAction: (action: LifecycleActionType) => void;
  onOpenSandbox?: () => void;
  onOpenReviewDiff?: () => void;
  pendingRevision?: any;
  buildStages?: any;
  buildStatus?: string;
  buildError?: string;
  onOpenBuildModal?: () => void;
  currentReleaseVersion?: string;
  draftVersion?: string;
  hasActiveProduction?: boolean;
  integrationMethod?: string;
}

export default function MiniAppLifecycleBanners({
  status,
  can,
  role,
  testVersion = 'v0.0.1',
  isSubmitting,
  actions,
  suspension,
  archiveRequest,
  onLifecycleAction,
  onOpenReviewDiff,
  pendingRevision,
  buildStages,
  buildStatus,
  buildError,
  onOpenBuildModal,
  currentReleaseVersion,
  draftVersion,
  hasActiveProduction,
  integrationMethod,
}: MiniAppLifecycleBannersProps) {
  const isDynamicMethod = ['WEBVIEW', 'DEEP_LINK'].includes(
    String(integrationMethod || '').toUpperCase(),
  );
  const dynamicLabel =
    String(integrationMethod || '').toUpperCase() === 'DEEP_LINK'
      ? 'Deep Link'
      : 'WebView';
  const stageDefs = [
    { id: 'preflight', name: '1. Pre-Flight & Manifest', icon: <ClipboardCheckIcon className="w-4 h-4 text-accent-500" />, defaultDetails: 'Verifying dependency checksums and manifest integrity.' },
    { id: 'compile', name: '2. Compile APK', icon: <SettingsIcon className="w-4 h-4 text-amber-500" />, defaultDetails: 'Assembling Flutter SuperApp container and compiling APK.' },
    { id: 'publish', name: '3. Publish to Nexus', icon: <PackageIcon className="w-4 h-4 text-emerald-500" />, defaultDetails: 'Uploading compiled APK artifact to Sonatype Nexus (apk-test-builds).' },
  ];

  const currentStages = buildStages || {};
  const isUpdateProposal = Boolean(
    hasActiveProduction ||
    (pendingRevision && actions.isLive) ||
    (status === 'IN_REVIEW' && hasActiveProduction)
  );

  const btn = 'text-sm px-4 py-2 font-semibold rounded-xl shadow-sm flex items-center gap-1.5';

  return (
    <>
      {/* Archived: stopped for good, kept on record */}
      {actions.phase === 'archived' && (
        <div className="mb-6 p-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 border border-slate-300 dark:border-slate-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Archived</h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                This mini app is stopped for good and hidden from users. It is kept as a record, and its App ID stays taken. A Super Admin can restore it, or delete it permanently from the ... menu.
                {suspension?.reason && <> Reason: <strong>{suspension.reason}</strong>.</>}
                {suspension?.archivedAt && <> Archived {formatWhen(suspension.archivedAt)}.</>}
              </p>
            </div>
          </div>
          {actions.restore && (
            <div className="flex items-center gap-2 shrink-0">
              <Button type="button" variant="outline" onClick={() => onLifecycleAction('restore')} disabled={isSubmitting} className={btn}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                <span>Restore as Draft</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Archive requested by an ADMIN: a SUPER_ADMIN decides */}
      {actions.archiveRequested && actions.phase !== 'archived' && (
        <div className="mb-6 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <div>
              <h4 className="text-base font-bold text-rose-900 dark:text-rose-200">Archive requested</h4>
              <p className="text-sm text-rose-800 dark:text-rose-200 mt-1 leading-relaxed">
                {archiveRequest?.requestedByName || 'An admin'} asked to archive this mini app
                {archiveRequest?.requestedAt && <> on {formatWhen(archiveRequest.requestedAt)}</>}
                {archiveRequest?.reason && <>: <strong>{archiveRequest.reason}</strong></>}.
                {!actions.decideArchive && ' A Super Admin will decide.'}
              </p>
            </div>
          </div>
          {actions.decideArchive && (
            <div className="flex items-center gap-2 shrink-0">
              <Button type="button" onClick={() => onLifecycleAction('archive')} disabled={isSubmitting} className={'bg-rose-600 hover:bg-rose-700 text-white ' + btn}>
                <span>Archive</span>
              </Button>
              <Button type="button" variant="outline" onClick={() => onLifecycleAction('decline-archive')} disabled={isSubmitting} className={btn}>
                <span>Decline</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Suspended: hidden from users until resumed */}
      {actions.phase === 'suspended' && (
        <div className="mb-6 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-base font-bold text-amber-900 dark:text-amber-200">Suspended</h4>
              <p className="text-sm text-amber-800 dark:text-amber-200 mt-1 leading-relaxed">
                Hidden from users and cannot be opened.
                {suspension?.reason && <> Reason: <strong>{suspension.reason}</strong>.</>}
                {suspension?.suspendedByName && <> By {suspension.suspendedByName}</>}
                {suspension?.suspendedAt && <> on {formatWhen(suspension.suspendedAt)}</>}
                {suspension?.suspendedByName || suspension?.suspendedAt ? '.' : ''}
              </p>
            </div>
          </div>
          {actions.resume && (
            <div className="flex items-center gap-2 shrink-0">
              <Button type="button" onClick={() => onLifecycleAction('resume')} disabled={isSubmitting} className={'bg-emerald-600 hover:bg-emerald-700 text-white ' + btn}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Resume</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Draft: the developer submits it (not shown for CHANGES_REQUESTED/REJECTED since ChangesRequestedBanner handles those) */}
      {status === 'DRAFT' && (
        <div className="mb-6 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 border border-brand-200 dark:border-brand-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Draft
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {actions.submit
                  ? 'Not sent for review yet. Finish the details, then submit it.'
                  : 'Waiting for the MiniApp developer to finish configuration and submit for review.'}
              </p>
            </div>
          </div>
          {actions.submit && (
            <div className="flex items-center gap-2 shrink-0">
              <Button type="button" onClick={() => onLifecycleAction('submit')} disabled={isSubmitting} className={'bg-brand-600 hover:bg-brand-700 text-white ' + btn}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>Submit for Review</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 0. Staged Revision in Review Banner for live Apps */}
      {actions.isLive && pendingRevision && (
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
                  Active Version Running in SuperApp
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                  Revision {pendingRevision.revisionStatus || 'IN_REVIEW'}
                </span>
              </div>
              <p className="text-sm text-amber-800 dark:text-amber-200 mt-1 leading-relaxed">
                You have staged updates pending publication. The current live version remains active for users in the SuperApp until this revision is published.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenReviewDiff && (
              <Button
                type="button"
                onClick={onOpenReviewDiff}
                className="bg-brand-600 hover:bg-brand-700 text-white text-sm px-4 py-2 font-semibold shadow-sm flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span>Compare &amp; Review Revision</span>
              </Button>
            )}
            {actions.publishRevision && (
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
            {actions.discardRevision && (
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
            )}
          </div>
        </div>
      )}
      {/* 1. Review & Action Banner for IN_REVIEW (New App vs Update Proposal).
          After a failed security scan: no Approve, only Request Changes / Reject. */}
      {status === 'IN_REVIEW' && (
        <div className={`mb-6 p-4 sm:p-5 rounded-2xl border shadow-sm animate-in fade-in flex flex-col xl:flex-row xl:items-center justify-between gap-4 ${
          isUpdateProposal
            ? 'border-amber-200/90 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/35'
            : 'border-blue-200/90 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/35'
        }`}>
          <div className="flex items-start gap-3.5 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isUpdateProposal
                ? 'bg-amber-100/90 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                : 'bg-blue-100/90 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
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
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className={`text-sm sm:text-base font-bold ${
                  isUpdateProposal ? 'text-amber-950 dark:text-amber-100' : 'text-slate-900 dark:text-slate-100'
                }`}>
                  {isUpdateProposal
                    ? `MiniApp Update Proposal${draftVersion ? ` (${draftVersion})` : ''}`
                    : 'New MiniApp Initial Submission'}
                </h4>
                {isUpdateProposal && currentReleaseVersion && (
                  <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                    Active v{currentReleaseVersion}
                  </span>
                )}
                <span className={`px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide rounded-md border ${
                  isUpdateProposal
                    ? 'bg-amber-100/90 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800/60'
                    : 'bg-blue-100/90 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800/60'
                }`}>
                  In Review
                </span>
              </div>
              <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${
                isUpdateProposal ? 'text-amber-900/80 dark:text-amber-200/90' : 'text-slate-600 dark:text-slate-300'
              }`}>
                {actions.scanFailed
                  ? 'The automated security scan FAILED, so this cannot be approved. Review the findings in the security report, then Request Changes so the developer can fix them, or Reject.'
                  : isUpdateProposal
                    ? `Active version v${currentReleaseVersion || '1.0.0'} is currently running and unaffected. Review the configuration, permissions, and security report for candidate version ${draftVersion || 'update'} before approving.`
                    : 'Automated security validation has PASSED. Review the initial configuration, permissions, and security report to approve for Sandbox Testing.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenReviewDiff && (
              <Button
                type="button"
                variant="outline"
                onClick={onOpenReviewDiff}
                className="h-9 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs inline-flex items-center gap-1.5 transition-all"
              >
                <svg className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span>{isUpdateProposal ? 'Review Changes Diff' : 'Open Review Desk'}</span>
              </Button>
            )}
            {actions.approve && (
              <Button
                type="button"
                onClick={() => onLifecycleAction('approve')}
                disabled={isSubmitting}
                className="h-9 px-4 rounded-xl text-xs font-semibold whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/15 inline-flex items-center gap-1.5 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>{isUpdateProposal ? 'Approve Update' : 'Approve MiniApp'}</span>
              </Button>
            )}
            {actions.requestChanges && (
              <Button
                type="button"
                onClick={() => onLifecycleAction('request-changes')}
                disabled={isSubmitting}
                className="h-9 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 text-white shadow-sm shadow-amber-500/15 inline-flex items-center gap-1.5 transition-all"
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Request Changes</span>
              </Button>
            )}
            {actions.reject && (
              <Button
                type="button"
                onClick={() => onLifecycleAction('reject')}
                disabled={isSubmitting}
                className="h-9 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/15 inline-flex items-center gap-1.5 transition-all"
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Reject</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 2. SA Admin Banner for APPROVED */}
      {actions.startTesting && (
        <div className="mb-6 p-4 rounded-2xl border border-teal-200 dark:border-teal-900/50 bg-teal-50/80 dark:bg-teal-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-200 dark:border-teal-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h4 className="text-base font-bold text-teal-900 dark:text-teal-200">
                {isDynamicMethod
                  ? 'MiniApp Approved — Ready for Sandbox Testing'
                  : 'MiniApp Approved — Build & Assembly Required'}
              </h4>
              <p className="text-sm text-teal-800 dark:text-teal-200 mt-1 leading-relaxed">
                {isDynamicMethod
                  ? `Integration review approved. No native build is required for ${dynamicLabel} — move directly to Sandbox Testing.`
                  : 'Integration review approved by SA Admin. Build and validate the SuperApp test container before moving to the TESTING phase for APK download.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              onClick={() => onLifecycleAction('start-testing')}
              disabled={isSubmitting}
              className="bg-accent-600 hover:bg-accent-700 text-white text-sm px-4 py-2 font-semibold shadow-sm flex items-center gap-1.5 shadow-accent-600/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d={
                    isDynamicMethod
                      ? 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z'
                      : 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z'
                  }
                />
              </svg>
              <span>{isDynamicMethod ? 'Move to Testing' : 'Build & Move to Testing'}</span>
            </Button>
          </div>
        </div>
      )}

      {/* 3. Building & Compiling Banner */}
      {status === 'BUILDING' && buildStatus !== 'FAILED' && (
        <div className="mb-6 p-5 rounded-2xl border border-accent-200 dark:border-accent-900/50 bg-accent-50/80 dark:bg-accent-950/40 shadow-sm animate-in fade-in space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-accent-100 dark:bg-accent-900/60 text-accent-600 dark:text-accent-400 flex items-center justify-center shrink-0 border border-accent-200 dark:border-accent-800">
                <svg className="animate-spin w-6 h-6 text-accent-600 dark:text-accent-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
              <div>
                <h4 className="text-base font-bold text-accent-900 dark:text-accent-200 flex items-center gap-2">
                  <span>SuperApp Fastlane CI Build in Progress...</span>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-accent-100 text-accent-800 dark:bg-accent-900/50 dark:text-accent-300 animate-pulse">
                    Compiling &amp; Packaging
                  </span>
                </h4>
                <p className="text-sm text-accent-800 dark:text-accent-200 mt-1 leading-relaxed">
                  Assembling Flutter SuperApp container and compiling test APK. Progress updates automatically below.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onOpenBuildModal && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onOpenBuildModal}
                  className="h-10 px-4 text-xs font-bold rounded-xl border-accent-300 dark:border-accent-800 text-accent-700 dark:text-accent-300 hover:bg-accent-100 dark:hover:bg-accent-900/40 flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>Open Build Modal</span>
                </Button>
              )}
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent-100/80 dark:bg-accent-900/60 text-accent-700 dark:text-accent-300 text-xs font-semibold border border-accent-200 dark:border-accent-800">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-600 dark:bg-accent-400"></span>
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
                      ? 'bg-white dark:bg-slate-900 border-accent-400 dark:border-accent-600 shadow-sm ring-1 ring-accent-500/20'
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
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded font-mono uppercase ${
                      isRunning
                        ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/60 dark:text-accent-300 animate-pulse'
                        : isCompleted
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                        : isFailed
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {recorded?.status || (idx === 0 ? 'RUNNING' : 'PENDING')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                    {recorded?.details || st.defaultDetails}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3.5 Build Failed Banner with Intelligent Responsibility & Accountability Breakdown */}
      {actions.phase === 'build-failed' && (() => {
        const diag = classifyDiagnosticError(buildError);
        return (
          <div className="mb-6 p-5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 shadow-sm animate-in fade-in space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                    diag.isInfrastructure
                      ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                      : 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {diag.isInfrastructure ? (
                    <WrenchIcon className="w-5 h-5" />
                  ) : (
                    <AlertTriangleIcon className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      SuperApp Build Assembly Failed
                    </h4>
                    <span
                      className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                        diag.isInfrastructure
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {diag.accountabilityLabel}
                    </span>
                    <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      Owner: {diag.accountabilityRole}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed font-medium">
                    {diag.category}: {diag.summary}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {actions.retryBuild && (
                  <Button
                    type="button"
                    onClick={() => onLifecycleAction('start-testing')}
                    disabled={isSubmitting}
                    className="bg-accent-600 hover:bg-accent-700 text-white text-sm px-4 py-2 font-bold rounded-xl shadow-md shadow-accent-600/20 flex items-center gap-1.5"
                  >
                    <RefreshIcon className="w-4 h-4" />
                    <span>Retry Test Build</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Structured Diagnostic & Accountability Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Responsibility & Root Cause Box */}
              <div className="p-3.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  <ShieldIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>Accountability & Root Cause</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  <strong className="text-slate-900 dark:text-slate-200">{diag.accountabilityRole}:</strong> {diag.summary}
                </p>
              </div>

              {/* Actionable Next Steps */}
              <div className="p-3.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-accent-700 dark:text-accent-400 uppercase tracking-wide">
                  <WrenchIcon className="w-3.5 h-3.5 text-accent-600" />
                  <span>Actionable Resolution</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {diag.remedy}
                </p>
              </div>
            </div>

            {/* Technical Failure Log / Raw Diagnostic */}
            <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-800">
                <span className="uppercase tracking-wider font-semibold">Technical Console Diagnostic</span>
                <span>Jenkins Fastlane Pipeline</span>
              </div>
              <p className="pt-1 text-rose-300 leading-relaxed break-all">
                {diag.rawError || `Fastlane APK compilation exited with errors. Inspect Jenkins console logs at ${process.env.NEXT_PUBLIC_JENKINS_URL || 'http://localhost:8085'} for details.`}
              </p>
            </div>
          </div>
        );
      })()}

      {/* 4. Manual Sandbox Testing Phase Banner */}
      {actions.phase === 'testing' && (
        <div className="mb-6 p-4 rounded-2xl border border-accent-200 dark:border-accent-900/50 bg-accent-50/80 dark:bg-accent-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-100 dark:bg-accent-900/60 text-accent-600 dark:text-accent-400 flex items-center justify-center shrink-0 border border-accent-200 dark:border-accent-800">
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
              <h4 className="text-base font-bold text-accent-900 dark:text-accent-200">
                {isDynamicMethod ? `${dynamicLabel} Sandbox Testing` : 'Manual Sandbox Testing Phase'}
              </h4>
              <p className="text-sm text-accent-800 dark:text-accent-200 mt-1 leading-relaxed">
                {isDynamicMethod ? (
                  <>
                    Ready for verification. Test the MiniApp with <strong>Sandbox Preview</strong> in the header or inside the SuperApp. When everything works, mark testing as passed; found a defect? Request changes.
                  </>
                ) : (
                  <>
                    The test build is ready. Test the MiniApp with <strong>Launch Sandbox Preview</strong> (in the ... menu) or the test APK on an Android phone. When everything works, a reviewer marks testing as passed; found a defect? Request changes.
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {actions.passTesting && (
              <Button
                type="button"
                onClick={() => onLifecycleAction('pass-testing')}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 font-semibold shadow-sm flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Pass Testing</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 5. Testing passed: ready for the production release */}
      {actions.phase === 'test-passed' && (
        <div className="mb-6 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/80 dark:bg-emerald-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h4 className="text-base font-bold text-emerald-900 dark:text-emerald-200">Testing Passed</h4>
              <p className="text-sm text-emerald-800 dark:text-emerald-200 mt-1 leading-relaxed">
                {isDynamicMethod
                  ? `${dynamicLabel} sandbox testing was verified. Activating publishes the MiniApp directly to the SuperApp catalog.`
                  : 'The test build was verified. Activating starts the production release build and puts the MiniApp in the SuperApp catalog.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {actions.activate && (
              <Button
                type="button"
                onClick={() => onLifecycleAction('activate')}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 font-semibold shadow-sm flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Activate MiniApp</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
