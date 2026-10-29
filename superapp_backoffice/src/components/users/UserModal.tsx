'use client';


import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Label } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth';
import {
  usersApi,
  organizationsApi,
  User,
  Role,
  Organization,
  unwrapData,
} from '@/api';
import { AvatarUpload } from './AvatarUpload';


export interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingUser: User | null;
  roles: Role[];
  organizations?: Organization[];
  onSuccess: () => void;
}


interface RoleMetadata {
  label: string;
  badge: string;
  description: string;
  icon: (className: string) => React.ReactNode;
}


const ROLE_METADATA: Record<string, RoleMetadata> = {
  MA_DEVELOPER: {
    label: 'MiniApp Developer',
    badge: 'Developer',
    description: 'Build, submit, and configure mini-apps & inspect security reports',
    icon: (className) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  ADMIN: {
    label: 'Administrator',
    badge: 'Admin',
    description: 'Manage organization operators, review submissions & configure notifications',
    icon: (className) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  SUPER_ADMIN: {
    label: 'Super Admin',
    badge: 'Super Admin',
    description: 'Complete platform governance, security control, and tenant access',
    icon: (className) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
};


const getRoleMeta = (roleName: string): RoleMetadata => {
  if (ROLE_METADATA[roleName]) {
    return ROLE_METADATA[roleName];
  }
  return {
    label: roleName.replace(/_/g, ' '),
    badge: roleName,
    description: 'Operator account with specific platform capabilities',
    icon: (className) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  };
};


const DEFAULT_ROLES: Role[] = [
  { id: 'role-dev', name: 'MA_DEVELOPER', description: 'MiniApp Developer', isActive: true, permissions: [] },
  { id: 'role-admin', name: 'ADMIN', description: 'Administrator', isActive: true, permissions: [] },
  { id: 'role-superadmin', name: 'SUPER_ADMIN', description: 'Super Administrator', isActive: true, permissions: [] },
];


export function UserModal({
  isOpen,
  onClose,
  editingUser,
  roles,
  organizations,
  onSuccess,
}: UserModalProps) {
  const { user: currentUser, refreshSession, updateUserAvatar } = useAuth();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [organizationsList, setOrganizationsList] = useState<Organization[]>(organizations || []);
  const [loadingOrgs, setLoadingOrgs] = useState(false);


  const [formData, setFormData] = useState({
    name: '',
    email: '',
    selectedRole: 'MA_DEVELOPER',
    organizationId: '',
    password: '',
    telegramChatId: '',
    telegramUsername: '',
    isActive: true,
  });




  useEffect(() => {
    setMounted(true);
  }, []);




  // Preload Organizations when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (organizations && organizations.length > 0) {
      setOrganizationsList(organizations);
    } else {
      setLoadingOrgs(true);
      organizationsApi
        .getAll({ limit: 100 })
        .then((res) => {
          const list = unwrapData<Organization>(res);
          setOrganizationsList(list);
        })
        .catch((err) => {
          console.error('Failed to load organizations for user modal', err);
        })
        .finally(() => setLoadingOrgs(false));
    }
  }, [isOpen, organizations]);


  // Sync edit data when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowPassword(false);


      if (editingUser) {
        const userRoleName =
          editingUser.role?.name ||
          (editingUser.roles && editingUser.roles.length > 0 ? editingUser.roles[0].name : '') ||
          'MA_DEVELOPER';


        setFormData({
          name: editingUser.name || '',
          email: editingUser.email || '',
          selectedRole: userRoleName,
          organizationId: editingUser.organizationId || editingUser.organization?.id || '',
          password: '',
          telegramChatId: editingUser.telegramChatId || '',
          telegramUsername: editingUser.telegramUsername || '',
          isActive: editingUser.isActive !== undefined ? editingUser.isActive : true,
        });
      } else {
        setFormData({
          name: '',
          email: '',
          selectedRole: 'MA_DEVELOPER',
          organizationId: '',
          password: '',
          telegramChatId: '',
          telegramUsername: '',
          isActive: true,
        });
      }
    }
  }, [isOpen, editingUser]);


  // Super Admin protection guard check
  const isEditingSuperAdmin = Boolean(
    editingUser && (
      (editingUser.roles && editingUser.roles.some((r: any) => (typeof r === 'string' ? r : r?.name) === 'SUPER_ADMIN')) ||
      editingUser.role?.name === 'SUPER_ADMIN'
    )
  );


  // Normalized available roles list sorted logically
  const availableRoles = useMemo(() => {
    const list = roles && roles.length > 0 ? roles : DEFAULT_ROLES;
    const orderMap: Record<string, number> = {
      MA_DEVELOPER: 1,
      ADMIN: 2,
      SUPER_ADMIN: 3,
    };
    return [...list].sort((a, b) => (orderMap[a.name] || 99) - (orderMap[b.name] || 99));
  }, [roles]);




  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.warning('Name and Email are required');
      return;
    }


    if (formData.password.trim() && formData.password.trim().length < 6) {
      toast.warning('Password should be at least 6 characters');
      return;
    }

    if (!editingUser && !formData.organizationId.trim()) {
      toast.error('Organization is required for user creation.');
      return;
    }


    setIsSubmitting(true);
    try {
      // Backend expects roleNames as string[] with single role for the user
      const payload: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        roleNames: [formData.selectedRole],
        telegramChatId: formData.telegramChatId.trim() || undefined,
        telegramUsername: formData.telegramUsername.trim() || undefined,
        isActive: formData.isActive,
      };


      if (formData.password.trim()) {
        payload.password = formData.password.trim();
      }


      if (editingUser) {
        const isSelf = Boolean(
          currentUser && editingUser && (
            currentUser.id === editingUser.id ||
            (currentUser.email && editingUser.email && currentUser.email.toLowerCase() === editingUser.email.toLowerCase())
          )
        );
        if (isEditingSuperAdmin && !isSelf) {
          toast.error('Protected Account Guard: Super Administrators cannot modify other Super Administrator accounts.');
          setIsSubmitting(false);
          return;
        }
        if (isEditingSuperAdmin) {
          if (!payload.isActive) {
            toast.error('Protected Account Guard: Super Admin accounts cannot be set to inactive.');
            setIsSubmitting(false);
            return;
          }
          if (payload.roleNames && !payload.roleNames.includes('SUPER_ADMIN')) {
            toast.error('Protected Role Guard: Super Admin clearance level cannot be downgraded or revoked.');
            setIsSubmitting(false);
            return;
          }
        }
        payload.organizationId = formData.organizationId.trim() || '';
        await usersApi.update(editingUser.id, payload);
        if (currentUser?.id === editingUser.id) {
          await refreshSession?.();
        }
        toast.success(`User '${formData.name}' updated successfully!`);
      } else {
        payload.organizationId = formData.organizationId.trim();
        await usersApi.create(payload);
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
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 max-w-2xl w-full p-5 sm:p-6 shadow-2xl my-auto max-h-[calc(100vh-3rem)] overflow-y-auto z-10 animate-in zoom-in-95 duration-200">


        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {editingUser ? 'Edit User Account' : 'Create New User'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure operator profile, organization, password, and alert channels
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


        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar management for existing user */}
          {editingUser && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                Profile Media / Avatar
              </Label>
              <AvatarUpload
                currentAvatarUrl={editingUser.avatarUrl}
                name={formData.name || editingUser.name}
                size="sm"
                onUpload={async (file) => {
                  const updated = await usersApi.uploadAvatar(editingUser.id, file);
                  editingUser.avatarUrl = updated.avatarUrl;
                  if (currentUser?.id === editingUser.id) {
                    updateUserAvatar(updated.avatarUrl || null);
                    if (refreshSession) await refreshSession();
                  }
                }}
                onDelete={async () => {
                  const updated = await usersApi.deleteAvatar(editingUser.id);
                  editingUser.avatarUrl = null;
                  if (currentUser?.id === editingUser.id) {
                    updateUserAvatar(null);
                    if (refreshSession) await refreshSession();
                  }
                }}
              />
            </div>
          )}

          {/* Identity Fields: Full Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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


          {/* Organization & Password Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Organization Dropdown */}
            <div>
              <Label htmlFor="user-organization" className="flex items-center justify-between mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>Organization</span>
                  {!editingUser && <span className="text-rose-500 font-bold">*</span>}
                </span>
                {!editingUser ? (
                  <span className="text-[10px] text-rose-500 font-semibold">Required</span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                )}
              </Label>
              <div className="relative">
                <select
                  id="user-organization"
                  required={!editingUser}
                  value={formData.organizationId}
                  onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                  className="w-full h-10 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled={!editingUser}>
                    {!editingUser ? 'Select an organization...' : 'Independent / No Organization'}
                  </option>
                  {organizationsList.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} {org.code ? `(${org.code})` : ''}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                {loadingOrgs ? 'Loading organizations...' : 'Associates operator with regulatory or financial authority'}
              </p>
            </div>


            {/* Password Field */}
            <div>
              <Label htmlFor="user-password" className="flex items-center justify-between mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  {editingUser ? 'Reset Password' : 'Password'}
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Optional</span>
              </Label>
              <div className="relative">
                <Input
                  id="user-password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? 'Leave blank to keep unchanged' : 'Enter initial password'}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer p-0.5"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                {editingUser
                  ? 'Only fill if you want to reset the user password'
                  : 'If empty, default seed credentials or self-reset will apply'}
              </p>
            </div>
          </div>


          {/* Single Role Selection Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Assign Role *
              </Label>
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                Each user has exactly one assigned role
              </span>
            </div>


            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {availableRoles.map((r) => {
                const isSelected = formData.selectedRole === r.name;
                const meta = getRoleMeta(r.name);
                return (
                  <button
                    key={r.id || r.name}
                    type="button"
                    disabled={isEditingSuperAdmin && r.name !== 'SUPER_ADMIN'}
                    onClick={() => {
                      if (isEditingSuperAdmin && r.name !== 'SUPER_ADMIN') {
                        toast.error('Protected Role Guard: Super Admin clearance level cannot be downgraded.');
                        return;
                      }
                      setFormData((prev) => ({ ...prev, selectedRole: r.name }));
                    }}
                    className={`group relative flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 ${
                      isEditingSuperAdmin && r.name !== 'SUPER_ADMIN'
                        ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50'
                        : isSelected
                        ? 'cursor-pointer bg-brand-50/70 dark:bg-brand-500/10 border-brand-500 dark:border-brand-500 ring-2 ring-brand-500/20 dark:ring-brand-500/25'
                        : 'cursor-pointer bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div>
                      {/* Top Bar: Icon + Radio Indicator */}
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isSelected
                              ? 'bg-brand-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                            }`}
                        >
                          {meta.icon('w-4 h-4')}
                        </div>


                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${isSelected
                              ? 'border-brand-600 bg-brand-600 text-white shadow-2xs'
                              : 'border-slate-300 dark:border-slate-600 bg-transparent group-hover:border-slate-400'
                            }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>


                      {/* Role Info */}
                      <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                        {meta.label}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {r.name}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                        {r.description || meta.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>






          {/* Account Status Field */}
          <div>
            <Label className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Account Status
            </Label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, isActive: true }))}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${formData.isActive
                    ? 'bg-emerald-50/70 dark:bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-2xs'
                    : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">Active (Can Login & Access)</span>
              </button>
              <button
                type="button"
                disabled={isEditingSuperAdmin}
                onClick={() => {
                  if (isEditingSuperAdmin) {
                    toast.error('Protected Account Guard: Super Admin accounts cannot be set to inactive.');
                    return;
                  }
                  setFormData((prev) => ({ ...prev, isActive: false }));
                }}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  isEditingSuperAdmin
                    ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                    : 'cursor-pointer ' + (!formData.isActive
                        ? 'bg-amber-50/70 dark:bg-amber-500/10 border-amber-500 text-amber-800 dark:text-amber-300 ring-2 ring-amber-500/20 shadow-2xs'
                        : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700')
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                <span className="truncate">Inactive / Suspended</span>
              </button>
            </div>
          </div>


          {/* Modal Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5 cursor-pointer">
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
