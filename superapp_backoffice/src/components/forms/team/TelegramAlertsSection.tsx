'use client';

import React from 'react';
import { Input, Label, Button } from '@/components/ui/inputs';
import {
  BuildingIcon,
  UserIcon,
  CheckIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ZapIcon,
} from '@/components/ui/Icons';

export interface TelegramAlertsSectionProps {
  formData: any;
  handleChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isEditable?: boolean;
  telegramStatus: any;
  updateField: (name: string, value: string) => void;
  isEditingTelegram: boolean;
  setIsEditingTelegram: (val: boolean) => void;
  showGuide: boolean;
  setShowGuide: (val: boolean | ((prev: boolean) => boolean)) => void;
  isTesting: boolean;
  handleTestTeamAlert: () => Promise<void>;
  handleAutoDetectGroups: () => Promise<void>;
  detectingGroups: boolean;
  detectedGroups: any[];
  saveAsDefault: boolean;
  setSaveAsDefault: (val: boolean) => void;
  handleSaveToProfile: () => Promise<void>;
}

export function TelegramAlertsSection({
  formData,
  handleChange,
  isEditable = true,
  telegramStatus,
  updateField,
  isEditingTelegram,
  setIsEditingTelegram,
  showGuide,
  setShowGuide,
  isTesting,
  handleTestTeamAlert,
  handleAutoDetectGroups,
  detectingGroups,
  detectedGroups,
  saveAsDefault,
  setSaveAsDefault,
  handleSaveToProfile,
}: TelegramAlertsSectionProps) {
  const userHasTeamChat = Boolean(telegramStatus?.user?.teamTelegramChatId);
  const userHasDirectChat = Boolean(telegramStatus?.user?.telegramChatId);
  const currentChatId = (formData.teamTelegramChatId || formData.alertTelegramChatId || '').trim();
  const isConnected = Boolean(currentChatId);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900/60 shadow-xs space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-sky-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Team Telegram Channel Alerts</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium">
                Persistent
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Receive real-time CI/CD test results, security audit alerts, and build reports.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowGuide((prev) => !prev)}
            className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{showGuide ? 'Hide Guide' : 'Setup Guide'}</span>
          </button>
        </div>
      </div>

      {/* Connected State (Status-First) */}
      {isConnected && !isEditingTelegram && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-sky-500/5 via-emerald-500/5 to-transparent dark:from-sky-950/30 dark:via-emerald-950/20 dark:to-transparent border border-sky-200/80 dark:border-sky-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
              </svg>
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Telegram Notification Channel
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Connected &amp; Active</span>
                </span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-500 dark:text-slate-400">Destination:</span>
                <code className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[11px] font-semibold">
                  {currentChatId}
                </code>
                {currentChatId === telegramStatus?.user?.teamTelegramChatId ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-medium">
                    Agency Profile Group
                  </span>
                ) : currentChatId === telegramStatus?.user?.telegramChatId ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium">
                    Personal Chat
                  </span>
                ) : null}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                CI/CD test runs, build reports, and security audit alerts are delivered here automatically.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestTeamAlert}
              disabled={isTesting}
              className="text-xs px-3 py-1.5 h-8 flex items-center gap-1.5 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/50 cursor-pointer"
            >
              <svg className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span>{isTesting ? 'Testing...' : 'Test Channel Alert'}</span>
            </Button>

            {isEditable && (
              <button
                type="button"
                onClick={() => setIsEditingTelegram(true)}
                className="text-xs px-3 py-1.5 h-8 font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span>Change Channel</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Configuration Drawer (When Not Connected or Editing) */}
      {(!isConnected || isEditingTelegram) && (
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              {isConnected ? 'Change Notification Channel' : 'Connect Telegram Notification Channel'}
            </span>
            {isConnected && (
              <button
                type="button"
                onClick={() => setIsEditingTelegram(false)}
                className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Quick Presets */}
          {(userHasTeamChat || userHasDirectChat) && (
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-slate-500 font-medium">Quick Presets:</span>
              {userHasTeamChat && (
                <button
                  type="button"
                  onClick={() => updateField('teamTelegramChatId', telegramStatus.user.teamTelegramChatId)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    currentChatId === telegramStatus.user.teamTelegramChatId
                      ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 text-sky-700 dark:text-sky-300 font-semibold'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-sky-300'
                  }`}
                >
                  <BuildingIcon className="w-3 h-3 text-sky-500" />
                  <span>Profile Group ({telegramStatus.user.teamTelegramChatId})</span>
                </button>
              )}
              {userHasDirectChat && (
                <button
                  type="button"
                  onClick={() => updateField('teamTelegramChatId', telegramStatus.user.telegramChatId)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    currentChatId === telegramStatus.user.telegramChatId
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                  }`}
                >
                  <UserIcon className="w-3 h-3 text-indigo-500" />
                  <span>Personal Chat ({telegramStatus.user.telegramChatId})</span>
                </button>
              )}
            </div>
          )}

          {/* 1-Click Bot & Auto-Detect Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/60 text-xs">
            <span className="font-semibold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
              <ZapIcon className="w-3.5 h-3.5 text-sky-500" />
              <span>Connect a Group with Zero Manual Setup:</span>
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {isEditable && (
                <a
                  href={`https://t.me/${telegramStatus?.botUsername || 'superapp_notification_bot'}?startgroup=true&admin=post_messages+manage_chat`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1 shadow-sm transition-all"
                  title="Opens Telegram to select your group and add the bot as Admin automatically!"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>1-Click Add Bot to Group</span>
                </a>
              )}
              {isEditable && (
                <button
                  type="button"
                  onClick={handleAutoDetectGroups}
                  disabled={detectingGroups}
                  className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer"
                >
                  <svg
                    className={`w-3.5 h-3.5 ${detectingGroups ? 'animate-spin' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>{detectingGroups ? 'Scanning...' : 'Scan Discovered Groups'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Detected Groups */}
          {detectedGroups.length > 0 && (
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-700 space-y-2 animate-in fade-in duration-200 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-sky-900 dark:text-sky-200">
                <span className="flex items-center gap-1.5">
                  <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Active Bot Groups Detected:</span>
                </span>
                <span className="text-[11px] text-sky-600 dark:text-sky-400">Click any card to select</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {detectedGroups.map((group) => {
                  const isSelected = formData.teamTelegramChatId === group.id;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => updateField('teamTelegramChatId', group.id)}
                      className={`p-2.5 rounded-lg border text-left flex items-center justify-between gap-2 transition-all select-none cursor-pointer ${
                        isSelected
                          ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 ring-2 ring-sky-500/20'
                          : 'bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 hover:border-sky-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                          <span>{group.title || 'Untitled Group'}</span>
                          {(group as any).isLive === false && (
                            <span className="text-[10px] text-rose-500 font-normal inline-flex items-center gap-0.5">
                              <AlertTriangleIcon className="w-3 h-3 text-rose-500" />
                              <span>Unavailable</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <span>{group.id}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-[10px] uppercase font-sans">
                            {group.type}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          <CheckIcon className="w-3.5 h-3.5 text-white" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chat ID Input Row */}
          <div className="space-y-1.5">
            <Label className="text-xs">Telegram Group or Channel ID</Label>
            <div className="flex gap-2">
              <Input
                name="teamTelegramChatId"
                value={formData.teamTelegramChatId || ''}
                onChange={handleChange}
                placeholder="e.g. -1001234567890 or @my_team_channel"
                disabled={!isEditable}
                className="font-mono text-sm flex-1"
              />
              {formData.teamTelegramChatId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestTeamAlert}
                  disabled={isTesting}
                  className="shrink-0 text-xs px-3 flex items-center gap-1.5 cursor-pointer"
                >
                  <svg
                    className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  <span>{isTesting ? 'Testing...' : 'Test Channel Alert'}</span>
                </Button>
              )}
              {isConnected && (
                <Button
                  type="button"
                  onClick={() => setIsEditingTelegram(false)}
                  className="shrink-0 text-xs px-3.5 bg-brand-600 hover:bg-brand-700 text-white cursor-pointer"
                >
                  Done
                </Button>
              )}
            </div>
          </div>

          {/* Save As Default Checkbox */}
          {isEditable && (
            <div className="p-2.5 rounded-lg bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={saveAsDefault}
                  onChange={(e) => setSaveAsDefault(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                />
                <span className="font-medium">
                  Save this group as my default team channel in profile (for future MiniApps)
                </span>
              </label>
              {formData.teamTelegramChatId && (
                <button
                  type="button"
                  onClick={handleSaveToProfile}
                  className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
                >
                  <BuildingIcon className="w-3 h-3 text-sky-500" />
                  <span>Save Now</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Collapsible Helper Guide */}
      {showGuide && (
        <div className="p-3.5 rounded-xl bg-slate-100/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2 text-slate-700 dark:text-slate-300 animate-in fade-in duration-200">
          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
            <span>Quick Guide: Setup Team Group Alerts (Persistent)</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium">
              Auto-Saved
            </span>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed">
            <li>
              <strong>Option A (1-Click Link):</strong> Click <strong>&quot;1-Click Add Bot to Group&quot;</strong>. Telegram will open, ask you to pick your group, and prompt to add <code>@{telegramStatus?.botUsername || 'superapp_notification_bot'}</code> with admin permissions.
            </li>
            <li>
              <strong>Option B (Manual Add):</strong> Add <code>@{telegramStatus?.botUsername || 'superapp_notification_bot'}</code> into your group and promote it to <strong>Administrator</strong>. In the group, type <code>/start@{telegramStatus?.botUsername || 'superapp_notification_bot'}</code>.
            </li>
            <li>
              <strong>Auto-Detect or Paste Chat ID:</strong> Click <strong>&quot;Scan Discovered Groups&quot;</strong>, or paste the <code>-100...</code> ID directly into the field.
            </li>
            <li>
              <strong>Test &amp; Persist:</strong> Click <strong>&quot;Test Channel Alert&quot;</strong>. The group is permanently registered in PostgreSQL and remembered across server restarts!
            </li>
          </ol>
        </div>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Automated security scan reports, CI/CD test builds, and release updates for this MiniApp will be broadcast directly to your team channel. (Add <code>@{telegramStatus?.botUsername || 'superapp_notification_bot'}</code> to your group/channel first).
      </p>
    </div>
  );
}
