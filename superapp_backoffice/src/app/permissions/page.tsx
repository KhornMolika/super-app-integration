'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RefreshCw,
  Lock,
  Layers,
  ArrowLeft,
  Plus,
  SlidersHorizontal,
  AlertTriangle,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { rolesApi, Role } from '@/api';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmationProvider';
import { RolesTab } from '@/components/users/RolesTab';
import {
  TOTAL_PERMISSIONS_COUNT,
  ALL_FLAT_PERMISSIONS,
} from '@/components/users/types';

function PermissionsPageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { can } = useAuth();
  const canManageRoles = can('role:manage');

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRoles = useCallback(async () => {
    try {
      const data = await rolesApi.getAll();
      setRoles(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err?.status !== 403 && err?.statusCode !== 403) {
        console.error('Failed to fetch roles', err);
        toast.error('Failed to load roles list');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRoles();
  };

  const handleDuplicateRole = async (role: Role) => {
    if (!canManageRoles) return;
    try {
      await rolesApi.create({
        name: `${role.name}_COPY`,
        description: role.description
          ? `${role.description} (Copy)`
          : `Cloned from ${role.name}`,
        permissions: [...(role.permissions || [])],
      });
      toast.success(`Role "${role.name}_COPY" created!`);
      fetchRoles();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to clone role');
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (!canManageRoles) return;
    const ok = await confirm({
      title: 'Delete Role',
      message: (
        <span>
          Are you sure you want to delete role{' '}
          <strong className="text-slate-800 dark:text-slate-200">{role.name}</strong>?
        </span>
      ),
      confirmText: 'Delete Role',
      confirmVariant: 'danger',
    });
    if (!ok) return;

    try {
      await rolesApi.delete(role.id);
      toast.success(`Role "${role.name}" deleted.`);
      fetchRoles();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete role');
    }
  };

  const criticalCount = useMemo(
    () => ALL_FLAT_PERMISSIONS.filter((p) => p.level === 'CRITICAL').length,
    [],
  );
  const systemCount = useMemo(
    () => ALL_FLAT_PERMISSIONS.filter((p) => p.level === 'SYSTEM').length,
    [],
  );

  return (
    <div className="w-full min-w-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      {/* Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            <Link
              href="/roles"
              className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              Access Control
            </Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">
              Permissions &amp; RBAC
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <SlidersHorizontal className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Roles &amp; Permissions</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Inspect granted security scopes by role or switch to Matrix View for side-by-side comparison.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            title="Refresh Permissions"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/roles"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400" />
            <span>Manage Roles</span>
          </Link>

          {canManageRoles && (
            <Link
              href="/roles/create"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Role</span>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Shelf */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Scopes
            </span>
            <SlidersHorizontal className="w-4 h-4 text-brand-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {TOTAL_PERMISSIONS_COUNT}
          </div>
          <span className="text-xs text-slate-400">Across 4 categories</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Critical Actions
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {criticalCount}
          </div>
          <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
            High-impact privileges
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              System Scopes
            </span>
            <Lock className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {systemCount}
          </div>
          <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">
            RBAC &amp; core settings
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Configured Roles
            </span>
            <Layers className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {roles.length}
          </div>
          <span className="text-xs text-sky-600 dark:text-sky-400 font-medium">
            Active in access matrix
          </span>
        </div>
      </div>

      {/* Unified Scalable 2-Pane Role Inspector & Matrix View */}
      <RolesTab
        roles={roles}
        loadingRoles={loading}
        canManage={canManageRoles}
        onOpenCreateRole={() => router.push('/roles/create')}
        onOpenEditRole={(role) => router.push(`/roles/${role.id}/edit`)}
        onDuplicateRole={handleDuplicateRole}
        onDeleteRole={handleDeleteRole}
      />
    </div>
  );
}

export default function PermissionsPage() {
  return (
    <ProtectedRoute requiredPermission="role:read">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[50vh]">
            <span className="text-sm text-slate-400 animate-pulse">
              Loading permissions matrix...
            </span>
          </div>
        }
      >
        <PermissionsPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
