'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { User, usersApi, unwrapItem } from '@/api';
import { telegramApi, TelegramBotChat } from '@/api/telegram.api';
import { Button, Input, Label } from '@/components/ui/inputs';
import { toast } from '@/components/ui/Toast';

export interface TelegramConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSuccess?: (updatedUser: User) => void;
}

export function TelegramConfigModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: TelegramConfigModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [telegramUsername, setTelegramUsername] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');

  // Bot Info & Detection State
  const [botUsername, setBotUsername] = useState('superapp_notification_bot');
  const [isBotEnabled, setIsBotEnabled] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [detectedChats, setDetectedChats] = useState<TelegramBotChat[]>([]);

  // Chat Validation State
  const [validatingChatId, setValidatingChatId] = useState(false);
  const [chatValidation, setChatValidation] = useState<{
    isValid?: boolean;
    title?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize Form Data from User
  useEffect(() => {
    if (isOpen) {
      setTelegramUsername(
        user.telegramUsername ? user.telegramUsername.replace(/^@+/, '') : ''
      );
      setTelegramChatId(user.telegramChatId || '');
      setChatValidation(null);
    }
  }, [isOpen, user]);

  // Scan Bot Whereabouts (Triggered ONLY when user clicks Detect)
  const handleScanTelegram = useCallback(async () => {
    try {
      setIsScanning(true);
      const [statusRes, chatsRes] = await Promise.allSettled([
        telegramApi.getStatus(),
        telegramApi.getRecentChats(),
      ]);

      if (statusRes.status === 'fulfilled' && statusRes.value?.botUsername) {
        setBotUsername(statusRes.value.botUsername);
        setIsBotEnabled(statusRes.value.isEnabled !== false);
      }

      const foundMap = new Map<string, TelegramBotChat>();

      if (chatsRes.status === 'fulfilled') {
        const rawChats = Array.isArray(chatsRes.value)
          ? chatsRes.value
          : Array.isArray(chatsRes.value?.chats)
          ? chatsRes.value.chats
          : [];

        for (const c of rawChats) {
          if (c && c.chatId) {
            const id = String(c.chatId);
            const rawType = (c.type || '').toLowerCase();
            // Normalize supergroup and group cleanly into 'group'
            const normalizedType =
              rawType === 'supergroup' || rawType === 'group'
                ? 'group'
                : rawType === 'channel'
                ? 'channel'
                : 'private';

            foundMap.set(id, {
              chatId: id,
              type: normalizedType as any,
              name: c.name || (c.username ? `@${c.username}` : `Chat ${id}`),
              username: c.username,
              isDirectUser: normalizedType === 'private',
              lastActive: c.lastActive,
            });
          }
        }
      }

      const list = Array.from(foundMap.values());
      setDetectedChats(list);
      setHasScanned(true);

      if (list.length > 0) {
        toast.success(
          `Detected ${list.length} active Telegram chat(s) & group(s) where @${botUsername} is present.`
        );
      } else {
        toast.info(
          `No active interactions found yet. Open @${botUsername} in Telegram to start or invite to group.`
        );
      }
    } catch (err: any) {
      console.error('Failed to scan bot whereabouts:', err);
      toast.error('Failed to scan Telegram bot whereabouts');
    } finally {
      setIsScanning(false);
    }
  }, [botUsername]);

  if (!mounted || !isOpen) return null;

  const cleanTelegram = telegramUsername.trim().replace(/^@+/, '');
  const cleanChatId = telegramChatId.trim();

  // Apply a detected chat directly to form
  const handleSelectChat = (chat: TelegramBotChat) => {
    setTelegramChatId(chat.chatId);
    if (chat.username) {
      setTelegramUsername(chat.username.replace(/^@+/, ''));
    }
    setChatValidation({
      isValid: true,
      title: chat.name,
    });
    toast.success(`Selected "${chat.name}" (ID: ${chat.chatId})`);
  };

  // Live validate Chat ID against Telegram API
  const handleValidateChatId = async () => {
    if (!cleanChatId) {
      toast.warning('Please enter a Chat ID to validate');
      return;
    }
    try {
      setValidatingChatId(true);
      setChatValidation(null);
      const res = await telegramApi.validateChat(cleanChatId);
      if (res && (res as any).isValid !== false && !(res as any).error) {
        const title = (res as any).title || 'Verified Telegram Chat';
        setChatValidation({
          isValid: true,
          title,
        });
        toast.success(`Chat ID verified! Bot is active in "${title}".`);
      } else {
        const error = (res as any).error || 'Bot could not access this chat. Make sure bot is added.';
        setChatValidation({
          isValid: false,
          error,
        });
        toast.warning(error);
      }
    } catch (err: any) {
      setChatValidation({
        isValid: false,
        error: err.message || 'Validation request failed',
      });
      toast.error(err.message || 'Validation request failed');
    } finally {
      setValidatingChatId(false);
    }
  };

  // Submit and Save to User Account
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await usersApi.update(user.id, {
        telegramUsername: cleanTelegram || '',
        telegramChatId: cleanChatId || '',
      });
      const updatedUser = unwrapItem<User>(res);
      toast.success('Alert delivery channels updated successfully!');
      onSuccess?.(updatedUser);
      onClose();
    } catch (err: any) {
      console.error('Failed to update alert channels:', err);
      toast.error(err.message || 'Failed to update alert delivery channels');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearTelegram = () => {
    setTelegramUsername('');
    setTelegramChatId('');
    setChatValidation(null);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={() => !isSubmitting && onClose()} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 max-w-xl w-full p-5 sm:p-6 shadow-2xl my-auto z-10 animate-in zoom-in-95 duration-200 max-h-[calc(100vh-2.5rem)] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Alerts &amp; Delivery Channels
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure direct dispatch channels and Telegram notifications for {user.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Bot Whereabouts & Detection Card */}
          <div className="rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/40 dark:bg-sky-950/20 p-4 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>Telegram Bot Whereabouts</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Online
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Detect where @{botUsername} is present and select a channel
                  </p>
                </div>
              </div>

              {/* Scan Action Button */}
              <button
                type="button"
                onClick={handleScanTelegram}
                disabled={isScanning}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto shrink-0"
              >
                <svg
                  className={`w-3.5 h-3.5 text-sky-500 ${isScanning ? 'animate-spin' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{isScanning ? 'Scanning...' : 'Detect Bot Chats'}</span>
              </button>
            </div>

            {/* 1-Click Bot Setup Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-sky-200/60 dark:border-sky-800/60 text-xs">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Quick Connect:</span>
              <a
                href={`https://t.me/${botUsername}?start=${user.id}`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-[11px] shadow-xs inline-flex items-center gap-1 transition-colors"
                title="Open personal chat with the bot and tap START"
              >
                <span>Open Bot (@{botUsername})</span>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <a
                href={`https://t.me/${botUsername}?startgroup=true&admin=post_messages+manage_chat`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] shadow-xs inline-flex items-center gap-1 transition-colors"
                title="Add bot to an alert group as Admin automatically"
              >
                <span>Add Bot to Group</span>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </a>
            </div>

            {/* Detected Chats List */}
            {detectedChats.length > 0 ? (
              <div className="space-y-2 pt-2 border-t border-sky-200/60 dark:border-sky-800/60">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Detected Bot Locations ({detectedChats.length}):
                  </span>
                  <span className="text-slate-400">Click any card to apply</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {detectedChats.map((chat) => {
                    const isSelected = cleanChatId === chat.chatId;
                    const isChannel = chat.type === 'channel';
                    const isDirect = chat.type === 'private' || chat.isDirectUser;
                    const isGroup = !isChannel && !isDirect;
                    const typeLabel = isDirect ? 'Direct Chat' : isChannel ? 'Channel' : 'Group';

                    return (
                      <div
                        key={chat.chatId}
                        onClick={() => handleSelectChat(chat)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'bg-sky-500/10 border-sky-500 ring-2 ring-sky-500/30'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-600'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isGroup
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : isChannel
                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                            }`}
                          >
                            {isGroup ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            ) : isChannel ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {chat.name}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <span>ID: {chat.chatId}</span>
                              {chat.username && (
                                <span className="text-sky-600 dark:text-sky-400">
                                  @{chat.username}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              isGroup
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : isChannel
                                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                                : 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                            }`}
                          >
                            {typeLabel}
                          </span>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">
                              ✓
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : hasScanned && !isScanning ? (
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                  No active chats recorded yet.
                </span>
                <p>
                  To connect: Click <b>Open Bot</b> to send <code className="text-sky-600">/start</code>, or click <b>Add Bot to Group</b>, then tap <b>Detect Bot Chats</b> above.
                </p>
              </div>
            ) : null}
          </div>

          {/* Manual Input Fields Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Channel Credentials
              </span>
              {(cleanTelegram || cleanChatId) && (
                <button
                  type="button"
                  onClick={handleClearTelegram}
                  className="text-[11px] text-rose-500 hover:text-rose-600 font-medium hover:underline cursor-pointer"
                >
                  Unlink Telegram
                </button>
              )}
            </div>

            {/* Telegram Username */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="modal-telegram-user" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Telegram Username
                </Label>
                {cleanTelegram && (
                  <a
                    href={`https://t.me/${cleanTelegram}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <span>Open t.me/{cleanTelegram}</span>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono select-none">
                  @
                </span>
                <Input
                  id="modal-telegram-user"
                  type="text"
                  value={telegramUsername}
                  onChange={(e) => setTelegramUsername(e.target.value.replace(/^@+/, ''))}
                  placeholder="operator_username"
                  className="w-full text-xs pl-7 rounded-xl font-mono"
                />
              </div>
            </div>

            {/* Telegram Chat ID */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="modal-telegram-chat" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Telegram Chat ID
                </Label>
                {cleanChatId && (
                  <button
                    type="button"
                    onClick={handleValidateChatId}
                    disabled={validatingChatId}
                    className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    {validatingChatId ? 'Verifying...' : 'Verify ID with Bot ↗'}
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="modal-telegram-chat"
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => {
                    setTelegramChatId(e.target.value.trim());
                    setChatValidation(null);
                  }}
                  placeholder="e.g. 1193078022 or -100..."
                  className="w-full text-xs rounded-xl font-mono"
                />
              </div>

              {/* Chat Validation Feedback */}
              {chatValidation && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                    chatValidation.isValid
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  <span className="font-bold">{chatValidation.isValid ? '✓ Verified:' : '⚠ Warning:'}</span>
                  <span className="truncate">{chatValidation.title || chatValidation.error}</span>
                </div>
              )}

              <p className="text-[11px] text-slate-400">
                Direct user chat ID or group channel ID (with leading <code>-100</code>).
              </p>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs font-semibold py-2 px-4 rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="text-xs font-semibold py-2 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Save Configuration</span>
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
