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
  SettingsPageHeader,
} from '@/components/settings';
import { telegramApi } from '@/api';
import { copyText } from '@/lib/clipboard';

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
  const [activeChannelTab, setActiveChannelTab] = useState<'personal' | 'team'>('personal');

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
    copyText(text);
    if (isTeam) {
      setCopiedTeamChatId(true);
      setTimeout(() => setCopiedTeamChatId(false), 2000);
    } else {
      setCopiedChatId(true);
      setTimeout(() => setCopiedChatId(false), 2000);
    }
    toast.info(
      isTeam ? 'Team Chat ID copied to clipboard.' : 'Personal Chat ID copied to clipboard.',
      'Copied',
    );
  };

  const isTelegramConnected = Boolean(telegramStatus?.user?.isConnected);
  const liveGroupsCount = detectedGroups.filter((g) => g.isLive).length;
  const inactiveGroupsCount = detectedGroups.filter((g) => !g.isLive).length;
  const hasTeamChat = Boolean(telegramStatus?.user?.teamTelegramChatId);

  return (
    <ProtectedRoute>
      <div className="w-full min-w-0 space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out">
        <SettingsPageHeader
          section="Incident & Review Alerts"
          title="Telegram & Alerts"
          description="Connect your personal Telegram account for direct operational alerts and configure team channels for automated MiniApp pipeline notifications."
          badge={
            isTelegramConnected
              ? { label: 'Telegram Connected', tone: 'emerald', pulse: true }
              : { label: 'Not Connected', tone: 'amber' }
          }
        />

        {/* Interactive Channel Overview & Tab Switcher */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setActiveChannelTab('personal')}
            className={`text-left p-5 rounded-2xl border transition-all cursor-pointer ${
              activeChannelTab === 'personal'
                ? 'border-sky-500/60 bg-sky-50/40 dark:bg-sky-950/20 shadow-xs ring-1 ring-sky-500/20'
                : 'border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    Personal Direct Alerts
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isTelegramConnected
                      ? telegramStatus?.user?.telegramUsername
                        ? `Linked as @${telegramStatus.user.telegramUsername}`
                        : '1-on-1 direct chat active'
                      : 'Link your personal Telegram for private alerts'}
                  </div>
                </div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${
                  isTelegramConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                }`}
              >
                {isTelegramConnected ? 'Connected' : 'Setup'}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveChannelTab('team')}
            className={`text-left p-5 rounded-2xl border transition-all cursor-pointer ${
              activeChannelTab === 'team'
                ? 'border-sky-500/60 bg-sky-50/40 dark:bg-sky-950/20 shadow-xs ring-1 ring-sky-500/20'
                : 'border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    Team Channels &amp; MiniApp Routing
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {liveGroupsCount > 0
                      ? `${liveGroupsCount} active group${liveGroupsCount === 1 ? '' : 's'} connected`
                      : hasTeamChat
                      ? 'Default team group configured'
                      : 'Configure broadcast channels for pipeline alerts'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {inactiveGroupsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800">
                    {inactiveGroupsCount} Inactive
                  </span>
                )}
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    hasTeamChat || liveGroupsCount > 0
                      ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800'
                      : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                  }`}
                >
                  {liveGroupsCount || (hasTeamChat ? 1 : 0)} Channels
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Active Channel View */}
        {activeChannelTab === 'personal' ? (
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
        ) : (
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
        )}
      </div>
    </ProtectedRoute>
  );
}
