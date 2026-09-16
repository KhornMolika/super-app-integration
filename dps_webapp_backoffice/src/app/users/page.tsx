'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Label } from '@/components/ui/inputs';
import { Card } from '@/components/ui/card';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { usersApi, rolesApi, User, Role } from '@/api';
import { useToast } from '@/components/ui/Toast';

// Permission Categories & Definition Catalog
export interface PermissionItem {
  key: string;
  label: string;
  desc: string;
  level: 'CRITICAL' | 'ELEVATED' | 'STANDARD' | 'SYSTEM';
}

export interface PermissionCategoryGroup {
  category: string;
  icon: string;
  description: string;
  color: string;
  permissions: PermissionItem[];
}

const PERMISSION_GROUPS: PermissionCategoryGroup[] = [
  {
    category: 'Mini App Management',
    icon: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z',
    description: 'Manage registration, builds, lifecycle states, and security actions for Mini Apps',
    color: 'brand',
    permissions: [
      { key: 'miniapp:create', label: 'Create Mini App', desc: 'Register new applications, drafts, and initial metadata', level: 'STANDARD' },
      { key: 'miniapp:read', label: 'View Mini Apps', desc: 'Browse catalog, inspect details, artifacts, and build versions', level: 'STANDARD' },
      { key: 'miniapp:update', label: 'Update Mini App', desc: 'Modify configurations, branding, and team assignments', level: 'STANDARD' },
      { key: 'miniapp:submit', label: 'Submit for Review', desc: 'Submit mini apps and new versions to the review queue', level: 'STANDARD' },
      { key: 'miniapp:approve', label: 'Approve Mini App', desc: 'Authorize mini apps for staging and production rollout', level: 'CRITICAL' },
      { key: 'miniapp:reject', label: 'Reject / Request Revisions', desc: 'Issue rejection feedback and change requests', level: 'ELEVATED' },
      { key: 'miniapp:suspend', label: 'Suspend Mini App', desc: 'Emergency take-down or suspension of running mini apps', level: 'CRITICAL' },
      { key: 'miniapp:delete', label: 'Delete Mini App', desc: 'Permanently remove applications and associated artifacts', level: 'CRITICAL' },
    ],
  },
  {
    category: 'Permissions & Proposals',
    icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
    description: 'Hardware/OS capability scope declarations, proposals, and regulatory approvals',
    color: 'amber',
    permissions: [
      { key: 'permission:read', label: 'View Scope Catalog', desc: 'Browse platform host capability scopes and requirements', level: 'STANDARD' },
      { key: 'permission:manage', label: 'Manage Scope Catalog', desc: 'Create, edit, or deprecate platform permission declarations', level: 'SYSTEM' },
      { key: 'permission_proposal:read', label: 'View Proposals', desc: 'Inspect permission elevation requests submitted by mini apps', level: 'STANDARD' },
      { key: 'permission_proposal:review', label: 'Review Proposals', desc: 'Evaluate justification, risk score, and compliance impact', level: 'ELEVATED' },
      { key: 'permission_proposal:approve', label: 'Approve Proposals', desc: 'Grant elevated device/financial host permissions', level: 'CRITICAL' },
      { key: 'miniapp_permission:approve', label: 'Authorize Scope Bundles', desc: 'Batch authorize capability bundles for mini applications', level: 'CRITICAL' },
      { key: 'issue:resolve', label: 'Resolve Security Issues', desc: 'Override or clear flagged security gate and compliance items', level: 'ELEVATED' },
    ],
  },
  {
    category: 'Super App & Ecosystem',
    icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
    description: 'Host shell release pipeline orchestration, sandbox verification, and agency tenants',
    color: 'purple',
    permissions: [
      { key: 'super_app:read', label: 'View Super App Status', desc: 'Inspect release assembly, health digest, and license status', level: 'STANDARD' },
      { key: 'super_app:manage', label: 'Manage Host Releases', desc: 'Trigger Jenkins sandbox builds and release bundle publishing', level: 'CRITICAL' },
      { key: 'organization:read', label: 'View Organizations', desc: 'Browse registered partner agencies and tenant directory', level: 'STANDARD' },
      { key: 'organization:manage', label: 'Manage Organizations', desc: 'Create, onboard, and verify partner agencies', level: 'ELEVATED' },
    ],
  },
  {
    category: 'System & Security',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    description: 'Operator directory, RBAC governance, audit trails, and platform configurations',
    color: 'rose',
    permissions: [
      { key: 'user:read', label: 'View User Directory', desc: 'Access staff directory and operator accounts', level: 'STANDARD' },
      { key: 'user:manage', label: 'Manage User Accounts', desc: 'Create, update, deactivate staff accounts and assign roles', level: 'SYSTEM' },
      { key: 'role:read', label: 'View RBAC Roles', desc: 'Inspect role definitions and permission matrices', level: 'STANDARD' },
      { key: 'role:manage', label: 'Manage RBAC Roles', desc: 'Create custom roles and customize permission matrices', level: 'SYSTEM' },
      { key: 'audit_log:read', label: 'View Audit Logs', desc: 'Inspect immutable system governance and security audit logs', level: 'ELEVATED' },
      { key: 'settings:manage', label: 'Manage Global Settings', desc: 'Configure retention policies and CI/CD timers', level: 'SYSTEM' },
    ],
  },
];

