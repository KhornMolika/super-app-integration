'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';
import { UserProfileCard } from '@/components/settings';
import { telegramApi, usersApi } from '@/api';

export default function ProfileSettingsPage() {
  const { role, user: authUser } = useAuth();

  const [fullProfile, setFullProfile] = useState<any>(null);
  const [telegramStatus, setTelegramStatus] = useState<any>(null);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  const fetchProfileData = async () => {
    try {
      const [statusData, profileData] = await Promise.all([
        telegramApi.getStatus().catch(() => null),
        usersApi.getProfile().catch(() => null),
      ]);
      if (statusData) setTelegramStatus(statusData);
      if (profileData) setFullProfile(profileData);
    } catch (err) {
      console.error('Failed to load profile data:', err);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleSendTestEmail = async (targetEmail?: string) => {
    const dest = targetEmail || authUser?.email;
    if (!dest) return;
    setSendingTestEmail(true);
    try {
      const data = await telegramApi.testEmail(dest);
      if (data?.success) {
        toast.success(`Verified test email successfully delivered to ${dest}!`, 'Email Delivered');
      } else {
        toast.error(data?.message || data?.error || 'Failed to send test email.', 'Email Delivery Failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send test email.', 'Network Error');
    } finally {
      setSendingTestEmail(false);
    }
  };

  const mergedUser = {
    ...authUser,
    ...fullProfile,
    organization: fullProfile?.organization || authUser?.organization || null,
  };

  return (
    <ProtectedRoute>
      <div className="w-full min-w-0 space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-1.5">
              <span>Settings</span>
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <span>Account Identity</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Profile &amp; Account
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm max-w-2xl leading-relaxed">
              Manage your personal credentials, administrative authority tier, and security preferences.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Session Active</span>
            </span>
          </div>
        </div>

        {/* Profile Content */}
        <div>
          <UserProfileCard
            user={mergedUser}
            role={role}
            telegramStatus={telegramStatus}
            onSendTestEmail={handleSendTestEmail}
            sendingTestEmail={sendingTestEmail}
            onProfileUpdated={fetchProfileData}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
