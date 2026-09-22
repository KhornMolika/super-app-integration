"use client";
import { useState, useEffect } from 'react';
import { Input, Label, Button } from '@/components/ui/inputs';
import { toast } from '@/components/ui/Toast';
import { telegramApi } from '@/api';
import { ZapIcon, BuildingIcon, UserIcon, CheckIcon, CheckCircleIcon, AlertTriangleIcon, DevicePhoneIcon, PlusCircleIcon } from '@/components/ui/Icons';

export default function TeamForm({
  formData,
  setFormData,
  handleChange,
  allErrors = {},
  isEditable = true,
}: any) {
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Auto-Detect & User Profile Telegram states
  const [telegramStatus, setTelegramStatus] = useState<any>(null);
  const [loadingTelegram, setLoadingTelegram] = useState(false);
  const [detectingGroups, setDetectingGroups] = useState(false);
  const [detectedGroups, setDetectedGroups] = useState<Array<{ id: string; title: string; type?: string; [key: string]: any }>>([]);
  const [groupMode, setGroupMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  const updateField = (name: string, value: string) => {
    if (setFormData) {
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    } else if (handleChange) {
      handleChange({ target: { name, value } } as any);
    }
  };

  // Fetch Telegram status & profile info on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoadingTelegram(true);
        const data = await telegramApi.getStatus();
        if (data) {
          setTelegramStatus(data);

          // Auto-populate if fields are empty
          if (!formData.ownerName && data.user?.name) {
            updateField('ownerName', data.user.name);
          }
          if (!formData.ownerEmail && data.user?.email) {
            updateField('ownerEmail', data.user.email);
          }
          if (!formData.supportEmail && data.user?.email) {
            updateField('supportEmail', data.user.email);
          }
          if (!formData.teamTelegramChatId) {
            const defaultChat = data.user?.teamTelegramChatId || data.user?.telegramChatId;
            if (defaultChat) {
              updateField('teamTelegramChatId', defaultChat);
            }
          }
          if (data.user?.teamTelegramChatId) {
            setGroupMode('EXISTING');
          } else {
            setGroupMode('NEW');
          }
        }
      } catch (err) {
        console.error('Failed to load telegram status in TeamForm', err);
      } finally {
        setLoadingTelegram(false);
      }
    };

    fetchStatus();
  }, []);

  const handleAutofillOwner = () => {
    if (telegramStatus?.user) {
      if (telegramStatus.user.name) updateField('ownerName', telegramStatus.user.name);
      if (telegramStatus.user.email) updateField('ownerEmail', telegramStatus.user.email);
      if (telegramStatus.user.email && !formData.supportEmail) {
        updateField('supportEmail', telegramStatus.user.email);
      }
      toast.info(`Owner details pre-filled from profile (${telegramStatus.user.name || telegramStatus.user.email}).`, 'Auto-Filled');
    }
  };

  const handleAutoDetectGroups = async () => {
    setDetectingGroups(true);
    try {
      const data = await telegramApi.getUserGroups();
      const liveUserGroups = Array.isArray(data.groups)
        ? data.groups.filter((g: any) => g.isLive !== false)
        : [];

      if (liveUserGroups.length > 0) {
        setDetectedGroups(liveUserGroups);
        toast.success(
          `Discovered ${liveUserGroups.length} verified active Telegram group(s). Click any group below to apply.`,
          'Telegram Groups Found',
        );
      } else {
        // Fallback to recent-groups scan if user-groups was empty
        const fallbackData = await telegramApi.getRecentGroups();
        const liveFallback = Array.isArray(fallbackData.groups)
          ? fallbackData.groups.filter((g: any) => g.isLive !== false)
          : [];

        if (liveFallback.length > 0) {
          setDetectedGroups(liveFallback);
          toast.success(
            `Discovered ${liveFallback.length} active Telegram group(s). Click any group below to apply.`,
            'Telegram Groups Found',
          );
        } else {
          setDetectedGroups([]);
          const bot = telegramStatus?.botUsername || 'superapp_notification_bot';
          const msg = `No active groups detected. Ensure @${bot} is added as Administrator to your group and you typed "/start@${bot}". (Plain messages like "hi" are blocked by Telegram's default Group Privacy Mode).`;
          toast.warning(msg, 'No Groups Found');
        }
      }
    } catch (err: any) {
      toast.error('Failed to scan for recent Telegram groups.', 'Scan Failed');
    } finally {
      setDetectingGroups(false);
    }
  };

  const handleTestEmail = async () => {
    if (!formData.ownerEmail?.trim()) return;
    setIsTestingEmail(true);

    try {
      const data = await telegramApi.testEmail(formData.ownerEmail.trim());
      if (data && data.success) {
        toast.success(`Test email sent to ${formData.ownerEmail.trim()}! Check your inbox / spam.`, 'Email Delivered');
      } else {
        const msg = data?.message || data?.error || 'Failed to send test email.';
        toast.error(msg, 'Email Delivery Failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error sending test email.', 'Network Error');
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleSaveToProfile = async () => {
    if (!formData.teamTelegramChatId?.trim()) return;
    try {
      const res = await telegramApi.saveTeamChat({ teamTelegramChatId: formData.teamTelegramChatId.trim() });
      if (res?.success) {
        toast.success('Channel saved as your default profile team group!', 'Profile Updated');
        setTelegramStatus((prev: any) => ({
          ...prev,
          user: {
            ...prev?.user,
            teamTelegramChatId: formData.teamTelegramChatId.trim(),
          },
        }));
      }
    } catch (err: any) {
      toast.error('Failed to save group to profile.', 'Error');
    }
  };

  const handleTestTeamAlert = async () => {
    if (!formData.teamTelegramChatId?.trim()) return;
    setIsTesting(true);

    try {
      const data = await telegramApi.testTeamAlert(
        formData.teamTelegramChatId.trim(),
        formData.name || 'Mini App'
      );
      if (data && data.success) {
        toast.success('Test alert sent successfully to Telegram channel / group!', 'Telegram Alert Sent');
        if (saveAsDefault && formData.teamTelegramChatId?.trim()) {
          telegramApi
            .saveTeamChat({ teamTelegramChatId: formData.teamTelegramChatId.trim() })
            .then(() => {
              toast.info('Saved this group as your default team channel in profile.', 'Profile Updated');
              setTelegramStatus((prev: any) => ({
                ...prev,
                user: {
                  ...prev?.user,
                  teamTelegramChatId: formData.teamTelegramChatId.trim(),
                },
              }));
            })
            .catch(() => {});
        }
      } else {
        const msg = data?.message || 'Failed to send test alert. Make sure @superapp_notification_bot is added to the channel/group as Admin.';
        toast.error(msg, 'Telegram Delivery Failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error sending test Telegram notification.', 'Telegram Error');
    } finally {
      setIsTesting(false);
    }
  };

  const userHasTeamChat = Boolean(telegramStatus?.user?.teamTelegramChatId);
  const userHasDirectChat = Boolean(telegramStatus?.user?.telegramChatId);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>Team Name</Label>
            <span className="text-xs text-slate-400 font-medium">Optional</span>
          </div>
          <Input
            name="teamName"
            value={formData.teamName || ''}
            onChange={handleChange}
            placeholder="e.g. Core Banking Team"
            disabled={!isEditable}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>Owner Name</Label>
            {telegramStatus?.user?.name && isEditable && (
              <button
                type="button"
                onClick={handleAutofillOwner}
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold flex items-center gap-1"
              >
                <ZapIcon className="w-3.5 h-3.5 text-amber-500" />
                <span>Fill from Profile ({telegramStatus.user.name})</span>
              </button>
            )}
          </div>
          <Input
            name="ownerName"
            value={formData.ownerName || ''}
            onChange={handleChange}
            placeholder="John Doe"
            disabled={!isEditable}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>Owner Email <span className="text-rose-500">*</span></Label>
            {formData.ownerEmail && (
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={isTestingEmail}
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold flex items-center gap-1"
              >
                <svg className={`w-3.5 h-3.5 ${isTestingEmail ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>{isTestingEmail ? 'Sending...' : 'Send Test Email'}</span>
              </button>
            )}
          </div>
          <Input 
            required 
            name="ownerEmail" 
            value={formData.ownerEmail || ''} 
            onChange={handleChange} 
            type="email" 
            placeholder="john.doe@fsa.gov" 
            disabled={!isEditable}
            className={allErrors.ownerEmail ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}
          />
          {allErrors.ownerEmail && <p className="mt-1.5 text-sm text-rose-600 font-medium">{allErrors.ownerEmail}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>Support Email</Label>
            <span className="text-xs text-slate-400 font-medium">Optional</span>
          </div>
          <Input 
            name="supportEmail" 
            value={formData.supportEmail || ''} 
            onChange={handleChange} 
            type="email" 
            placeholder="support@fsa.gov" 
            disabled={!isEditable}
            className={allErrors.supportEmail ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}
          />
          {allErrors.supportEmail && <p className="mt-1.5 text-sm text-rose-600 font-medium">{allErrors.supportEmail}</p>}
        </div>

        {/* Telegram Channel / Group Integration */}
        <div className="md:col-span-2 space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-sky-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span>Team Telegram Channel Alerts</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium">Persistent</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Receive real-time CI/CD test results, security audit alerts, and build reports.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:underline flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{showGuide ? 'Hide Guide' : 'Setup Guide'}</span>
              </button>
            </div>
          </div>

          {/* User has team chat in profile: Show Choice Prompt */}
          {userHasTeamChat && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Do you want to use your existing team group or add a new one?
                </span>
                <span className="text-[11px] text-slate-400">Select an option below</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 2 Card: Use Existing Group */}
                <button
                  type="button"
                  disabled={!isEditable}
                  onClick={() => {
                    setGroupMode('EXISTING');
                    updateField('teamTelegramChatId', telegramStatus.user.teamTelegramChatId);
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    groupMode === 'EXISTING'
                      ? 'border-sky-500 bg-white dark:bg-slate-800 ring-2 ring-sky-500/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 w-full">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        groupMode === 'EXISTING'
                          ? 'bg-sky-500 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        <BuildingIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                          <span>Use Existing Group</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-medium">
                            Profile Saved
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {telegramStatus.user.teamTelegramChatId}
                        </div>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center transition-all ${
                      groupMode === 'EXISTING'
                        ? 'border-sky-500 bg-sky-500 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {groupMode === 'EXISTING' && <CheckIcon className="w-2.5 h-2.5 text-white" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    Use your default team channel saved in your user profile.
                  </p>
                </button>

                {/* Option 1 Card: Add New Group */}
                <button
                  type="button"
                  disabled={!isEditable}
                  onClick={() => {
                    setGroupMode('NEW');
                    if (formData.teamTelegramChatId === telegramStatus.user.teamTelegramChatId) {
                      updateField('teamTelegramChatId', '');
                    }
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    groupMode === 'NEW'
                      ? 'border-sky-500 bg-white dark:bg-slate-800 ring-2 ring-sky-500/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 w-full">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        groupMode === 'NEW'
                          ? 'bg-sky-500 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        <PlusCircleIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                          <span>Add New Group</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium">
                            1-Click / Custom
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          Connect a separate group
                        </div>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center transition-all ${
                      groupMode === 'NEW'
                        ? 'border-sky-500 bg-sky-500 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {groupMode === 'NEW' && <CheckIcon className="w-2.5 h-2.5 text-white" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    Add the bot to a new channel or auto-detect an active group.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Body when groupMode === 'EXISTING' */}
          {userHasTeamChat && groupMode === 'EXISTING' && (
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Routing alerts to saved group: <strong className="font-mono">{formData.teamTelegramChatId || telegramStatus.user.teamTelegramChatId}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestTeamAlert}
                    disabled={isTesting || !formData.teamTelegramChatId}
                    className="text-xs px-3 py-1.5 h-8 flex items-center gap-1.5 text-sky-700 border-sky-300 hover:bg-sky-50 dark:text-sky-300 dark:border-sky-800"
                  >
                    <svg className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span>{isTesting ? 'Testing...' : 'Test Channel Alert'}</span>
                  </Button>
                </div>
              </div>

              {userHasDirectChat && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Need personal notifications instead?</span>
                  <button
                    type="button"
                    onClick={() => updateField('teamTelegramChatId', telegramStatus.user.telegramChatId)}
                    className="text-sky-600 dark:text-sky-400 hover:underline font-medium flex items-center gap-1"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-sky-500" />
                    <span>Use Personal Chat ({telegramStatus.user.telegramChatId})</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Body when groupMode === 'NEW' OR when user does not have a saved group */}
          {(!userHasTeamChat || groupMode === 'NEW') && (
            <div className="space-y-3">
              {/* Action bar for New Group */}
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
                      className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 font-semibold text-xs flex items-center gap-1 transition-all"
                    >
                      <svg className={`w-3.5 h-3.5 ${detectingGroups ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span>{detectingGroups ? 'Scanning...' : 'Scan Discovered Groups'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Detected Groups Drawer */}
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
                          className={`p-2.5 rounded-lg border text-left flex items-center justify-between gap-2 transition-all select-none ${
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

              {/* Input row */}
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
                    className="shrink-0 text-xs px-3 flex items-center gap-1.5"
                  >
                    <svg className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span>{isTesting ? 'Testing...' : 'Test Channel Alert'}</span>
                  </Button>
                )}
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
                      Save this group as my default team channel in profile (for future Mini Apps)
                    </span>
                  </label>
                  {formData.teamTelegramChatId && (
                    <button
                      type="button"
                      onClick={handleSaveToProfile}
                      className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 shrink-0 ml-2"
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
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium">Auto-Saved</span>
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
            Automated security scan reports, CI/CD test builds, and release updates for this Mini App will be broadcast directly to your team channel. (Add <code>@{telegramStatus?.botUsername || 'superapp_notification_bot'}</code> to your group/channel first).
          </p>
        </div>
      </div>
    </>
  );
}
