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

  // Telegram States
  const [telegramStatus, setTelegramStatus] = useState<{
    isEnabled: boolean;
    botUsername: string;
    hasDefaultChat: boolean;
    user: {
      id: string;
      email: string;
      name: string;
      telegramChatId: string | null;
      telegramUsername: string | null;
      telegramConnectedAt: string | null;
      isConnected: boolean;
    } | null;
  } | null>(null);
  const [fetchingTelegram, setFetchingTelegram] = useState(true);
  const [checkingSync, setCheckingSync] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [showManualTelegram, setShowManualTelegram] = useState(false);
  const [manualChatId, setManualChatId] = useState('');
  const [manualUsername, setManualUsername] = useState('');

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

  // Fetch Telegram status
  const fetchTelegramStatus = async () => {
    try {
      setFetchingTelegram(true);
      const res = await fetch('/api/telegram/status');
      if (res.ok) {
        const data = await res.json();
        setTelegramStatus(data);
      }
    } catch (err) {
      console.error('Failed to load telegram status:', err);
    } finally {
      setFetchingTelegram(false);
    }
  };

  useEffect(() => {
    fetchLicenseStatus();
    fetchTelegramStatus();
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

  const handleOneClickConnect = async () => {
    try {
      const res = await fetch('/api/telegram/connect-url');
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.open(data.url, '_blank');
          setFeedback({
            type: 'success',
            message: 'Telegram opened! Tap START in the bot, then click "Check & Sync Connection".',
          });
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to generate Telegram connect link.' });
    }
  };

  const handleCheckSync = async () => {
    setCheckingSync(true);
    try {
      const res = await fetch('/api/telegram/check-sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.linked) {
        await fetchTelegramStatus();
        setFeedback({
          type: 'success',
          message: 'Your Telegram account has been linked successfully!',
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.message || 'No /start command detected yet. Please tap START in the Telegram bot.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to sync with Telegram.' });
    } finally {
      setCheckingSync(false);
    }
  };

  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualChatId.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/telegram/manual-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: manualChatId.trim(), username: manualUsername.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchTelegramStatus();
        setShowManualTelegram(false);
        setManualChatId('');
        setManualUsername('');
        setFeedback({
          type: 'success',
          message: 'Telegram Chat ID connected successfully!',
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.message || 'Failed to link Chat ID.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to link Chat ID.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestMessage = async () => {
    setSendingTest(true);
    try {
      const res = await fetch('/api/telegram/test-user', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: 'Test notification sent! Check your Telegram app.',
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.message || 'Failed to send test message. Verify your Chat ID.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to send test message.' });
    } finally {
      setSendingTest(false);
    }
  };

  const handleDisconnectTelegram = async () => {
    if (!confirm('Are you sure you want to disconnect Telegram notifications?')) return;
    try {
      const res = await fetch('/api/telegram/disconnect', { method: 'POST' });
      if (res.ok) {
        await fetchTelegramStatus();
        setFeedback({
          type: 'success',
          message: 'Telegram notifications have been disconnected from your account.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to disconnect Telegram.' });
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
              Configure global infrastructure, MinIO AIStor licensing, and real-time Telegram notification routing.
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

        {/* Telegram Direct Notifications Card (Approach 2) */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center text-2xl font-bold">
                ✈️
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Telegram Direct Notifications
                  {telegramStatus?.user?.isConnected ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Connected
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      Not Connected
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Receive instant personal alerts for Mini App validations, security scan results, reviews, and test builds.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={fetchTelegramStatus}
              disabled={fetchingTelegram}
              className="text-xs h-9 px-3 shrink-0"
            >
              {fetchingTelegram ? 'Checking...' : 'Refresh Status'}
            </Button>
          </div>

          {/* Telegram Status Body */}
          {telegramStatus?.user?.isConnected ? (
            <div className="my-6 space-y-4">
              <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium block">Telegram Account</span>
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm">
                      {telegramStatus.user.telegramUsername ? `@${telegramStatus.user.telegramUsername}` : 'Direct Chat Active'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium block">Chat ID</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {telegramStatus.user.telegramChatId}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium block">Connected At</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {telegramStatus.user.telegramConnectedAt ? new Date(telegramStatus.user.telegramConnectedAt).toLocaleDateString() : 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  type="button"
                  onClick={handleSendTestMessage}
                  disabled={sendingTest}
                  className="text-xs bg-sky-600 hover:bg-sky-500 text-white"
                >
                  {sendingTest ? 'Sending Test...' : 'Send Test Notification'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDisconnectTelegram}
                  className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400"
                >
                  Disconnect Telegram
                </Button>
              </div>
            </div>
          ) : (
            <div className="my-6 space-y-6">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                <p className="text-slate-700 dark:text-slate-300">
                  Connect your Telegram account to get direct real-time alerts whenever:
                </p>
                <ul className="list-disc list-inside text-slate-500 dark:text-slate-400 space-y-1">
                  <li>Your Mini App completes automated security scans (with compliance score &amp; findings)</li>
                  <li>A test build APK or sandbox container is ready for testing</li>
                  <li>A revision is submitted, approved, or rejected by the Super App Administrator</li>
                </ul>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={handleOneClickConnect}
                  className="text-sm bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center gap-2"
                >
                  <span>✈️ 1-Click Connect with Telegram</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCheckSync}
                  disabled={checkingSync}
                  className="text-xs"
                >
                  {checkingSync ? 'Checking Sync...' : 'Check & Sync Connection'}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowManualTelegram(!showManualTelegram)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline ml-2"
                >
                  {showManualTelegram ? 'Hide manual setup' : 'Enter Chat ID manually'}
                </button>
              </div>

              {/* Manual Input Fallback */}
              {showManualTelegram && (
                <form onSubmit={handleManualConnect} className="p-4 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Telegram Chat ID *</Label>
                      <Input
                        type="text"
                        value={manualChatId}
                        onChange={(e) => setManualChatId(e.target.value)}
                        placeholder="e.g. 1193078022"
                        className="font-mono text-sm"
                        required
                      />
                    </div>
                    <div>
                      <Label>Telegram Username (Optional)</Label>
                      <Input
                        type="text"
                        value={manualUsername}
                        onChange={(e) => setManualUsername(e.target.value)}
                        placeholder="e.g. khornmolika"
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading || !manualChatId.trim()} className="text-xs">
                    Save Chat ID
                  </Button>
                </form>
              )}
            </div>
          )}
        </Card>

        {/* MinIO AIStor License Card */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center text-2xl font-bold">
                🪣
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  MinIO AIStor License &amp; API Key
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
            Status of auxiliary build, messaging, and registry services configured across the platform.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">
                  Telegram Bot Gateway
                </span>
                <span className="text-slate-500 font-mono">@{telegramStatus?.botUsername || 'superapp_notification_bot'}</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                Online
              </span>
            </div>

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
