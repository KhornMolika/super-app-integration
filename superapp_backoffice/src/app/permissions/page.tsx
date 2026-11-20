'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import {
  Shield,
  Search,
  RefreshCw,
  Lock,
  Layers,
  ArrowLeft,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  Check,
  Minus,
  Pencil,
  AlertTriangle,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { rolesApi, Role } from '@/api';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/card';
import { Input, Button } from '@/components/ui/inputs';
import { CleanDropdown, CleanDropdownOption } from '@/components/ui/CleanDropdown';
import {
  PERMISSION_GROUPS,
  TOTAL_PERMISSIONS_COUNT,
  ALL_FLAT_PERMISSIONS,
  getRoleTheme,
  getSensitivityBadge,
  isSystemRole,
} from '@/components/users/types';

function PermissionsPageContent() {
  const { toast } = useToast();
  const { can } = useAuth();
  const canManageRoles = can('role:manage');

  // State
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sensitivityFilter, setSensitivityFilter] = useState('ALL');
  const [selectedRoleId, setSelectedRoleId] = useState('ALL');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

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

  // Category dropdown options
  const categoryDropdownOptions: CleanDropdownOption[] = useMemo(() => {
    const opts: CleanDropdownOption[] = [
      {
        value: 'ALL',
        label: 'All Categories',
        count: TOTAL_PERMISSIONS_COUNT,
      },
    ];
    PERMISSION_GROUPS.forEach((g) => {
      opts.push({
        value: g.category,
        label: g.category,
        count: g.permissions.length,
      });
    });
    return opts;
  }, []);

  // Sensitivity dropdown options
  const sensitivityDropdownOptions: CleanDropdownOption[] = useMemo(() => {
    const counts = {
      CRITICAL: 0,
      ELEVATED: 0,
      STANDARD: 0,
      SYSTEM: 0,
    };
    ALL_FLAT_PERMISSIONS.forEach((p) => {
      if (p.level in counts) {
        counts[p.level as keyof typeof counts]++;
      }
    });

    return [
      { value: 'ALL', label: 'All Levels', count: TOTAL_PERMISSIONS_COUNT },
      { value: 'CRITICAL', label: 'Critical', count: counts.CRITICAL, dotColor: 'bg-rose-500' },
      { value: 'ELEVATED', label: 'Elevated', count: counts.ELEVATED, dotColor: 'bg-amber-500' },
      { value: 'SYSTEM', label: 'System', count: counts.SYSTEM, dotColor: 'bg-violet-500' },
      { value: 'STANDARD', label: 'Standard', count: counts.STANDARD, dotColor: 'bg-slate-400' },
    ];
  }, []);

  // Role focus dropdown options
  const roleDropdownOptions: CleanDropdownOption[] = useMemo(() => {
    const opts: CleanDropdownOption[] = [
      {
        value: 'ALL',
        label: 'All Roles (Matrix)',
        count: roles.length,
      },
    ];
    roles.forEach((r) => {
      opts.push({
        value: r.id,
        label: r.name,
        count: r.permissions?.length || 0,
      });
    });
    return opts;
  }, [roles]);

  // Roles to display in matrix columns
  const displayedRoles = useMemo(() => {
    if (selectedRoleId === 'ALL') return roles;
    return roles.filter((r) => r.id === selectedRoleId);
  }, [roles, selectedRoleId]);

  // Category accordion toggles
  const toggleCategoryCollapse = (category: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const allCategoriesCollapsed = useMemo(() => {
    return PERMISSION_GROUPS.length > 0 &&
      PERMISSION_GROUPS.every((g) => !!collapsedCategories[g.category]);
  }, [collapsedCategories]);

  const toggleAllCategories = () => {
    if (allCategoriesCollapsed) {
      setCollapsedCategories({});
    } else {
      const all: Record<string, boolean> = {};
      PERMISSION_GROUPS.forEach((g) => {
        all[g.category] = true;
      });
      setCollapsedCategories(all);
    }
  };

  const isFiltered =
    searchQuery.trim() !== '' ||
    categoryFilter !== 'ALL' ||
    sensitivityFilter !== 'ALL' ||
    selectedRoleId !== 'ALL';

  const resetAllFilters = () => {
    setSearchQuery('');
    setCategoryFilter('ALL');
    setSensitivityFilter('ALL');
    setSelectedRoleId('ALL');
  };

  // Key metrics
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
              Permissions Matrix
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <SlidersHorizontal className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Permissions & RBAC Matrix</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Side-by-side access comparison across all {TOTAL_PERMISSIONS_COUNT} security scopes.
            Inspect granted capabilities or navigate to edit roles.
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
          <span className="text-[11px] text-slate-400">Across 4 categories</span>
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
          <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
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
          <span className="text-[11px] text-violet-600 dark:text-violet-400 font-medium">
            RBAC & core settings
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
          <span className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">
            Active in access matrix
          </span>
        </div>
      </div>

      {/* Control & Filter Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              placeholder="Search scope, key, or action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs w-full"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <CleanDropdown
            label="Category"
            value={categoryFilter}
            options={categoryDropdownOptions}
            onChange={setCategoryFilter}
            dropdownWidth="w-64"
          />

          {/* Sensitivity Dropdown */}
          <CleanDropdown
            label="Sensitivity"
            value={sensitivityFilter}
            options={sensitivityDropdownOptions}
            onChange={setSensitivityFilter}
            dropdownWidth="w-52"
          />

          {/* Role Comparison Focus */}
          <CleanDropdown
            label="Role View"
            value={selectedRoleId}
            options={roleDropdownOptions}
            onChange={setSelectedRoleId}
            dropdownWidth="w-56"
          />

          {/* Reset Filters */}
          {isFiltered && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline px-2 py-1 cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Right Toolbar: Collapse / Expand All */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={toggleAllCategories}
            className="h-9 px-3 text-xs font-semibold gap-1.5 shrink-0"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                allCategoriesCollapsed ? 'rotate-180' : ''
              }`}
            />
            <span>{allCategoriesCollapsed ? 'Expand All' : 'Collapse All'}</span>
          </Button>
        </div>
      </div>

      {/* Permissions Matrix Table */}
      <Card className="!p-0 overflow-hidden shadow-sm border border-slate-200/80 dark:border-slate-700/60">
        {loading ? (
          <div className="py-20 text-center text-slate-500">
            <div className="flex flex-col items-center justify-center gap-3">
              <RefreshCw className="animate-spin h-7 w-7 text-brand-500" />
              <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                Loading access control matrix...
              </span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto relative">
            <table className="w-full text-left border-collapse">
              {/* Sticky Table Header */}
              <thead className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {/* Left Column: Permission Scope Specs */}
                  <th className="sticky left-0 z-30 bg-slate-100 dark:bg-slate-800 px-6 py-4 font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider w-[40%] min-w-[340px]">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-brand-500" />
                      <span>Permission Scope & Definition</span>
                    </div>
                  </th>

                  {/* Right Columns: Role Headers */}
                  {displayedRoles.map((r) => {
                    const theme = getRoleTheme(r.name);
                    const isFocused = selectedRoleId === r.id;
                    const permCount = r.permissions?.length || 0;
                    const isSys = isSystemRole(r.name);

                    return (
                      <th
                        key={r.id}
                        className={`px-4 py-3.5 text-center transition-colors min-w-[130px] ${
                          isFocused ? 'bg-brand-50/50 dark:bg-brand-950/20' : ''
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1.5">
                          <span
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${theme.badge}`}
                          >
                            {r.name}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {permCount} / {TOTAL_PERMISSIONS_COUNT} scopes
                          </span>
                          {canManageRoles && (
                            <Link
                              href={`/roles/${r.id}/edit`}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                              title={`Edit ${r.name}`}
                            >
                              <Pencil className="w-3 h-3" />
                              <span>{isSys ? 'View/Edit' : 'Edit'}</span>
                            </Link>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {PERMISSION_GROUPS.map((group) => {
                  if (categoryFilter !== 'ALL' && group.category !== categoryFilter) {
                    return null;
                  }

                  const matchingPerms = group.permissions.filter((p) => {
                    if (sensitivityFilter !== 'ALL' && p.level !== sensitivityFilter) {
                      return false;
                    }

                    const q = searchQuery.toLowerCase().trim();
                    if (!q) return true;

                    return (
                      p.key.toLowerCase().includes(q) ||
                      p.label.toLowerCase().includes(q) ||
                      p.desc.toLowerCase().includes(q)
                    );
                  });

                  if (matchingPerms.length === 0) return null;

                  const isCollapsed = !!collapsedCategories[group.category];

                  return (
                    <React.Fragment key={group.category}>
                      {/* Collapsible Category Accordion Header */}
                      <tr
                        onClick={() => toggleCategoryCollapse(group.category)}
                        className="bg-slate-50/90 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800/90 transition-colors cursor-pointer select-none"
                      >
                        <td
                          colSpan={displayedRoles.length + 1}
                          className="px-6 py-3 font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <ChevronDown
                                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                                  isCollapsed ? '-rotate-90' : 'rotate-0'
                                }`}
                              />

                              <div className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400">
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

                              <span className="text-slate-900 dark:text-white font-bold">
                                {group.category}
                              </span>
                              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                                ({matchingPerms.length} scopes)
                              </span>
                            </div>

                            <span className="text-[11px] font-normal text-slate-400 italic hidden md:inline">
                              {group.description}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Permission Rows */}
                      {!isCollapsed &&
                        matchingPerms.map((perm) => (
                          <tr
                            key={perm.key}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                          >
                            {/* Left Cell: Scope Definition */}
                            <td className="sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50/70 dark:group-hover:bg-slate-800/40 px-6 py-3.5 z-10 border-r border-slate-100 dark:border-slate-800">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                                    {perm.label}
                                  </span>
                                  {getSensitivityBadge(perm.level)}
                                  <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60">
                                    {perm.key}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                  {perm.desc}
                                </p>
                              </div>
                            </td>

                            {/* Right Cells: Role Status Checkmarks */}
                            {displayedRoles.map((r) => {
                              const hasPerm = r.permissions?.includes(perm.key);
                              const isFocused = selectedRoleId === r.id;

                              return (
                                <td
                                  key={r.id}
                                  className={`px-4 py-3 text-center align-middle transition-colors ${
                                    isFocused ? 'bg-brand-50/20 dark:bg-brand-950/10' : ''
                                  }`}
                                >
                                  {hasPerm ? (
                                    <div
                                      title={`${r.name} has granted access to ${perm.label}`}
                                      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs"
                                    >
                                      <Check className="w-4 h-4" strokeWidth={2.5} />
                                    </div>
                                  ) : (
                                    <div
                                      title={`${r.name} does NOT have access to ${perm.label}`}
                                      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600"
                                    >
                                      <Minus className="w-3.5 h-3.5" strokeWidth={2} />
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
        )}
      </Card>
    </div>
  );
}

export default function PermissionsPage() {
  return (
    <ProtectedRoute requiredPermission="role:read">
      <Suspense
        fallback={
          <div className="py-20 text-center text-slate-500">
            <div className="flex flex-col items-center justify-center gap-3">
              <RefreshCw className="animate-spin h-7 w-7 text-brand-500" />
              <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                Loading permissions...
              </span>
            </div>
          </div>
        }
      >
        <PermissionsPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
