'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '@/components/ui/card';
import { Button, Input, Label } from '@/components/ui/inputs';
import { usersApi } from '@/api/users.api';
import { toast } from '@/components/ui/Toast';

interface UserProfileCardProps {
  user: { id?: string; name?: string; email?: string; avatarUrl?: string };
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    avatarUrl: user?.avatarUrl || '',
  });

  const userDisplayName = user?.name || 'Authorized User';
  const userEmail = user?.email || '';

  const roleBadgeStyle =
    role === 'MINI_APP_DEVELOPER'
      ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800'
      : role === 'SUPER_ADMIN'
      ? 'bg-accent-50 text-accent-800 border-accent-200 dark:bg-accent-950/50 dark:text-accent-300 dark:border-accent-800'
      : role === 'QA_TESTER'
      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800'
      : 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950/50 dark:text-brand-300 dark:border-brand-800';

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
      ? 'SuperApp Platform Administration'
      : role === 'MINI_APP_DEVELOPER'
      ? 'MiniApp Submissions & Management'
      : 'MiniApp Quality Verification & Testing';

  const isConnected = Boolean(telegramStatus?.user?.isConnected);

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
    <>
      <Card className="p-6 sm:p-7 overflow-hidden relative border-slate-200/80 dark:border-slate-800/80 shadow-xs rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-bold text-2xl sm:text-3xl shadow-sm ring-4 ring-brand-500/10 shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {userDisplayName}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleBadgeStyle}`}>
                  {roleBadgeLabel}
                </span>
                <button
                  type="button"
                  onClick={handleOpenEdit}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 dark:hover:bg-brand-900/60 border border-brand-200/80 dark:border-brand-800 transition-colors cursor-pointer"
                  title="Edit user profile information"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span>Edit Profile</span>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
                <span className="text-xs sm:text-sm font-mono text-slate-500 dark:text-slate-400">
                  {userEmail}
                </span>
                {userEmail && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOpenEmailModal}
                    disabled={sendingTestEmail}
                    className="text-xs h-6.5 px-2.5 rounded-lg flex items-center gap-1.5 border-slate-200 dark:border-slate-700"
                  >
                    <svg
                      className={`w-3 h-3 text-brand-600 ${sendingTestEmail ? 'animate-spin' : ''}`}
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
                    <span>{sendingTestEmail ? 'Sending...' : 'Send Test Email'}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
              <span>Organization: <strong className="font-semibold text-slate-900 dark:text-white">Financial Services Authority (FSA)</strong></span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
            <span className="text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500 block tracking-wider">Account Status</span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">Active &amp; Verified</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
            <span className="text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500 block tracking-wider">Personal Telegram</span>
            <div className="flex items-center gap-2 mt-1.5">
              {isConnected ? (
                <span className="font-bold text-sky-600 dark:text-sky-400 text-sm inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                  <span>
                    {telegramStatus?.user?.telegramUsername
                      ? `@${telegramStatus.user.telegramUsername}`
                      : 'Direct Chat Active'}
                  </span>
                </span>
              ) : (
                <span className="font-medium text-slate-400 dark:text-slate-500 text-sm">Not Connected</span>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
            <span className="text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500 block tracking-wider">Access Scope</span>
            <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm mt-1.5 truncate">
              {accessScopeLabel}
            </div>
          </div>
        </div>
      </Card>

      {/* Edit Profile Modal */}
      {isEditModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Edit User Profile</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Update your public name and account details</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Full Name / Display Name</Label>
                <Input
                  id="edit-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sok Piseth"
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
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Send Test Email</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Dispatch a live HTML test notification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
                  placeholder="e.g. molikakhorn71@gmail.com"
                  required
                  className="font-mono text-xs"
                />
              </div>

              {/* Sandbox info callout */}
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                  <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Resend Sandbox Mode Restriction</span>
                </div>
                <p className="text-amber-800 dark:text-amber-300 leading-relaxed text-[11px]">
                  Unless your custom domain (<code className="font-mono">fintechcenterfsa.com</code>) is verified on Resend, emails can only be delivered to your registered Resend account owner address (<code className="font-mono">molikakhorn71@gmail.com</code>).
                </p>
                <button
                  type="button"
                  onClick={() => setTestEmailAddress('molikakhorn71@gmail.com')}
                  className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 underline hover:text-amber-900 dark:hover:text-amber-200 cursor-pointer"
                >
                  Click here to use verified sandbox address (molikakhorn71@gmail.com)
                </button>
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
                  className="bg-brand-600 hover:bg-brand-700 text-white font-semibold"
                >
                  {sendingTestEmail ? 'Sending...' : 'Send Test Email'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
