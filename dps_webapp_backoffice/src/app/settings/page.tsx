'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button, Input, Label } from '@/components/ui/inputs';

export default function SettingsPage() {
  const { role, user } = useAuth();

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
      teamTelegramChatId: string | null;
      isConnected: boolean;
    } | null;
  } | null>(null);

  const [fetchingTelegram, setFetchingTelegram] = useState(true);
  const [checkingSync, setCheckingSync] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingTeamTest, setSendingTeamTest] = useState(false);
  const [savingTeamChat, setSavingTeamChat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showManualTelegram, setShowManualTelegram] = useState(false);
  const [manualChatId, setManualChatId] = useState('');
  const [manualUsername, setManualUsername] = useState('');
  const [teamChatIdInput, setTeamChatIdInput] = useState('');
  const [copiedChatId, setCopiedChatId] = useState(false);
  const [copiedTeamChatId, setCopiedTeamChatId] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'botfather' | 'personal' | 'group'>('botfather');

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
        if (data.user?.teamTelegramChatId) {
          setTeamChatIdInput(data.user.teamTelegramChatId);
        }
      }
    } catch (err) {
      console.error('Failed to load telegram status:', err);
    } finally {
      setFetchingTelegram(false);
    }
  };

  useEffect(() => {
    fetchTelegramStatus();
  }, [role]);

  const handleOneClickConnect = async () => {
    try {
      const res = await fetch('/api/telegram/connect-url');
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.open(data.url, '_blank');
          setFeedback({
            type: 'success',
            message: 'Telegram bot opened! Tap START in the app, then click "Check & Sync Connection".',
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
          message: 'Your Telegram account has been linked successfully! Test message can be sent below.',
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.message || 'No /start command detected yet. Please tap START in the Telegram bot chat first.',
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
          message: 'Personal Telegram Chat ID connected successfully!',
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

  const handleSaveTeamChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTeamChat(true);
    try {
      const res = await fetch('/api/telegram/save-team-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamTelegramChatId: teamChatIdInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchTelegramStatus();
        setFeedback({
          type: 'success',
          message: 'Team Telegram Channel / Group ID saved successfully!',
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.message || 'Failed to save Team Telegram ID.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save Team Telegram ID.' });
    } finally {
      setSavingTeamChat(false);
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
          message: 'Personal test notification delivered! Please check your private Telegram chat with the bot.',
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

  const handleSendTeamTestMessage = async () => {
    const targetChat = teamChatIdInput.trim() || telegramStatus?.user?.teamTelegramChatId;
    if (!targetChat) {
      setFeedback({
        type: 'error',
        message: 'Please enter a Team Telegram Channel / Group ID first.',
      });
      return;
    }

    setSendingTeamTest(true);
    try {
      const res = await fetch('/api/telegram/test-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: targetChat,
          miniAppName: role === 'SUPER_ADMIN' || role === 'ADMIN' ? 'DPS Super App Operations' : 'Mini App Team Channel',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: `Team test alert sent to ${targetChat}! Please check your Telegram group.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.message || 'Failed to send team alert. Make sure the bot is added to your group/channel as Admin.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to send team alert.' });
    } finally {
      setSendingTeamTest(false);
    }
  };

  const handleDisconnectTelegram = async () => {
    if (!confirm('Are you sure you want to disconnect personal Telegram notifications from this account?')) return;
    try {
      const res = await fetch('/api/telegram/disconnect', { method: 'POST' });
      if (res.ok) {
        await fetchTelegramStatus();
        setFeedback({
          type: 'success',
          message: 'Personal Telegram direct notifications disconnected.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to disconnect Telegram.' });
    }
  };

  const copyToClipboard = (text: string, isTeam = false) => {
    navigator.clipboard.writeText(text);
    if (isTeam) {
      setCopiedTeamChatId(true);
      setTimeout(() => setCopiedTeamChatId(false), 2000);
    } else {
      setCopiedChatId(true);
      setTimeout(() => setCopiedChatId(false), 2000);
    }
  };

  const userDisplayName = user.name;
  const userEmail = user.email;

  const roleBadgeStyle =
    role === 'MINI_APP_MANAGER'
      ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800'
      : role === 'SUPER_ADMIN'
      ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800'
      : role === 'DEVELOPER'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
      : 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950/50 dark:text-brand-300 dark:border-brand-800';

  const roleBadgeLabel = role
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  const initials = userDisplayName
    .split(' ')
    .map((w) => w.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const accessScopeLabel =
    role === 'SUPER_ADMIN'
      ? 'Super App Global Administration & Root Governance'
      : role === 'ADMIN'
      ? 'Super App Platform Administration'
      : role === 'MINI_APP_MANAGER'
      ? 'Mini App Submissions & Management'
      : 'Mini App Development & Integration';

  const isConnected = Boolean(telegramStatus?.user?.isConnected);
  const hasTeamChat = Boolean(telegramStatus?.user?.teamTelegramChatId);

  return (
    <ProtectedRoute>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out space-y-8 w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider mb-1">
              <span>Account &amp; Notifications</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Settings &amp; Profile
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              Manage your personal user profile identity, direct personal alerts, and team notification channels.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Session Active</span>
            </span>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback.message && (
          <div
            className={`p-4 rounded-2xl border text-sm flex items-start justify-between gap-3 transition-all ${
              feedback.type === 'success'
                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {feedback.type === 'success' ? (
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              <span className="leading-snug">{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback({ type: null, message: null })}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* CARD 1: User Profile & Role Overview */}
        {/* ------------------------------------------------------------- */}
        <Card className="p-6 overflow-hidden relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm shrink-0">
                {initials}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {userDisplayName}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${roleBadgeStyle}`}>
                    {roleBadgeLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-mono text-slate-500 dark:text-slate-400">
                    {userEmail}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Organization: <strong className="text-slate-900 dark:text-white">Financial Services Authority (FSA)</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
              <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider">Account Status</span>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">Active &amp; Verified</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
              <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider">Personal Telegram</span>
              <div className="flex items-center gap-2 mt-1.5">
                {isConnected ? (
                  <span className="font-bold text-sky-600 dark:text-sky-400 text-sm inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                    <span>{telegramStatus?.user?.telegramUsername ? `@${telegramStatus.user.telegramUsername}` : 'Direct Chat Active'}</span>
                  </span>
                ) : (
                  <span className="font-medium text-slate-400 text-sm">Not Connected</span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
              <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider">Access Scope</span>
              <div className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-1.5 truncate">
                {accessScopeLabel}
              </div>
            </div>
          </div>
        </Card>

        {/* ------------------------------------------------------------- */}
        {/* CARD 2: Telegram Direct Notifications (Personal 1-on-1) */}
        {/* ------------------------------------------------------------- */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Personal Direct Telegram Notifications
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      isConnected
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {isConnected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  1-on-1 private bot chat for security scans, review approvals, and test build APK readiness.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={fetchTelegramStatus}
              disabled={fetchingTelegram}
              className="text-xs h-9 px-3 shrink-0 flex items-center gap-1.5"
            >
              <svg className={`w-3.5 h-3.5 text-slate-500 ${fetchingTelegram ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{fetchingTelegram ? 'Checking...' : 'Refresh Status'}</span>
            </Button>
          </div>

          {/* Connected State View */}
          {isConnected ? (
            <div className="my-6 space-y-6">
              <div className="p-5 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/30 dark:to-teal-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/60">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <span className="text-xs font-bold uppercase text-emerald-800/60 dark:text-emerald-300/60 block tracking-wider">
                      Connected Handle
                    </span>
                    <span className="font-bold text-emerald-900 dark:text-emerald-200 text-base mt-1 block">
                      {telegramStatus?.user?.telegramUsername ? `@${telegramStatus.user.telegramUsername}` : 'Direct User Chat'}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase text-emerald-800/60 dark:text-emerald-300/60 block tracking-wider">
                      Personal Chat ID
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                        {telegramStatus?.user?.telegramChatId}
                      </span>
                      {telegramStatus?.user?.telegramChatId && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(telegramStatus?.user?.telegramChatId || '')}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          title="Copy Chat ID"
                        >
                          {copiedChatId ? (
                            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase text-emerald-800/60 dark:text-emerald-300/60 block tracking-wider">
                      Delivery Channel
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300 text-sm mt-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      1-on-1 Direct Chat Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={handleSendTestMessage}
                  disabled={sendingTest}
                  className="text-sm bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center gap-2 rounded-xl"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>{sendingTest ? 'Sending Test Alert...' : 'Send Test Personal Alert'}</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDisconnectTelegram}
                  className="text-sm text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900 rounded-xl"
                >
                  Disconnect Personal Telegram
                </Button>
              </div>
            </div>
          ) : (
            /* Disconnected State */
            <div className="my-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
                  <div className="w-7 h-7 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-300 font-bold text-xs flex items-center justify-center mb-2.5">
                    1
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Open Telegram Bot</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Click 1-Click Connect to launch <strong>@{telegramStatus?.botUsername || 'superapp_notification_bot'}</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
                  <div className="w-7 h-7 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-300 font-bold text-xs flex items-center justify-center mb-2.5">
                    2
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Tap &quot;START&quot;</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    In Telegram, press <strong>START</strong> to register your personal Chat ID automatically.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
                  <div className="w-7 h-7 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-300 font-bold text-xs flex items-center justify-center mb-2.5">
                    3
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Sync &amp; Confirm</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Return here and click <strong>Check &amp; Sync Connection</strong> to activate real-time alerts.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  type="button"
                  onClick={handleOneClickConnect}
                  className="text-sm bg-[#229ED9] hover:bg-[#1E8BC0] text-white font-bold shadow-sm rounded-xl px-5 py-2.5 flex items-center gap-2.5 transition-transform active:scale-95"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                  </svg>
                  <span>1-Click Connect with Telegram</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCheckSync}
                  disabled={checkingSync}
                  className="text-sm rounded-xl flex items-center gap-2"
                >
                  <svg className={`w-4 h-4 text-slate-500 ${checkingSync ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{checkingSync ? 'Syncing...' : 'Check & Sync Connection'}</span>
                </Button>

                <button
                  type="button"
                  onClick={() => setShowManualTelegram(!showManualTelegram)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold underline ml-2"
                >
                  {showManualTelegram ? 'Hide manual Chat ID input' : 'Enter Chat ID manually'}
                </button>
              </div>

              {showManualTelegram && (
                <form onSubmit={handleManualConnect} className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-300">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Manual Chat ID Entry
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Telegram Chat ID *</Label>
                      <Input
                        type="text"
                        value={manualChatId}
                        onChange={(e) => setManualChatId(e.target.value)}
                        placeholder="e.g. 1193078022"
                        className="font-mono text-sm mt-1"
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
                        className="text-sm mt-1"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading || !manualChatId.trim()} className="text-xs rounded-xl">
                    Save Chat ID
                  </Button>
                </form>
              )}
            </div>
          )}
        </Card>

        {/* ------------------------------------------------------------- */}
        {/* CARD 3: Team / Platform Group Notifications */}
        {/* ------------------------------------------------------------- */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Team &amp; Platform Group Notifications
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      hasTeamChat
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {hasTeamChat ? 'Group Configured' : 'No Group Set'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {role === 'SUPER_ADMIN' || role === 'ADMIN'
                    ? 'Default broadcast Telegram group for Super App Operations, review alerts, and system issues.'
                    : 'Default broadcast Telegram channel/group for your team and registered Mini Apps.'}
                </p>
              </div>
            </div>
          </div>

          <div className="my-6 space-y-4">
            <form onSubmit={handleSaveTeamChat} className="space-y-4">
              <div>
                <Label className="flex items-center gap-1.5">
                  <span>Team / Platform Telegram Group Chat ID</span>
                  <span className="text-xs text-slate-400 font-normal">(starts with -100...)</span>
                </Label>
                <div className="flex flex-col sm:flex-row gap-3 mt-1.5">
                  <Input
                    type="text"
                    value={teamChatIdInput}
                    onChange={(e) => setTeamChatIdInput(e.target.value)}
                    placeholder="e.g. -1002345678901 or @my_team_group"
                    className="font-mono text-sm flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={savingTeamChat}
                    className="text-xs font-semibold px-4 rounded-xl shrink-0"
                  >
                    {savingTeamChat ? 'Saving...' : 'Save Group ID'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendTeamTestMessage}
                    disabled={sendingTeamTest || (!teamChatIdInput.trim() && !telegramStatus?.user?.teamTelegramChatId)}
                    className="text-xs px-4 rounded-xl shrink-0 flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>{sendingTeamTest ? 'Sending Test...' : 'Send Test Group Alert'}</span>
                  </Button>
                </div>
              </div>
            </form>

            {telegramStatus?.user?.teamTelegramChatId && (
              <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  <span className="text-indigo-900 dark:text-indigo-200">
                    Active Team Channel: <strong className="font-mono">{telegramStatus.user.teamTelegramChatId}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(telegramStatus.user?.teamTelegramChatId || '', true)}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                >
                  {copiedTeamChatId ? <span>Copied!</span> : <span>Copy Group ID</span>}
                </button>
              </div>
            )}
          </div>
        </Card>

        {/* ------------------------------------------------------------- */}
        {/* CARD 4: Interactive Step-by-Step Guideline Drawer */}
        {/* ------------------------------------------------------------- */}
        <Card className="p-6 sm:p-7 border-brand-200 dark:border-brand-900/60 bg-gradient-to-br from-white to-brand-50/30 dark:from-slate-900 dark:to-brand-950/20">
          <div className="flex items-center gap-3.5 pb-4 border-b border-slate-200/80 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Setup Guideline: How to Connect Telegram &amp; Find IDs
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Troubleshooting guide for bot group permissions, personal chat IDs, and team group IDs.
              </p>
            </div>
          </div>

          {/* Guide Selector Tabs */}
          <div className="flex flex-wrap gap-2.5 pt-5">
            <button
              type="button"
              onClick={() => setActiveGuideTab('botfather')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeGuideTab === 'botfather'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>1. Enable Group Adding (BotFather)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGuideTab('group')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeGuideTab === 'group'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>2. Find Team Group ID (-100...)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGuideTab('personal')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeGuideTab === 'personal'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>3. Find Personal 1-on-1 Chat ID</span>
            </button>
          </div>

          {/* Guide Tab Contents */}
          <div className="mt-5 p-5 sm:p-6 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 text-sm sm:text-base leading-relaxed space-y-4">
            {activeGuideTab === 'botfather' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 font-bold text-base sm:text-lg">
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Fix &quot;This bot can&apos;t be added to groups&quot; Error:</span>
                </div>
                <ol className="list-decimal list-inside space-y-2.5 text-slate-800 dark:text-slate-200 ml-1 text-sm sm:text-base">
                  <li className="pl-1">In Telegram search, open <strong className="font-bold text-slate-900 dark:text-white">@BotFather</strong>.</li>
                  <li className="pl-1">Send the command <code className="px-2 py-0.5 rounded-lg bg-brand-50 dark:bg-brand-950/60 border border-brand-200/80 dark:border-brand-800 text-brand-700 dark:text-brand-300 font-mono text-xs sm:text-sm font-semibold">/mybots</code> and choose your notification bot.</li>
                  <li className="pl-1">Click <strong className="font-bold text-slate-900 dark:text-white">Bot Settings</strong> &rarr; <strong className="font-bold text-slate-900 dark:text-white">Allow Groups?</strong> (or <strong className="font-bold text-slate-900 dark:text-white">Groups</strong>).</li>
                  <li className="pl-1">Click <strong className="font-bold text-emerald-600 dark:text-emerald-400">Turn groups on</strong> (you will see &quot;Groups are currently enabled for this bot&quot;).</li>
                  <li className="pl-1"><em className="text-slate-600 dark:text-slate-400">(Optional)</em> Under <strong className="font-bold text-slate-900 dark:text-white">Bot Settings</strong> &rarr; <strong className="font-bold text-slate-900 dark:text-white">Group Privacy</strong>, tap <strong className="font-bold text-slate-900 dark:text-white">Turn off</strong> so the bot can receive commands in groups.</li>
                  <li className="pl-1 text-emerald-700 dark:text-emerald-300 font-semibold">Now you can immediately add the bot to any group without errors!</li>
                </ol>
              </div>
            )}

            {activeGuideTab === 'group' && (
              <div className="space-y-4">
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5 text-base sm:text-lg">
                  <svg className="w-5 h-5 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>How to Get your Team Telegram Group ID (-100...):</span>
                </div>
                <ol className="list-decimal list-inside space-y-2.5 text-slate-800 dark:text-slate-200 ml-1 text-sm sm:text-base">
                  <li className="pl-1">Create a new Telegram Group or open an existing group with your team.</li>
                  <li className="pl-1">Add your bot <strong className="font-bold text-slate-900 dark:text-white">@{telegramStatus?.botUsername || 'superapp_notification_bot'}</strong> into the group.</li>
                  <li className="pl-1">Add <strong className="font-bold text-slate-900 dark:text-white">@RawDataBot</strong> (the blue robot icon) to your group.</li>
                  <li className="pl-1">Look at the message <code className="px-2 py-0.5 rounded-lg bg-brand-50 dark:bg-brand-950/60 border border-brand-200/80 dark:border-brand-800 text-brand-700 dark:text-brand-300 font-mono text-xs sm:text-sm font-semibold">@RawDataBot</code> sends: find <code className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono text-xs sm:text-sm font-bold">&quot;chat&quot;: &#123; &quot;id&quot;: -100xxxxxxxxxx &#125;</code>.</li>
                  <li className="pl-1">Copy that full number starting with <code className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono text-xs sm:text-sm font-bold">-100</code> (including the minus sign).</li>
                  <li className="pl-1">Remove <code className="px-2 py-0.5 rounded-lg bg-brand-50 dark:bg-brand-950/60 border border-brand-200/80 dark:border-brand-800 text-brand-700 dark:text-brand-300 font-mono text-xs sm:text-sm font-semibold">@RawDataBot</code> from the group, paste the ID into the input above, and click <strong className="font-bold text-brand-600 dark:text-brand-400">Save Group ID</strong>!</li>
                </ol>
              </div>
            )}

            {activeGuideTab === 'personal' && (
              <div className="space-y-4">
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5 text-base sm:text-lg">
                  <svg className="w-5 h-5 text-sky-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>How to Get your Personal 1-on-1 Chat ID:</span>
                </div>
                <ul className="list-disc list-inside space-y-2.5 text-slate-800 dark:text-slate-200 ml-1 text-sm sm:text-base">
                  <li className="pl-1"><strong className="font-bold text-slate-900 dark:text-white">Instant 1-Click Method:</strong> Click the blue <strong className="font-bold text-sky-600 dark:text-sky-400">1-Click Connect with Telegram</strong> button above. When Telegram opens, press <strong className="font-bold text-slate-900 dark:text-white">START</strong> and then click <strong className="font-bold text-slate-900 dark:text-white">Check &amp; Sync Connection</strong>.</li>
                  <li className="pl-1"><strong className="font-bold text-slate-900 dark:text-white">Manual Lookup Method:</strong> Search for <strong className="font-bold text-slate-900 dark:text-white">@userinfobot</strong> in Telegram and tap Start. It will reply with your personal <code className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono text-xs sm:text-sm font-bold">Id: xxxxxxxxxx</code>. Copy that number and paste it into manual entry.</li>
                </ul>
              </div>
            )}
          </div>
        </Card>

        {/* ------------------------------------------------------------- */}
        {/* CARD 5: Automated Notification Events Overview */}
        {/* ------------------------------------------------------------- */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Automated Notification Events
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Active alerts dispatched directly to your connected Telegram channels.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">
                  Security Scans &amp; DAST
                </span>
                <p className="text-slate-500 mt-0.5 text-[11px]">
                  Real-time scan results with CVE compliance scores and vulnerability counts.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">
                  Test Build APK Generated
                </span>
                <p className="text-slate-500 mt-0.5 text-[11px]">
                  Instant direct APK download links whenever CI/CD pipeline completes a test build.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">
                  Review &amp; Approval Decisions
                </span>
                <p className="text-slate-500 mt-0.5 text-[11px]">
                  Immediate notification when Super App Admin approves, rejects, or requests changes.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
