'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  AlertTriangleIcon,
  RefreshIcon,
  CheckCircleIcon,
  ClockIcon,
  SettingsIcon,
  ArrowRightIcon,
  XCircleIcon,
  CheckIcon,
} from '@/components/ui/Icons';
import { healthApi, BackendHealthResponse } from '@/api/health.api';

export interface BackendServiceOfflineNoticeProps {
  mode?: 'page' | 'card' | 'banner';
  title?: string;
  message?: string;
  statusCode?: number;
  code?: string;
  onRetry?: () => void | Promise<void>;
  autoRetrySeconds?: number;
  showDiagnosticsButton?: boolean;
  showTroubleshooting?: boolean;
  className?: string;
}

export function BackendServiceOfflineNotice({
  mode = 'card',
  title = 'Backend Service Unreachable',
  message,
  statusCode = 503,
  code = 'BACKEND_SERVICE_DOWN',
  onRetry,
  autoRetrySeconds = 5,
  showDiagnosticsButton = true,
  showTroubleshooting = true,
  className = '',
}: BackendServiceOfflineNoticeProps) {
  const [retrying, setRetrying] = useState(false);
  const [countdown, setCountdown] = useState<number>(autoRetrySeconds);
  const [autoRetryActive, setAutoRetryActive] = useState(autoRetrySeconds > 0);
  const [showTroubleshootDetails, setShowTroubleshootDetails] = useState(false);
  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<{
    tested: boolean;
    online: boolean;
    latencyMs?: number;
    error?: string;
  } | null>(null);

  const displayMessage =
    message ||
    'Backend service is currently unreachable. It may be starting up or restarting. Please try again shortly.';

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    setDiagnosticResult(null);
    try {
      if (onRetry) {
        await onRetry();
      } else {
        // Default behavior: check health and refresh if successful
        const health = await healthApi.check();
        if (health && health.status === 'ok') {
          window.location.reload();
        }
      }
    } catch (err: any) {
      setDiagnosticResult({
        tested: true,
        online: false,
        error: err?.message || 'Connection refused (ECONNREFUSED)',
      });
    } finally {
      setRetrying(false);
      setCountdown(autoRetrySeconds);
    }
  }, [onRetry, autoRetrySeconds]);

  // Live auto-retry timer
  useEffect(() => {
    if (!autoRetryActive || autoRetrySeconds <= 0 || retrying) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleRetry();
          return autoRetrySeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRetryActive, autoRetrySeconds, retrying, handleRetry]);

  // Run quick live diagnostic check
  const runQuickDiagnostic = async () => {
    setDiagnosticsRunning(true);
    const start = performance.now();
    try {
      const data = await healthApi.check();
      const elapsed = Math.round(performance.now() - start);
      setDiagnosticResult({
        tested: true,
        online: true,
        latencyMs: elapsed,
      });
      // If service is back, trigger retry
      if (onRetry) {
        onRetry();
      }
    } catch (err: any) {
      setDiagnosticResult({
        tested: true,
        online: false,
        error: err?.message || 'Backend server is not listening on port 3000.',
      });
    } finally {
      setDiagnosticsRunning(false);
    }
  };

  // BANNER MODE (Compact top / table alert)
  if (mode === 'banner') {
    return (
      <div
        className={`p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 text-amber-900 dark:text-amber-200 shadow-sm animate-in fade-in duration-300 ${className}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangleIcon className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  HTTP {statusCode}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{displayMessage}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {autoRetryActive && (
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <ClockIcon className="w-3.5 h-3.5 text-amber-500" />
                <span>Retrying in {countdown}s</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
            >
              <RefreshIcon className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
              <span>{retrying ? 'Connecting...' : 'Retry Now'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CARD / FULL PAGE MODE
  const isPage = mode === 'page';

  return (
    <div
      className={`${
        isPage
          ? 'min-h-[75vh] flex items-center justify-center p-4 sm:p-6'
          : 'w-full my-6'
      } ${className}`}
    >
      <div
        className={`w-full ${
          isPage ? 'max-w-2xl' : 'max-w-3xl mx-auto'
        } bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-amber-200/80 dark:border-amber-900/50 overflow-hidden animate-in fade-in zoom-in-95 duration-200`}
      >
        {/* Top Status Bar with pulsing accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 animate-pulse" />

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header section with Icon, Title, and Badges */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-xs">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border-2 border-white dark:border-slate-900"></span>
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {title}
                </h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    HTTP {statusCode}
                  </span>
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {code}
                  </span>
                </div>
              </div>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {displayMessage}
              </p>

              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span>
                  The web application is active, but the core API service (
                  <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                    http://localhost:3000
                  </code>
                  ) is currently not responding to requests.
                </span>
              </div>
            </div>
          </div>

          {/* Auto-retry Progress & Control Bar */}
          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
                <ClockIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>
                  {autoRetryActive
                    ? `Auto-reconnecting in ${countdown} second${countdown === 1 ? '' : 's'}...`
                    : 'Auto-reconnect is paused.'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setAutoRetryActive(!autoRetryActive)}
                className="text-[11px] text-amber-700 dark:text-amber-300 hover:underline font-semibold cursor-pointer"
              >
                {autoRetryActive ? 'Pause Auto-Retry' : 'Resume Auto-Retry'}
              </button>
            </div>

            {/* Visual Countdown Progress Bar */}
            {autoRetryActive && (
              <div className="w-full h-1.5 bg-amber-200/60 dark:bg-amber-900/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${Math.max(0, Math.min(100, (countdown / autoRetrySeconds) * 100))}%`,
                  }}
                />
              </div>
            )}
          </div>

          {/* Quick Inline Diagnostic Feedback (if run) */}
          {diagnosticResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
                diagnosticResult.online
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {diagnosticResult.online ? (
                  <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <XCircleIcon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <span>
                  {diagnosticResult.online
                    ? `Service Responded! Online in ${diagnosticResult.latencyMs}ms. Reloading view...`
                    : `Health Check Failed: ${diagnosticResult.error}`}
                </span>
              </div>
              {diagnosticResult.online && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Ready
                </span>
              )}
            </div>
          )}

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-50 transition-all shadow-sm shadow-amber-600/20 cursor-pointer"
            >
              <RefreshIcon className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
              <span>{retrying ? 'Connecting to API...' : 'Retry Connection Now'}</span>
            </button>

            {showDiagnosticsButton && (
              <button
                type="button"
                onClick={runQuickDiagnostic}
                disabled={diagnosticsRunning}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 active:scale-95 disabled:opacity-50 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <SettingsIcon className={`w-4 h-4 ${diagnosticsRunning ? 'animate-spin' : ''}`} />
                <span>{diagnosticsRunning ? 'Testing /api/health...' : 'Test Health Endpoint'}</span>
              </button>
            )}

            {isPage && (
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer ml-auto"
              >
                <span>Dashboard</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            )}
          </div>

          {/* Expandable Troubleshooting Guide */}
          {showTroubleshooting && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowTroubleshootDetails(!showTroubleshootDetails)}
                className="flex items-center justify-between w-full text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer py-1"
              >
                <span className="flex items-center gap-1.5">
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${showTroubleshootDetails ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                  <span>Troubleshooting & Technical Details</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  {showTroubleshootDetails ? 'Hide' : 'Show Details'}
                </span>
              </button>

              {showTroubleshootDetails && (
                <div className="mt-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-xs space-y-3 font-sans animate-in fade-in duration-150">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Common causes for unreachable backend:
                    </div>
                    <ul className="space-y-1.5 text-slate-600 dark:text-slate-400 list-disc list-inside">
                      <li>
                        <strong>Dev Server Starting / Compiling:</strong> The NestJS backend (
                        <code className="font-mono text-[11px]">pnpm run start:dev</code>) is compiling TypeScript or restarting after a code edit.
                      </li>
                      <li>
                        <strong>Database Initialization:</strong> PostgreSQL container or TypeORM sync is connecting on port 5432.
                      </li>
                      <li>
                        <strong>Network / Port Conflict:</strong> Port 3000 is occupied or not bound to <code className="font-mono text-[11px]">0.0.0.0</code>.
                      </li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] space-y-1.5 overflow-x-auto">
                    <div className="text-slate-400">// Quick terminal checks:</div>
                    <div className="text-emerald-400"># Verify backend dev server is active:</div>
                    <div className="text-slate-100">cd d:\Projects\fintect\superapp-poc\superapp_backend && pnpm run start:dev</div>
                    <div className="text-emerald-400 mt-1"># Test endpoint directly:</div>
                    <div className="text-slate-100">curl http://localhost:3000/health</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BackendServiceOfflineNotice;
