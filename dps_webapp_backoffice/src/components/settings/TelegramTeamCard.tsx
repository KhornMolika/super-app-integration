'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button, Input, Label } from '@/components/ui/inputs';
import { toast } from '@/components/ui/Toast';
import { AssignMiniAppModal } from './AssignMiniAppModal';

export interface TelegramGroupAssociation {
  type: 'PROFILE' | 'MINIAPP' | 'SUPER_APP' | 'BOT_SCAN';
  id?: string;
  name?: string;
  appId?: string;
  status?: string;
  category?: string;
  logo?: string;
  label?: string;
}

export interface TelegramGroupItem {
  id: string;
  title: string;
  type: string;
  isLive: boolean;
  error?: string;
  associatedWith: TelegramGroupAssociation[];
  isDefaultProfileChat?: boolean;
}

interface TelegramTeamCardProps {
  role: string;
  telegramStatus: any;
  teamChatIdInput: string;
  detectingGroups: boolean;
  detectedGroups: TelegramGroupItem[];
  savingTeamChat: boolean;
  sendingTeamTest: boolean;
  copiedTeamChatId: boolean;
  setTeamChatIdInput: (val: string) => void;
  onSaveTeamChat: (e: React.FormEvent) => Promise<void>;
  onDetectGroups: () => Promise<void>;
  onSendTeamTestMessage: (customChatId?: string, appLabel?: string) => Promise<void>;
  onCopyTeamChatId: (text: string) => void;
  onReassignGroup?: (oldChatId: string, newChatId: string | null) => Promise<void>;
  onAssignAppGroup?: (miniAppId: string, newChatId: string | null) => Promise<void>;
  onCleanupInactive?: () => Promise<void>;
}

