'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Label } from '@/components/ui/inputs';
import { toast } from '@/components/ui/Toast';
import { TelegramGroupItem } from './TelegramTeamCard';

import { telegramApi } from '@/api';

interface AssignMiniAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  miniApp: {
    id: string;
    name?: string;
    appId?: string;
    currentChatId?: string;
  } | null;
  liveGroups: TelegramGroupItem[];
  onAssign: (miniAppId: string, newChatId: string | null) => Promise<void>;
}

export function AssignMiniAppModal({
  isOpen,
  onClose,
  miniApp,
  liveGroups,
  onAssign,
}: AssignMiniAppModalProps) {
  const [mode, setMode] = useState<'EXISTING' | 'NEW' | 'UNLINK'>('EXISTING');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [newGroupIdInput, setNewGroupIdInput] = useState<string>('');
  const [validatingChat, setValidatingChat] = useState(false);
  const [chatValidation, setChatValidation] = useState<{
    isValid?: boolean;
    title?: string;
    error?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const firstLive = liveGroups.find((g) => g.isLive);
      if (firstLive) {
        setSelectedGroupId(firstLive.id);
        setMode('EXISTING');
      } else {
        setMode('NEW');
      }
      setNewGroupIdInput('');
      setChatValidation(null);
    }
  }, [isOpen, liveGroups]);

  if (!isOpen || !miniApp) return null;

  const handleValidateNewGroup = async () => {
    const trimmed = newGroupIdInput.trim();
    if (!trimmed) {
      toast.warning('Please enter a Telegram Chat ID first.', 'Missing ID');
      return;
    }

    setValidatingChat(true);
    setChatValidation(null);
    try {
      const data = await telegramApi.validateChat(trimmed);
      setChatValidation(data as any);
      if ((data as any).valid || (data as any).isValid) {
        toast.success(`Group "${data.title || trimmed}" verified active!`, 'Group Verified');
      } else {
        toast.error((data as any).error || 'Group inaccessible or bot is not a member.', 'Validation Failed');
      }
    } catch (err: any) {
      setChatValidation({ isValid: false, error: err.message || 'Failed to reach validation service' });
      toast.error('Network error validating Telegram group.', 'Network Error');
    } finally {
      setValidatingChat(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    let targetChatId: string | null = null;

    if (mode === 'EXISTING') {
      if (!selectedGroupId) {
        toast.warning('Please select a target group.', 'Selection Required');
        return;
      }
      targetChatId = selectedGroupId;
    } else if (mode === 'NEW') {
      const trimmed = newGroupIdInput.trim();
      if (!trimmed) {
        toast.warning('Please enter a new Telegram Group ID.', 'Input Required');
        return;
      }
      targetChatId = trimmed;
    } else {
      targetChatId = null;
    }

    setSaving(true);
    try {
      await onAssign(miniApp.id, targetChatId);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const activeLiveGroups = liveGroups.filter((g) => g.isLive);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Assign Telegram Group
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Target Mini App: <strong className="text-slate-800 dark:text-slate-200">{miniApp.name || miniApp.appId}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Current Status Info */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
              </svg>
              <span className="text-slate-600 dark:text-slate-300 font-medium">Current Group:</span>
            </div>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
              {miniApp.currentChatId || 'None (Unlinked)'}
            </span>
          </div>

          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('EXISTING')}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                mode === 'EXISTING'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2H5a2 2 0 00-2 2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Active Group</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('NEW')}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                mode === 'NEW'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>New Group</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('UNLINK')}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                mode === 'UNLINK'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Unlink</span>
            </button>
          </div>

          {/* Option 1: Existing Active Groups List */}
          {mode === 'EXISTING' && (
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Select an Active Telegram Group:
              </Label>
              {activeLiveGroups.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {activeLiveGroups.map((group) => {
                    const isSelected = selectedGroupId === group.id;
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setSelectedGroupId(group.id)}
                        className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all select-none ${
                          isSelected
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500 shadow-xs'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                              {group.title}
                            </span>
                            {group.isDefaultProfileChat && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 font-bold">
                                ⭐ Default
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                            {group.id}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            ✓
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>No active groups found. Please switch to &quot;New Group&quot; tab to enter a new Group ID.</span>
                </div>
              )}
            </div>
          )}

          {/* Option 2: Enter New Group ID */}
          {mode === 'NEW' && (
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Enter New Telegram Channel / Group ID:
              </Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newGroupIdInput}
                  onChange={(e) => {
                    setNewGroupIdInput(e.target.value);
                    setChatValidation(null);
                  }}
                  placeholder="e.g. -1002345678901 or -5542396469"
                  className="font-mono text-sm flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleValidateNewGroup}
                  disabled={validatingChat || !newGroupIdInput.trim()}
                  className="shrink-0 text-xs px-3.5 flex items-center gap-1.5"
                >
                  <svg className={`w-3.5 h-3.5 ${validatingChat ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{validatingChat ? 'Verifying...' : 'Check Live'}</span>
                </Button>
              </div>

              {chatValidation && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
                    chatValidation.isValid
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                  }`}
                >
                  {chatValidation.isValid ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                      <span>
                        Verified: <strong>{chatValidation.title}</strong> (Active group)
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-rose-500 font-bold shrink-0">⚠️</span>
                      <span>{chatValidation.error || 'Group inaccessible. Make sure bot is added as Admin.'}</span>
                    </>
                  )}
                </div>
              )}

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Make sure you added the bot as an administrator in the new group before saving.
              </p>
            </div>
          )}

          {/* Option 3: Unlink confirmation */}
          {mode === 'UNLINK' && (
            <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-2 text-xs text-rose-900 dark:text-rose-200">
              <div className="font-bold flex items-center gap-1.5">
                <svg className="w-4 h-4 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Remove Group Association</span>
              </div>
              <p>
                Mini App <strong>{miniApp.name || miniApp.appId}</strong> will no longer dispatch broadcast alerts to any Telegram group until a new group is configured.
              </p>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="text-xs px-4 py-2 rounded-xl flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Cancel</span>
            </Button>

            <Button
              type="submit"
              disabled={saving}
              className={`text-xs font-semibold px-5 py-2 rounded-xl flex items-center gap-1.5 ${
                mode === 'UNLINK' ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''
              }`}
            >
              <svg className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{saving ? 'Saving...' : mode === 'UNLINK' ? 'Confirm Unlink' : 'Apply Assignment'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}