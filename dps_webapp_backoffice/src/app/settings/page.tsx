'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button, Input, Label } from '@/components/ui/inputs';

export default function SettingsPage() {
  const { role, can } = useAuth();

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
  const [loading, setLoading] = useState(false);
  const [showManualTelegram, setShowManualTelegram] = useState(false);
  const [manualChatId, setManualChatId] = useState('');
  const [manualUsername, setManualUsername] = useState('');

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | null;
    message: string | null;
  }>({ type: null, message: null });

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
    fetchTelegramStatus();
  }, []);

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

  const userDisplayName =
    telegramStatus?.user?.name ||
    (role === 'MINI_APP_MANAGER'
      ? 'Mini App Manager'
      : role === 'ADMIN'
      ? 'Super App Administrator'
      : role === 'SUPER_ADMIN'
      ? 'System Super Admin'
      : 'Developer');

  const userEmail =
    telegramStatus?.user?.email ||
    (role === 'MINI_APP_MANAGER'
      ? 'manager@example.com'
      : role === 'ADMIN'
      ? 'admin@example.com'
      : role === 'SUPER_ADMIN'
      ? 'superadmin@example.com'
      : 'dev@example.com');

  const roleBadgeLabel =
    role === 'MINI_APP_MANAGER'
      ? 'Mini App Manager'
      : role === 'ADMIN'
      ? 'Administrator'
      : role === 'SUPER_ADMIN'
      ? 'Super Admin'
      : 'Developer';

  return (
    <ProtectedRoute>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out space-y-8 max-w-5xl">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Settings &amp; Profile
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              Manage your account profile, personal Telegram direct notifications, and platform infrastructure.
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
              {feedback.type === 'success' ? (
                <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
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

        {/* User Profile & Role Overview Card */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xl">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {userDisplayName}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30">
                    {roleBadgeLabel}
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                  {userEmail}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Organization: <strong className="text-slate-900 dark:text-white">Financial Services Authority</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 p-4 bg-slate-50/70 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">Account Status</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Active
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Telegram Alerts</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm mt-0.5 block">
                {telegramStatus?.user?.isConnected ? (
                  <span className="text-sky-600 dark:text-sky-400">
                    {telegramStatus.user.telegramUsername ? `@${telegramStatus.user.telegramUsername}` : 'Connected'}
                  </span>
                ) : (
                  <span className="text-slate-400">Not Linked</span>
                )}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Scope / Role Type</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm mt-0.5 block">
                {role === 'MINI_APP_MANAGER' ? 'Mini App Submissions & Management' : 'Super App Administration'}
              </span>
            </div>
          </div>
        </Card>

        {/* Telegram Direct Notifications Card (Approach 2) */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
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
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                  </svg>
                  <span>1-Click Connect with Telegram</span>
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
      </div>
    </ProtectedRoute>
  );
}
