'use client';

import React from 'react';
import { Button } from '@/components/ui/inputs';

export interface BuildStageItem {
  id: string;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | string;
  details?: string;
  updatedAt?: string;
}

export interface BuildProgressModalState {
  isOpen: boolean;
  status: 'building' | 'success' | 'error';
  releaseVersion?: string;
  apkUrl?: string;
  errorMessage?: string;
  stages?: Record<string, BuildStageItem>;
  appId?: string;
  appName?: string;
}

export interface BuildProgressModalProps {
  state: BuildProgressModalState;
  onClose: () => void;
  onRunInBackground: () => void;
  onRetry?: () => void;
  onOpenSandbox?: () => void;
}

const DEFAULT_STAGES: { id: string; name: string; defaultDetails: string; icon: string }[] = [
  {
    id: 'preflight',
    name: '1. Pre-Flight & Manifest Verification',
    defaultDetails: 'Verifying dependency checksums, manifest digest, and package exports.',
    icon: 'preflight',
  },
  {
    id: 'compile',
    name: '2. Fastlane APK Packaging',
    defaultDetails: 'Assembling Flutter Super App container and compiling debug APK binary with Fastlane.',
    icon: 'compile',
  },
  {
    id: 'publish',
    name: '3. Publish to Nexus & Finalize',
    defaultDetails: 'Uploading compiled APK artifact to Sonatype Nexus repository (apk-test-builds).',
    icon: 'publish',
  },
];

export default function BuildProgressModal({
  state,
  onClose,
  onRunInBackground,
  onRetry,
  onOpenSandbox,
}: BuildProgressModalProps) {
  if (!state.isOpen) return null;

  const rawStages = state.stages || {};

  const stagesList = DEFAULT_STAGES.map((def, idx) => {
    const recorded = rawStages[def.id];
    if (recorded) {
      return {
        id: def.id,
        name: recorded.name || def.name,
        status: recorded.status || (idx === 0 ? 'RUNNING' : 'PENDING'),
        details: recorded.details || (recorded.status === 'COMPLETED' ? 'Stage completed successfully.' : def.defaultDetails),
        icon: def.icon,
      };
    }
    return {
      id: def.id,
      name: def.name,
      status: state.status === 'success' ? 'COMPLETED' : idx === 0 ? 'RUNNING' : 'PENDING',
      details: state.status === 'success' ? 'Stage completed successfully.' : def.defaultDetails,
      icon: def.icon,
    };
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 w-full max-w-2xl relative flex flex-col items-center">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Close modal"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* ─── State: BUILDING / RUNNING ─── */}
        {state.status === 'building' && (
          <div className="w-full flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center mb-4 shadow-sm">
              <svg className="animate-spin w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>

            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                <span>Fastlane CI Pipeline</span>
                {state.releaseVersion && <span className="font-mono font-extrabold">• {state.releaseVersion}</span>}
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Super App Assembly in Progress
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-md mx-auto">
                The Jenkins pipeline is packaging the Flutter Super App test container and compiling the APK artifact in real time.
              </p>
            </div>

            {/* 3-Stage Progress Stepper */}
            <div className="w-full bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-3 mb-6">
              {stagesList.map((st, idx) => {
                const isCompleted = st.status === 'COMPLETED';
                const isRunning = st.status === 'RUNNING';
                const isFailed = st.status === 'FAILED';

                return (
                  <div
                    key={st.id || idx}
                    className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all duration-200 ${
                      isRunning
                        ? 'bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-700 shadow-md ring-2 ring-indigo-500/10'
                        : isCompleted
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                        : isFailed
                        ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/50'
                        : 'bg-white/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/60 opacity-60'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isCompleted && (
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      {isRunning && (
                        <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        </div>
                      )}
                      {isFailed && (
                        <div className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      )}
                      {!isCompleted && !isRunning && !isFailed && (
                        <div className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-bold truncate ${
                          isRunning
                            ? 'text-indigo-700 dark:text-indigo-300'
                            : isCompleted
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : isFailed
                            ? 'text-rose-700 dark:text-rose-300'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {st.name}
                        </span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider ${
                          isRunning
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200 animate-pulse'
                            : isCompleted
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
                            : isFailed
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200'
                            : 'bg-slate-200/60 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {st.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {st.details}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={onRunInBackground}
              className="h-11 px-6 text-sm font-semibold rounded-xl flex items-center gap-2 border-slate-300 dark:border-slate-700"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
              <span>Close &amp; Run in Background</span>
            </Button>
          </div>
        )}

        {/* ─── State: SUCCESS ─── */}
        {state.status === 'success' && (
          <div className="w-full flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-4 border border-emerald-200 dark:border-emerald-800 shadow-md">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1.5">
              Super App Test Build Ready!
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 max-w-md">
              Fastlane has compiled the Super App container ({state.releaseVersion || 'v1.0.0'}) and published the test APK to Sonatype Nexus.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 w-full mb-6">
              <a
                href={`/api/download-apk?type=test&version=${encodeURIComponent(state.releaseVersion || 'v1.0.0')}`}
                download={`superapp-test-${state.releaseVersion || 'v1.0.0'}.apk`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold shadow-md shadow-purple-600/20 transition-all flex-1 min-w-[200px]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download Test APK ({state.releaseVersion || 'latest'})</span>
              </a>

              {onOpenSandbox && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onOpenSandbox}
                  className="h-12 px-5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>Launch Sandbox</span>
                </Button>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 px-6 text-sm font-medium rounded-xl border-slate-200 dark:border-slate-800"
            >
              Continue Managing
            </Button>
          </div>
        )}

        {/* ─── State: ERROR / FAILED ─── */}
        {state.status === 'error' && (
          <div className="w-full flex flex-col items-center">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mb-4 border border-rose-200 dark:border-rose-800 shadow-md">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 mb-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Build Pipeline Failed</span>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Super App Compilation Failed
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-md mx-auto">
                The Fastlane build pipeline encountered an error during APK packaging.
              </p>
            </div>

            {/* Diagnostic Reason Box */}
            <div className="w-full bg-rose-50/90 dark:bg-rose-950/40 p-4.5 rounded-2xl border border-rose-200 dark:border-rose-900/60 mb-6 space-y-2">
              <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 font-bold text-sm">
                <svg className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Failure Reason &amp; Diagnostics</span>
              </div>
              <p className="text-xs text-rose-800 dark:text-rose-300 font-mono leading-relaxed bg-white/70 dark:bg-slate-900/70 p-3 rounded-xl border border-rose-200/80 dark:border-rose-900/40 break-words">
                {state.errorMessage || 'Fastlane APK compilation exited with errors. Inspect Jenkins console logs at http://localhost:8085 for details.'}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 h-11 text-sm font-semibold rounded-xl border-slate-300 dark:border-slate-700"
              >
                Dismiss
              </Button>
              {onRetry && (
                <Button
                  type="button"
                  onClick={onRetry}
                  className="flex-1 h-11 text-sm font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Retry Build</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
