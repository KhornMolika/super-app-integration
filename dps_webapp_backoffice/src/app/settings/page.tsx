'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card } from '@/components/ui/card';
import { Button, Input, Label } from '@/components/ui/inputs';

export default function SettingsPage() {
  const [licenseKey, setLicenseKey] = useState('');
  const [showLicenseKey, setShowLicenseKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingStatus, setFetchingStatus] = useState(true);
  const [status, setStatus] = useState<{
    configured: boolean;
    maskedKey: string | null;
    licenseType: string;
    endpoint: string;
    bucket: string;
  } | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | null;
    message: string | null;
  }>({ type: null, message: null });

  // Fetch initial license status
  const fetchLicenseStatus = async () => {
    try {
      setFetchingStatus(true);
      const res = await fetch('/api/storage/license-status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to load license status:', err);
    } finally {
      setFetchingStatus(false);
    }
  };

  useEffect(() => {
    fetchLicenseStatus();
  }, []);

  const handleSaveLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) {
      setFeedback({
        type: 'error',
        message: 'Please enter a valid MinIO AIStor license key or API token.',
      });
      return;
    }

    setLoading(true);
    setFeedback({ type: null, message: null });

    try {
      const res = await fetch('/api/storage/update-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: licenseKey.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatus({
          configured: data.configured,
          maskedKey: data.maskedKey,
          licenseType: data.licenseType,
          endpoint: data.endpoint,
          bucket: data.bucket,
        });
        setLicenseKey('');
        setFeedback({
          type: 'success',
          message: 'MinIO AIStor license key updated and verified successfully!',
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.message || 'Failed to apply license key.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Network error while connecting to server.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute permission="settings:manage">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out space-y-8 max-w-5xl">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              System Settings
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              Configure global infrastructure, MinIO AIStor licensing, and integration parameters.
            </p>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback.message && (
          <div
            className={`p-4 rounded-xl border text-sm flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{feedback.type === 'success' ? '✓' : '✗'}</span>
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback({ type: null, message: null })}
              className="text-xs font-semibold underline opacity-75 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* MinIO AIStor License Card */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center text-2xl font-bold">
                🪣
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  MinIO AIStor License & API Key
                  {status?.configured ? (
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
                  Commercial object storage license for quarantine package validation and UI assets.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={fetchLicenseStatus}
              disabled={fetchingStatus}
              className="text-xs h-9 px-3 shrink-0"
            >
              {fetchingStatus ? 'Checking...' : 'Refresh Status'}
            </Button>
          </div>

          {/* Current Status Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">License Edition</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {status?.licenseType || 'Loading...'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Active Key</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {status?.maskedKey || 'No custom license key set'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Storage Endpoint</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {status?.endpoint || 'localhost:9000'}
              </span>
            </div>
          </div>

          {/* Form to Update License Key */}
          <form onSubmit={handleSaveLicense} className="space-y-4">
            <div>
              <Label>Enter MinIO AIStor License Key / Subnet API Key</Label>
              <div className="relative flex items-center">
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
              <Button type="submit" disabled={loading || !licenseKey.trim()} className="text-sm">
                {loading ? 'Validating & Applying...' : 'Apply AIStor License'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Global Infrastructure Overview Card */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
            Integrated Services Overview
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Status of auxiliary build and registry services configured across the platform.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">
                  Sonatype Nexus Registry
                </span>
                <span className="text-slate-500 font-mono">http://localhost:8081</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                Online
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">
                  Jenkins CI/CD Automation
                </span>
                <span className="text-slate-500 font-mono">http://localhost:8085</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                Online
              </span>
            </div>
          </div>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