export function TelegramTeamCard({
  role,
  telegramStatus,
  teamChatIdInput,
  detectingGroups,
  detectedGroups,
  savingTeamChat,
  sendingTeamTest,
  copiedTeamChatId,
  setTeamChatIdInput,
  onSaveTeamChat,
  onDetectGroups,
  onSendTeamTestMessage,
  onCopyTeamChatId,
  onReassignGroup,
  onAssignAppGroup,
  onCleanupInactive,
}: TelegramTeamCardProps) {
  const hasTeamChat = Boolean(telegramStatus?.user?.teamTelegramChatId);
  const [testingGroupId, setTestingGroupId] = useState<string | null>(null);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [migratingGroupId, setMigratingGroupId] = useState<string | null>(null);
  const [selectedMiniAppForModal, setSelectedMiniAppForModal] = useState<{
    id: string;
    name?: string;
    appId?: string;
    currentChatId?: string;
  } | null>(null);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleExpandGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleTestSpecificGroup = async (groupId: string, label: string) => {
    setTestingGroupId(groupId);
    try {
      await onSendTeamTestMessage(groupId, label);
    } finally {
      setTestingGroupId(null);
    }
  };

  const handleBatchCleanup = async () => {
    if (!onCleanupInactive) return;
    setCleaningUp(true);
    try {
      await onCleanupInactive();
    } finally {
      setCleaningUp(false);
    }
  };

  const handleMigrateGroupToDefault = async (oldChatId: string) => {
    if (!onReassignGroup) return;
    const defaultChat = telegramStatus?.user?.teamTelegramChatId || detectedGroups.find((g) => g.isLive && g.isDefaultProfileChat)?.id;
    if (!defaultChat) {
      toast.warning('No active default team channel found. Please select an active group or enter a new group ID.', 'Missing Default');
      return;
    }
    setMigratingGroupId(oldChatId);
    try {
      await onReassignGroup(oldChatId, defaultChat);
    } finally {
      setMigratingGroupId(null);
    }
  };

  const handleUnlinkAllFromGroup = async (oldChatId: string) => {
    if (!onReassignGroup) return;
    if (!confirm(`Are you sure you want to unlink all Mini Apps from deleted group "${oldChatId}"?`)) return;
    setMigratingGroupId(oldChatId);
    try {
      await onReassignGroup(oldChatId, null);
    } finally {
      setMigratingGroupId(null);
    }
  };

  const handleAssignMiniApp = async (miniAppId: string, newChatId: string | null) => {
    if (onAssignAppGroup) {
      await onAssignAppGroup(miniAppId, newChatId);
    }
  };

  const inactiveGroups = detectedGroups.filter((g) => !g.isLive);
  const liveDefaultGroup = detectedGroups.find(
    (g) => g.isLive && (g.isDefaultProfileChat || g.id === telegramStatus?.user?.teamTelegramChatId),
  );

  return (
    <Card className="p-6 sm:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Team &amp; Platform Group Notifications</span>
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  hasTeamChat
                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {hasTeamChat ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
                <span>{hasTeamChat ? 'Group Configured' : 'No Group Set'}</span>
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {role === 'SUPER_ADMIN' || role === 'ADMIN'
                ? 'Default broadcast Telegram group for Super App Operations, review alerts, and system issues.'
                : 'Manage team Telegram notification channels associated with your user profile and registered Mini Apps.'}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onDetectGroups}
          disabled={detectingGroups}
          className="text-sm h-10 px-4 shrink-0 flex items-center gap-2 rounded-xl border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
        >
          <svg
            className={`w-4 h-4 text-indigo-600 ${detectingGroups ? 'animate-spin' : ''}`}
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
          <span>{detectingGroups ? 'Scanning Channels...' : 'Auto-Detect & Refresh Groups'}</span>
        </Button>
      </div>

      {/* Inactive Groups Global Alert Banner */}
      {inactiveGroups.length > 0 && (
        <div className="p-4 rounded-2xl bg-linear-to-r from-rose-50 to-amber-50 dark:from-rose-950/40 dark:to-amber-950/30 border border-rose-200/90 dark:border-rose-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
                <span>Action Required: {inactiveGroups.length} Inactive Telegram Group(s) Detected</span>
              </div>
              <p className="text-xs text-rose-700/90 dark:text-rose-300/80 mt-0.5 max-w-2xl leading-relaxed">
                One or more Telegram groups were deleted or the bot was removed. Mini Apps pointing to these groups cannot receive broadcast notifications until migrated.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onCleanupInactive && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBatchCleanup}
                disabled={cleaningUp}
                className="text-xs font-semibold px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950 flex items-center gap-1.5 shadow-xs"
              >
                <svg className={`w-3.5 h-3.5 ${cleaningUp ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>{cleaningUp ? 'Cleaning Up...' : 'Auto-Clean Inactive Groups'}</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* SECTION 1: Default Team Group Setting Form */}
      <form onSubmit={onSaveTeamChat} className="space-y-4">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <Label className="flex items-center gap-2 text-sm sm:text-base">
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span className="font-semibold">Default Team Telegram Group ID</span>
              <span className="text-sm text-slate-400 font-normal">(starts with -100...)</span>
            </Label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <Input
              type="text"
              value={teamChatIdInput}
              onChange={(e) => setTeamChatIdInput(e.target.value)}
              placeholder="e.g. -5542396469 or -1002345678901"
              className="font-mono text-base flex-1"
            />
            <Button
              type="submit"
              disabled={savingTeamChat}
              className="text-sm font-semibold px-5 py-2.5 rounded-xl shrink-0 flex items-center gap-2"
            >
              <svg className={`w-4 h-4 ${savingTeamChat ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span>{savingTeamChat ? 'Saving...' : 'Save Default Group'}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onSendTeamTestMessage()}
              disabled={sendingTeamTest || (!teamChatIdInput.trim() && !telegramStatus?.user?.teamTelegramChatId)}
              className="text-sm font-medium px-5 py-2.5 rounded-xl shrink-0 flex items-center gap-2"
            >
              <svg className={`w-4 h-4 text-indigo-500 ${sendingTeamTest ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span>{sendingTeamTest ? 'Sending Test...' : 'Send Test Alert'}</span>
            </Button>
          </div>
        </div>
      </form>

      {/* SECTION 2: List of All Groups Associated with User & Mini Apps */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Connected Telegram Groups &amp; Associated Mini Apps</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {detectedGroups.length} {detectedGroups.length === 1 ? 'Channel' : 'Channels'}
              </span>
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Detailed mapping of every Telegram group connected to your account and Mini Apps.
            </p>
          </div>
        </div>

        {detectedGroups.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {detectedGroups.map((group) => {
              const isDefault =
                group.isDefaultProfileChat ||
                teamChatIdInput === group.id ||
                telegramStatus?.user?.teamTelegramChatId === group.id;
              const isTestingThis = testingGroupId === group.id;
              const isMigratingThis = migratingGroupId === group.id;
              const miniAppAssocs = group.associatedWith?.filter((a) => a.type === 'MINIAPP') || [];
              const profileAssoc = group.associatedWith?.find((a) => a.type === 'PROFILE');
              const superAppAssoc = group.associatedWith?.find((a) => a.type === 'SUPER_APP');
              const isExpanded = expandedGroups[group.id] || false;
              const displayedMiniApps = isExpanded ? miniAppAssocs : miniAppAssocs.slice(0, 4);
              const hiddenCount = miniAppAssocs.length - 4;

              return (
                <div
                  key={group.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    !group.isLive
                      ? 'bg-rose-50/20 dark:bg-rose-950/15 border-rose-300/80 dark:border-rose-900/60 shadow-xs'
                      : isDefault
                      ? 'bg-linear-to-r from-indigo-50/70 to-brand-50/50 dark:from-indigo-950/30 dark:to-brand-950/20 border-indigo-200 dark:border-indigo-800/80 shadow-xs'
                      : 'bg-white dark:bg-slate-900/60 border-slate-200/90 dark:border-slate-800 hover:border-indigo-200'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-base sm:text-lg">
                          {group.title}
                        </span>
                        <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                          {group.id}
                        </span>
                        {group.isLive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Verified Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-300 dark:border-rose-800">
                            <svg className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>Group Deleted / Inaccessible</span>
                          </span>
                        )}
                        {isDefault && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                            <span>⭐ Default Channel</span>
                          </span>
                        )}
                      </div>

                      {/* Inactive Explanation Notice */}
                      {!group.isLive && (
                        <div className="p-3 rounded-xl bg-rose-100/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                          <svg className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>
                            This group was deleted on Telegram or the bot was removed. Please migrate the associated Mini Apps below to an active group or enter a new Group ID.
                          </span>
                        </div>
                      )}

                      {/* Profile & Platform Associations */}
                      {(profileAssoc || isDefault || superAppAssoc) && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {(profileAssoc || isDefault) && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span>Default Profile Channel</span>
                            </span>
                          )}
                          {superAppAssoc && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              <svg className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              <span>Super App Operations Channel</span>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Associated Mini Apps Section */}
                      {miniAppAssocs.length > 0 ? (
                        <div className="pt-2">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                              <svg className="w-3.5 h-3.5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              <span>Connected Mini Apps</span>
                              <span className="px-1.5 py-0.2 text-[11px] font-bold rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300">
                                {miniAppAssocs.length}
                              </span>
                            </div>
                            {miniAppAssocs.length > 4 && (
                              <button
                                type="button"
                                onClick={() => toggleExpandGroup(group.id)}
                                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                              >
                                {isExpanded ? (
                                  <>
                                    <span>Show less</span>
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                    </svg>
                                  </>
                                ) : (
                                  <>
                                    <span>+{hiddenCount} more</span>
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {displayedMiniApps.map((assoc, idx) => {
                              const s = assoc.status?.toUpperCase();
                              const statusBg =
                                s === 'APPROVED' || s === 'LIVE' || s === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  : s === 'TESTING' || s === 'DRAFT' || s === 'REVIEW'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';

                              return (
                                <div
                                  key={assoc.id || idx}
                                  className="inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-xl text-xs bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 shadow-xs hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group/app"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                                  <span className="font-semibold text-slate-800 dark:text-slate-200 max-w-32.5 truncate" title={assoc.name || assoc.appId}>
                                    {assoc.name || assoc.appId}
                                  </span>
                                  {assoc.status && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider border ${statusBg}`}>
                                      {assoc.status}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedMiniAppForModal({
                                        id: assoc.id || '',
                                        name: assoc.name,
                                        appId: assoc.appId,
                                        currentChatId: group.id,
                                      })
                                    }
                                    className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                                    title="Move / Reassign Mini App to Another Group"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : !profileAssoc && !isDefault && !superAppAssoc ? (
                        <div className="pt-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Discovered via Bot Scan (No assigned apps)</span>
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* Action Buttons for this Group */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {group.isLive ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleTestSpecificGroup(group.id, group.title)}
                            disabled={isTestingThis}
                            className="text-xs h-9 px-3 rounded-xl flex items-center gap-1.5"
                          >
                            <svg
                              className={`w-3.5 h-3.5 text-indigo-600 ${isTestingThis ? 'animate-spin' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                              />
                            </svg>
                            <span>{isTestingThis ? 'Testing...' : 'Test Alert'}</span>
                          </Button>

                          {!isDefault && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setTeamChatIdInput(group.id);
                                toast.info(
                                  `Selected "${group.title}" (${group.id}). Tap "Save Default Group" to confirm.`,
                                  'Selected',
                                );
                              }}
                              className="text-xs h-9 px-3 rounded-xl flex items-center gap-1.5"
                            >
                              <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                              </svg>
                              <span>Set as Default</span>
                            </Button>
                          )}
                        </>
                      ) : (
                        /* INACTIVE / DELETED GROUP ACTIONS */
                        <div className="flex flex-wrap items-center gap-2">
                          {liveDefaultGroup && miniAppAssocs.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleMigrateGroupToDefault(group.id)}
                              disabled={isMigratingThis}
                              className="text-xs h-9 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 flex items-center gap-1.5"
                            >
                              <svg className={`w-3.5 h-3.5 ${isMigratingThis ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                              <span>Migrate to Default ({liveDefaultGroup.title})</span>
                            </Button>
                          )}

                          {miniAppAssocs.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                const firstApp = miniAppAssocs[0];
                                setSelectedMiniAppForModal({
                                  id: firstApp.id || '',
                                  name: firstApp.name,
                                  appId: firstApp.appId,
                                  currentChatId: group.id,
                                });
                              }}
                              className="text-xs h-9 px-3 rounded-xl flex items-center gap-1.5"
                            >
                              <svg className="w-3.5 h-3.5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                              </svg>
                              <span>Assign to New Group</span>
                            </Button>
                          )}

                          {miniAppAssocs.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleUnlinkAllFromGroup(group.id)}
                              disabled={isMigratingThis}
                              className="text-xs h-9 px-3 rounded-xl border-rose-200 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 flex items-center gap-1.5"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Unlink Apps</span>
                            </Button>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => onCopyTeamChatId(group.id)}
                        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold p-2 flex items-center gap-1"
                        title="Copy Group ID"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        <span>Copy ID</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-200 text-base">
                No Telegram Groups Detected Yet
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                Add <strong>@{telegramStatus?.botUsername || 'superapp_notification_bot'}</strong> into your Telegram team channel or group, then click <strong>&quot;Auto-Detect &amp; Refresh Groups&quot;</strong> above.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Assign Mini App to Group Modal */}
      <AssignMiniAppModal
        isOpen={Boolean(selectedMiniAppForModal)}
        onClose={() => setSelectedMiniAppForModal(null)}
        miniApp={selectedMiniAppForModal}
        liveGroups={detectedGroups}
        onAssign={handleAssignMiniApp}
      />
    </Card>
  );
}
