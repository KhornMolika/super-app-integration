'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button, Input } from '@/components/ui/inputs';
import { CleanDropdown, CleanDropdownOption } from '@/components/ui/CleanDropdown';
import { Role } from '@/api';
import {
  PERMISSION_GROUPS,
  TOTAL_PERMISSIONS_COUNT,
  getRoleTheme,
  getSensitivityBadge,
} from './types';

export interface RolesTabProps {
  roles: Role[];
  loadingRoles: boolean;
  canManage: boolean;
  onOpenCreateRole: () => void;
  onOpenEditRole: (role: Role) => void;
  onDuplicateRole: (role: Role) => void;
  onDeleteRole: (role: Role) => void;
}

export function RolesTab({
  roles,
  loadingRoles,
  canManage,
  onOpenCreateRole,
  onOpenEditRole,
  onDuplicateRole,
  onDeleteRole,
}: RolesTabProps) {
  const [rolesSubView, setRolesSubView] = useState<'cards' | 'matrix' | 'catalog'>('cards');
  const [roleSearch, setRoleSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [expandedRoleCards, setExpandedRoleCards] = useState<Record<string, boolean>>({});

  const toggleRoleCardExpand = (roleId: string) => {
    setExpandedRoleCards((prev) => ({ ...prev, [roleId]: !prev[roleId] }));
  };

  const categoryDropdownOptions: CleanDropdownOption[] = useMemo(() => [
    { value: 'ALL', label: 'All Categories' },
    ...PERMISSION_GROUPS.map((g) => ({
      value: g.category,
      label: g.category,
    })),
  ], []);

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

  return (
    <div className="space-y-6">
      {/* Top Toolbar: View Mode Switcher, Search, and Category Filters */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {/* Left: View Mode Pills */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setRolesSubView('cards')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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

        {/* Right: Search, Category Filter, and Add Role Button */}
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

          <CleanDropdown
            label="Group"
            icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            }
            value={categoryFilter}
            options={categoryDropdownOptions}
            onChange={setCategoryFilter}
            align="right"
            dropdownWidth="w-64"
          />

          {canManage && (
            <Button
              type="button"
              onClick={onOpenCreateRole}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Custom Role</span>
            </Button>
          )}
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
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                System Protected
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {role.description || 'Custom defined access tier'}
                          </p>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border shrink-0 ${theme.badge}`}>
                        {theme.label}
                      </span>
                    </div>

                    {/* Progress Bar & Stat */}
                    <div className="space-y-1.5 my-4 p-3 rounded-xl bg-white/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-600 dark:text-slate-300">Permission Coverage</span>
                        <span className="text-slate-900 dark:text-white font-mono">
                          {permCount} / {TOTAL_PERMISSIONS_COUNT} ({coveragePercent}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${theme.bar} transition-all duration-300`}
                          style={{ width: `${coveragePercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Permissions Badges (Foldable) */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        <span>Assigned Permissions</span>
                        {permCount > 6 && (
                          <button
                            type="button"
                            onClick={() => toggleRoleCardExpand(role.id)}
                            className="text-brand-600 dark:text-brand-400 hover:underline capitalize font-semibold cursor-pointer text-xs"
                          >
                            {isExpanded ? 'Show Less' : `+${permCount - 6} more`}
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {permCount === 0 ? (
                          <span className="text-xs text-slate-400 italic">No permissions granted</span>
                        ) : (
                          (isExpanded ? role.permissions : role.permissions.slice(0, 6))?.map((p) => (
                            <span
                              key={p}
                              className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 truncate max-w-[200px]"
                              title={p}
                            >
                              {p}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => onDuplicateRole(role)}
                      className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-semibold px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                        onClick={() => onOpenEditRole(role)}
                        className="h-8 text-xs font-semibold gap-1.5 px-3"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Configure
                      </Button>

                      {!isSystemRole && canManage && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => onDeleteRole(role)}
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
  );
}
