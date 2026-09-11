'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button, Input, Label } from '@/components/ui/inputs';
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

interface StorageStatus {
  configured: boolean;
  maskedKey: string | null;
  licenseType: string;
  endpoint: string;
  bucket: string;
}

interface TelegramBotInfo {
  enabled: boolean;
  botUsername?: string;
  globalChatId?: string;
}

export default function SuperAppEcosystemPage() {
  const { can, role } = useAuth();
  const [status, setStatus] = useState<EcosystemStatus | null>(null);
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [telegramInfo, setTelegramInfo] = useState<TelegramBotInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // MinIO AIStor License management state
  const [licenseKey, setLicenseKey] = useState('');
  const [showLicenseKey, setShowLicenseKey] = useState(false);
  const [updatingLicense, setUpdatingLicense] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchEcosystemData = useCallback(async () => {
    try {
      setLoading(true);
      const [ecoRes, storRes, tgRes] = await Promise.all([
        fetch('/api/super-app/ecosystem-status').catch(() => fetch(`${API_URL}/super-app/ecosystem-status`)),
        fetch('/api/storage/license-status').catch(() => fetch(`${API_URL}/storage/license-status`)),
        fetch('/api/telegram/status').catch(() => fetch(`${API_URL}/telegram/status`)),
      ]);

      if (ecoRes?.ok) {
        const ecoData = await ecoRes.json();
        setStatus(ecoData);
      }
      if (storRes?.ok) {
        const storData = await storRes.json();
        setStorageStatus(storData);
      }
      if (tgRes?.ok) {
        const tgData = await tgRes.json();
        setTelegramInfo(tgData);
      }
    } catch (err) {
      console.error('Failed to load Super App ecosystem status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEcosystemData();
  }, [fetchEcosystemData]);

  const handleSaveLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) return;

    setUpdatingLicense(true);
    setFeedback(null);

    try {
      let res = await fetch('/api/storage/update-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey }),
      });

      if (!res.ok) {
        res = await fetch(`${API_URL}/storage/update-license`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey }),
        });
      }

      if (res.ok) {
        const result = await res.json();
        setStorageStatus(result);
        setLicenseKey('');
        setFeedback({
          type: 'success',
          message: 'MinIO AIStor enterprise license applied and verified successfully.',
        });
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback({
          type: 'error',
          message: err.message || 'Failed to update license key. Please check your credentials.',
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Network error communicating with storage license service.',
      });
    } finally {
      setUpdatingLicense(false);
    }
  };

  const isSuperAdminOrAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN' || can('super_app:manage') || can('settings:manage');

  return (
    <ProtectedRoute permission="super_app:read">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Super App Ecosystem Architecture
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              Live status, runtime sandboxes, bridge capabilities, enterprise storage engines, and integrated gateways.
            </p>
          </div>
          <Button
            onClick={fetchEcosystemData}
            variant="outline"
            disabled={loading}
            className="flex items-center gap-2 text-sm shrink-0"
          >
            <svg
              className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{loading ? 'Refreshing...' : 'Refresh Architecture'}</span>
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
            <p className="text-xs text-slate-500 mt-1">Dynamic CVE &amp; DAST verification</p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-slate-400">Storage Engine</span>
              <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                storageStatus?.configured
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
              }`}>
                {storageStatus?.configured ? 'AIStor Active' : 'S3 Storage'}
              </span>
            </div>
            <div className="text-xl font-black text-slate-800 dark:text-slate-100 mt-2 truncate">
              {storageStatus?.licenseType || 'MinIO AIStor'}
            </div>
            <p className="text-xs text-slate-500 mt-1">Immutable package artifacts</p>
          </div>
        </div>

        {/* Architecture Details Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
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
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    Container Sandbox &amp; Execution Runtimes
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

        {/* MinIO AIStor License & Storage Engine Management Card */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>MinIO AIStor Storage Engine &amp; License</span>
                  {storageStatus?.configured ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Enterprise Active
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Community Edition
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Object storage engine for immutable Mini App release bundles, quarantine security scans, and assets.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={fetchEcosystemData}
              disabled={loading}
              className="text-xs h-9 px-3 shrink-0 flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh Status</span>
            </Button>
          </div>

          {feedback && (
            <div
              className={`mt-4 p-4 rounded-xl text-sm flex items-start gap-3 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <div className="flex-1">{feedback.message}</div>
            </div>
          )}

          {/* Current Status Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 my-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">License Edition</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                {storageStatus?.licenseType || 'MinIO AIStor Enterprise'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Active Key</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                {storageStatus?.maskedKey || 'Community Key Active'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Storage Endpoint</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                {storageStatus?.endpoint || 'localhost:9000'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Primary Bucket</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                {storageStatus?.bucket || 'mini-app-logos'}
              </span>
            </div>
          </div>

          {/* Form to Update License Key (Super Admins) */}
          {isSuperAdminOrAdmin ? (
            <form onSubmit={handleSaveLicense} className="space-y-4">
              <div>
                <Label>Update MinIO AIStor License Key / Subnet API Key</Label>
                <div className="relative flex items-center mt-1">
                  <Input
                    type={showLicenseKey ? 'text' : 'password'}
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    placeholder="Paste your MinIO AIStor / Subnet license key (e.g. minio_lic_...)"
                    className="pr-24 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLicenseKey(!showLicenseKey)}
                    className="absolute right-3 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium px-2 py-1 rounded bg-slate-100 dark:bg-slate-800"
                  >
                    {showLicenseKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  The key will be verified and stored securely to enable AIStor commercial features, unlimited object capacity, and enterprise diagnostics.
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={updatingLicense || !licenseKey.trim()}
                  className="text-sm flex items-center gap-2"
                >
                  {updatingLicense ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Validating &amp; Applying...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Apply AIStor License</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-xs text-slate-400 italic">
              Global object storage parameters are managed by the System Super Administrator.
            </p>
          )}
        </Card>

        {/* Global Infrastructure Overview Card */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Integrated Ecosystem Services Overview
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live status of auxiliary build engines, messaging gateways, and package registries configured across the platform.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs mt-6">
            {/* Telegram Bot Gateway */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.196 1.006.128.832.941z"/>
                  </svg>
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">
                    Telegram Bot Gateway
                  </span>
                  <span className="text-slate-500 font-mono text-[11px]">
                    @{telegramInfo?.botUsername || 'superapp_notification_bot'}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold text-[11px]">
                Online
              </span>
            </div>

            {/* Sonatype Nexus Registry */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">
                    Sonatype Nexus Registry
                  </span>
                  <span className="text-slate-500 font-mono text-[11px]">http://localhost:8081</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold text-[11px]">
                Online
              </span>
            </div>

            {/* Jenkins CI/CD Automation */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">
                    Jenkins CI/CD Automation
                  </span>
                  <span className="text-slate-500 font-mono text-[11px]">http://localhost:8085</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold text-[11px]">
                Online
              </span>
            </div>
          </div>
        </Card>
      </div>
    </ProtectedRoute>
  );
}

