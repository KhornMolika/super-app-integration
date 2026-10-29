'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button, Input, Label } from '@/components/ui/inputs';
import { usersApi } from '@/api/users.api';
import { toast } from '@/components/ui/Toast';
import { AvatarUpload } from '@/components/users/AvatarUpload';
import {
  ShieldCheckIcon,
  BuildingIcon,
  CopyIcon,
  CheckIcon,
  KeyIcon,
  ArrowRightIcon,
  UserIcon,
  MailIcon,
  LockIcon,
  SendIcon,
} from 'lucide-react';

interface UserProfileCardProps {
  user: {
    id?: string;
    name?: string;
    email?: string;
    avatarUrl?: string;
    organization?: { name?: string; code?: string } | null;
  } | null;
  role: string;
  telegramStatus: any;
  onSendTestEmail: (targetEmail?: string) => Promise<void>;
  sendingTestEmail: boolean;
  onProfileUpdated?: () => void;
}

export function UserProfileCard({
  user,
  role,
  telegramStatus,
  onSendTestEmail,
  sendingTestEmail,
  onProfileUpdated,
}: UserProfileCardProps) {
  const { refreshSession, updateUserAvatar } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    avatarUrl: user?.avatarUrl || '',
  });

  const handleAvatarUpload = async (file: File) => {
    const res = await usersApi.uploadMyAvatar(file);
    if (res?.avatarUrl) {
      updateUserAvatar(res.avatarUrl);
    }
    if (refreshSession) await refreshSession();
    if (onProfileUpdated) onProfileUpdated();
  };

  const handleAvatarDelete = async () => {
    await usersApi.deleteMyAvatar();
    updateUserAvatar(null);
    if (refreshSession) await refreshSession();
    if (onProfileUpdated) onProfileUpdated();
  };

  const userDisplayName = user?.name || 'Authorized User';
  const userEmail = user?.email || '';
  const userId = user?.id || '';
  const orgName = user?.organization?.name || 'Financial Services Authority (FSA)';

  const roleBadgeStyle =
    role === 'SUPER_ADMIN'
      ? 'bg-purple-500/10 text-purple-400 border-purple-500/25 ring-1 ring-purple-500/20'
      : role === 'ADMIN'
      ? 'bg-brand-500/10 text-brand-400 border-brand-500/25 ring-1 ring-brand-500/20'
      : 'bg-sky-500/10 text-sky-400 border-sky-500/25 ring-1 ring-sky-500/20';

  const roleBadgeLabel = role
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  const initials = userDisplayName
    .split(' ')
    .map((w) => w.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const accessScopeLabel =
    role === 'SUPER_ADMIN'
      ? 'SuperApp Global Administration & Root Governance'
      : role === 'ADMIN'
      ? 'SuperApp Platform Administration & Audit'
      : 'MiniApp Development, Sandbox Testing & Submissions';

  const isConnected = Boolean(telegramStatus?.user?.isConnected);

  const handleCopyId = () => {
    if (!userId) return;
    navigator.clipboard.writeText(userId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    toast.info('User ID copied to clipboard!', 'Copied');
  };

  const handleOpenEdit = () => {
    setFormData({
      name: user?.name || '',
      avatarUrl: user?.avatarUrl || '',
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEmailModal = () => {
    setTestEmailAddress(user?.email || '');
    setIsEmailModalOpen(true);
  };

  const handleSendTestEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailAddress.trim()) return;
    await onSendTestEmail(testEmailAddress.trim());
    setIsEmailModalOpen(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.warning('Name is required');
      return;
    }

    setSaving(true);
    try {
      if (user?.id) {
        await usersApi.update(user.id, { name: formData.name.trim() });
      } else {
        await usersApi.updateProfile({ name: formData.name.trim() });
      }
      toast.success('Your profile information has been updated successfully!');
      setIsEditModalOpen(false);
      if (onProfileUpdated) onProfileUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Hero Profile Card */}
      <Card className="p-6 sm:p-8 overflow-hidden relative border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-br from-white via-slate-50/50 to-slate-100/40 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-slate-950/90 shadow-xl rounded-3xl">
        {/* Subtle Decorative Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Avatar and Primary Identity Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6 min-w-0">
            {/* Vibrant Avatar with Online Dot */}
            <div className="relative shrink-0">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={userDisplayName}
                  className="w-20 h-20 sm:w-22 sm:h-22 rounded-full object-cover shadow-lg ring-4 ring-white/10 dark:ring-slate-800"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-gradient-to-tr from-brand-600 via-indigo-600 to-violet-500 text-white flex items-center justify-center font-extrabold text-2xl sm:text-3xl shadow-lg ring-4 ring-white/10 dark:ring-slate-800">
                  {initials || 'MK'}
                </div>
              )}
              <span
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-900 flex items-center justify-center shadow-xs"
                title="Account Active & Verified"
              >
                <CheckIcon className="w-3 h-3 text-white stroke-[3]" />
              </span>
            </div>

            {/* Names & Metadata */}
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                  {userDisplayName}
                </h3>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${roleBadgeStyle}`}>
                  <ShieldCheckIcon className="w-3.5 h-3.5" />
                  <span>{roleBadgeLabel}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Active &amp; Verified</span>
                </span>
              </div>

              {/* Subtitle / Meta Details */}
              <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <MailIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono text-slate-700 dark:text-slate-300">{userEmail}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BuildingIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">{orgName}</span>
                </div>
                {userId && (
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[11px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
                    title="Click to copy User ID"
                  >
                    <CopyIcon className="w-3 h-3 text-slate-400" />
                    <span>ID: {userId.substring(0, 8)}...</span>
                    {copiedId && <span className="text-emerald-500 font-bold ml-0.5">Copied!</span>}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
            <Button
              type="button"
              onClick={handleOpenEdit}
              className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </Button>

            {userEmail && (
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenEmailModal}
                disabled={sendingTestEmail}
                className="text-xs h-9 px-3.5 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-semibold flex items-center gap-2 cursor-pointer"
              >
                <MailIcon className={`w-3.5 h-3.5 text-brand-500 ${sendingTestEmail ? 'animate-spin' : ''}`} />
                <span>{sendingTestEmail ? 'Sending...' : 'Send Test Email'}</span>
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* 2. Structured Bento Grid: Credentials & Integrations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Account & Security Specifications */}
        <div className="lg:col-span-7">
          <Card className="p-6 sm:p-7 rounded-3xl border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-xs h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                    <ShieldCheckIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Credentials &amp; Access Scope
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Primary administrative authorization parameters
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Verified Identity
                </span>
              </div>

              {/* Specification Rows */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs mt-2">
                <div className="py-3 flex items-center justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Full Name</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">{userDisplayName}</span>
                </div>

                <div className="py-3 flex items-center justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Primary Email</span>
                  <div className="flex items-center gap-2 text-right">
                    <span className="font-mono text-slate-800 dark:text-slate-200">{userEmail}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      Verified
                    </span>
                  </div>
                </div>

                <div className="py-3 flex items-center justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Organization</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">{orgName}</span>
                </div>

                <div className="py-3 flex items-center justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Role Authority</span>
                  <span className="font-semibold text-brand-600 dark:text-brand-400 text-right">{roleBadgeLabel}</span>
                </div>

                <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">Access Scope</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium sm:text-right leading-relaxed">
                    {accessScopeLabel}
                  </span>
                </div>

                <div className="py-3 flex items-center justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Session Security</span>
                  <div className="flex items-center gap-1.5 text-right">
                    <LockIcon className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="font-medium text-slate-800 dark:text-slate-200">Active Authentication Session</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Account updates synchronized in real time.</span>
              <button
                type="button"
                onClick={handleOpenEdit}
                className="text-brand-600 dark:text-brand-400 font-bold hover:underline cursor-pointer"
              >
                Modify Name
              </button>
            </div>
          </Card>
        </div>

        {/* Right Column (5 cols): Connected Services & Tokens */}
        <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
          {/* Personal Access Tokens (PAT) Quick Card */}
          <Card className="p-6 rounded-3xl border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-xs flex-1 flex flex-col justify-between hover:border-brand-500/40 transition-colors group">
            <div>
              <div className="flex items-center justify-between pb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                  <KeyIcon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  CLI &amp; API
                </span>
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2">
                Personal Access Tokens
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Generate and manage scoped API credentials for CLI automated deployments, packaging pipelines, and scripts.
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Link
                href="/settings/tokens"
                className="inline-flex items-center justify-between w-full text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-500 transition-colors group-hover:translate-x-0.5 duration-150"
              >
                <span>Manage Access Tokens</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </Card>

          {/* Telegram Alert Channel Quick Card */}
          <Card className="p-6 rounded-3xl border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-xs flex-1 flex flex-col justify-between hover:border-sky-500/40 transition-colors group">
            <div>
              <div className="flex items-center justify-between pb-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center border border-sky-500/20">
                  <SendIcon className="w-5 h-5" />
                </div>
                {isConnected ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Connected</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    Not Connected
                  </span>
                )}
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2">
                Telegram &amp; Alert Channels
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {isConnected ? (
                  <span>
                    Direct notifications linked to{' '}
                    <strong className="text-sky-400 font-mono">
                      {telegramStatus?.user?.telegramUsername ? `@${telegramStatus.user.telegramUsername}` : 'Direct Chat'}
                    </strong>
                    . Instant alerts for SAST reviews and submissions.
                  </span>
                ) : (
                  <span>
                    Link your Telegram account to receive instant notifications when security scans pass or build packages are ready.
                  </span>
                )}
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Link
                href="/settings/telegram"
                className="inline-flex items-center justify-between w-full text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-500 transition-colors group-hover:translate-x-0.5 duration-150"
              >
                <span>Configure Alert Channels</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Edit User Profile</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Update your public display name</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <Label className="mb-2 block">Profile Picture</Label>
                <AvatarUpload
                  currentAvatarUrl={user?.avatarUrl}
                  name={userDisplayName}
                  onUpload={handleAvatarUpload}
                  onDelete={handleAvatarDelete}
                  disabled={saving}
                  size="md"
                />
              </div>

              <div>
                <Label htmlFor="edit-name">Full Name / Display Name</Label>
                <Input
                  id="edit-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Molika Khorn"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-email">Account Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={userEmail}
                  disabled
                  className="bg-slate-100 dark:bg-slate-800/80 cursor-not-allowed opacity-75 font-mono text-xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">Official domain email cannot be altered self-service.</p>
              </div>

              <div>
                <Label htmlFor="edit-role">Active Role</Label>
                <Input
                  id="edit-role"
                  type="text"
                  value={roleBadgeLabel}
                  disabled
                  className="bg-slate-100 dark:bg-slate-800/80 cursor-not-allowed opacity-75 text-xs font-semibold"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-semibold"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Send Test Email Modal */}
      {isEmailModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                  <MailIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Send Test Email</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Dispatch a live HTML test notification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSendTestEmailSubmit} className="space-y-4">
              <div>
                <Label htmlFor="test-recipient-email">Recipient Email Address</Label>
                <Input
                  id="test-recipient-email"
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="e.g. user@fsa.gov.kh"
                  required
                  className="font-mono text-xs mt-1.5"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEmailModalOpen(false)}
                  disabled={sendingTestEmail}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={sendingTestEmail}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-semibold cursor-pointer"
                >
                  {sendingTestEmail ? 'Sending...' : 'Send Test Email'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
