'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Label } from '@/components/ui/inputs';
import { Card } from '@/components/ui/card';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { usersApi, rolesApi, User, Role, PermissionDefinition } from '@/api';
import { useToast } from '@/components/ui/Toast';

// Permission Categories for Role Matrix
const PERMISSION_GROUPS: {
  category: string;
  icon: string;
  description: string;
  permissions: { key: string; label: string; desc: string }[];
}[] = [
  {
    category: 'Mini App Management',
    icon: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z',
    description: 'Manage registration, lifecycle, builds, and actions for Mini Apps',
    permissions: [
      { key: 'miniapp:create', label: 'Create Mini App', desc: 'Register new applications and drafts' },
      { key: 'miniapp:read', label: 'View Mini Apps', desc: 'Browse and inspect mini applications' },
      { key: 'miniapp:update', label: 'Update Mini App', desc: 'Edit details, builds, and settings' },
      { key: 'miniapp:submit', label: 'Submit for Review', desc: 'Submit mini apps to review queue' },
      { key: 'miniapp:approve', label: 'Approve Mini App', desc: 'Authorize mini apps for testing / production' },
      { key: 'miniapp:reject', label: 'Reject / Request Changes', desc: 'Send feedback and request revisions' },
      { key: 'miniapp:suspend', label: 'Suspend Mini App', desc: 'Temporarily take down mini apps' },
      { key: 'miniapp:delete', label: 'Delete Mini App', desc: 'Permanently remove applications' },
    ],
  },
  {
    category: 'Permissions & Proposals',
    icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
    description: 'Scope definitions, permission proposals, and regulatory reviews',
    permissions: [
      { key: 'permission:read', label: 'View Permissions', desc: 'Browse capability scopes and declarations' },
      { key: 'permission:manage', label: 'Manage Permissions', desc: 'Create, update, and configure scopes' },
      { key: 'permission_proposal:read', label: 'View Proposals', desc: 'Inspect permission requests from mini apps' },
      { key: 'permission_proposal:review', label: 'Review Proposals', desc: 'Evaluate and score permission requests' },
      { key: 'permission_proposal:approve', label: 'Approve Proposals', desc: 'Grant elevated device / financial permissions' },
      { key: 'miniapp_permission:approve', label: 'Approve Scope Bundles', desc: 'Authorize bundled permissions' },
      { key: 'issue:resolve', label: 'Resolve Security Issues', desc: 'Dismiss or resolve flagged security gate items' },
    ],
  },
  {
    category: 'Super App & Ecosystem',
    icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
    description: 'Super App release orchestration and partner organizations',
    permissions: [
      { key: 'super_app:read', label: 'View Super App Status', desc: 'Inspect release assembly and capability health' },
      { key: 'super_app:manage', label: 'Manage Releases', desc: 'Trigger Jenkins sandbox builds and release bundles' },
      { key: 'organization:read', label: 'View Organizations', desc: 'Browse registered partner agencies' },
      { key: 'organization:manage', label: 'Manage Organizations', desc: 'Create and verify trusted agency domains' },
    ],
  },
  {
    category: 'System & Security',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    description: 'Access control, audit trails, and global system parameters',
    permissions: [
      { key: 'user:read', label: 'View Users', desc: 'Access user listings and directory' },
      { key: 'user:manage', label: 'Manage Users', desc: 'Create, update, and manage staff accounts' },
      { key: 'role:read', label: 'View Roles', desc: 'Inspect RBAC role definitions' },
      { key: 'role:manage', label: 'Manage Roles', desc: 'Create and adjust roles and permissions' },
      { key: 'audit_log:read', label: 'View Audit Logs', desc: 'Inspect system-wide security audit trails' },
      { key: 'settings:manage', label: 'Manage System Settings', desc: 'Configure retention and pipeline timers' },
    ],
  },
];

