"use client";
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Input, Label, Button } from '@/components/ui/inputs';
import { toast } from '@/components/ui/Toast';
import { telegramApi, miniappsApi, usersApi, User } from '@/api';
import {
  ZapIcon,
  BuildingIcon,
  UserIcon,
  CheckIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  DevicePhoneIcon,
  PlusCircleIcon,
  SearchIcon,
  XIcon,
  CodeIcon,
  ShieldIcon,
  EyeIcon,
  UserGroupIcon,
} from '@/components/ui/Icons';

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-indigo-600 text-white',
    'bg-sky-600 text-white',
    'bg-emerald-600 text-white',
    'bg-amber-600 text-white',
    'bg-purple-600 text-white',
    'bg-rose-600 text-white',
    'bg-teal-600 text-white',
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function TeamForm({
  formData,
  setFormData,
  handleChange,
  allErrors = {},
  isEditable = true,
}: any) {
  const [mounted, setMounted] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isEditingOwner, setIsEditingOwner] = useState(false);
  const [isEditingTelegram, setIsEditingTelegram] = useState(false);

  // Auto-Detect & User Profile Telegram states
  const [telegramStatus, setTelegramStatus] = useState<any>(null);
  const [loadingTelegram, setLoadingTelegram] = useState(false);
  const [detectingGroups, setDetectingGroups] = useState(false);
  const [detectedGroups, setDetectedGroups] = useState<Array<{ id: string; title: string; type?: string;[key: string]: any }>>([]);
  const [groupMode, setGroupMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  // Collaborators management state
  const [collaborators, setCollaborators] = useState<any[]>(formData.collaborators || []);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  // Method A: Direct In-Agency Selection Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [agencyStaff, setAgencyStaff] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<'DEVELOPER' | 'ADMIN' | 'VIEWER'>('DEVELOPER');
  const [isInviting, setIsInviting] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isAddModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isAddModalOpen]);

  const resolvedOrgId =
    formData.organizationId ||
    formData.organization?.id ||
    telegramStatus?.user?.organizationId ||
    telegramStatus?.user?.organization?.id;

  const agencyName =
    formData.organization?.name ||
    telegramStatus?.user?.organization?.name ||
    'Your Agency';

  // Load existing collaborators on mount
  useEffect(() => {
    if (!formData.id) return;
    const loadCollaborators = async () => {
      try {
        setLoadingCollaborators(true);
        const collabs = await miniappsApi.getCollaborators(formData.id);
        if (Array.isArray(collabs)) {
          setCollaborators(collabs);
        }
      } catch (err) {
        console.warn('Failed to load collaborators', err);
      } finally {
        setLoadingCollaborators(false);
      }
    };
    loadCollaborators();
  }, [formData.id]);

  // Load agency staff when Add Collaborator modal opens
  useEffect(() => {
    if (!isAddModalOpen) return;
    const fetchAgencyStaff = async () => {
      setIsSearchingUsers(true);
      try {
        const params: Record<string, any> = {
          limit: 100,
          status: 'ACTIVE',
        };
        if (resolvedOrgId) {
          params.organizationId = resolvedOrgId;
        }
        const usersRes = await usersApi.getAll(params);
        const userList = Array.isArray(usersRes) ? usersRes : (usersRes as any)?.data || [];
        setAgencyStaff(userList);
      } catch (err) {
        console.warn('Failed to load agency staff', err);
      } finally {
        setIsSearchingUsers(false);
      }
    };
    fetchAgencyStaff();
  }, [isAddModalOpen, resolvedOrgId]);

  // Filter candidate active staff: in agency, not owner, and not already a collaborator
  const candidateStaff = agencyStaff.filter((u) => {
    const isOwner =
      u.id === formData.ownerId ||
      u.email?.toLowerCase() === formData.ownerEmail?.toLowerCase() ||
      u.id === formData.owner?.id ||
      u.email?.toLowerCase() === formData.owner?.email?.toLowerCase();
    if (isOwner) return false;

    const isAlreadyCollab = collaborators.some(
      (c) => c.userId === u.id || c.user?.id === u.id,
    );
    if (isAlreadyCollab) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  });

  const handleInviteCollaborator = async () => {
    if (!formData.id || !selectedUser) return;
    setIsInviting(true);
    try {
      await miniappsApi.addCollaborator(formData.id, selectedUser.id, selectedRole);
      toast.success(
        `${selectedUser.name || selectedUser.email} has been added as ${selectedRole}!`,
        'Collaborator Added',
      );
      const updated = await miniappsApi.getCollaborators(formData.id);
      if (Array.isArray(updated)) {
        setCollaborators(updated);
      }
      setIsAddModalOpen(false);
      setSelectedUser(null);
      setSearchQuery('');
      setSelectedRole('DEVELOPER');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add collaborator.', 'Error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!formData.id) return;
    setRemovingUserId(userId);
    try {
      await miniappsApi.removeCollaborator(formData.id, userId);
      toast.success('Collaborator removed.', 'Success');
      setCollaborators((prev) => prev.filter((c) => c.userId !== userId && c.user?.id !== userId));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove collaborator.', 'Error');
    } finally {
      setRemovingUserId(null);
    }
  };

  const updateField = (name: string, value: string) => {
    if (setFormData) {
      setFormData((prev: any) => {
        const next = { ...prev, [name]: value };
        if (name === 'teamTelegramChatId') {
          next.alertTelegramChatId = value;
        } else if (name === 'alertTelegramChatId') {
          next.teamTelegramChatId = value;
        }
        return next;
      });
    } else if (handleChange) {
      handleChange({ target: { name, value } } as any);
      if (name === 'teamTelegramChatId') {
        handleChange({ target: { name: 'alertTelegramChatId', value } } as any);
      } else if (name === 'alertTelegramChatId') {
        handleChange({ target: { name: 'teamTelegramChatId', value } } as any);
      }
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
          if (!formData.alertTelegramChatId && !formData.teamTelegramChatId) {
            const defaultChat = data.user?.alertTelegramChatId || data.user?.teamTelegramChatId || data.user?.telegramChatId;
            if (defaultChat) {
              updateField('alertTelegramChatId', defaultChat);
              updateField('teamTelegramChatId', defaultChat);
            }
          }
          if (data.user?.teamTelegramChatId || data.user?.alertTelegramChatId) {
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
        formData.name || 'MiniApp'
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
            .catch(() => { });
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
  const currentChatId = (formData.teamTelegramChatId || formData.alertTelegramChatId || '').trim();
  const isConnected = Boolean(currentChatId);

  return (
    <>
      <div className="space-y-6">
        {/* Card 1: Publisher & Support Contacts */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900/60 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center">
              <BuildingIcon className="w-4 h-4 text-brand-500 shrink-0" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Publisher &amp; Support Contacts
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Primary agency contacts responsible for administrative ownership, support, and public listing.
              </p>
            </div>
          </div>

          {/* Administrative Owner & Creator Strip */}
          <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-xs ${getAvatarColor(
                  formData.ownerName || formData.owner?.name || telegramStatus?.user?.name || 'O',
                )}`}
              >
                {(formData.ownerName || formData.owner?.name || telegramStatus?.user?.name || 'O')
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                  <span className="truncate">
                    {formData.ownerName || formData.owner?.name || telegramStatus?.user?.name || 'Administrative Owner'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950/70 text-brand-800 dark:text-brand-300 font-bold uppercase tracking-wider border border-brand-200 dark:border-brand-900/60">
                    Primary Creator
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {formData.ownerEmail || formData.owner?.email || telegramStatus?.user?.email || 'No email configured'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {formData.ownerEmail && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestEmail}
                  disabled={isTestingEmail}
                  className="text-xs px-2.5 py-1 h-7.5 flex items-center gap-1.5 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Send a verification test email to owner"
                >
                  <svg
                    className={`w-3.5 h-3.5 ${isTestingEmail ? 'animate-spin' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <span>{isTestingEmail ? 'Sending...' : 'Send Test Email'}</span>
                </Button>
              )}
              {isEditable && (
                <button
                  type="button"
                  onClick={() => setIsEditingOwner(!isEditingOwner)}
                  className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-semibold px-2.5 py-1 rounded-lg border border-brand-200 dark:border-brand-800/80 bg-brand-50/60 dark:bg-brand-950/40 hover:bg-brand-100/60 transition-colors cursor-pointer"
                >
                  {isEditingOwner ? 'Done' : 'Edit Creator'}
                </button>
              )}
            </div>
          </div>

          {/* Edit Creator Details Form (Collapsible) */}
          {(isEditingOwner || !formData.ownerEmail) && (
            <div className="p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Update Creator Credentials
                </span>
                {telegramStatus?.user?.name && isEditable && (
                  <button
                    type="button"
                    onClick={handleAutofillOwner}
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <ZapIcon className="w-3.5 h-3.5 text-amber-500" />
                    <span>Fill from Profile ({telegramStatus.user.name})</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Owner Name</Label>
                  <Input
                    name="ownerName"
                    value={formData.ownerName || ''}
                    onChange={handleChange}
                    placeholder="e.g. Molika Khorn"
                    disabled={!isEditable}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">
                    Owner Email <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    required
                    name="ownerEmail"
                    value={formData.ownerEmail || ''}
                    onChange={handleChange}
                    type="email"
                    placeholder="e.g. molika@agency.gov"
                    disabled={!isEditable}
                    className={`mt-1 ${
                      allErrors.ownerEmail ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/50' : ''
                    }`}
                  />
                  {allErrors.ownerEmail && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{allErrors.ownerEmail}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Team Name and Support Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Team / Department Name</Label>
                <span className="text-xs text-slate-400 font-medium">Optional</span>
              </div>
              <Input
                name="teamName"
                value={formData.teamName || ''}
                onChange={handleChange}
                placeholder="e.g. Financial Technology Center"
                disabled={!isEditable}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Public Support Email</Label>
                {formData.ownerEmail && isEditable && (
                  <button
                    type="button"
                    onClick={() => updateField('supportEmail', formData.ownerEmail)}
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium cursor-pointer"
                  >
                    Use Owner Email
                  </button>
                )}
              </div>
              <Input
                name="supportEmail"
                value={formData.supportEmail || ''}
                onChange={handleChange}
                type="email"
                placeholder="e.g. support@fintech.gov"
                disabled={!isEditable}
                className={allErrors.supportEmail ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}
              />
              {allErrors.supportEmail && (
                <p className="mt-1.5 text-sm text-rose-600 font-medium">{allErrors.supportEmail}</p>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: MiniApp Collaborators & Roles */}
        {formData.id && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900/60 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <UserGroupIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>MiniApp Collaborators &amp; Roles</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium">
                      {1 + (collaborators?.length || 0)} Members
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Manage team members who can co-develop, trigger test builds, and inspect security reports for this MiniApp.
                  </p>
                </div>
              </div>

              {/* + Add Collaborator Button - ALWAYS VISIBLE */}
              <Button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(true);
                  setSearchQuery('');
                  setSelectedUser(null);
                  setSelectedRole('DEVELOPER');
                  setIsSearchDropdownOpen(false);
                }}
                className="inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-xs shrink-0 transition-all cursor-pointer"
              >
                <PlusCircleIcon className="w-4 h-4" />
                <span>Add Collaborator</span>
              </Button>
            </div>

            {/* Members List */}
            <div className="space-y-2.5">
              {/* Primary Owner / Maintainer Row */}
              <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-xs ${getAvatarColor(formData.ownerName || formData.owner?.name || 'O')}`}>
                    {(formData.ownerName || formData.owner?.name || 'O').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span className="truncate">{formData.ownerName || formData.owner?.name || 'Lead Maintainer'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wider border border-amber-200 dark:border-amber-900/60">
                        Primary Owner
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {formData.ownerEmail || formData.owner?.email || 'Registered Creator'}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hidden sm:inline">
                    Full Administrative Authority
                  </span>
                </div>
              </div>

              {/* Collaborators Rows */}
              {loadingCollaborators ? (
                <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Loading collaborators...</span>
                </div>
              ) : collaborators.length === 0 ? (
                <div className="py-7 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="w-9 h-9 mx-auto rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                    <UserGroupIcon className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No additional collaborators yet
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                      Use <span className="font-semibold text-slate-700 dark:text-slate-300">&quot;Add Collaborator&quot;</span> above to grant agency teammates build, test, and review privileges.
                    </p>
                  </div>
                </div>
              ) : (
                collaborators.map((collab: any) => {
                  const userObj = collab.user || {};
                  const isRemoving = removingUserId === (collab.userId || userObj.id);
                  return (
                    <div
                      key={collab.id || collab.userId || userObj.id}
                      className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-xs ${getAvatarColor(userObj.name || userObj.email || 'U')}`}>
                          {(userObj.name || userObj.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {userObj.name || 'Teammate'}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {userObj.email || collab.userId}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${collab.role === 'ADMIN'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : collab.role === 'VIEWER'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                            }`}
                        >
                          {collab.role === 'ADMIN' && <ShieldIcon className="w-2.5 h-2.5" />}
                          {collab.role === 'DEVELOPER' && <CodeIcon className="w-2.5 h-2.5" />}
                          {collab.role === 'VIEWER' && <EyeIcon className="w-2.5 h-2.5" />}
                          <span>{collab.role || 'DEVELOPER'}</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveCollaborator(collab.userId || userObj.id)}
                          disabled={isRemoving}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          title="Remove collaborator"
                        >
                          <svg className={`w-4 h-4 ${isRemoving ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Card 3: Team Telegram Channel Alerts (Status-First) */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900/60 shadow-xs space-y-4">
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
                onClick={() => setShowGuide(!showGuide)}
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
                      <svg className={`w-3.5 h-3.5 ${detectingGroups ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      <svg className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
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
            Automated security scan reports, CI/CD test builds, and release updates for this MiniApp will be broadcast directly to your team channel. (Add <code>@{telegramStatus?.botUsername || 'superapp_notification_bot'}</code> to your group/channel first).
          </p>
        </div>
      </div>

      {/* Method A: Direct In-Agency Selection Modal */}
      {mounted && isAddModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => !isInviting && setIsAddModalOpen(false)}
          />

          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl p-6 max-h-[88vh] overflow-y-auto space-y-4 my-auto -translate-y-6 sm:-translate-y-10 transition-all">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 shadow-xs">
                  <UserGroupIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Add MiniApp Collaborator</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200/80 dark:border-emerald-800/80">
                      Direct (1-Click)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Select an active colleague from your agency to grant direct access to this MiniApp.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isInviting}
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Autocomplete Search Dropdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Organization Member <span className="text-rose-500">*</span>
                </Label>
                {agencyName && (
                  <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium flex items-center gap-1">
                    <BuildingIcon className="w-3 h-3 text-slate-400" />
                    <span>Organization: {agencyName}</span>
                  </span>
                )}
              </div>

              {/* Selected User Highlight Card */}
              {selectedUser ? (
                <div className="p-3 rounded-xl border border-brand-300 dark:border-brand-700/80 bg-brand-50/50 dark:bg-brand-950/30 flex items-center justify-between gap-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${getAvatarColor(
                        selectedUser.name || selectedUser.email,
                      )}`}
                    >
                      {(selectedUser.name || selectedUser.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-900 truncate flex items-center gap-2">
                        <span>{selectedUser.name || 'Agency Teammate'}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-200 dark:bg-brand-900/80 text-brand-700 dark:text-brand-300 font-semibold uppercase">
                          Selected
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {selectedUser.email}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isInviting}
                    onClick={() => {
                      setSelectedUser(null);
                      setSearchQuery('');
                      setIsSearchDropdownOpen(true);
                    }}
                    className="text-xs text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white font-semibold px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs shrink-0 transition-colors cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  {/* Search Input Box */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <SearchIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsSearchDropdownOpen(true);
                      }}
                      onFocus={() => setIsSearchDropdownOpen(true)}
                      placeholder="Type name or email to search active agency staff..."
                      className="w-full pl-9 pr-9 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all shadow-xs"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Candidate Results */}
                  {isSearchDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/70 animate-in fade-in slide-in-from-top-1 duration-150">
                      {isSearchingUsers ? (
                        <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          <span>Searching active agency staff...</span>
                        </div>
                      ) : candidateStaff.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400 px-4">
                          {searchQuery.trim() ? (
                            <>
                              No active staff matching{' '}
                              <span className="font-semibold text-slate-600 dark:text-slate-300">
                                &quot;{searchQuery}&quot;
                              </span>
                            </>
                          ) : (
                            'No other active staff available in this agency'
                          )}
                        </div>
                      ) : (
                        candidateStaff.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsSearchDropdownOpen(false);
                            }}
                            className="w-full text-left p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors group cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${getAvatarColor(
                                  user.name || user.email,
                                )}`}
                              >
                                {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 truncate">
                                  {user.name || 'Unnamed Staff'}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs px-3 py-1 rounded-lg font-bold bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 border border-brand-200 dark:border-brand-800/80 group-hover:bg-brand-600 group-hover:text-white group-hover:border-transparent transition-all shrink-0 shadow-2xs">
                              Select
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Role Selection Cards (ADMIN, DEVELOPER, VIEWER) */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Collaborator Role <span className="text-rose-500">*</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* DEVELOPER Card */}
                <div
                  onClick={() => setSelectedRole('DEVELOPER')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${selectedRole === 'DEVELOPER'
                    ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 ring-2 ring-sky-500/25 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/60 hover:bg-slate-100/60 dark:hover:bg-slate-800/90 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 uppercase tracking-wider flex items-center gap-1">
                      <CodeIcon className="w-3 h-3" />
                      <span>DEVELOPER</span>
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedRole === 'DEVELOPER'
                        ? 'border-sky-500 bg-sky-500 text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-transparent'
                        }`}
                    >
                      {selectedRole === 'DEVELOPER' && <CheckIcon className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Push revisions, trigger test builds, and inspect test APK artifacts.
                  </p>
                </div>

                {/* ADMIN Card */}
                <div
                  onClick={() => setSelectedRole('ADMIN')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${selectedRole === 'ADMIN'
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/25 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/60 hover:bg-slate-100/60 dark:hover:bg-slate-800/90 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 uppercase tracking-wider flex items-center gap-1">
                      <ShieldIcon className="w-3 h-3" />
                      <span>ADMIN</span>
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedRole === 'ADMIN'
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-transparent'
                        }`}
                    >
                      {selectedRole === 'ADMIN' && <CheckIcon className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Co-maintainer. Manage collaborators, security, and integration secrets.
                  </p>
                </div>

                {/* VIEWER Card */}
                <div
                  onClick={() => setSelectedRole('VIEWER')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${selectedRole === 'VIEWER'
                    ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 ring-2 ring-purple-500/25 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/60 hover:bg-slate-100/60 dark:hover:bg-slate-800/90 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 uppercase tracking-wider flex items-center gap-1">
                      <EyeIcon className="w-3 h-3" />
                      <span>VIEWER</span>
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedRole === 'VIEWER'
                        ? 'border-purple-500 bg-purple-500 text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-transparent'
                        }`}
                    >
                      {selectedRole === 'VIEWER' && <CheckIcon className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Read-only. Inspect build telemetry, issues, and audit records.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="secondary"
                disabled={isInviting}
                onClick={() => setIsAddModalOpen(false)}
                className="text-xs px-4 h-9 font-medium cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!selectedUser || isInviting}
                onClick={handleInviteCollaborator}
                className="text-xs px-5 h-9 font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isInviting ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Inviting...</span>
                  </>
                ) : (
                  <>
                    <PlusCircleIcon className="w-3.5 h-3.5" />
                    <span>Invite</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
