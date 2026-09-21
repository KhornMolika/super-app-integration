"use client";
import { useState, useEffect } from 'react';
import { Input, Label, Button } from '@/components/ui/inputs';
import { toast } from '@/components/ui/Toast';
import { telegramApi } from '@/api';
import { ZapIcon, BuildingIcon, UserIcon, CheckIcon, AlertTriangleIcon, DevicePhoneIcon } from '@/components/ui/Icons';

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
          const msg = `No active groups found yet. Make sure you added @${
            telegramStatus?.botUsername || 'superapp_notification_bot'
          } into your group and posted a message (e.g. "/start" or "hi").`;
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
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-sky-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Team Telegram Channel / Group ID</span>
            </Label>

            <div className="flex items-center gap-3">
              {isEditable && (
                <button
                  type="button"
                  onClick={handleAutoDetectGroups}
                  disabled={detectingGroups}
                  className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline flex items-center gap-1"
                >
                  <svg className={`w-3.5 h-3.5 ${detectingGroups ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>{detectingGroups ? 'Scanning Groups...' : '1-Click Auto-Detect Groups'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:underline flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{showGuide ? 'Hide Guide' : 'How to get ID?'}</span>
              </button>
            </div>
          </div>

          {/* Quick Auto-Fill Chips from Profile */}
          {isEditable && (userHasTeamChat || userHasDirectChat) && (
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-slate-500 font-medium">Quick Fill from Profile:</span>
              {userHasTeamChat && (
                <button
                  type="button"
                  onClick={() => updateField('teamTelegramChatId', telegramStatus.user.teamTelegramChatId)}
                  className={`px-2.5 py-1 rounded-lg border font-mono transition-all flex items-center gap-1.5 ${
                    formData.teamTelegramChatId === telegramStatus.user.teamTelegramChatId
                      ? 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800 ring-1 ring-sky-400'
                      : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:border-sky-300'
                  }`}
                >
                  <BuildingIcon className="w-3.5 h-3.5 text-sky-500" />
                  <span>Use Saved Team Channel ({telegramStatus.user.teamTelegramChatId})</span>
                  {formData.teamTelegramChatId === telegramStatus.user.teamTelegramChatId && (
                    <CheckIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  )}
                </button>
              )}
              {userHasDirectChat && (
                <button
                  type="button"
                  onClick={() => updateField('teamTelegramChatId', telegramStatus.user.telegramChatId)}
                  className={`px-2.5 py-1 rounded-lg border font-mono transition-all flex items-center gap-1.5 ${
                    formData.teamTelegramChatId === telegramStatus.user.telegramChatId
                      ? 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800 ring-1 ring-sky-400'
                      : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:border-sky-300'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5 text-sky-500" />
                  <span>
                    Use Personal Chat ({telegramStatus.user.telegramChatId}
                    {telegramStatus.user.telegramUsername ? ` - @${telegramStatus.user.telegramUsername}` : ''})
                  </span>
                  {formData.teamTelegramChatId === telegramStatus.user.telegramChatId && (
                    <CheckIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  )}
                </button>
              )}
            </div>
          )}

          {/* Auto-Detected Groups Drawer */}
          {detectedGroups.length > 0 && (
            <div className="p-3 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/60 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs font-semibold text-sky-900 dark:text-sky-200">
                <span>Discovered Groups with @{telegramStatus?.botUsername || 'superapp_notification_bot'}:</span>
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
                          ? 'bg-white dark:bg-slate-800 border-sky-500 ring-2 ring-sky-500 shadow-sm'
                          : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-700'
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
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-[10px] uppercase font-sans">
                            {group.type}
                          </span>
                        </div>
                        {Array.isArray((group as any).associatedWith) && (group as any).associatedWith.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(group as any).associatedWith.map((assoc: any, i: number) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 font-medium inline-flex items-center gap-1">
                                {assoc.type === 'MINIAPP' ? (
                                  <>
                                    <DevicePhoneIcon className="w-3 h-3 text-purple-500" />
                                    <span>{assoc.name || assoc.appId}</span>
                                  </>
                                ) : assoc.type === 'PROFILE' ? (
                                  <>
                                    <UserIcon className="w-3 h-3 text-sky-500" />
                                    <span>Profile Channel</span>
                                  </>
                                ) : (
                                  assoc.type
                                )}
                              </span>
                            ))}
                          </div>
                        )}
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

          {/* Collapsible Helper Guide */}
          {showGuide && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2 text-slate-700 dark:text-slate-300 animate-in fade-in duration-200">
              <div className="font-bold text-slate-900 dark:text-slate-100">Quick Guide: Setup Team Group Alerts</div>
              <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed">
                <li>
                  <strong>Add bot to group:</strong> Add <code>@{telegramStatus?.botUsername || 'superapp_notification_bot'}</code> into your Telegram team group or channel.
                </li>
                <li>
                  <strong>1-Click Auto-Detect:</strong> Click <strong>&quot;1-Click Auto-Detect Groups&quot;</strong> above to instantly scan and choose your group.
                </li>
                <li>
                  <strong>Or Find Group ID manually:</strong> Open <code>web.telegram.org</code> and copy the <code>-100...</code> ID from the browser URL.
                </li>
                <li>
                  <strong>Test Delivery:</strong> Click <strong>&quot;Test Channel Alert&quot;</strong> to confirm instant notification delivery!
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