const ALL_FLAT_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.permissions);
const TOTAL_PERMISSIONS_COUNT = ALL_FLAT_PERMISSIONS.length;

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

  // Roles Sub-View Mode ('cards' | 'matrix' | 'catalog')
  const [rolesSubView, setRolesSubView] = useState<'cards' | 'matrix' | 'catalog'>('cards');
  const [roleSearch, setRoleSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [expandedRoleCards, setExpandedRoleCards] = useState<Record<string, boolean>>({});

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
  const [roleModalSearch, setRoleModalSearch] = useState('');
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
    setRoleModalSearch('');
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
    setRoleModalSearch('');
    setRoleFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || [],
      isActive: role.isActive,
    });
    setIsRoleModalOpen(true);
  };

  const handleDuplicateRole = (role: Role) => {
    setEditingRole(null);
    setRoleModalSearch('');
    setRoleFormData({
      name: `${role.name}_COPY`,
      description: `Copy of ${role.name}: ${role.description || ''}`,
      permissions: [...(role.permissions || [])],
      isActive: true,
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

  // Delete Confirm Handler
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

  // Preset Handlers in Role Modal
  const applyRolePreset = (preset: 'ALL' | 'READ_ONLY' | 'MINI_APP' | 'CLEAR') => {
    if (preset === 'ALL') {
      setRoleFormData((prev) => ({ ...prev, permissions: ALL_FLAT_PERMISSIONS.map((p) => p.key) }));
    } else if (preset === 'READ_ONLY') {
      setRoleFormData((prev) => ({
        ...prev,
        permissions: ALL_FLAT_PERMISSIONS.filter((p) => p.key.endsWith(':read')).map((p) => p.key),
      }));
    } else if (preset === 'MINI_APP') {
      const miniAppGroup = PERMISSION_GROUPS.find((g) => g.category === 'Mini App Management');
      const keys = miniAppGroup?.permissions.map((p) => p.key) || [];
      setRoleFormData((prev) => ({ ...prev, permissions: keys }));
    } else if (preset === 'CLEAR') {
      setRoleFormData((prev) => ({ ...prev, permissions: [] }));
    }
  };

  const toggleRoleCardExpand = (roleId: string) => {
    setExpandedRoleCards((prev) => ({ ...prev, [roleId]: !prev[roleId] }));
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.telegramUsername && u.telegramUsername.toLowerCase().includes(userSearch.toLowerCase()));

      const matchesRole = roleFilter === 'ALL' || u.roles?.some((r) => r.name === roleFilter);

      return matchesSearch && matchesRole;
    });
  }, [users, userSearch, roleFilter]);

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const query = roleSearch.toLowerCase();
      const matchesSearch =
        r.name.toLowerCase().includes(query) ||
        (r.description && r.description.toLowerCase().includes(query)) ||
        r.permissions?.some((p) => p.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      if (categoryFilter === 'ALL') return true;

      const group = PERMISSION_GROUPS.find((g) => g.category === categoryFilter);
      if (!group) return true;
      const groupKeys = group.permissions.map((p) => p.key);
      return r.permissions?.some((p) => groupKeys.includes(p));
    });
  }, [roles, roleSearch, categoryFilter]);

  // Helper styling for roles
  const getRoleTheme = (roleName: string) => {
    switch (roleName) {
      case 'SUPER_ADMIN':
        return {
          badge: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/30',
          gradient: 'from-rose-500/10 via-rose-500/5 to-transparent border-rose-200/80 dark:border-rose-500/30',
          iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300',
          bar: 'bg-rose-500',
          label: 'Super Admin',
        };
      case 'ADMIN':
        return {
          badge: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-500/30',
          gradient: 'from-purple-500/10 via-purple-500/5 to-transparent border-purple-200/80 dark:border-purple-500/30',
          iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300',
          bar: 'bg-purple-500',
          label: 'System Admin',
        };
      case 'MINI_APP_MANAGER':
        return {
          badge: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 border-sky-200 dark:border-sky-500/30',
          gradient: 'from-sky-500/10 via-sky-500/5 to-transparent border-sky-200/80 dark:border-sky-500/30',
          iconBg: 'bg-sky-50 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300',
          bar: 'bg-sky-500',
          label: 'Mini App Manager',
        };
      case 'DEVELOPER':
        return {
          badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
          gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-200/80 dark:border-emerald-500/30',
          iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
          bar: 'bg-emerald-500',
          label: 'Developer',
        };
      case 'AUDITOR':
        return {
          badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
          gradient: 'from-amber-500/10 via-amber-500/5 to-transparent border-amber-200/80 dark:border-amber-500/30',
          iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
          bar: 'bg-amber-500',
          label: 'Compliance Auditor',
        };
      default:
        return {
          badge: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 border-brand-200 dark:border-brand-500/30',
          gradient: 'from-brand-500/10 via-brand-500/5 to-transparent border-brand-200/80 dark:border-brand-500/30',
          iconBg: 'bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300',
          bar: 'bg-brand-500',
          label: roleName,
        };
    }
  };

  const getSensitivityBadge = (level: 'CRITICAL' | 'ELEVATED' | 'STANDARD' | 'SYSTEM') => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
            <svg className="w-2.5 h-2.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Critical
          </span>
        );
      case 'ELEVATED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
            <svg className="w-2.5 h-2.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Elevated
          </span>
        );
      case 'SYSTEM':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
            <svg className="w-2.5 h-2.5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            System Admin
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <svg className="w-2.5 h-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Standard
          </span>
        );
    }
  };

  return (
    <ProtectedRoute permission="user:read">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-brand-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Users & Access Control
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    PostgreSQL RBAC Database Synchronized
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {users.length} Active Operators across {roles.length} Defined Roles
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {activeTab === 'users' ? (
              <Button onClick={handleOpenCreateUser} className="gap-2 flex items-center h-10 px-4 text-sm font-semibold shadow-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Add User Account
              </Button>
            ) : (
              <Button onClick={handleOpenCreateRole} className="gap-2 flex items-center h-10 px-4 text-sm font-semibold shadow-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Custom Role
              </Button>
            )}
          </div>
        </div>

        {/* Main Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2.5 px-5 py-3.5 font-semibold text-sm border-b-2 transition-all ${
                activeTab === 'users'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-50/30 dark:bg-brand-500/5'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>User Accounts</span>
              <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                activeTab === 'users' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {users.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className={`flex items-center gap-2.5 px-5 py-3.5 font-semibold text-sm border-b-2 transition-all ${
                activeTab === 'roles'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-50/30 dark:bg-brand-500/5'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Roles & Permissions</span>
              <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                activeTab === 'roles' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {roles.length}
              </span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* --- TAB 1: USERS DIRECTORY --- */}
        {/* ========================================================================= */}
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
                  Filter Role:
                </span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="h-10 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="ALL">All Roles ({users.length})</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name} ({r.userCount || 0})
                    </option>
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
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          User Profile
                        </div>
                      </th>
                      <th className="w-[24%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          Assigned Roles
                        </div>
                      </th>
                      <th className="w-[20%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-sky-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                          </svg>
                          Telegram Alert Channel
                        </div>
                      </th>
                      <th className="w-[12%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Status
                        </div>
                      </th>
                      <th className="w-[16%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right">
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
                            Fetching accounts from database...
                          </div>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                            <span className="font-medium text-slate-700 dark:text-slate-300">No users match your filter criteria</span>
                            <span className="text-xs text-slate-400">Try adjusting your search query or role filter</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => {
                        const initials = (user.name || 'U')
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase();

                        return (
                          <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm ring-2 ring-white dark:ring-slate-900 shrink-0">
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                                    <span>{user.name}</span>
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate font-mono">
                                    {user.email}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1.5">
                                {user.roles && user.roles.length > 0 ? (
                                  user.roles.map((role) => {
                                    const theme = getRoleTheme(role.name);
                                    return (
                                      <span
                                        key={role.id || role.name}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${theme.badge}`}
                                      >
                                        <svg className="w-3 h-3 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                        {role.name}
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="text-xs text-slate-400 italic">No roles assigned</span>
                                )}
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              {user.telegramChatId ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                                  <svg className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                                  </svg>
                                  <span>{user.telegramUsername ? `@${user.telegramUsername}` : `ID: ${user.telegramChatId}`}</span>
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                  <span>—</span> Not configured
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
                                {user.isActive !== false ? 'Active' : 'Suspended'}
                              </span>
                            </td>

                            <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
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

        {/* ========================================================================= */}
        {/* --- TAB 2: ROLES & PERMISSIONS MANAGEMENT (ENHANCED) --- */}
        {/* ========================================================================= */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            {/* Top Toolbar: View Mode Switcher, Search, and Category Filters */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              {/* Left: View Mode Pills */}
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRolesSubView('cards')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    rolesSubView === 'cards'
                      ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span>Role Cards</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRolesSubView('matrix')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    rolesSubView === 'matrix'
                      ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M9 4v16m6-16v16" />
                  </svg>
                  <span>RBAC Matrix Grid</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRolesSubView('catalog')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    rolesSubView === 'catalog'
                      ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span>Permission Catalog</span>
                </button>
              </div>

              {/* Right: Search & Category Filter */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 sm:w-64">
                  <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <Input
                    placeholder="Search roles or permissions..."
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                    className="pl-9 h-9 text-xs w-full"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    Group:
                  </span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-9 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="ALL">All Categories</option>
                    {PERMISSION_GROUPS.map((g) => (
                      <option key={g.category} value={g.category}>
                        {g.category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* --- SUB-VIEW 1: ROLE CARDS (2 COLS) --- */}
            {rolesSubView === 'cards' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {loadingRoles ? (
                  <div className="col-span-full py-16 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-6 w-6 text-brand-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading RBAC roles and permission schema...
                    </div>
                  </div>
                ) : filteredRoles.length === 0 ? (
                  <div className="col-span-full py-16 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">No roles matched query</span>
                      <span className="text-xs text-slate-400">Try clearing the search query or category filter</span>
                    </div>
                  </div>
                ) : (
                  filteredRoles.map((role) => {
                    const isSystemRole = ['SUPER_ADMIN', 'ADMIN'].includes(role.name);
                    const theme = getRoleTheme(role.name);
                    const permCount = role.permissions?.length || 0;
                    const coveragePercent = Math.round((permCount / TOTAL_PERMISSIONS_COUNT) * 100);
                    const isExpanded = !!expandedRoleCards[role.id];

                    return (
                      <Card
                        key={role.id}
                        className={`p-5 flex flex-col justify-between hover:shadow-md transition-all border ${
                          theme.gradient
                        } relative overflow-hidden group`}
                      >
                        {/* Card Header */}
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-xl ${theme.iconBg} shadow-sm shrink-0`}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                    {role.name}
                                  </h3>
                                  {isSystemRole && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                      System
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                  {role.description || 'Custom defined operational access role'}
                                </p>
                              </div>
                            </div>

                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                              <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              <span>{role.userCount || 0}</span>
                            </span>
                          </div>

                          {/* Coverage Indicator */}
                          <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                              <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Capability Coverage
                              </span>
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                {permCount} / {TOTAL_PERMISSIONS_COUNT} ({coveragePercent}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${theme.bar}`}
                                style={{ width: `${Math.min(100, Math.max(4, coveragePercent))}%` }}
                              />
                            </div>

                            {/* Category Mini Counts */}
                            <div className="grid grid-cols-2 gap-1.5 mt-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 text-[10px] text-slate-500 dark:text-slate-400">
                              {PERMISSION_GROUPS.map((g) => {
                                const groupKeys = g.permissions.map((p) => p.key);
                                const grantedInGroup = role.permissions?.filter((p) => groupKeys.includes(p)).length || 0;
                                return (
                                  <div key={g.category} className="flex items-center justify-between px-1">
                                    <span className="truncate">{g.category.split(' ')[0]}:</span>
                                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                                      {grantedInGroup}/{g.permissions.length}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Permissions Preview / Chips */}
                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                              <span>Granted Permissions</span>
                              {permCount > 4 && (
                                <button
                                  type="button"
                                  onClick={() => toggleRoleCardExpand(role.id)}
                                  className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5"
                                >
                                  {isExpanded ? 'Show less' : `+${permCount - 4} more`}
                                </button>
                              )}
                            </div>

                            <div className={`flex flex-wrap gap-1.5 transition-all ${isExpanded ? 'max-h-48 overflow-y-auto pr-1' : 'max-h-16 overflow-hidden'}`}>
                              {role.permissions && role.permissions.length > 0 ? (
                                role.permissions.map((perm) => (
                                  <span
                                    key={perm}
                                    className="font-mono text-[10px] px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs"
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

                        {/* Card Footer Actions */}
                        <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => handleDuplicateRole(role)}
                            title="Clone this role"
                            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-semibold px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Clone
                          </button>

                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleOpenEditRole(role)}
                              className="h-8 text-xs font-semibold gap-1.5 px-3"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Configure
                            </Button>

                            {!isSystemRole && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDeleteTarget({ type: 'role', id: role.id, name: role.name })}
                                className="h-8 text-xs font-semibold gap-1 px-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/50"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            )}

            {/* --- SUB-VIEW 2: RBAC MATRIX GRID (COMPARISON TABLE) --- */}
            {rolesSubView === 'matrix' && (
              <Card className="!p-0 overflow-hidden shadow-sm">
                <div className="overflow-x-auto max-h-[750px] relative">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800/95 backdrop-blur border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="sticky left-0 z-30 bg-slate-100 dark:bg-slate-800 px-6 py-4 font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider w-[36%] min-w-[280px]">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Permission Scope & Category
                          </div>
                        </th>
                        {roles.map((r) => {
                          const theme = getRoleTheme(r.name);
                          return (
                            <th
                              key={r.id}
                              className="px-4 py-4 font-bold text-center text-xs uppercase tracking-wider min-w-[130px]"
                            >
                              <div className="flex flex-col items-center gap-1">
                                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${theme.badge}`}>
                                  {r.name}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                                  {r.permissions?.length || 0} scopes
                                </span>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {PERMISSION_GROUPS.map((group) => {
                        const matchingPerms = group.permissions.filter((p) => {
                          const q = roleSearch.toLowerCase();
                          if (!q) return true;
                          return p.key.toLowerCase().includes(q) || p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q);
                        });

                        if (matchingPerms.length === 0) return null;

                        return (
                          <React.Fragment key={group.category}>
                            {/* Category Section Header Row */}
                            <tr className="bg-slate-50/90 dark:bg-slate-800/50">
                              <td
                                colSpan={roles.length + 1}
                                className="px-6 py-2.5 font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={group.icon} />
                                    </svg>
                                    <span>{group.category}</span>
                                    <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                                      ({matchingPerms.length} permissions)
                                    </span>
                                  </div>
                                  <span className="text-[11px] font-normal text-slate-400 italic hidden sm:inline">
                                    {group.description}
                                  </span>
                                </div>
                              </td>
                            </tr>

                            {/* Permission Rows */}
                            {matchingPerms.map((perm) => (
                              <tr
                                key={perm.key}
                                className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                              >
                                <td className="sticky left-0 bg-white dark:bg-slate-900 px-6 py-3.5 z-10 border-r border-slate-100 dark:border-slate-800">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <span>{perm.label}</span>
                                        {getSensitivityBadge(perm.level)}
                                      </div>
                                      <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                        {perm.key}
                                      </div>
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        {perm.desc}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                {roles.map((r) => {
                                  const hasPerm = r.permissions?.includes(perm.key);
                                  return (
                                    <td key={r.id} className="px-4 py-3.5 text-center align-middle">
                                      {hasPerm ? (
                                        <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                          </svg>
                                        </div>
                                      ) : (
                                        <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600">
                                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                                          </svg>
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* --- SUB-VIEW 3: PERMISSION CATALOG & EXPLORER --- */}
            {rolesSubView === 'catalog' && (
              <div className="space-y-4">
                {PERMISSION_GROUPS.map((group) => {
                  const filteredGroupPerms = group.permissions.filter((p) => {
                    const q = roleSearch.toLowerCase();
                    if (!q) return true;
                    return p.key.toLowerCase().includes(q) || p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q);
                  });

                  if (filteredGroupPerms.length === 0) return null;

                  return (
                    <Card key={group.category} className="p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={group.icon} />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                              {group.category}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {group.description}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {filteredGroupPerms.length} Scopes
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredGroupPerms.map((perm) => {
                          const entitledRoles = roles.filter((r) => r.permissions?.includes(perm.key));

                          return (
                            <div
                              key={perm.key}
                              className="p-3.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                      {perm.label}
                                    </h4>
                                    <div className="font-mono text-[10px] text-brand-600 dark:text-brand-400 font-semibold mt-0.5">
                                      {perm.key}
                                    </div>
                                  </div>
                                  {getSensitivityBadge(perm.level)}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                                  {perm.desc}
                                </p>
                              </div>

                              <div className="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-700/50">
                                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                  </svg>
                                  Entitled Roles ({entitledRoles.length})
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {entitledRoles.length > 0 ? (
                                    entitledRoles.map((r) => {
                                      const theme = getRoleTheme(r.name);
                                      return (
                                        <span
                                          key={r.id}
                                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${theme.badge}`}
                                        >
                                          {r.name}
                                        </span>
                                      );
                                    })
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">No roles currently have this permission</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* --- USER CREATE / EDIT MODAL --- */}
        {/* ========================================================================= */}
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
                    <option value="INACTIVE">Inactive / Suspended</option>
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
        )}

        {/* ========================================================================= */}
        {/* --- ROLE CREATE / EDIT MODAL (ENHANCED WITH PRESETS & SEARCH) --- */}
        {/* ========================================================================= */}
        {mounted && isRoleModalOpen && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
            <div
              className="fixed inset-0"
              onClick={() => !isSubmittingRole && setIsRoleModalOpen(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full p-6 shadow-2xl my-auto max-h-[calc(100vh-3rem)] overflow-y-auto z-10 animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-500/20">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {editingRole ? `Configure Role: ${editingRole.name}` : 'Create RBAC Custom Role'}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      placeholder="e.g. COMPLIANCE_LEAD"
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
                    <Input
                      id="role-desc"
                      value={roleFormData.description}
                      onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                      placeholder="Brief summary of duties..."
                    />
                  </div>
                </div>

                {/* Quick Presets & Live Coverage Bar */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Quick Presets:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => applyRolePreset('ALL')}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                        >
                          ⚡ All Permissions
                        </button>
                        <button
                          type="button"
                          onClick={() => applyRolePreset('READ_ONLY')}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                        >
                          👁️ Read Only
                        </button>
                        <button
                          type="button"
                          onClick={() => applyRolePreset('MINI_APP')}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                        >
                          📱 Mini App Focus
                        </button>
                        <button
                          type="button"
                          onClick={() => applyRolePreset('CLEAR')}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-600 hover:bg-rose-50 transition-colors"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400 shrink-0">
                      {roleFormData.permissions.length} / {TOTAL_PERMISSIONS_COUNT} Selected ({Math.round((roleFormData.permissions.length / TOTAL_PERMISSIONS_COUNT) * 100)}%)
                    </span>
                  </div>

                  {/* Filter inside modal */}
                  <div className="relative">
                    <svg className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <Input
                      placeholder="Filter permissions in this dialog..."
                      value={roleModalSearch}
                      onChange={(e) => setRoleModalSearch(e.target.value)}
                      className="pl-8 h-8 text-xs bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                {/* Categorized Permission Checkboxes */}
                <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
                  {PERMISSION_GROUPS.map((group) => {
                    const groupKeys = group.permissions.map((p) => p.key);
                    const matchingGroupPerms = group.permissions.filter((p) => {
                      const q = roleModalSearch.toLowerCase();
                      if (!q) return true;
                      return p.key.toLowerCase().includes(q) || p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q);
                    });

                    if (matchingGroupPerms.length === 0) return null;

                    const allInGroup = groupKeys.every((k) => roleFormData.permissions.includes(k));

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
                            {allInGroup ? 'Deselect Category' : 'Select Category'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {matchingGroupPerms.map((perm) => {
                            const isSelected = roleFormData.permissions.includes(perm.key);
                            return (
                              <label
                                key={perm.key}
                                className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors border ${
                                  isSelected
                                    ? 'bg-brand-50/80 dark:bg-brand-500/20 border-brand-300 dark:border-brand-500/40 shadow-2xs'
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 border-transparent'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => togglePermission(perm.key)}
                                  className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 w-4 h-4 shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight flex items-center gap-1.5 flex-wrap">
                                    <span>{perm.label}</span>
                                    {getSensitivityBadge(perm.level)}
                                  </div>
                                  <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                    {perm.key}
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                                    {perm.desc}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Modal Actions */}
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
                        Saving Role...
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

        {/* ========================================================================= */}
        {/* --- DELETE CONFIRMATION DIALOG --- */}
        {/* ========================================================================= */}
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
                Delete {deleteTarget.type === 'user' ? 'User Account' : 'Custom Role'}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Are you sure you want to remove <strong className="text-slate-800 dark:text-slate-200">{deleteTarget.name}</strong>? This action is permanent and will revoke access immediately.
              </p>

              <div className="flex justify-center gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                  className="gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleExecuteDelete}
                  disabled={isDeleting}
                  className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                >
                  {isDeleting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Confirm Delete
                    </>
                  )}
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
