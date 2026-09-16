'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/inputs';

interface UserProfileCardProps {
  user: { name?: string; email?: string };
  role: string;
  telegramStatus: any;
  onSendTestEmail: () => Promise<void>;
  sendingTestEmail: boolean;
}

export function UserProfileCard({
  user,
  role,
  telegramStatus,
  onSendTestEmail,
  sendingTestEmail,
}: UserProfileCardProps) {
  const userDisplayName = user?.name || 'Authorized User';
  const userEmail = user?.email || '';

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

  return (
    <Card className="p-6 sm:p-8 overflow-hidden relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl sm:text-3xl shadow-sm shrink-0">
            {initials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                {userDisplayName}
              </h3>
              <span className={`px-3 py-1 rounded-full text-sm font-bold border ${roleBadgeStyle}`}>
                {roleBadgeLabel}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="text-base font-mono text-slate-500 dark:text-slate-400">
                {userEmail}
              </span>
              {userEmail && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSendTestEmail}
                  disabled={sendingTestEmail}
                  className="text-xs h-7 px-2.5 rounded-lg flex items-center gap-1.5"
                >
                  <svg
                    className={`w-3.5 h-3.5 text-brand-600 ${sendingTestEmail ? 'animate-spin' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <span>{sendingTestEmail ? 'Sending Test...' : 'Send Test Email'}</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Organization: <strong className="text-slate-900 dark:text-white">Financial Services Authority (FSA)</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-6">
        <div className="p-5 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
          <span className="text-sm uppercase font-bold text-slate-400 block tracking-wider">Account Status</span>
          <div className="flex items-center gap-2.5 mt-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300 text-base">Active &amp; Verified</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
          <span className="text-sm uppercase font-bold text-slate-400 block tracking-wider">Personal Telegram</span>
          <div className="flex items-center gap-2.5 mt-2">
            {isConnected ? (
              <span className="font-bold text-sky-600 dark:text-sky-400 text-base inline-flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-500"></span>
                <span>
                  {telegramStatus?.user?.telegramUsername
                    ? `@${telegramStatus.user.telegramUsername}`
                    : 'Direct Chat Active'}
                </span>
              </span>
            ) : (
              <span className="font-medium text-slate-400 text-base">Not Connected</span>
            )}
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
          <span className="text-sm uppercase font-bold text-slate-400 block tracking-wider">Access Scope</span>
          <div className="font-bold text-slate-800 dark:text-slate-200 text-base mt-2 truncate">
            {accessScopeLabel}
          </div>
        </div>
      </div>
    </Card>
  );
}
