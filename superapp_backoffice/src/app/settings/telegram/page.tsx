'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmationProvider';
import {
  TelegramPersonalCard,
  TelegramTeamCard,
  TelegramGroupItem,
} from '@/components/settings';
import { telegramApi } from '@/api';

export default function TelegramSettingsPage() {
  const { role } = useAuth();
  const confirm = useConfirm();

  // Telegram States
  const [telegramStatus, setTelegramStatus] = useState<any>(null);
  const [fetchingTelegram, setFetchingTelegram] = useState(true);
  const [checkingSync, setCheckingSync] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
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

  useEffect(() => {
    fetchTelegramStatus();
  }, []);

  const handleOneClickConnect = async () => {
    try {
      const data = await telegramApi.getConnectUrl();
      if (data?.url) {
        window.open(data.url, '_blank');
        toast.info('Telegram bot opened! Tap START in the app, then click "Check & Sync Connection".', 'Telegram Connect');
      }
    } catch (err: any) {
      toast.error('Failed to generate Telegram connect link.', 'Connect Error');
    }
  };

  const handleCheckSync = async () => {
    setCheckingSync(true);
    try {
      const data = await telegramApi.checkSync();
      if (data?.linked) {
        await fetchTelegramStatus();
        toast.success('Your Telegram account has been linked successfully! Test message can be sent below.', 'Telegram Linked');
      } else {
        toast.warning(data?.message || 'No /start command detected yet. Please tap START in the Telegram bot chat first.', 'Sync Pending');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync with Telegram.', 'Sync Failed');
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
        toast.success('Personal Telegram Chat ID connected successfully!', 'Telegram Connected');
      } else {
        toast.error(data?.message || 'Failed to link Chat ID.', 'Connection Failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to link Chat ID.', 'Connection Error');
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
        toast.success('Team Telegram Channel / Group ID saved successfully!', 'Team Channel Saved');
      } else {
        toast.error(data?.message || 'Failed to save Team Telegram ID.', 'Save Failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save Team Telegram ID.', 'Save Error');
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
        toast.success(`Discovered ${data.groups.length} active Telegram group(s) where both you and the bot are members!`, 'Telegram Groups Found');
      } else {
        setDetectedGroups([]);
        toast.warning('No active groups found where you and the bot are both members. Make sure you and the bot are in the same group and posted a message (e.g. "/start" or "hi").', 'No Groups Found');
      }
    } catch (err: any) {
      toast.error('Failed to scan for recent Telegram groups.', 'Scan Failed');
    } finally {
      setDetectingGroups(false);
    }
  };

  const handleSendTestMessage = async () => {
    setSendingTest(true);
    try {
      const data = await telegramApi.testUserAlert();
      if (data?.success) {
        toast.success('Personal test notification delivered! Please check your private Telegram chat with the bot.', 'Telegram Delivered');
      } else {
        toast.error(data?.message || 'Failed to send test message. Verify your Chat ID.', 'Delivery Failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send test message.', 'Delivery Error');
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendTeamTestMessage = async (customChatId?: string, appLabel?: string) => {
    const targetChat = customChatId || teamChatIdInput.trim() || telegramStatus?.user?.teamTelegramChatId;
    if (!targetChat) {
      toast.warning('Please specify or save a Team Telegram Group ID first.', 'No Chat ID');
      return;
    }
    setSendingTeamTest(true);
    try {
      const data = await telegramApi.testTeamAlert(
        targetChat,
        appLabel || 'SuperApp Ecosystem',
        'Verification alert: Bot connectivity check passed.'
      );
      if (data?.success) {
        toast.success('Team alert delivered to group channel!', 'Team Alert Sent');
      } else {
        toast.error(data?.message || 'Failed to send team notification.', 'Team Alert Failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send team notification.', 'Team Alert Error');
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
        toast.info('Personal Telegram direct notifications disconnected.', 'Telegram Disconnected');
      }
    } catch (err: any) {
      toast.error('Failed to disconnect Telegram.', 'Disconnect Failed');
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
        toast.success(data.message || 'MiniApp Telegram group updated!', 'Group Assigned');
        await fetchTelegramStatus();
      } else {
        toast.error(data?.message || 'Failed to update MiniApp Telegram group.', 'Assignment Failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error updating MiniApp group.', 'Network Error');
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

  const isTelegramConnected = Boolean(telegramStatus?.user?.isConnected);

  return (
    <ProtectedRoute>
      <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out space-y-6 pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-1.5">
              <span>Incident &amp; Review Alerts</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Telegram &amp; Alerts
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm max-w-2xl leading-relaxed">
              Connect your personal Telegram account for direct operational alerts and configure team channels for automated MiniApp pipeline notifications.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {isTelegramConnected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Telegram Connected</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Not Connected</span>
              </span>
            )}
          </div>
        </div>

        {/* Telegram Content */}
        <div className="space-y-6">
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
        </div>
      </div>
    </ProtectedRoute>
  );
}
