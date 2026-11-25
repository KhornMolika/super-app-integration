'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';
import { UserProfileCard, SettingsPageHeader } from '@/components/settings';
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
        <SettingsPageHeader
          section="Account Identity"
          title="Profile & Account"
          description="Manage your personal details, administrative authority tier, and security preferences."
          badge={{ label: 'Session Active', tone: 'emerald', pulse: true }}
        />

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