export default function UsersPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [mounted, setMounted] = useState(false);

  // Users State
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    roleNames: ['DEVELOPER'] as string[],
    telegramChatId: '',
    telegramUsername: '',
    isActive: true,
  });

  // Role Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);
  const [roleFormData, setRoleFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
    isActive: true,
  });

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'user' | 'role'; id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const data = await usersApi.getAll();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch users', err);
      toast.error('Failed to load users list');
    } finally {
      setLoadingUsers(false);
    }
  }, [toast]);

  const fetchRoles = useCallback(async () => {
    try {
      setLoadingRoles(true);
      const data = await rolesApi.getAll();
      setRoles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch roles', err);
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  // User Handlers
  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setUserFormData({
      name: '',
      email: '',
      roleNames: ['DEVELOPER'],
      telegramChatId: '',
      telegramUsername: '',
      isActive: true,
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setUserFormData({
      name: user.name,
      email: user.email,
      roleNames: user.roles?.map((r) => r.name) || ['DEVELOPER'],
      telegramChatId: user.telegramChatId || '',
      telegramUsername: user.telegramUsername || '',
      isActive: user.isActive !== undefined ? user.isActive : true,
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.name.trim() || !userFormData.email.trim()) {
      toast.warning('Name and Email are required');
      return;
    }

    setIsSubmittingUser(true);
    try {
      if (editingUser) {
        await usersApi.update(editingUser.id, userFormData);
        toast.success(`User '${userFormData.name}' updated successfully!`);
      } else {
        await usersApi.create(userFormData);
        toast.success(`User '${userFormData.name}' created successfully!`);
      }
      setIsUserModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save user.');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Role Handlers
  const handleOpenCreateRole = () => {
    setEditingRole(null);
    setRoleFormData({
      name: '',
      description: '',
      permissions: [],
      isActive: true,
    });
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || [],
      isActive: role.isActive,
    });
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleFormData.name.trim()) {
      toast.warning('Role name is required');
      return;
    }

    setIsSubmittingRole(true);
    try {
      if (editingRole) {
        await rolesApi.update(editingRole.id, roleFormData);
        toast.success(`Role '${roleFormData.name}' updated successfully!`);
      } else {
        await rolesApi.create(roleFormData);
        toast.success(`Role '${roleFormData.name}' created successfully!`);
      }
      setIsRoleModalOpen(false);
      fetchRoles();
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save role.');
    } finally {
      setIsSubmittingRole(false);
    }
  };

  // Confirm Delete Handler
  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'user') {
        await usersApi.delete(deleteTarget.id);
        toast.success(`User '${deleteTarget.name}' deleted.`);
        fetchUsers();
      } else {
        await rolesApi.delete(deleteTarget.id);
        toast.success(`Role '${deleteTarget.name}' deleted.`);
        fetchRoles();
      }
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete target item.');
    } finally {
      setIsDeleting(false);
    }
  };

  const togglePermission = (key: string) => {
    setRoleFormData((prev) => {
      const exists = prev.permissions.includes(key);
      return {
        ...prev,
        permissions: exists ? prev.permissions.filter((p) => p !== key) : [...prev.permissions, key],
      };
    });
  };

  const togglePermissionGroup = (keys: string[]) => {
    setRoleFormData((prev) => {
      const allSelected = keys.every((k) => prev.permissions.includes(k));
      if (allSelected) {
        return { ...prev, permissions: prev.permissions.filter((k) => !keys.includes(k)) };
      } else {
        const set = new Set([...prev.permissions, ...keys]);
        return { ...prev, permissions: Array.from(set) };
      }
    });
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.telegramUsername && u.telegramUsername.toLowerCase().includes(userSearch.toLowerCase()));

    const matchesRole =
      roleFilter === 'ALL' || u.roles?.some((r) => r.name === roleFilter);

    return matchesSearch && matchesRole;
  });

  return (
    <ProtectedRoute permission="user:read">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                Users & Access Control
              </h2>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Manage system operators, role assignments, Telegram alert channels, and granular permission matrices.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'users' ? (
              <Button onClick={handleOpenCreateUser} className="gap-2 flex items-center h-10 text-sm font-semibold">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Add User
              </Button>
            ) : (
              <Button onClick={handleOpenCreateRole} className="gap-2 flex items-center h-10 text-sm font-semibold">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Role
              </Button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>User Accounts</span>
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
              {users.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'roles'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Roles & Permissions</span>
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
              {roles.length}
            </span>
          </button>
        </div>

        {/* --- USERS TAB --- */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="relative w-full sm:w-80">
                <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <Input
                  placeholder="Search by name, email, or @telegram..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9 h-10 text-sm w-full"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Role:
                </span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="h-10 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="ALL">All Roles</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Users Table */}
            <Card className="!p-0 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/50">
                    <tr>
                      <th className="w-[28%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                        User Profile
                      </th>
                      <th className="w-[22%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                        Assigned Roles
                      </th>
                      <th className="w-[20%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                        Telegram Channel
                      </th>
                      <th className="w-[12%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                        Status
                      </th>
                      <th className="w-[18%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                          <div className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-brand-500" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Loading user directory...
                          </div>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                          No users found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => {
                        const initials = user.name
                          .split(' ')
                          .map((w) => w.charAt(0))
                          .join('')
                          .substring(0, 2)
                          .toUpperCase();

                        return (
                          <tr
                            key={user.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 font-bold text-xs flex items-center justify-center border border-brand-300/40 dark:border-brand-700/60 shrink-0 shadow-sm">
                                  {initials}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                    <span>{user.name}</span>
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                    <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span>{user.email}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1.5">
                                {user.roles && user.roles.length > 0 ? (
                                  user.roles.map((role) => (
                                    <span
                                      key={role.id || role.name}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
                                        role.name === 'SUPER_ADMIN'
                                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                                          : role.name === 'ADMIN'
                                          ? 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20'
                                          : role.name === 'MINI_APP_MANAGER'
                                          ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20'
                                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                      }`}
                                    >
                                      <svg className="w-3 h-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                      </svg>
                                      {role.name}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-slate-400">None</span>
                                )}
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              {user.telegramChatId ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                                  <svg className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                                  </svg>
                                  <span>{user.telegramUsername ? `@${user.telegramUsername}` : `ID: ${user.telegramChatId}`}</span>
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                  <span>—</span> Not linked
                                </span>
                              )}
                            </td>

                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                                  user.isActive !== false
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${user.isActive !== false ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                {user.isActive !== false ? 'Active' : 'Inactive'}
                              </span>
                            </td>

                            <td className="px-6 py-4 text-right space-x-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEditUser(user)}
                                className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:text-brand-700 font-semibold text-xs px-2.5 py-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget({ type: 'user', id: user.id, name: user.name })}
                                className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:text-rose-700 font-semibold text-xs px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* --- ROLES TAB --- */}
        {activeTab === 'roles' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loadingRoles ? (
                <div className="col-span-2 py-12 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-brand-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading RBAC role definitions...
                  </div>
                </div>
              ) : (
                roles.map((role) => {
                  const isSystemRole = ['SUPER_ADMIN', 'ADMIN'].includes(role.name);

                  return (
                    <Card key={role.id} className="p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm">
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-xl ${
                              role.name === 'SUPER_ADMIN'
                                ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                                : role.name === 'ADMIN'
                                ? 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400'
                                : 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                            }`}>
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                                <span>{role.name}</span>
                                {isSystemRole && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                    System
                                  </span>
                                )}
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {role.description || 'Custom defined operational role'}
                              </p>
                            </div>
                          </div>

                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span>{role.userCount || 0} members</span>
                          </span>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between">
                            <span>Permissions ({role.permissions?.length || 0})</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                            {role.permissions && role.permissions.length > 0 ? (
                              role.permissions.map((perm) => (
                                <span
                                  key={perm}
                                  className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80"
                                >
                                  {perm}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400 italic">No permissions assigned</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleOpenEditRole(role)}
                          className="h-8 text-xs font-semibold gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit Permissions
                        </Button>
                        {!isSystemRole && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteTarget({ type: 'role', id: role.id, name: role.name })}
                            className="h-8 text-xs font-semibold gap-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/50"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* --- USER CREATE / EDIT MODAL --- */}
        {mounted && isUserModalOpen && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
            <div
              className="fixed inset-0"
              onClick={() => !isSubmittingUser && setIsUserModalOpen(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl my-auto max-h-[calc(100vh-3rem)] overflow-y-auto z-10 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
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
                  onClick={() => setIsUserModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="space-y-4">
                <div>
                  <Label htmlFor="user-name" className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Full Name *
                  </Label>
                  <Input
                    id="user-name"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
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
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    placeholder="e.g. user@fsa.gov.kh"
                    required
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Assign Roles *
                  </Label>
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700">
                    {roles.map((r) => {
                      const checked = userFormData.roleNames.includes(r.name);
                      return (
                        <label
                          key={r.id}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-xs font-semibold ${
                            checked
                              ? 'bg-brand-50 dark:bg-brand-500/20 text-brand-800 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setUserFormData((prev) => ({
                                ...prev,
                                roleNames: checked
                                  ? prev.roleNames.filter((n) => n !== r.name)
                                  : [...prev.roleNames, r.name],
                              }));
                            }}
                            className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                          />
                          <span>{r.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="telegram-chat-id" className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <svg className="w-3.5 h-3.5 text-sky-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                      </svg>
                      Telegram Chat ID
                    </Label>
                    <Input
                      id="telegram-chat-id"
                      value={userFormData.telegramChatId}
                      onChange={(e) => setUserFormData({ ...userFormData, telegramChatId: e.target.value })}
                      placeholder="e.g. 123456789"
                    />
                  </div>

                  <div>
                    <Label htmlFor="telegram-username" className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <svg className="w-3.5 h-3.5 text-sky-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                      </svg>
                      Telegram Username
                    </Label>
                    <Input
                      id="telegram-username"
                      value={userFormData.telegramUsername}
                      onChange={(e) => setUserFormData({ ...userFormData, telegramUsername: e.target.value.replace(/^@/, '') })}
                      placeholder="e.g. johndoe"
                    />
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Account Status
                  </Label>
                  <select
                    value={userFormData.isActive ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) => setUserFormData({ ...userFormData, isActive: e.target.value === 'ACTIVE' })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="ACTIVE">Active (Can sign in & receive alerts)</option>
                    <option value="INACTIVE">Inactive (Access suspended)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsUserModalOpen(false)}
                    disabled={isSubmittingUser}
                    className="gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmittingUser} className="gap-1.5">
                    {isSubmittingUser ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
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
        )}

        {/* --- ROLE CREATE / EDIT MODAL --- */}
        {mounted && isRoleModalOpen && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
            <div
              className="fixed inset-0"
              onClick={() => !isSubmittingRole && setIsRoleModalOpen(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 shadow-2xl my-auto max-h-[calc(100vh-3rem)] overflow-y-auto z-10 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-500/20">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {editingRole ? `Edit Role: ${editingRole.name}` : 'Create RBAC Role'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Define capability scopes and action entitlements for this role
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSaveRole} className="space-y-5">
                <div>
                  <Label htmlFor="role-name" className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Role Identifier *
                  </Label>
                  <Input
                    id="role-name"
                    value={roleFormData.name}
                    onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value.toUpperCase() })}
                    placeholder="e.g. COMPLIANCE_OFFICER"
                    required
                    disabled={editingRole ? ['SUPER_ADMIN', 'ADMIN'].includes(editingRole.name) : false}
                  />
                </div>

                <div>
                  <Label htmlFor="role-desc" className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    Description
                  </Label>
                  <textarea
                    id="role-desc"
                    value={roleFormData.description}
                    onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                    placeholder="Describe the operational responsibilities of this role..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    rows={2}
                  />
                </div>

                {/* Permission Matrix Accordion/Groups */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <svg className="w-3.5 h-3.5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Entitled Permissions ({roleFormData.permissions.length} selected)
                    </Label>
                  </div>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {PERMISSION_GROUPS.map((group) => {
                      const groupKeys = group.permissions.map((p) => p.key);
                      const allInGroup = groupKeys.every((k) => roleFormData.permissions.includes(k));
                      const someInGroup = groupKeys.some((k) => roleFormData.permissions.includes(k));

                      return (
                        <div
                          key={group.category}
                          className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700"
                        >
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-brand-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={group.icon} />
                              </svg>
                              <div>
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                  {group.category}
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {group.description}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => togglePermissionGroup(groupKeys)}
                              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline shrink-0"
                            >
                              {allInGroup ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {group.permissions.map((perm) => {
                              const isSelected = roleFormData.permissions.includes(perm.key);
                              return (
                                <label
                                  key={perm.key}
                                  className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-brand-50 dark:bg-brand-500/20 border border-brand-200 dark:border-brand-500/30'
                                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => togglePermission(perm.key)}
                                    className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 w-4 h-4 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                                      {perm.label}
                                    </div>
                                    <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                      {perm.key}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsRoleModalOpen(false)}
                    disabled={isSubmittingRole}
                    className="gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmittingRole} className="gap-1.5">
                    {isSubmittingRole ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {editingRole ? 'Update Role' : 'Create Role'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* --- DELETE CONFIRMATION DIALOG --- */}
        {mounted && deleteTarget && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
            <div
              className="fixed inset-0"
              onClick={() => !isDeleting && setDeleteTarget(null)}
            />
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl my-auto z-10 animate-in zoom-in-95 duration-200 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-4 border border-rose-200 dark:border-rose-900/50 shadow-sm">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Delete {deleteTarget.type === 'user' ? 'User Account' : 'Role'}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Are you sure you want to remove <strong className="text-slate-800 dark:text-slate-200">{deleteTarget.name}</strong>? This action is permanent and cannot be undone.
              </p>

              <div className="flex justify-center gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleExecuteDelete}
                  disabled={isDeleting}
                  className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </ProtectedRoute>
  );
}

