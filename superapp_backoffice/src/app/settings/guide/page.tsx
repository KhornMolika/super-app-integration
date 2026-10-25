'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import {
  TelegramGuidelineCard,
  NotificationEventsCard,
} from '@/components/settings';
import { telegramApi } from '@/api';

export default function GuideSettingsPage() {
  const { role } = useAuth();
  const [telegramStatus, setTelegramStatus] = useState<any>(null);
  const [activeGuideTab, setActiveGuideTab] = useState<'botfather' | 'group' | 'personal'>('group');

  useEffect(() => {
    telegramApi
      .getStatus()
      .then((data) => {
        if (data) setTelegramStatus(data);
      })
      .catch(() => null);
  }, []);

  return (
    <ProtectedRoute>
      <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out space-y-6 w-full max-w-7xl mx-auto pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-1.5">
              <span>Documentation &amp; Setup Standards</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Guide &amp; Notification Rules
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm max-w-2xl leading-relaxed">
              Step-by-step instructions for team channels, personal chat IDs, BotFather permissions, and real-time alert trigger specifications.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Session Active</span>
            </span>
          </div>
        </div>

        {/* Guidelines Content */}
        <div className="space-y-6">
          <TelegramGuidelineCard
            role={role}
            telegramStatus={telegramStatus}
            activeGuideTab={activeGuideTab}
            setActiveGuideTab={setActiveGuideTab}
          />
          <NotificationEventsCard />
        </div>
      </div>
    </ProtectedRoute>
  );
}
