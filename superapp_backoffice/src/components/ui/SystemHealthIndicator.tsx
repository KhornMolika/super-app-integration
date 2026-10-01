'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { healthApi, BackendHealthResponse } from '@/api/health.api';
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XCircleIcon,
  XIcon,
  CheckIcon,
  ClockIcon,
} from '@/components/ui/Icons';

export function SystemHealthIndicator() {
  const [mounted, setMounted] = useState(false);
  const [health, setHealth] = useState<BackendHealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = async (isManual = false) => {
    if (isManual) setLoading(true);
    try {
      const data = await healthApi.check();
      setHealth(data);
      setError(null);
      setLastChecked(new Date());
    } catch (err: any) {
      setError(err?.message || 'Unable to connect to backend service');
      setHealth(null);
      setLastChecked(new Date());
    } finally {
      if (isManual) setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchHealth();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchHealth(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

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

  const handleCopyReport = () => {
    if (!health && !error) return;
    const report = {
      overallStatus: error ? 'error' : health?.status,
      timestamp: health?.timestamp || new Date().toISOString(),
      uptimeSeconds: health?.uptime,
      environment: health?.environment,
      version: health?.version,
      database: health?.services.database,
      storage: health?.services.storage,
      memory: health?.memory,
      errorDetail: error,
    };

    navigator.clipboard.writeText(JSON.stringify(report, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isDegraded = health?.status === 'degraded';
  const isError = !!error || health?.status === 'error';
  const isHealthy = !isError && !isDegraded && health?.status === 'ok';

  return (
    <>
      {/* Navbar Status Pill Trigger */}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 shadow-xs cursor-pointer border backdrop-blur-md ${
          isHealthy
            ? 'bg-brand-500/10 hover:bg-brand-500/20 text-brand-700 dark:text-brand-300 border-brand-500/30'
            : isDegraded
            ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
            : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30'
        }`}
        title="View Live System Health & Infrastructure Diagnostics"
      >
        <span className="relative flex h-2 w-2">
          {isHealthy ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </>
          ) : isDegraded ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </>
          ) : (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </>
          )}
        </span>

        {isHealthy ? (
          <>
            <CheckCircleIcon className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span className="font-medium tracking-tight">API: Online</span>
          </>
        ) : isDegraded ? (
          <>
            <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="font-medium tracking-tight">Degraded</span>
          </>
        ) : (
          <>
            <XCircleIcon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span className="font-medium tracking-tight">Offline</span>
          </>
        )}
      </button>

      {/* Diagnostics Modal Portal */}
      {showModal &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
            <div className="w-full max-w-2xl my-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xs ${
                      isHealthy
                        ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20'
                        : isDegraded
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                    }`}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        System Health & Infrastructure
                      </h3>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                          isHealthy
                            ? 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border-brand-200 dark:border-brand-800'
                            : isDegraded
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {isHealthy ? 'All Systems Operational' : isDegraded ? 'Degraded Service' : 'Service Offline'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Real-time telemetry from Backend API Engine, PostgreSQL, and MinIO S3 Storage.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Close (Esc)"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Error Banner if completely down */}
                {error && (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-start gap-3">
                    <XCircleIcon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <div className="font-bold">Gateway Connection Failed</div>
                      <div>{error}</div>
                      <div className="text-[11px] text-rose-600 dark:text-rose-400 font-mono">
                        Target endpoint: http://localhost:3000/health (BFF Proxy: /api/health)
                      </div>
                    </div>
                  </div>
                )}

                {/* Core Service Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 1. PostgreSQL Database */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">PostgreSQL DB</h4>
                          <span className="text-[11px] text-slate-500 font-mono">TypeORM Driver</span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          health?.services?.database?.status === 'connected'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {health?.services?.database?.status === 'connected' ? 'Connected' : 'Offline'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Latency</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {health?.services?.database?.responseTimeMs !== undefined
                            ? `${health.services.database.responseTimeMs} ms`
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Query Check</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          SELECT 1
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. MinIO S3 Object Storage */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-accent-50 dark:bg-accent-950/50 border border-accent-200 dark:border-accent-800 flex items-center justify-center text-accent-600 dark:text-accent-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">MinIO Storage</h4>
                          <span className="text-[11px] text-slate-500 font-mono">S3 AIStor Buckets</span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          health?.services?.storage?.status === 'connected'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {health?.services?.storage?.status === 'connected' ? 'Connected' : 'Offline'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Latency</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {health?.services?.storage?.responseTimeMs !== undefined
                            ? `${health.services.storage.responseTimeMs} ms`
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Asset Bucket</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          mini-app-assets
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3. API Gateway Runtime */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800 flex items-center justify-center text-brand-600 dark:text-brand-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">API Runtime</h4>
                          <span className="text-[11px] text-slate-500 font-mono">NestJS 11 • Node.js</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300">
                        v{health?.version || '0.0.1'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Uptime</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {health?.uptime !== undefined
                            ? `${Math.floor(health.uptime / 60)}m ${health.uptime % 60}s`
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Environment</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 uppercase">
                          {health?.environment || 'development'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Memory Footprint */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Process Memory</h4>
                          <span className="text-[11px] text-slate-500 font-mono">Heap & RSS Allocations</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Active
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Heap Used</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {health?.memory?.heapUsedMB !== undefined
                            ? `${health.memory.heapUsedMB} MB`
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Resident Set (RSS)</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {health?.memory?.rssMB !== undefined
                            ? `${health.memory.rssMB} MB`
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Timestamp Card */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Last Telemetry Sync:</span>
                    <strong className="text-slate-700 dark:text-slate-300 font-mono">
                      {lastChecked ? lastChecked.toLocaleTimeString() : 'N/A'}
                    </strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px]">Auto-refresh (10s):</span>
                    <button
                      type="button"
                      onClick={() => setAutoRefresh(!autoRefresh)}
                      className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors cursor-pointer ${
                        autoRefresh ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          autoRefresh ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs"
                >
                  {copied ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied JSON!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy Report</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchHealth(true)}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                  >
                    <svg
                      className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <span>{loading ? 'Testing...' : 'Run Diagnostic Check'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    Dismiss
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
export default SystemHealthIndicator;
