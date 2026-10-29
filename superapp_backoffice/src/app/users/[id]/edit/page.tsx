'use client';


import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  usersApi,
  organizationsApi,
  rolesApi,
  User,
  Organization,
  Role,
  unwrapData,
  unwrapItem,
} from '@/api';
import { BackButton } from '@/components/ui/BackButton';
import { Button, Input, Label } from '@/components/ui/inputs';
import { toast } from '@/components/ui/Toast';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ShieldCheckIcon, CheckIcon, BuildingIcon } from '@/components/ui/Icons';
import { getRoleTheme, getUserEffectiveStatus, getUserRoles, AvatarUpload } from '@/components/users';


interface RoleOption {
  key: string;
  label: string;
  badge: string;
  desc: string;
  capabilities: string[];
}


const ROLE_OPTIONS: RoleOption[] = [
  {
    key: 'MA_DEVELOPER',
    label: 'MiniApp Developer',
    badge: 'Developer',
    desc: 'Build, configure, publish mini applications and submit capability proposals',
    capabilities: ['Create & submit MiniApps', 'Inspect build artifacts', 'Request bridge capabilities'],
  },
  {
    key: 'ADMIN',
    label: 'Platform Administrator',
    badge: 'Admin',
    desc: 'Review submissions, manage organizational operators, and oversee security gates',
    capabilities: ['Review & approve applications', 'Manage tenant users', 'Resolve compliance issues'],
  },
  {
    key: 'SUPER_ADMIN',
    label: 'Super Administrator',
    badge: 'Super Admin',
    desc: 'Full platform governance, security control, tenant administration & root access',
    capabilities: ['Global system governance', 'Manage RBAC & permissions', 'Full audit registry inspection'],
  },
];


