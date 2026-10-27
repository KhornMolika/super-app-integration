'use client';

import React, { useState, useMemo } from 'react';
import { User, Role } from '@/api';
import { ShieldCheckIcon } from '@/components/ui/Icons';
import {
  PERMISSION_GROUPS,
  TOTAL_PERMISSIONS_COUNT,
  getRoleTheme,
  getUserRoles,
  getSensitivityBadge,
} from '../types';

export interface UserPermissionsTabProps {
  user: User;
  roles?: Role[];
}

export function UserPermissionsTab({ user, roles = [] }: UserPermissionsTabProps) {
  const [filterMode, setFilterMode] = useState<'ALL' | 'GRANTED' | 'DENIED'>('ALL');
  const [permissionSearch, setPermissionSearch] = useState('');

  const userRoles = getUserRoles(user);
  const primaryRole = userRoles[0]?.name || user.role?.name || 'USER';
  const roleTheme = getRoleTheme(primaryRole);

  // Match role from real database roles
  const matchedRole = useMemo(() => {
    return (
      roles.find(
        (r) =>
          r.id === user.roleId ||
          r.id === user.role?.id ||
          r.name.toUpperCase() === primaryRole.toUpperCase()
      ) || user.role
    );
  }, [roles, user, primaryRole]);

  const isSuperAdmin =
    primaryRole.toUpperCase() === 'SUPER_ADMIN' ||
    primaryRole.toUpperCase() === 'SUPERADMIN' ||
    userRoles.some((r) => r.name?.toUpperCase() === 'SUPER_ADMIN') ||
    user.email?.toLowerCase().includes('superadmin');

  // Real granted permissions set resolved directly from Database Role & User record
  const grantedPermissionKeys = useMemo(() => {
    if (isSuperAdmin) return new Set<string>(['*']);

    const set = new Set<string>();

    // 1. Direct user permissions
    if (Array.isArray(user.permissions)) {
      user.permissions.forEach((p) => set.add(p));
    }

    // 2. Real database role permissions
    if (matchedRole && Array.isArray((matchedRole as any).permissions)) {
      (matchedRole as any).permissions.forEach((p: any) => {
        if (typeof p === 'string') set.add(p);
        else if (p?.name) set.add(p.name);
      });
    }

    // 3. Fallback baseline if role permissions array is empty in seed
    if (set.size === 0) {
      if (primaryRole === 'ADMIN') {
        [
          'miniapp:read',
          'miniapp:create',
          'miniapp:update',
          'miniapp:submit',
          'miniapp:approve',
          'miniapp:reject',
          'permission:read',
          'permission_proposal:read',
          'permission_proposal:review',
          'permission_proposal:approve',
          'super_app:read',
          'organization:read',
          'organization:manage',
          'user:read',
          'role:read',
          'audit_log:read',
        ].forEach((k) => set.add(k));
      } else if (primaryRole === 'MA_DEVELOPER' || primaryRole === 'DEVELOPER') {
        [
          'miniapp:create',
          'miniapp:read',
          'miniapp:update',
          'miniapp:submit',
          'permission:read',
          'permission_proposal:read',
          'super_app:read',
        ].forEach((k) => set.add(k));
      }
    }

    return set;
  }, [user, isSuperAdmin, matchedRole, primaryRole]);

  const hasPermission = (key: string) => {
    if (isSuperAdmin) return true;
    return grantedPermissionKeys.has('*') || grantedPermissionKeys.has(key);
  };

  // Calculate granted total
  const allPermissionsFlat = useMemo(() => {
    return PERMISSION_GROUPS.flatMap((g) => g.permissions);
  }, []);

  const totalGrantedCount = useMemo(() => {
    if (isSuperAdmin) return TOTAL_PERMISSIONS_COUNT;
    return allPermissionsFlat.filter((p) => hasPermission(p.key)).length;
  }, [isSuperAdmin, allPermissionsFlat, grantedPermissionKeys]);

  // Filter groups according to filterMode and search
  const filteredGroups = useMemo(() => {
    const q = permissionSearch.trim().toLowerCase();

    return PERMISSION_GROUPS.map((group) => {
      const filteredPermissions = group.permissions.filter((p) => {
        const isGranted = hasPermission(p.key);
        if (filterMode === 'GRANTED' && !isGranted) return false;
        if (filterMode === 'DENIED' && isGranted) return false;

        if (q) {
          const matchesKey = p.key.toLowerCase().includes(q);
          const matchesLabel = p.label.toLowerCase().includes(q);
          const matchesDesc = p.desc.toLowerCase().includes(q);
          return matchesKey || matchesLabel || matchesDesc;
        }
        return true;
      });

      return {
        ...group,
        filteredPermissions,
      };
    }).filter((g) => g.filteredPermissions.length > 0);
  }, [filterMode, permissionSearch, isSuperAdmin, grantedPermissionKeys]);

  return (
    <div className="space-y-6">
      {/* Real Role Assignment Banner Card */}
      <div
        className={`p-5 sm:p-6 rounded-2xl bg-gradient-to-r ${roleTheme.gradient} border shadow-sm transition-all`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm ${roleTheme.iconBg}`}
            >
              <ShieldCheckIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {roleTheme.label}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${roleTheme.badge}`}>
                  Database Assignment
                </span>
                {matchedRole?.id && (
                  <span className="font-mono text-[11px] text-slate-400">
                    ID: #{matchedRole.id.slice(0, 8)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                {(matchedRole as any)?.description ||
                  (isSuperAdmin
                    ? 'Super Administrator holds full, unrestricted platform governance privileges across all tenant scopes, system configs, and release pipelines.'
                    : `Account inherits security capabilities and scope defined under the ${roleTheme.label} role.`)}
              </p>
            </div>
          </div>

          <div className="shrink-0 text-left sm:text-right">
            <span className="text-xs text-slate-400 block font-medium">Authorization Scope</span>
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
              {isSuperAdmin
                ? 'Full Root Access (All Capabilities)'
                : `${totalGrantedCount} of ${TOTAL_PERMISSIONS_COUNT} Capabilities`}
            </span>
          </div>
        </div>
      </div>

      {/* Permissions Header & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Effective Permission Matrix
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Live authorization status resolved from assigned RBAC roles and organizational tenancy.
          </p>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Filter Buttons */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-medium border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setFilterMode('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                filterMode === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              All ({TOTAL_PERMISSIONS_COUNT})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('GRANTED')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                filterMode === 'GRANTED'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Granted ({totalGrantedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('DENIED')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                filterMode === 'DENIED'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Denied ({TOTAL_PERMISSIONS_COUNT - totalGrantedCount})
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-48">
            <input
              type="text"
              value={permissionSearch}
              onChange={(e) => setPermissionSearch(e.target.value)}
              placeholder="Search capability..."
              className="w-full pl-3 pr-7 py-1 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 dark:text-slate-200 transition-all placeholder:text-slate-400"
            />
            {permissionSearch && (
              <button
                type="button"
                onClick={() => setPermissionSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Permissions Matrix Grouped by Category */}
      {filteredGroups.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No permissions match your filter criteria.
          </p>
          <button
            type="button"
            onClick={() => {
              setFilterMode('ALL');
              setPermissionSearch('');
            }}
            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline mt-2"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredGroups.map((group) => {
            const grantedCount = group.permissions.filter((p) => hasPermission(p.key)).length;

            return (
              <div
                key={group.category}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden"
              >
                {/* Category Header */}
                <div className="p-4 sm:px-6 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d={group.icon}
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {group.category}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {group.description}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                    {grantedCount} / {group.permissions.length} Granted
                  </span>
                </div>

                {/* Permissions List */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {group.filteredPermissions.map((item) => {
                    const isGranted = hasPermission(item.key);

                    return (
                      <div
                        key={item.key}
                        className="p-3.5 sm:px-6 flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {item.label}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              {item.key}
                            </span>
                            {getSensitivityBadge(item.level)}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {item.desc}
                          </p>
                        </div>

                        {/* Grant Status Indicator */}
                        <div className="shrink-0">
                          {isGranted ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>Granted</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span>Denied</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
