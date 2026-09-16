'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button, Input, Label } from '@/components/ui/inputs';

interface TelegramPersonalCardProps {
  telegramStatus: any;
  fetchingTelegram: boolean;
  checkingSync: boolean;
  sendingTest: boolean;
  loading: boolean;
  showManualTelegram: boolean;
  manualChatId: string;
  manualUsername: string;
  copiedChatId: boolean;
  onRefreshStatus: () => Promise<void>;
  onOneClickConnect: () => Promise<void>;
  onCheckSync: () => Promise<void>;
  onManualConnect: (e: React.FormEvent) => Promise<void>;
  onSendTestMessage: () => Promise<void>;
  onDisconnectTelegram: () => Promise<void>;
  setShowManualTelegram: (show: boolean) => void;
  setManualChatId: (id: string) => void;
  setManualUsername: (name: string) => void;
  onCopyChatId: (text: string) => void;
}

export function TelegramPersonalCard({
  telegramStatus,
  fetchingTelegram,
  checkingSync,
  sendingTest,
  loading,
  showManualTelegram,
  manualChatId,
  manualUsername,
  copiedChatId,
  onRefreshStatus,
  onOneClickConnect,
  onCheckSync,
  onManualConnect,
  onSendTestMessage,
  onDisconnectTelegram,
  setShowManualTelegram,
  setManualChatId,
  setManualUsername,
  onCopyChatId,
}: TelegramPersonalCardProps) {
  const isConnected = Boolean(telegramStatus?.user?.isConnected);

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                Personal Direct Telegram Notifications
              </h3>
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold ${
                  isConnected
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {isConnected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              1-on-1 private bot chat for security scans, review approvals, and test build APK readiness.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onRefreshStatus}
          disabled={fetchingTelegram}
          className="text-sm h-10 px-4 shrink-0 flex items-center gap-2 rounded-xl"
        >
          <svg
            className={`w-4 h-4 text-slate-500 ${fetchingTelegram ? 'animate-spin' : ''}`}
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
          <span>{fetchingTelegram ? 'Checking...' : 'Refresh Status'}</span>
        </Button>
      </div>

      {/* Connected State View */}
      {isConnected ? (
        <div className="my-6 space-y-6">
          <div className="p-6 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/30 dark:to-teal-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/60">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <span className="text-sm font-bold uppercase text-emerald-800/70 dark:text-emerald-300/70 block tracking-wider">
                  Connected Handle
                </span>
                <span className="font-bold text-emerald-900 dark:text-emerald-200 text-lg mt-1.5 block">
                  {telegramStatus?.user?.telegramUsername
                    ? `@${telegramStatus.user.telegramUsername}`
                    : 'Direct User Chat'}
                </span>
              </div>

              <div>
                <span className="text-sm font-bold uppercase text-emerald-800/70 dark:text-emerald-300/70 block tracking-wider">
                  Personal Chat ID
                </span>
                <div className="flex items-center gap-2.5 mt-1.5">
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-base">
                    {telegramStatus?.user?.telegramChatId}
                  </span>
                  {telegramStatus?.user?.telegramChatId && (
                    <button
                      type="button"
                      onClick={() => onCopyChatId(telegramStatus?.user?.telegramChatId || '')}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                      title="Copy Chat ID"
                    >
                      {copiedChatId ? (
                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span className="text-sm font-bold uppercase text-emerald-800/70 dark:text-emerald-300/70 block tracking-wider">
                  Delivery Channel
                </span>
                <span className="inline-flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300 text-base mt-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  1-on-1 Direct Chat Active
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3.5">
            <Button
              type="button"
              onClick={onSendTestMessage}
              disabled={sendingTest}
              className="text-base bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center gap-2.5 rounded-xl px-5 py-2.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span>{sendingTest ? 'Sending Test Alert...' : 'Send Test Personal Alert'}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onDisconnectTelegram}
              className="text-base text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900 rounded-xl px-4 py-2.5"
            >
              Disconnect Personal Telegram
            </Button>
          </div>
        </div>
      ) : (
        /* Disconnected State */
        <div className="my-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-300 font-bold text-sm flex items-center justify-center mb-3">
                1
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">Open Telegram Bot</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Click 1-Click Connect to launch <strong>@{telegramStatus?.botUsername || 'superapp_notification_bot'}</strong>.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-300 font-bold text-sm flex items-center justify-center mb-3">
                2
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">Tap &quot;START&quot;</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                In Telegram, press <strong>START</strong> to register your personal Chat ID automatically.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-300 font-bold text-sm flex items-center justify-center mb-3">
                3
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">Sync &amp; Confirm</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Return here and click <strong>Check &amp; Sync Connection</strong> to activate real-time alerts.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            <Button
              type="button"
              onClick={onOneClickConnect}
              className="text-base bg-[#229ED9] hover:bg-[#1E8BC0] text-white font-bold shadow-sm rounded-xl px-5 py-2.5 flex items-center gap-2.5 transition-transform active:scale-95"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
              </svg>
              <span>1-Click Connect with Telegram</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onCheckSync}
              disabled={checkingSync}
              className="text-base rounded-xl px-4 py-2.5 flex items-center gap-2"
            >
              <svg
                className={`w-4 h-4 text-slate-500 ${checkingSync ? 'animate-spin' : ''}`}
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
              <span>{checkingSync ? 'Syncing...' : 'Check & Sync Connection'}</span>
            </Button>

            <button
              type="button"
              onClick={() => setShowManualTelegram(!showManualTelegram)}
              className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold underline ml-2"
            >
              {showManualTelegram ? 'Hide manual Chat ID input' : 'Enter Chat ID manually'}
            </button>
          </div>

          {showManualTelegram && (
            <form
              onSubmit={onManualConnect}
              className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in duration-300"
            >
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Manual Chat ID Entry
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <Label className="text-sm">Telegram Chat ID *</Label>
                  <Input
                    type="text"
                    value={manualChatId}
                    onChange={(e) => setManualChatId(e.target.value)}
                    placeholder="e.g. 1193078022"
                    className="font-mono text-base mt-1.5"
                    required
                  />
                </div>
                <div>
                  <Label className="text-sm">Telegram Username (Optional)</Label>
                  <Input
                    type="text"
                    value={manualUsername}
                    onChange={(e) => setManualUsername(e.target.value)}
                    placeholder="e.g. khornmolika"
                    className="text-base mt-1.5"
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading || !manualChatId.trim()} className="text-sm rounded-xl px-4 py-2">
                Save Chat ID
              </Button>
            </form>
          )}
        </div>
      )}
    </Card>
  );
}
