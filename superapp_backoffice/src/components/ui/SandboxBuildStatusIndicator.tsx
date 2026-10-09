'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { pubspecApi, SandboxBuildStatus } from '@/api/integrations.api';
import { useAuth } from '@/lib/auth';
import {
  GlobeIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  ArrowUpRightIcon,
  XIcon,
  CheckIcon,
  ZapIcon,
  ShieldCheckIcon,
} from '@/components/ui/Icons';

export default function SandboxBuildStatusIndicator() {
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole('SUPER_ADMIN') || hasRole('ADMIN');

  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<SandboxBuildStatus | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [copied, setCopied] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const jenkinsUrl =
    process.env.NEXT_PUBLIC_JENKINS_URL || 'http://localhost:8085';
  const jenkinsJobUrl = `${jenkinsUrl}/job/superapp-sandbox-build/`;

  const fetchStatus = async () => {
    try {
      const res = await pubspecApi.getSandboxBuildStatus();
      setStatus(res);
    } catch (_) {}
  };

  useEffect(() => {
    setMounted(true);
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll terminal to bottom when new logs arrive while modal is open
  useEffect(() => {
    if (showModal && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [showModal, status?.recentLogs]);

  // Keyboard shortcut: Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    if (showModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  const handleManualRebuild = async () => {
    setIsTriggering(true);
    try {
      await pubspecApi.triggerSandboxBuild();
      await fetchStatus();
    } catch (_) {
    } finally {
      setIsTriggering(false);
    }
  };

  const handleCopyLogs = () => {
    if (!status?.recentLogs?.length) return;
    const text = status.recentLogs.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!status || status.state === 'IDLE') return null;

  return (
    <>
      {/* Navbar Trigger Pill Badge */}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 shadow-sm cursor-pointer border backdrop-blur-md ${
          status.state === 'BUILDING'
            ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border-amber-500/40 shadow-amber-500/10'
            : status.state === 'SUCCESS'
            ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 shadow-emerald-500/10'
            : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border-rose-500/40 shadow-rose-500/10'
        }`}
        title="View SuperApp Sandbox Build Pipeline & Live Logs"
      >
        {status.state === 'BUILDING' ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <svg
              className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span className="font-medium tracking-tight">Compiling...</span>
          </>
        ) : status.state === 'SUCCESS' ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-xs shadow-emerald-500/50"></span>
            </span>
            <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium tracking-tight">Sandbox Ready</span>
          </>
        ) : (
          <>
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-xs shadow-rose-500/50"></span>
            </span>
            <AlertTriangleIcon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span className="font-medium tracking-tight">Build Failed</span>
          </>
        )}
      </button>

      {/* Enterprise Terminal Modal Portal */}
      {showModal &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
            <div className="w-full max-w-3xl my-auto bg-slate-900 rounded-2xl shadow-2xl border border-slate-750/80 overflow-hidden flex flex-col max-h-[85vh] ring-1 ring-white/10">
            
            {/* Terminal Top Window Chrome */}
            <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
              {/* Left: Window Traffic Light Controls & Title */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 select-none">
                  <span
                    onClick={() => setShowModal(false)}
                    className="w-3 h-3 rounded-full bg-rose-500/80 hover:bg-rose-500 cursor-pointer transition-colors"
                    title="Close Window"
                  />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>

                <div className="h-4 w-px bg-slate-800 mx-1" />

                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <GlobeIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-xs sm:text-sm tracking-tight">
                        SuperApp Sandbox Build Pipeline
                      </h3>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                          status.state === 'BUILDING'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                            : status.state === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {status.state}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Target: super-app (Flutter Web) • Base Href: /superapp-sandbox/
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Actions Toolbar */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLogs}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 transition-all cursor-pointer shadow-xs"
                  title="Copy logs to clipboard"
                >
                  {copied ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <a
                  href={jenkinsJobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition-all shadow-xs"
                  title="Open Jenkins Job Console"
                >
                  <ZapIcon className="w-3.5 h-3.5" />
                  <span>Jenkins</span>
                  <ArrowUpRightIcon className="w-3 h-3 opacity-70" />
                </a>

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={handleManualRebuild}
                    disabled={isTriggering || status.state === 'BUILDING'}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-50 transition-all shadow-xs cursor-pointer"
                  >
                    <svg
                      className={`w-3.5 h-3.5 ${isTriggering || status.state === 'BUILDING' ? 'animate-spin' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>{isTriggering ? 'Triggering...' : 'Rebuild'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Close (Esc)"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Terminal Screen & Log Viewer */}
            <div className="flex-1 p-4 bg-[#0a0d14] font-mono text-xs text-slate-200 overflow-y-auto max-h-[60vh] space-y-1.5 select-text scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {status.recentLogs.length === 0 ? (
                <div className="text-slate-500 py-12 text-center flex flex-col items-center gap-2">
                  <GlobeIcon className="w-6 h-6 text-slate-600 animate-pulse" />
                  <span>No compilation logs buffered yet. Build is standing by.</span>
                </div>
              ) : (
                status.recentLogs.map((line, idx) => {
                  const isError =
                    line.includes('ERROR') ||
                    line.includes('[WARN/ERR]') ||
                    line.includes('❌') ||
                    line.includes('failed');
                  const isSuccess =
                    line.includes('✅') ||
                    line.includes('[OK]') ||
                    line.includes('SUCCESS') ||
                    line.includes('successfully');
                  const isHeader = line.includes('===');

                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 px-2 py-0.5 rounded transition-colors hover:bg-white/5 font-mono ${
                        isError
                          ? 'text-rose-400 bg-rose-500/10 font-semibold'
                          : isSuccess
                          ? 'text-emerald-400 bg-emerald-500/10 font-medium'
                          : isHeader
                          ? 'text-sky-300 font-bold bg-sky-500/10 py-1'
                          : 'text-slate-300'
                      }`}
                    >
                      <span className="text-[10px] text-slate-600 select-none w-7 text-right flex-shrink-0 pt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed break-all flex-1">
                        {line}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={terminalEndRef} />
            </div>

            {/* Dark Styled Footer with Rich Metadata */}
            <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800/90 text-xs text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                  <span className="text-slate-500">Triggered By:</span>
                  <span className="font-semibold text-slate-200">
                    {status.triggeredBy || 'SuperApp Administrator'}
                  </span>
                </div>

                {status.durationMs ? (
                  <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800 text-slate-300">
                    <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>{(status.durationMs / 1000).toFixed(1)}s</span>
                  </div>
                ) : null}

                <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <ShieldCheckIcon className="w-3.5 h-3.5" />
                  <span>CI Sync Active</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {status.state === 'SUCCESS' && (
                  <a
                    href="/superapp-sandbox/index.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs cursor-pointer"
                  >
                    <GlobeIcon className="w-3.5 h-3.5" />
                    <span>Launch Live Sandbox</span>
                    <ArrowUpRightIcon className="w-3 h-3 opacity-80" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
                >
                  <span>Dismiss</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
