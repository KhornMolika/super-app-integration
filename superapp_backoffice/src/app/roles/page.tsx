'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Plus,
  Search,
  RefreshCw,
  Copy,
  Pencil,
  Trash2,
  Lock,
  Layers,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { rolesApi, Role } from '@/api';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmationProvider';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { CleanDropdown } from '@/components/ui/CleanDropdown';
import {
  TOTAL_PERMISSIONS_COUNT,
  getRoleTheme,
  isSystemRole,
} from '@/components/users/types';

function RolesPageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { can } = useAuth();
  const canManageRoles = can('role:manage');

  // State
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SYSTEM' | 'CUSTOM'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

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

  const handleDeleteRole = async (role: Role) => {
    if (isSystemRole(role.name)) {
      toast.error('System roles cannot be deleted');
      return;
    }

    const confirmed = await confirm({
      title: 'Delete Role',
      message: `Are you sure you want to permanently delete role "${role.name}"? Users assigned to this role will lose their granted privileges.`,
      confirmText: 'Delete Role',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });

    if (!confirmed) return;

    try {
      await rolesApi.delete(role.id);
      toast.success(`Role "${role.name}" deleted successfully`);
      fetchRoles();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete role');
    }
  };

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      const isSystem = isSystemRole(role.name);
      if (typeFilter === 'SYSTEM' && !isSystem) return false;
      if (typeFilter === 'CUSTOM' && isSystem) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        role.name.toLowerCase().includes(q) ||
        (role.description && role.description.toLowerCase().includes(q))
      );
    });
  }, [roles, searchQuery, typeFilter]);

  const systemRolesCount = useMemo(
    () => roles.filter((r) => isSystemRole(r.name)).length,
    [roles],
  );
  const customRolesCount = Math.max(0, roles.length - systemRolesCount);

  return (
    <div className="w-full min-w-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      {/* Top Header */}
      <PageHeader
        title="Roles Directory"
        description="Define administrative authorization tiers, assign security boundaries, and govern custom roles"
        actions={
          <>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Refresh Roles"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <Link
              href="/permissions"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>Permissions Matrix</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            {canManageRoles && (
              <Link
                href="/roles/create"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Custom Role</span>
              </Link>
            )}
          </>
        }
      />

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Roles</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {roles.length}
          </div>
          <span className="text-xs text-slate-400">Configured in ecosystem</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">System Roles</span>
            <Lock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {systemRolesCount}
          </div>
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Protected core tiers</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Custom Roles</span>
            <Shield className="w-4 h-4 text-brand-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {customRolesCount}
          </div>
          <span className="text-xs text-brand-600 dark:text-brand-400 font-medium">Organization customized</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Available Scopes</span>
            <SlidersHorizontal className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {TOTAL_PERMISSIONS_COUNT}
          </div>
          <span className="text-xs text-slate-400">Across 4 governance categories</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search roles by identifier or description..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <CleanDropdown
            label="Type"
            value={typeFilter}
            onChange={(val) => {
              setTypeFilter(val as any);
              setCurrentPage(1);
            }}
            options={[
              { value: 'ALL', label: 'All Role Types' },
              { value: 'SYSTEM', label: 'System Roles Only' },
              { value: 'CUSTOM', label: 'Custom Roles Only' },
            ]}
            dropdownWidth="w-52"
            align="right"
          />
        </div>
      </div>

      {/* Roles Directory Table */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
            <span className="text-xs text-slate-500">Loading roles directory...</span>
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Shield className="w-10 h-10 mx-auto text-slate-400" />
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No roles match your search filters
            </div>
            {canManageRoles && (
              <Link
                href="/roles/create"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Role</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-xs">
                  <th className="py-3 px-4">Role Identifier</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Role Type</th>
                  <th className="py-3 px-4">Scopes Coverage</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredRoles
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((role) => {
                  const isSystem = isSystemRole(role.name);
                  const theme = getRoleTheme(role.name);
                  const permCount = role.permissions?.length || 0;
                  const coveragePercent = Math.round((permCount / TOTAL_PERMISSIONS_COUNT) * 100);

                  return (
                    <tr
                      key={role.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      {/* Name & Theme Icon */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${theme.iconBg} shadow-2xs font-bold text-xs`}
                          >
                            <Shield className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block font-mono text-xs">
                              {role.name}
                            </span>
                            <span className="text-xs text-slate-400">
                              {theme.label}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                        {role.description || (
                          <span className="text-slate-400 italic">No description provided</span>
                        )}
                      </td>

                      {/* Type: System vs Custom */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isSystem ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                            <Lock className="w-3 h-3" />
                            <span>System</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400 border border-brand-200 dark:border-brand-900/50">
                            <Shield className="w-3 h-3" />
                            <span>Custom</span>
                          </span>
                        )}
                      </td>

                      {/* Permissions Coverage */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {permCount} / {TOTAL_PERMISSIONS_COUNT}
                          </span>
                          <span className="text-xs px-1.5 py-0.2 rounded font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {coveragePercent}%
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            role.isActive !== false
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              role.isActive !== false ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          <span>{role.isActive !== false ? 'Active' : 'Inactive'}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Clone */}
                          <Link
                            href={`/roles/create?cloneFrom=${role.id}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            title={`Clone role ${role.name}`}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Link>

                          {/* Edit */}
                          <Link
                            href={`/roles/${role.id}/edit`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors cursor-pointer"
                            title={`Edit role ${role.name}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>

                          {/* Delete (custom roles only) */}
                          {!isSystem && canManageRoles && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRole(role)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                              title={`Delete role ${role.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filteredRoles.length >= 5 && (
          <div className="px-4 py-3 border-t border-slate-200/80 dark:border-slate-700/60">
            <Pagination
              currentPage={currentPage}
              totalItems={filteredRoles.length}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              showPageSizeSelector
              showTotal
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function RolesPage() {
  return (
    <ProtectedRoute requiredPermission="role:read">
      <Suspense
        fallback={
          <div className="w-full h-64 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
          </div>
        }
      >
        <RolesPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