function EditUserContent() {
  const params = useParams();
  const router = useRouter();
  const id =
    (typeof params?.id === 'string'
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : '') || '';


  const {
    user: currentUser,
    refreshSession,
    setAvatarPreview,
    clearAvatarPreview,
    updateUserAvatar,
  } = useAuth();


  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [saving, setSaving] = useState(false);


  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);


  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('MA_DEVELOPER');
  const [organizationId, setOrganizationId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Staged / Pending Avatar State (Committed to MinIO only on form submit)
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [pendingAvatarRemove, setPendingAvatarRemove] = useState(false);

  const handleAvatarSelect = (file: File) => {
    if (avatarPreviewUrl && avatarPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
    const objectUrl = URL.createObjectURL(file);
    setPendingAvatarFile(file);
    setAvatarPreviewUrl(objectUrl);
    setPendingAvatarRemove(false);

    // Sync topbar HeaderProfile in real time if editing current authenticated user
    if (currentUser?.id === id) {
      setAvatarPreview(objectUrl);
    }
  };

  const handleAvatarRemove = () => {
    if (avatarPreviewUrl && avatarPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
    setPendingAvatarFile(null);
    setAvatarPreviewUrl(null);
    setPendingAvatarRemove(true);

    // Sync topbar HeaderProfile in real time if editing current authenticated user
    if (currentUser?.id === id) {
      setAvatarPreview('');
    }
  };

  // Revoke object URL on unmount or URL replacement and restore topbar avatar preview
  useEffect(() => {
    return () => {
      if (avatarPreviewUrl && avatarPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
      if (currentUser?.id === id) {
        clearAvatarPreview();
      }
    };
  }, [avatarPreviewUrl, currentUser?.id, id, clearAvatarPreview]);

  // Dynamic avatar URL for header & preview
  const effectiveAvatarUrl = useMemo(() => {
    if (pendingAvatarRemove) return null;
    return avatarPreviewUrl || user?.avatarUrl || null;
  }, [pendingAvatarRemove, avatarPreviewUrl, user?.avatarUrl]);


  // Load User Data
  const fetchUser = useCallback(async () => {
    if (!id) return;
    try {
      setLoadingUser(true);
      const res = await usersApi.getById(id);
      const data = unwrapItem<User>(res);
      setUser(data);


      setName(data.name || '');
      setEmail(data.email || '');
      const userRoles = getUserRoles(data);
      const primaryRole = userRoles[0]?.name || data.role?.name || 'MA_DEVELOPER';
      setSelectedRole(primaryRole);
      setOrganizationId(data.organizationId || data.organization?.id || '');
      setIsActive(data.isActive !== undefined ? data.isActive : true);

      // Reset pending avatar state
      setPendingAvatarFile(null);
      setAvatarPreviewUrl(null);
      setPendingAvatarRemove(false);
    } catch (err: any) {
      console.error('Failed to load user details:', err);
      toast.error('Failed to load user details');
    } finally {
      setLoadingUser(false);
    }
  }, [id]);


  // Load Organizations and Roles
  const fetchMetadata = useCallback(async () => {
    try {
      setLoadingOrgs(true);
      const [orgsRes, rolesRes] = await Promise.allSettled([
        organizationsApi.getAll({ limit: 100 }),
        rolesApi.getAll(),
      ]);


      if (orgsRes.status === 'fulfilled') {
        const orgs = unwrapData<Organization>(orgsRes.value);
        setOrganizations(orgs);
      }
      if (rolesRes.status === 'fulfilled') {
        setRoles(Array.isArray(rolesRes.value) ? rolesRes.value : []);
      }
    } catch (err) {
      console.error('Failed to load metadata:', err);
    } finally {
      setLoadingOrgs(false);
    }
  }, []);


  useEffect(() => {
    fetchUser();
    fetchMetadata();
  }, [fetchUser, fetchMetadata]);


  // Selected Organization Details
  const selectedOrg = useMemo(() => {
    return organizations.find((o) => o.id === organizationId) || user?.organization;
  }, [organizations, organizationId, user]);


  const initials = (name || user?.name || 'U')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();


  const roleTheme = getRoleTheme(selectedRole);
  const isTargetSuperAdmin = Boolean(
    user && (
      (user.roles && user.roles.some((r: any) => (typeof r === 'string' ? r : r?.name) === 'SUPER_ADMIN')) ||
      user.role?.name === 'SUPER_ADMIN' ||
      getUserRoles(user).some((r) => r.name === 'SUPER_ADMIN')
    )
  );
  const isSelf = Boolean(
    user && currentUser && (
      currentUser.id === user.id ||
      (currentUser.email && user.email && currentUser.email.toLowerCase() === user.email.toLowerCase())
    )
  );
  const isBlockedFromEditing = isTargetSuperAdmin && !isSelf;


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;


    if (isBlockedFromEditing) {
      toast.error('Protected Account Guard: Super Administrators cannot modify other Super Administrator accounts.');
      return;
    }


    if (!name.trim()) {
      toast.warning('Full Name is required');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.warning('A valid email address is required');
      return;
    }
    if (password.trim() && password.trim().length < 6) {
      toast.warning('Password must be at least 6 characters');
      return;
    }


    if (isTargetSuperAdmin) {
      if (!isActive) {
        toast.error('Protected Account Guard: Super Admin accounts cannot be set to inactive.');
        return;
      }
      if (selectedRole !== 'SUPER_ADMIN') {
        toast.error('Protected Role Guard: Super Admin clearance level cannot be downgraded or revoked.');
        return;
      }
    }


    try {
      setSaving(true);

      // 1. Commit pending avatar changes to MinIO (folder: avatars/${userId}/)
      let latestAvatarUrl = user.avatarUrl;
      if (pendingAvatarFile) {
        try {
          const avatarRes = await usersApi.uploadAvatar(id, pendingAvatarFile);
          latestAvatarUrl = avatarRes?.avatarUrl || latestAvatarUrl;
        } catch (avatarErr: any) {
          console.error('Avatar upload failed:', avatarErr);
          toast.error(avatarErr?.response?.data?.message || avatarErr?.message || 'Failed to save avatar image');
          setSaving(false);
          return;
        }
      } else if (pendingAvatarRemove) {
        try {
          await usersApi.deleteAvatar(id);
          latestAvatarUrl = null;
        } catch (avatarErr: any) {
          console.error('Avatar removal failed:', avatarErr);
          toast.error(avatarErr?.response?.data?.message || avatarErr?.message || 'Failed to remove avatar image');
          setSaving(false);
          return;
        }
      }

      // 2. Commit user profile fields
      const payload: any = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        roleNames: [selectedRole],
        organizationId: organizationId.trim() || '',
        isActive,
      };

      if (password.trim()) {
        payload.password = password.trim();
      }

      const updated = await usersApi.update(id, payload);
      setUser({ ...updated, avatarUrl: latestAvatarUrl });

      if (currentUser?.id === id) {
        updateUserAvatar(latestAvatarUrl || null);
        await refreshSession?.();
      }
      toast.success(`User profile for "${name.trim()}" updated successfully!`);
      router.push(`/users/${id}`);
    } catch (err: any) {
      console.error('Failed to save user:', err);
      toast.error(err.message || 'Failed to update user profile');
    } finally {
      setSaving(false);
    }
  };


  if (loadingUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <svg
          className="animate-spin h-8 w-8 text-brand-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm font-medium text-slate-500">Loading user profile...</span>
      </div>
    );
  }


  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">User Account Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          The requested user account does not exist or has been removed from the directory.
        </p>
        <Button onClick={() => router.push('/users')} className="mt-2 font-semibold">
          Back to Users Directory
        </Button>
      </div>
    );
  }


  return (
    <div className="w-full min-w-0 space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      {/* Breadcrumb Navigation Line */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <BackButton href={`/users/${id}`} />
        <div className="flex items-center gap-1.5 min-w-0">
          <Link
            href="/users"
            className="hover:text-brand-600 dark:hover:text-brand-400 font-medium transition-colors"
          >
            Users Directory
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <Link
            href={`/users/${id}`}
            className="hover:text-brand-600 dark:hover:text-brand-400 font-semibold truncate max-w-xs transition-colors"
          >
            {user.name}
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="text-brand-600 dark:text-brand-400 font-bold">
            Edit Profile
          </span>
        </div>
      </div>

      {/* Main Edit Form Grid */}
      <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (8 of 12): Identity & Role */}
          <div className="lg:col-span-8 space-y-6">
            {/* Card 1: Identity & Security Profile */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-5">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <svg className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Identity &amp; Credentials</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Primary operator profile information and authentication credentials
                </p>
              </div>


              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Profile Media / Avatar */}
                <div className="sm:col-span-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                    Profile Media / Avatar
                  </Label>
                  <AvatarUpload
                    currentAvatarUrl={user?.avatarUrl}
                    name={name || user?.name}
                    stagedFile={pendingAvatarFile}
                    previewUrl={avatarPreviewUrl}
                    isPendingRemoval={pendingAvatarRemove}
                    onFileSelect={handleAvatarSelect}
                    onRemove={handleAvatarRemove}
                    disabled={saving}
                  />
                </div>

                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="user-name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Full Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="user-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full text-xs rounded-xl"
                  />
                </div>


                {/* Email Address */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="user-email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Primary Email <span className="text-rose-500">*</span>
                    </Label>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-emerald-500" />
                      Verified
                    </span>
                  </div>
                  <Input
                    id="user-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@company.com"
                    className="w-full text-xs rounded-xl font-mono"
                  />
                </div>


                {/* Password (Optional for updates) */}
                <div className="space-y-1.5">
                  <Label htmlFor="user-password" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>New Password</span>
                    <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="user-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Leave blank to keep unchanged"
                      className="w-full text-xs rounded-xl pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>


                {/* Account Status Switch */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Account Status
                    </Label>
                    {isTargetSuperAdmin && (
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                        Protected Root Account
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      disabled={isTargetSuperAdmin}
                      onClick={() => {
                        if (isTargetSuperAdmin) {
                          toast.error('Protected Account Guard: Super Admin accounts cannot be set to inactive.');
                          return;
                        }
                        setIsActive(!isActive);
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isTargetSuperAdmin ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {isActive ? 'Active Member (Allowed Access)' : 'Inactive / Suspended'}
                    </span>
                  </div>
                  {isTargetSuperAdmin && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 pt-0.5">
                      Super Administrator accounts maintain permanent active clearance and cannot be suspended.
                    </p>
                  )}
                </div>
              </div>
            </div>


            {/* Card 2: Role Authority & Access Scope */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheckIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  <span>Role Authority &amp; Access Scope</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select the administrative clearance level and RBAC permissions for this operator
                </p>
              </div>


              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {ROLE_OPTIONS.map((opt) => {
                  const isSelected = selectedRole === opt.key;
                  const theme = getRoleTheme(opt.key);
                  return (
                    <div
                      key={opt.key}
                      onClick={() => {
                        if (isTargetSuperAdmin && opt.key !== 'SUPER_ADMIN') {
                          toast.error('Protected Role Guard: Super Admin clearance level cannot be downgraded or revoked.');
                          return;
                        }
                        setSelectedRole(opt.key);
                      }}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between space-y-3 ${
                        isTargetSuperAdmin && opt.key !== 'SUPER_ADMIN'
                          ? 'opacity-40 cursor-not-allowed border-slate-200/60 dark:border-slate-800/60 bg-slate-50/20 dark:bg-slate-900/20'
                          : 'cursor-pointer ' + (isSelected
                              ? 'border-brand-500 bg-brand-50/20 dark:bg-brand-500/10 shadow-sm'
                              : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-800/30')
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${theme.badge}`}>
                            {opt.badge}
                          </span>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs">
                              <CheckIcon className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {opt.label}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          {opt.desc}
                        </p>
                      </div>


                      <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/50 space-y-1">
                        {opt.capabilities.map((c, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-300">
                            <span className="w-1 h-1 rounded-full bg-brand-500 shrink-0" />
                            <span>{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>


          {/* Right Column (4 of 12): Organization & Notification Channels */}
          <div className="lg:col-span-4 space-y-6">
            {/* Card 3: Assigned Organization Tenancy */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BuildingIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Assigned Organization</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tenant boundary and regulatory authority alignment
                </p>
              </div>


              <div className="space-y-3 text-xs">
                <div className="space-y-1.5">
                  <Label htmlFor="user-org" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Organization Tenant
                  </Label>
                  <select
                    id="user-org"
                    value={organizationId}
                    onChange={(e) => setOrganizationId(e.target.value)}
                    className="w-full text-xs rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                  >
                    <option value="">No Organization (Independent)</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} {org.code ? `(${org.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>


                {selectedOrg ? (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Tenancy Scope</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Isolated Tenant
                      </span>
                    </div>
                    {selectedOrg.code && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Regulatory Code</span>
                        <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                          {selectedOrg.code}
                        </span>
                      </div>
                    )}
                    {selectedOrg.parentAuthority && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Regulatory Authority</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]" title={selectedOrg.parentAuthority}>
                          {selectedOrg.parentAuthority}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    Independent operator with global platform access scope.
                  </p>
                )}
              </div>
            </div>


            {/* Account Governance & Tenancy Profile */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheckIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  <span>Account Governance</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Audit trail identity and security profile state
                </p>
              </div>


              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-400 font-medium">Authentication</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[170px]" title={user.externalId || 'Internal Platform User'}>
                    {user.externalId ? `SSO: ${user.externalId}` : 'Internal Platform User'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-400 font-medium">Registered Date</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-400 font-medium">Last Modified</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  </span>
                </div>


                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span>Alerts &amp; Channels</span>
                  </div>
                  <p>
                    Telegram and instant dispatch channels are configured directly on the profile Alerts card via the dedicated Configure modal.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Sticky Bottom Action Bar with Container Background */}
      <div className="sticky bottom-0 -mx-4 sm:-mx-6 lg:-mx-8 -mb-4 sm:-mb-6 lg:-mb-8 mt-10 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 min-w-0">
            <ShieldCheckIcon className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
            <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
              Editing: <strong className="font-semibold">{name || user.name}</strong>
            </span>
            {pendingAvatarFile && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 border border-brand-200/80 dark:border-brand-800">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                Avatar change pending save
              </span>
            )}
            {pendingAvatarRemove && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Avatar removal pending save
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/users/${id}`)}
              disabled={saving}
              className="text-xs font-semibold py-2 px-4 rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-user-form"
              variant="primary"
              disabled={saving}
              className="text-xs font-semibold py-2 px-5 rounded-xl shadow-sm bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <CheckIcon className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function EditUserPage() {
  return (
    <ProtectedRoute requiredPermission="user:manage">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[50vh]">
            <span className="text-sm text-slate-400 animate-pulse">Loading user profile editor...</span>
          </div>
        }
      >
        <EditUserContent />
      </Suspense>
    </ProtectedRoute>
  );
}


