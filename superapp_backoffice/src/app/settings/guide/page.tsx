'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import {
  TelegramGuidelineCard,
  NotificationEventsCard,
  SettingsPageHeader,
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
      <div className="w-full min-w-0 space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out">
        <SettingsPageHeader
          section="Documentation & Rules"
          title="Guide & Notification Rules"
          description="Step-by-step instructions for team channels, personal chat IDs, BotFather permissions, and real-time alert trigger specifications."
          badge={{ label: 'Session Active', tone: 'emerald', pulse: true }}
        />

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
