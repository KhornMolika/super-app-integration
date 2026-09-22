'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { PipelineTimingSettings, DEFAULT_PIPELINE_TIMING } from '@/types/settings.types';
import { toast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmationProvider';
import {
  UserProfileCard,
  TelegramPersonalCard,
  TelegramTeamCard,
  TelegramGuidelineCard,
  PipelineTimingCard,
  ArtifactRetentionCard,
  NotificationEventsCard,
  TelegramGroupItem,
} from '@/components/settings';


import { telegramApi, settingsApi } from '@/api';

export default function SettingsPage() {
  const { role, user } = useAuth();
  const confirm = useConfirm();

  // Pipeline Automation Timing States
  const [pipelineTiming, setPipelineTiming] = useState<PipelineTimingSettings>(DEFAULT_PIPELINE_TIMING);
  const [loadingTiming, setLoadingTiming] = useState(true);
  const [savingTiming, setSavingTiming] = useState(false);

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
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [sendingTeamTest, setSendingTeamTest] = useState(false);
  const [savingTeamChat, setSavingTeamChat] = useState(false);
  const [detectingGroups, setDetectingGroups] = useState(false);
  const [detectedGroups, setDetectedGroups] = useState<TelegramGroupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showManualTelegram, setShowManualTelegram] = useState(false);
  const [manualChatId, setManualChatId] = useState('');
  const [manualUsername, setManualUsername] = useState('');
  const [teamChatIdInput, setTeamChatIdInput] = useState('');
  const [copiedChatId, setCopiedChatId] = useState(false);
  const [copiedTeamChatId, setCopiedTeamChatId] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'botfather' | 'group' | 'personal'>('group');

  // Fetch Telegram status & associated groups
  const fetchTelegramStatus = async () => {
    try {
      setFetchingTelegram(true);
      const [statusData, groupsData] = await Promise.all([
        telegramApi.getStatus().catch(() => null),
        telegramApi.getUserGroups().catch(() => null),
      ]);

      if (statusData) {
        setTelegramStatus(statusData as any);
        if (statusData.user?.teamTelegramChatId) {
          setTeamChatIdInput(statusData.user.teamTelegramChatId);
        }
      }

      if (groupsData && Array.isArray(groupsData.groups)) {
        setDetectedGroups(groupsData.groups as any);
      }
    } catch (err) {
      console.error('Failed to load telegram status or groups:', err);
    } finally {
      setFetchingTelegram(false);
    }
  };

  const fetchPipelineTiming = async () => {
    try {
      setLoadingTiming(true);
      const data = await settingsApi.getPipelineTiming();
      if (data) {
        setPipelineTiming(data as any);
      }
    } catch (err) {
      console.error('Failed to load pipeline timing:', err);
    } finally {
      setLoadingTiming(false);
    }
  };

  const applyPreset = (preset: 'instant' | 'realistic' | 'demo') => {
    let updated: PipelineTimingSettings;
    if (preset === 'instant') {
      updated = {
        ...pipelineTiming,
        preset: 'instant',
        validationStartDelaySec: 0,
        securityScanPacingSec: 0,
        validationPassDelaySec: 0,
        buildTriggerDelaySec: 0,
      };
    } else if (preset === 'realistic') {
      updated = {
        ...pipelineTiming,
        preset: 'realistic',
        validationStartDelaySec: 2,
        securityScanPacingSec: 2,
        validationPassDelaySec: 3,
        buildTriggerDelaySec: 2,
      };
    } else {
      updated = {
        ...pipelineTiming,
        preset: 'demo',
        validationStartDelaySec: 5,
        securityScanPacingSec: 3,
        validationPassDelaySec: 5,
        buildTriggerDelaySec: 4,
      };
    }
    setPipelineTiming(updated);
  };

  const handleSavePipelineTiming = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingTiming(true);
    try {
      const data = await settingsApi.updatePipelineTiming(pipelineTiming as any);
      setPipelineTiming(data as any);
      const msg = `Pipeline automation timing updated successfully (Preset: ${(data as any).preset?.toUpperCase() || 'CUSTOM'})!`;
      toast.success(msg, 'Timing Saved');
    } catch (err: any) {
      const msg = err.message || 'Network error saving pipeline settings.';
      toast.error(msg, 'Network Error');
    } finally {
      setSavingTiming(false);
    }
  };

  useEffect(() => {
    fetchTelegramStatus();
    if (role === 'SUPER_ADMIN') {
      fetchPipelineTiming();
    }
  }, [role]);

  const handleOneClickConnect = async () => {
    try {
      const data = await telegramApi.getConnectUrl();
      if (data?.url) {
        window.open(data.url, '_blank');
        const msg = 'Telegram bot opened! Tap START in the app, then click "Check & Sync Connection".';
        toast.info(msg, 'Telegram Connect');
      }
    } catch (err: any) {
      const msg = 'Failed to generate Telegram connect link.';
      toast.error(msg, 'Connect Error');
    }
  };

  const handleCheckSync = async () => {
    setCheckingSync(true);
    try {
      const data = await telegramApi.checkSync();
      if (data?.linked) {
        await fetchTelegramStatus();
        const msg = 'Your Telegram account has been linked successfully! Test message can be sent below.';
        toast.success(msg, 'Telegram Linked');
      } else {
        const msg = data?.message || 'No /start command detected yet. Please tap START in the Telegram bot chat first.';
        toast.warning(msg, 'Sync Pending');
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to sync with Telegram.';
      toast.error(msg, 'Sync Failed');
    } finally {
      setCheckingSync(false);
    }
  };

  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualChatId.trim()) return;

    setLoading(true);
    try {
      const data = await telegramApi.manualConnect({ chatId: manualChatId.trim(), username: manualUsername.trim() });
      if (data?.success) {
        await fetchTelegramStatus();
        setShowManualTelegram(false);
        setManualChatId('');
        setManualUsername('');
        const msg = 'Personal Telegram Chat ID connected successfully!';
        toast.success(msg, 'Telegram Connected');
      } else {
        const msg = data?.message || 'Failed to link Chat ID.';
        toast.error(msg, 'Connection Failed');
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to link Chat ID.';
      toast.error(msg, 'Connection Error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTeamChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTeamChat(true);
    try {
      const data = await telegramApi.saveTeamChat({ teamTelegramChatId: teamChatIdInput.trim() });
      if (data?.success) {
        await fetchTelegramStatus();
        const msg = 'Team Telegram Channel / Group ID saved successfully!';
        toast.success(msg, 'Team Channel Saved');
      } else {
        const msg = data?.message || 'Failed to save Team Telegram ID.';
        toast.error(msg, 'Save Failed');
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to save Team Telegram ID.';
      toast.error(msg, 'Save Error');
    } finally {
      setSavingTeamChat(false);
    }
  };

  const handleDetectGroups = async () => {
    setDetectingGroups(true);
    try {
      const data = await telegramApi.getRecentGroups();
      if (Array.isArray(data?.groups) && data.groups.length > 0) {
        setDetectedGroups(data.groups as any);
        const msg = `Discovered ${data.groups.length} active Telegram group(s) where both you and the bot are members!`;
        toast.success(msg, 'Telegram Groups Found');
      } else {
        setDetectedGroups([]);
        const msg = 'No active groups found where you and the bot are both members. Make sure you and the bot are in the same group and posted a message (e.g. "/start" or "hi").';
        toast.warning(msg, 'No Groups Found');
      }
    } catch (err: any) {
      const msg = 'Failed to scan for recent Telegram groups.';
      toast.error(msg, 'Scan Failed');
    } finally {
      setDetectingGroups(false);
    }
  };

  const handleSendTestMessage = async () => {
    setSendingTest(true);
    try {
      const data = await telegramApi.testUserAlert();
      if (data?.success) {
        const msg = 'Personal test notification delivered! Please check your private Telegram chat with the bot.';
        toast.success(msg, 'Telegram Delivered');
      } else {
        const msg = data?.message || 'Failed to send test message. Verify your Chat ID.';
        toast.error(msg, 'Delivery Failed');
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to send test message.';
      toast.error(msg, 'Delivery Error');
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!user.email) return;
    setSendingTestEmail(true);
    try {
      const data = await telegramApi.testEmail(user.email);
      if (data?.success) {
        const msg = `Verified test email successfully delivered to ${user.email}! Please check your inbox and spam folder.`;
        toast.success(msg, 'Email Delivered');
      } else {
        const msg = data?.message || data?.error || 'Failed to send test email. Verify Resend API configuration.';
        toast.error(msg, 'Email Delivery Failed');
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to send test email.';
      toast.error(msg, 'Network Error');
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleSendTeamTestMessage = async (customChatId?: string, appLabel?: string) => {
    const targetChat = customChatId || teamChatIdInput.trim() || telegramStatus?.user?.teamTelegramChatId;
    if (!targetChat) {
      const msg = 'Please enter a Team Telegram Channel / Group ID first.';
      toast.warning(msg, 'Missing Group ID');
      return;
    }

    setSendingTeamTest(true);
    try {
      const data = await telegramApi.testTeamAlert(
        targetChat,
        appLabel || (role === 'SUPER_ADMIN' || role === 'ADMIN' ? 'Super App Operations' : 'Mini App Team Channel')
      );
      if (data?.success) {
        const msg = `Team test alert sent to ${appLabel ? `"${appLabel}" (${targetChat})` : targetChat}! Please check your Telegram group.`;
        toast.success(msg, 'Team Alert Sent');
      } else {
        const msg = data?.message || 'Failed to send team alert. Make sure the bot is added to your group/channel as Admin.';
        toast.error(msg, 'Team Alert Failed');
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to send team alert.';
      toast.error(msg, 'Team Alert Error');
    } finally {
      setSendingTeamTest(false);
    }
  };

  const handleDisconnectTelegram = async () => {
    const isConfirmed = await confirm({
      title: 'Disconnect Telegram',
      message: 'Are you sure you want to disconnect personal Telegram notifications from this account?',
      confirmText: 'Disconnect',
      confirmVariant: 'danger',
    });
    if (!isConfirmed) return;
    try {
      const data = await telegramApi.disconnect();
      if (data?.success) {
        await fetchTelegramStatus();
        const msg = 'Personal Telegram direct notifications disconnected.';
        toast.info(msg, 'Telegram Disconnected');
      }
    } catch (err: any) {
      const msg = 'Failed to disconnect Telegram.';
      toast.error(msg, 'Disconnect Failed');
    }
  };

  const handleReassignGroup = async (oldChatId: string, newChatId: string | null) => {
    try {
      const data = await telegramApi.reassignGroup({ oldChatId, newChatId });
      if (data?.success) {
        toast.success(data.message || 'Telegram group reassigned successfully!', 'Group Reassigned');
        await fetchTelegramStatus();
      } else {
        toast.error(data?.message || 'Failed to reassign Telegram group.', 'Reassign Failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error reassigning group.', 'Network Error');
    }
  };

  const handleAssignAppGroup = async (miniAppId: string, newChatId: string | null) => {
    try {
      const data = await telegramApi.assignAppGroup({ miniAppId, newChatId });
      if (data?.success) {
        toast.success(data.message || 'Mini App Telegram group updated!', 'Group Assigned');
        await fetchTelegramStatus();
      } else {
        toast.error(data?.message || 'Failed to update Mini App Telegram group.', 'Assignment Failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error updating Mini App group.', 'Network Error');
    }
  };

  const handleCleanupInactive = async () => {
    try {
      const data = await telegramApi.cleanupInactive();
      if (data?.success) {
        toast.success(data.message || 'Inactive groups cleaned up successfully!', 'Cleanup Complete');
        await fetchTelegramStatus();
      } else {
        toast.error(data?.message || 'Failed to cleanup inactive groups.', 'Cleanup Failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error during inactive group cleanup.', 'Network Error');
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
    toast.info(`Copied "${text}" to clipboard!`, 'Copied');
  };

  return (
    <ProtectedRoute>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out space-y-8 w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider mb-1">
              <span>Account &amp; Notifications</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Settings &amp; Profile
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-base">
              Manage your personal user profile identity, direct personal alerts, and team notification channels.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Session Active</span>
            </span>
          </div>
        </div>

        {/* 1. User Profile Card */}
        <UserProfileCard
          user={user}
          role={role}
          telegramStatus={telegramStatus}
          onSendTestEmail={handleSendTestEmail}
          sendingTestEmail={sendingTestEmail}
        />

        {/* 2. Personal Direct Telegram Card */}
        <TelegramPersonalCard
          telegramStatus={telegramStatus}
          fetchingTelegram={fetchingTelegram}
          checkingSync={checkingSync}
          sendingTest={sendingTest}
          loading={loading}
          showManualTelegram={showManualTelegram}
          manualChatId={manualChatId}
          manualUsername={manualUsername}
          copiedChatId={copiedChatId}
          onRefreshStatus={fetchTelegramStatus}
          onOneClickConnect={handleOneClickConnect}
          onCheckSync={handleCheckSync}
          onManualConnect={handleManualConnect}
          onSendTestMessage={handleSendTestMessage}
          onDisconnectTelegram={handleDisconnectTelegram}
          setShowManualTelegram={setShowManualTelegram}
          setManualChatId={setManualChatId}
          setManualUsername={setManualUsername}
          onCopyChatId={(id) => copyToClipboard(id, false)}
        />

        {/* 3. Team & Platform Group Card */}
        <TelegramTeamCard
          role={role}
          telegramStatus={telegramStatus}
          teamChatIdInput={teamChatIdInput}
          detectingGroups={detectingGroups}
          detectedGroups={detectedGroups}
          savingTeamChat={savingTeamChat}
          sendingTeamTest={sendingTeamTest}
          copiedTeamChatId={copiedTeamChatId}
          setTeamChatIdInput={setTeamChatIdInput}
          onSaveTeamChat={handleSaveTeamChat}
          onDetectGroups={handleDetectGroups}
          onSendTeamTestMessage={handleSendTeamTestMessage}
          onCopyTeamChatId={(id) => copyToClipboard(id, true)}
          onReassignGroup={handleReassignGroup}
          onAssignAppGroup={handleAssignAppGroup}
          onCleanupInactive={handleCleanupInactive}
        />

        {/* 4. Interactive Step-by-Step Guideline Drawer */}
        <TelegramGuidelineCard
          role={role}
          telegramStatus={telegramStatus}
          activeGuideTab={activeGuideTab}
          setActiveGuideTab={setActiveGuideTab}
        />

        {/* 5. Pipeline Automation & Stage Timing Card (Super Admin Only) */}
        {role === 'SUPER_ADMIN' && (
          <PipelineTimingCard
            pipelineTiming={pipelineTiming}
            setPipelineTiming={setPipelineTiming}
            loadingTiming={loadingTiming}
            savingTiming={savingTiming}
            onApplyPreset={applyPreset}
            onSavePipelineTiming={handleSavePipelineTiming}
          />
        )}

        {/* 6. Artifact Storage Retention & Scheduled APK Deletion (Super Admin Only) */}
        {role === 'SUPER_ADMIN' && <ArtifactRetentionCard />}

        {/* 7. Automated Notification Events Overview */}
        <NotificationEventsCard />
      </div>
    </ProtectedRoute>
  );

}
