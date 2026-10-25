'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Label } from '@/components/ui/inputs';
import { CleanDropdown } from '@/components/ui/CleanDropdown';
import { CheckIcon, AlertTriangleIcon } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { usersApi, telegramApi, User, Role, TelegramBotChat } from '@/api';

export interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingUser: User | null;
  roles: Role[];
  onSuccess: () => void;
}

export function UserModal({
  isOpen,
  onClose,
  editingUser,
  roles,
  onSuccess,
}: UserModalProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    roleNames: ['MA_DEVELOPER'] as string[],
    telegramChatId: '',
    telegramUsername: '',
    isActive: true,
  });

  // Telegram Auto-Detection State
  const [detectingTelegram, setDetectingTelegram] = useState(false);
  const [detectedTelegramChats, setDetectedTelegramChats] = useState<TelegramBotChat[]>([]);
  const [showTelegramPicker, setShowTelegramPicker] = useState(false);
  const [botUsername, setBotUsername] = useState('superapp_notification_bot');
  const [validatingChatId, setValidatingChatId] = useState(false);
  const [chatValidationStatus, setChatValidationStatus] = useState<{ checked: boolean; valid?: boolean; title?: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Preload Bot Info
  useEffect(() => {
    if (!isOpen) return;
    telegramApi
      .getStatus()
      .then((res) => {
        if (res?.botUsername) setBotUsername(res.botUsername);
      })
      .catch(() => { });
  }, [isOpen]);

  // Sync edit data when modal opens
  useEffect(() => {
    if (isOpen) {
      setDetectedTelegramChats([]);
      setShowTelegramPicker(false);
      setChatValidationStatus(null);

      if (editingUser) {
        const userRoles = editingUser.roles && editingUser.roles.length > 0
          ? editingUser.roles
          : editingUser.role
            ? [editingUser.role]
            : [];

        setFormData({
          name: editingUser.name || '',
          email: editingUser.email || '',
          roleNames: userRoles.length > 0 ? userRoles.map((r) => r.name) : ['MA_DEVELOPER'],
          telegramChatId: editingUser.telegramChatId || '',
          telegramUsername: editingUser.telegramUsername || '',
          isActive: editingUser.isActive !== undefined ? editingUser.isActive : true,
        });
      } else {
        setFormData({
          name: '',
          email: '',
          roleNames: ['MA_DEVELOPER'],
          telegramChatId: '',
          telegramUsername: '',
          isActive: true,
        });
      }
    }
  }, [isOpen, editingUser]);

  // Telegram Auto-Detection Handler
  const handleAutoDetectTelegram = async () => {
    setDetectingTelegram(true);
    try {
      const [statusRes, chatsRes] = await Promise.allSettled([
        telegramApi.getStatus(),
        telegramApi.getRecentChats(),
      ]);

      let currentBot = botUsername || 'superapp_notification_bot';
      if (statusRes.status === 'fulfilled' && statusRes.value?.botUsername) {
        currentBot = statusRes.value.botUsername;
        setBotUsername(currentBot);
      }

      const chats =
        chatsRes.status === 'fulfilled' && Array.isArray(chatsRes.value?.chats)
          ? chatsRes.value.chats
          : [];

      setDetectedTelegramChats(chats);
      setShowTelegramPicker(true);

      if (chats.length === 0) {
        toast.info(
          `No recent chats found. Ask the operator to message @${currentBot} with "/start", then tap Auto-Detect again.`,
          'Telegram Auto-Detect'
        );
      } else {
        const targetQuery = (formData.name || formData.email || '').toLowerCase().trim();
        const match = chats.find(
          (c: any) =>
            (c.username && targetQuery.includes(c.username.toLowerCase())) ||
            (c.name && targetQuery.includes(c.name.toLowerCase()))
        );

        if (match) {
          setFormData((prev) => ({
            ...prev,
            telegramChatId: match.chatId,
            telegramUsername: match.username || prev.telegramUsername,
          }));
          toast.success(
            `Matched: ${match.name} (Chat ID: ${match.chatId}). Auto-filled!`,
            'Telegram Auto-Detected'
          );
        } else {
          toast.success(
            `Found ${chats.length} active Telegram contact(s). Select below to auto-fill.`,
            'Contacts Discovered'
          );
        }
      }
    } catch (err: any) {
      console.error('Failed to auto-detect Telegram', err);
      toast.error('Failed to auto-detect Telegram chats.');
    } finally {
      setDetectingTelegram(false);
    }
  };

  const handleSelectDetectedChat = (chat: TelegramBotChat) => {
    setFormData((prev) => ({
      ...prev,
      telegramChatId: chat.chatId,
      telegramUsername: chat.username || prev.telegramUsername,
    }));
    setShowTelegramPicker(false);
    setChatValidationStatus({
      checked: true,
      valid: true,
      title: `${chat.name} (${chat.type})`,
    });
    toast.success(`Selected: ${chat.name} (${chat.chatId})`);
  };

  const handleVerifyChatId = async () => {
    if (!formData.telegramChatId.trim()) {
      toast.warning('Please enter a Telegram Chat ID first');
      return;
    }
    setValidatingChatId(true);
    try {
      const res = await telegramApi.validateChat(formData.telegramChatId.trim());
      if (res.valid) {
        setChatValidationStatus({
          checked: true,
          valid: true,
          title: res.title || 'Active Telegram Chat',
        });
        toast.success(`Verified: ${res.title || 'Chat is active'}`);
      } else {
        setChatValidationStatus({
          checked: true,
          valid: false,
          title: 'Unreachable / Inactive Chat ID',
        });
        toast.warning('Chat ID is not reachable by the bot');
      }
    } catch (err: any) {
      setChatValidationStatus({
        checked: true,
        valid: false,
        title: 'Validation failed',
      });
      toast.error('Chat validation failed');
    } finally {
      setValidatingChatId(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.warning('Name and Email are required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        await usersApi.update(editingUser.id, formData);
        toast.success(`User '${formData.name}' updated successfully!`);
      } else {
        await usersApi.create(formData);
        toast.success(`User '${formData.name}' created successfully!`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={() => !isSubmitting && onClose()}
      />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 shadow-2xl my-auto max-h-[calc(100vh-3rem)] overflow-y-auto z-10 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-500/20">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingUser ? 'Edit User Account' : 'Add New User'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure operator profile, role access, and alert channels
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="user-name" className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Full Name *
              </Label>
              <Input
                id="user-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. John Doe"
                required
              />
            </div>

            <div>
              <Label htmlFor="user-email" className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Address *
              </Label>
              <Input
                id="user-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. user@fsa.gov.kh"
                required
              />
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Assign Roles *
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700">
              {roles.map((r) => {
                const checked = formData.roleNames.includes(r.name);
                return (
                  <label
                    key={r.id}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-xs font-semibold ${checked
                        ? 'bg-brand-50 dark:bg-brand-500/20 text-brand-800 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setFormData((prev) => ({
                          ...prev,
                          roleNames: checked
                            ? prev.roleNames.filter((n) => n !== r.name)
                            : [...prev.roleNames, r.name],
                        }));
                      }}
                      className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4 shrink-0"
                    />
                    <span className="truncate">{r.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Telegram Alert Channel Auto-Detect Section */}
          <div className="p-4 rounded-xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-500 text-white shadow-xs">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Telegram Alert Channel</span>
                    <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/50 px-2 py-0.5 rounded-full">
                      Auto-Detect Ready
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Receive instant push notifications for approvals, review tasks, and alerts
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <a
                  href={`https://t.me/${botUsername || 'superapp_notification_bot'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-900/40 transition-colors shadow-2xs"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                  </svg>
                  <span>Open @{botUsername || 'Bot'}</span>
                  <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>

                <button
                  type="button"
                  onClick={handleAutoDetectTelegram}
                  disabled={detectingTelegram}
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-colors disabled:opacity-50"
                >
                  {detectingTelegram ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Scanning...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Auto-Detect</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Auto-detected list drawer / picker */}
            {showTelegramPicker && detectedTelegramChats.length > 0 && (
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 shadow-sm space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Discovered Active Contacts ({detectedTelegramChats.length}):
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowTelegramPicker(false)}
                    className="text-slate-400 hover:text-slate-600 text-[10px] font-semibold"
                  >
                    Close
                  </button>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {detectedTelegramChats.map((c) => (
                    <div
                      key={c.chatId}
                      onClick={() => handleSelectDetectedChat(c)}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-sky-50 dark:hover:bg-sky-900/30 border border-slate-200/60 dark:border-slate-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 shrink-0">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                            <span>{c.name}</span>
                            {c.username && (
                              <span className="text-[11px] font-normal text-sky-600 dark:text-sky-400">
                                @{c.username}
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">
                            ID: {c.chatId} • {c.type}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="text-[11px] font-bold px-2.5 py-1 rounded bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-600 hover:text-white transition-colors shrink-0"
                      >
                        Apply
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label htmlFor="telegram-chat-id" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <svg className="w-3.5 h-3.5 text-sky-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                    </svg>
                    Telegram Chat ID
                  </Label>
                  {formData.telegramChatId && (
                    <button
                      type="button"
                      onClick={handleVerifyChatId}
                      disabled={validatingChatId}
                      className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {validatingChatId ? 'Checking...' : 'Verify ID'}
                    </button>
                  )}
                </div>
                <Input
                  id="telegram-chat-id"
                  value={formData.telegramChatId}
                  onChange={(e) => {
                    setFormData({ ...formData, telegramChatId: e.target.value });
                    setChatValidationStatus(null);
                  }}
                  placeholder="e.g. 1193078022"
                />
                {chatValidationStatus && (
                  <div className={`text-[10px] font-semibold mt-1 flex items-center gap-1 ${chatValidationStatus.valid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                    }`}>
                    {chatValidationStatus.valid ? (
                      <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    <span>{chatValidationStatus.title}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="telegram-username" className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <svg className="w-3.5 h-3.5 text-sky-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                  </svg>
                  Telegram Username
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">@</span>
                  <Input
                    id="telegram-username"
                    value={formData.telegramUsername}
                    onChange={(e) => setFormData({ ...formData, telegramUsername: e.target.value.replace(/^@/, '') })}
                    placeholder="johndoe"
                    className="pl-7"
                  />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed flex items-center gap-1">
              <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>To auto-detect: Have operator open @{botUsername || 'the bot'} and tap /start.</span>
            </p>
          </div>

          <div>
            <Label className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Account Status
            </Label>
            <CleanDropdown
              label="Account Status"
              icon={
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              }
              value={formData.isActive ? 'ACTIVE' : 'INACTIVE'}
              options={[
                { value: 'ACTIVE', label: 'Active (Can Login & receive alerts)', dotColor: 'bg-emerald-500' },
                { value: 'INACTIVE', label: 'Inactive / Suspended', dotColor: 'bg-slate-400' },
              ]}
              onChange={(val) => setFormData({ ...formData, isActive: val === 'ACTIVE' })}
              className="w-full"
              buttonClassName="w-full justify-between"
              dropdownWidth="w-full"
              align="left"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving Account...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {editingUser ? 'Save Changes' : 'Create User'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
