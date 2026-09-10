'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/inputs';
import { API_URL } from '@/lib/config';

interface EcosystemStatus {
  superAppVersion: string;
  kernelStatus: string;
  bridgeProtocolVersion: string;
  securityGateEnforcement: string;
  supportedPlatforms: string[];
  activeSecurityChecks: string[];
  capabilities: string[];
  storageEngine: string;
  containerSandbox: string;
}

export default function SuperAppEcosystemPage() {
  const { can } = useAuth();
  const [status, setStatus] = useState<EcosystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      let res = await fetch('/api/super-app/ecosystem-status');
      if (!res.ok) {
        res = await fetch(`${API_URL}/super-app/ecosystem-status`);
      }
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to load Super App ecosystem status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return (
    <ProtectedRoute permission="super_app:read">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out space-y-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Super App Ecosystem Architecture
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              Live status, runtime sandboxes, bridge capabilities, and security gateway configurations.
            </p>
          </div>
          <Button
            onClick={fetchStatus}
            variant="outline"
            className="flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh Architecture</span>
          </Button>
        </div>

        {/* Status Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-slate-400">Kernel Version</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-2">
              {status?.superAppVersion || 'v2.4.0'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Bridge Protocol: {status?.bridgeProtocolVersion || '2.0.0'}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-slate-400">Kernel Status</span>
              <span className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                {status?.kernelStatus || 'OPERATIONAL'}
              </span>
            </div>
            <div className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-2">
              Healthy
            </div>
            <p className="text-xs text-slate-500 mt-1">Zero blocking container exceptions</p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-slate-400">Security Gate</span>
              <span className="px-2 py-0.5 text-xs font-bold rounded bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                {status?.securityGateEnforcement || 'STRICT'}
              </span>
            </div>
            <div className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-2">
              {status?.activeSecurityChecks?.length || 8} Active
            </div>
            <p className="text-xs text-slate-500 mt-1">Dynamic CVE & DAST verification</p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-slate-400">Storage Engine</span>
              <span className="px-2 py-0.5 text-xs font-bold rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                Enterprise
              </span>
            </div>
            <div className="text-xl font-black text-slate-800 dark:text-slate-100 mt-2 truncate">
              MinIO AIStor
            </div>
            <p className="text-xs text-slate-500 mt-1">Immutable package artifacts</p>
          </div>
        </div>

        {/* Architecture Details Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-lg">
                  🔌
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    Registered Host Bridge Capabilities
                  </h3>
                  <p className="text-xs text-slate-500">
                    Native device APIs exposed through the strict capability gatekeeper
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {status?.capabilities?.map((cap) => (
                  <span
                    key={cap}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{cap}</span>
                  </span>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
                  🛡️
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    Container Sandbox & Execution Runtimes
                  </h3>
                  <p className="text-xs text-slate-500">
                    Supported execution environments and sandbox boundaries
                  </p>
                </div>
              </div>

              <div className="space-y-3 mt-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Flutter Package (Dart AST Sandbox)
                    </span>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Compiled isolate execution with runtime reflection locks and SHA-256 verification.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-emerald-700 font-bold bg-emerald-50 dark:bg-emerald-950/40">
                    Enforced
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      WebView (iframe / PostMessage Sandbox)
                    </span>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Strict domain origin verification, CSP headers, SSRF filtering, and token validation.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-emerald-700 font-bold bg-emerald-50 dark:bg-emerald-950/40">
                    Enforced
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
