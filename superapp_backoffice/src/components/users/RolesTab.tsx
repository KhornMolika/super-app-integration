'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button, Input } from '@/components/ui/inputs';
import { CleanDropdown, CleanDropdownOption } from '@/components/ui/CleanDropdown';
import { Role } from '@/api';
import {
  PERMISSION_GROUPS,
  TOTAL_PERMISSIONS_COUNT,
  getRoleTheme,
  getSensitivityBadge,
  isSystemRole,
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

type ViewMode = 'inspector' | 'matrix';
type GrantFilter = 'ALL' | 'GRANTED' | 'DENIED';

export function RolesTab({
  roles,
  loadingRoles,
  canManage,
  onOpenCreateRole,
  onOpenEditRole,
  onDuplicateRole,
  onDeleteRole,
}: RolesTabProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const initialSearch = searchParams?.get('q') || '';
  const initialRole = searchParams?.get('role') || '';
  const initialCategory = searchParams?.get('category') || 'ALL';
  const initialSensitivity = searchParams?.get('sensitivity') || 'ALL';
  const initialView: ViewMode =
    searchParams?.get('view') === 'matrix' ? 'matrix' : 'inspector';

  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [selectedRoleId, setSelectedRoleId] = useState<string>(initialRole);
  const [roleListQuery, setRoleListQuery] = useState<string>('');
  const [grantFilter, setGrantFilter] = useState<GrantFilter>('ALL');

  const [searchInput, setSearchInput] = useState<string>(initialSearch);
  const [roleSearch, setRoleSearch] = useState<string>(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategory);
  const [sensitivityFilter, setSensitivityFilter] = useState<string>(initialSensitivity);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Default to the first available role in Inspector view
  useEffect(() => {
    if (roles.length > 0 && (!selectedRoleId || !roles.some((r) => r.id === selectedRoleId))) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  // 250ms debounced search input -> roleSearch
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== roleSearch) {
        setRoleSearch(searchInput);
      }
    }, 250);
    return () => clearTimeout(handler);
  }, [searchInput, roleSearch]);

  // Synchronize state with browser URL search params
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);

    if (viewMode === 'matrix') params.set('view', 'matrix');
    else params.delete('view');

    if (roleSearch.trim()) params.set('q', roleSearch.trim());
    else params.delete('q');

    if (selectedRoleId) params.set('role', selectedRoleId);
    else params.delete('role');

    if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
    else params.delete('category');

    if (sensitivityFilter !== 'ALL') params.set('sensitivity', sensitivityFilter);
    else params.delete('sensitivity');

    const qs = params.toString();
    const target = qs ? `${pathname}?${qs}` : pathname;
    if (window.location.pathname + window.location.search !== target && window.history?.replaceState) {
      window.history.replaceState(null, '', target);
    }
  }, [viewMode, roleSearch, selectedRoleId, categoryFilter, sensitivityFilter, pathname]);

  // Handle popstate on browser Back/Forward
  useEffect(() => {
    const onPop = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q') || '';
      setViewMode(params.get('view') === 'matrix' ? 'matrix' : 'inspector');
      setSearchInput(q);
      setRoleSearch(q);
      setSelectedRoleId(params.get('role') || '');
      setCategoryFilter(params.get('category') || 'ALL');
      setSensitivityFilter(params.get('sensitivity') || 'ALL');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const categoryDropdownOptions: CleanDropdownOption[] = useMemo(
    () => [
      { value: 'ALL', label: 'All Categories' },
      ...PERMISSION_GROUPS.map((g) => ({
        value: g.category,
        label: g.category,
      })),
    ],
    []
  );

  const sensitivityDropdownOptions: CleanDropdownOption[] = useMemo(
    () => [
      { value: 'ALL', label: 'All Levels' },
      { value: 'CRITICAL', label: 'Critical' },
      { value: 'ELEVATED', label: 'Elevated' },
      { value: 'STANDARD', label: 'Standard' },
      { value: 'SYSTEM', label: 'System' },
    ],
    []
  );

  const filteredRolesList = useMemo(() => {
    const q = roleListQuery.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
    );
  }, [roles, roleListQuery]);

  const activeRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) || roles[0] || null;
  }, [roles, selectedRoleId]);

  const activeRolePermSet = useMemo(() => {
    return new Set(activeRole?.permissions || []);
  }, [activeRole]);

  const activeRoleGrantCounts = useMemo(() => {
    const granted = PERMISSION_GROUPS.reduce(
      (acc, g) => acc + g.permissions.filter((p) => activeRolePermSet.has(p.key)).length,
      0
    );
    return {
      total: TOTAL_PERMISSIONS_COUNT,
      granted,
      denied: Math.max(0, TOTAL_PERMISSIONS_COUNT - granted),
    };
  }, [activeRolePermSet]);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const allCategoriesCollapsed = useMemo(() => {
    return PERMISSION_GROUPS.length > 0 && PERMISSION_GROUPS.every((g) => !!collapsedCategories[g.category]);
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
    roleSearch.trim() !== '' ||
    categoryFilter !== 'ALL' ||
    sensitivityFilter !== 'ALL' ||
    (viewMode === 'inspector' && grantFilter !== 'ALL');

  const resetAllFilters = () => {
    setSearchInput('');
    setRoleSearch('');
    setCategoryFilter('ALL');
    setSensitivityFilter('ALL');
    setGrantFilter('ALL');
  };

  if (loadingRoles) {
    return (
      <Card className="py-20 text-center text-slate-500 border border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-col items-center justify-center gap-3">
          <svg className="animate-spin h-7 w-7 text-brand-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">
            Loading roles and permission scopes...
          </span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* ========================================================= */}
      {/* TOP BAR: SUMMARY + VIEW MODE SWITCH + CREATE ROLE         */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Roles &amp; Permission Scopes</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {roles.length} Roles
            </span>
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {viewMode === 'inspector'
              ? 'Select any role on the left to inspect its granted permissions cleanly, or switch to Matrix View to compare side-by-side.'
              : 'Side-by-side permission comparison across all configured RBAC roles.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Segmented View Switcher */}
          <div
            role="tablist"
            aria-label="Roles view mode"
            className="inline-flex items-center rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'inspector'}
              onClick={() => setViewMode('inspector')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'inspector'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Role Inspector
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'matrix'}
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Matrix View
            </button>
          </div>

          {canManage && (
            <Button
              type="button"
              size="sm"
              onClick={onOpenCreateRole}
              className="gap-1.5 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Role</span>
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* VIEW 1: SCALABLE 2-PANE ROLE INSPECTOR (DEFAULT)          */}
      {/* ========================================================= */}
      {viewMode === 'inspector' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Pane (4 of 12): Sticky Searchable Vertical Roles Directory */}
          <div className="lg:col-span-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="relative">
                <svg
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <Input
                  placeholder={`Filter ${roles.length} roles...`}
                  value={roleListQuery}
                  onChange={(e) => setRoleListQuery(e.target.value)}
                  className="pl-9 pr-8 h-9 text-xs w-full"
                />
                {roleListQuery && (
                  <button
                    type="button"
                    onClick={() => setRoleListQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="p-2.5 space-y-1.5 flex-1 overflow-y-auto">
              {filteredRolesList.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No roles matching &ldquo;{roleListQuery}&rdquo;
                </div>
              ) : (
                filteredRolesList.map((role) => {
                  const isSelected = activeRole?.id === role.id;
                  const isSys = isSystemRole(role.name);
                  const theme = getRoleTheme(role.name);
                  const permCount = role.permissions?.length || 0;
                  const pct = Math.min(100, Math.round((permCount / Math.max(1, TOTAL_PERMISSIONS_COUNT)) * 100));

                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRoleId(role.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                        isSelected
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/25 border-emerald-500 shadow-2xs ring-1 ring-emerald-500/20'
                          : 'bg-white dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {theme.label || role.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded font-mono text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/70 shrink-0">
                            {role.name}
                          </span>
                          {isSys && (
                            <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/70 dark:border-amber-900/50 shrink-0 hidden xl:inline-block">
                              System
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                          {permCount} / {TOTAL_PERMISSIONS_COUNT} scopes
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isSelected ? 'bg-emerald-500' : 'bg-emerald-500/60 dark:bg-emerald-500/50'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Pane (8 of 12): Selected Role Scope Inspector */}
          <div className="lg:col-span-8 space-y-4 min-w-0">
            {activeRole ? (
              <>
                {/* Selected Role Summary Card */}
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                          {getRoleTheme(activeRole.name).label || activeRole.name}
                        </h4>
                        <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${getRoleTheme(activeRole.name).badge}`}>
                          {activeRole.name}
                        </span>
                        <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          {activeRoleGrantCounts.granted} / {activeRoleGrantCounts.total} scopes granted
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        {activeRole.description || 'Configure permission scopes and access boundaries for this role.'}
                      </p>
                    </div>

                    {/* Direct Role Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenEditRole(activeRole)}
                        className="gap-1.5 h-8 px-3 text-xs"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        <span>Edit Permissions</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onDuplicateRole(activeRole)}
                        title="Clone role"
                        className="h-8 px-2.5 text-xs"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </Button>

                      {!isSystemRole(activeRole.name) && canManage && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onDeleteRole(activeRole)}
                          title="Delete role"
                          className="h-8 px-2.5 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200/70 dark:border-rose-900/50"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Scope Filters Bar */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[200px]">
                      <div className="relative flex-1 min-w-[180px] max-w-xs">
                        <svg
                          className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <Input
                          placeholder="Search permissions..."
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          className="pl-8 pr-7 h-8 text-xs w-full"
                        />
                        {searchInput && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchInput('');
                              setRoleSearch('');
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Grant Status Pills */}
                      <div className="inline-flex items-center rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setGrantFilter('ALL')}
                          className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                            grantFilter === 'ALL'
                              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          All ({activeRoleGrantCounts.total})
                        </button>
                        <button
                          type="button"
                          onClick={() => setGrantFilter('GRANTED')}
                          className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                            grantFilter === 'GRANTED'
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          Granted ({activeRoleGrantCounts.granted})
                        </button>
                        <button
                          type="button"
                          onClick={() => setGrantFilter('DENIED')}
                          className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                            grantFilter === 'DENIED'
                              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          Not Granted ({activeRoleGrantCounts.denied})
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <CleanDropdown
                        label="Category"
                        value={categoryFilter}
                        options={categoryDropdownOptions}
                        onChange={setCategoryFilter}
                        dropdownWidth="w-60"
                      />
                      <CleanDropdown
                        label="Level"
                        value={sensitivityFilter}
                        options={sensitivityDropdownOptions}
                        onChange={setSensitivityFilter}
                        dropdownWidth="w-40"
                      />
                      {isFiltered && (
                        <button
                          type="button"
                          onClick={resetAllFilters}
                          className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline px-1.5 cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={toggleAllCategories}
                        className="h-8 px-2.5 text-xs font-semibold gap-1 shrink-0"
                        title={allCategoriesCollapsed ? 'Expand all categories' : 'Collapse all categories'}
                      >
                        <svg
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${allCategoriesCollapsed ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Permission Categories */}
                <div className="space-y-3">
                  {PERMISSION_GROUPS.map((group) => {
                    if (categoryFilter !== 'ALL' && group.category !== categoryFilter) {
                      return null;
                    }

                    const matchingPerms = group.permissions.filter((p) => {
                      const isGranted = activeRolePermSet.has(p.key);
                      if (grantFilter === 'GRANTED' && !isGranted) return false;
                      if (grantFilter === 'DENIED' && isGranted) return false;
                      if (sensitivityFilter !== 'ALL' && p.level !== sensitivityFilter) return false;

                      const q = roleSearch.toLowerCase().trim();
                      if (!q) return true;
                      return (
                        p.key.toLowerCase().includes(q) ||
                        p.label.toLowerCase().includes(q) ||
                        p.desc.toLowerCase().includes(q)
                      );
                    });

                    if (matchingPerms.length === 0) return null;

                    const grantedInGroup = matchingPerms.filter((p) => activeRolePermSet.has(p.key)).length;
                    const isCollapsed = !!collapsedCategories[group.category];

                    return (
                      <div
                        key={group.category}
                        className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleCategory(group.category)}
                          className="w-full px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-3 cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <svg
                              className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                                isCollapsed ? '-rotate-90' : 'rotate-0'
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            </svg>
                            <div className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 shrink-0">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={group.icon} />
                              </svg>
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white truncate">
                              {group.category}
                            </span>
                          </div>

                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${
                              grantedInGroup > 0
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {grantedInGroup} / {matchingPerms.length} Granted
                          </span>
                        </button>

                        {!isCollapsed && (
                          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                            {matchingPerms.map((perm) => {
                              const isGranted = activeRolePermSet.has(perm.key);
                              return (
                                <div
                                  key={perm.key}
                                  className="px-5 py-2.5 grid grid-cols-1 md:grid-cols-12 items-start md:items-center gap-2 md:gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                                >
                                  {/* Column 1: Permission Name */}
                                  <div className="md:col-span-3 min-w-0">
                                    <span className="text-sm font-semibold text-slate-900 dark:text-white block truncate" title={perm.label}>
                                      {perm.label}
                                    </span>
                                  </div>

                                  {/* Column 2: Sensitivity Pill */}
                                  <div className="md:col-span-2 flex items-center">
                                    {getSensitivityBadge(perm.level)}
                                  </div>

                                  {/* Column 3: Monospace Scope Key */}
                                  <div className="md:col-span-2 min-w-0">
                                    <span className="font-mono text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/70 dark:border-slate-700/70 inline-block truncate max-w-full" title={perm.key}>
                                      {perm.key}
                                    </span>
                                  </div>

                                  {/* Column 4: Description */}
                                  <div className="md:col-span-3 min-w-0">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug line-clamp-2" title={perm.desc}>
                                      {perm.desc}
                                    </p>
                                  </div>

                                  {/* Column 5: Toggle Indicator + Granted/Not Granted Pill */}
                                  <div className="md:col-span-2 flex items-center md:justify-end gap-2 shrink-0">
                                    <div
                                      aria-hidden="true"
                                      className={`w-8 h-4.5 rounded-full p-0.5 transition-colors flex items-center ${
                                        isGranted
                                          ? 'bg-emerald-500 justify-end'
                                          : 'bg-slate-200 dark:bg-slate-700 justify-start'
                                      }`}
                                    >
                                      <span className="w-3.5 h-3.5 rounded-full bg-white shadow-xs" />
                                    </div>
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-xs font-semibold border whitespace-nowrap ${
                                        isGranted
                                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200/80 dark:border-slate-700/80'
                                      }`}
                                    >
                                      {isGranted ? 'Granted' : 'Not Granted'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <Card className="p-12 text-center text-xs text-slate-400">
                No roles configured yet.
              </Card>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* VIEW 2: MATRIX COMPARISON VIEW                            */
        /* ========================================================= */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <svg
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <Input
                  placeholder="Search scope, key, or description..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9 pr-8 h-9 text-xs w-full"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setRoleSearch('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <CleanDropdown
                label="Category"
                value={categoryFilter}
                options={categoryDropdownOptions}
                onChange={setCategoryFilter}
                dropdownWidth="w-64"
              />

              <CleanDropdown
                label="Sensitivity"
                value={sensitivityFilter}
                options={sensitivityDropdownOptions}
                onChange={setSensitivityFilter}
                dropdownWidth="w-48"
              />

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

            <Button
              type="button"
              variant="outline"
              onClick={toggleAllCategories}
              className="h-9 px-3 text-xs font-semibold gap-1.5 shrink-0"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${allCategoriesCollapsed ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              <span>{allCategoriesCollapsed ? 'Expand All' : 'Collapse All'}</span>
            </Button>
          </div>

          <Card className="!p-0 overflow-hidden shadow-sm border border-slate-200/80 dark:border-slate-800">
            <div className="overflow-x-auto relative">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="sticky left-0 z-30 bg-slate-100 dark:bg-slate-800 px-6 py-4 font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider w-[42%] min-w-[320px]">
                      Permission Scope &amp; Definition
                    </th>
                    {roles.map((r) => {
                      const theme = getRoleTheme(r.name);
                      const permCount = r.permissions?.length || 0;
                      return (
                        <th key={r.id} className="px-4 py-3.5 text-center min-w-[130px]">
                          <div className="flex flex-col items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRoleId(r.id);
                                setViewMode('inspector');
                              }}
                              title="Inspect this role"
                              className={`px-2.5 py-1 rounded-md text-xs font-semibold border hover:opacity-85 transition cursor-pointer ${theme.badge}`}
                            >
                              {r.name}
                            </button>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                              {permCount} / {TOTAL_PERMISSIONS_COUNT} scopes
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {PERMISSION_GROUPS.map((group) => {
                    if (categoryFilter !== 'ALL' && group.category !== categoryFilter) {
                      return null;
                    }

                    const matchingPerms = group.permissions.filter((p) => {
                      if (sensitivityFilter !== 'ALL' && p.level !== sensitivityFilter) return false;
                      const q = roleSearch.toLowerCase().trim();
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
                        <tr
                          onClick={() => toggleCategory(group.category)}
                          className="bg-slate-50/90 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800/90 transition-colors cursor-pointer select-none"
                        >
                          <td
                            colSpan={roles.length + 1}
                            className="px-6 py-3 font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider"
                          >
                            <div className="flex items-center gap-2.5">
                              <svg
                                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                                  isCollapsed ? '-rotate-90' : 'rotate-0'
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                              </svg>
                              <span className="text-slate-900 dark:text-white font-bold">{group.category}</span>
                              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                                ({matchingPerms.length} scopes)
                              </span>
                            </div>
                          </td>
                        </tr>

                        {!isCollapsed &&
                          matchingPerms.map((perm) => (
                            <tr
                              key={perm.key}
                              className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                            >
                              <td className="sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50/70 dark:group-hover:bg-slate-800/40 px-6 py-3.5 z-10 border-r border-slate-100 dark:border-slate-800">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                                      {perm.label}
                                    </span>
                                    {getSensitivityBadge(perm.level)}
                                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60">
                                      {perm.key}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    {perm.desc}
                                  </p>
                                </div>
                              </td>

                              {roles.map((r) => {
                                const hasPerm = r.permissions?.includes(perm.key);
                                return (
                                  <td key={r.id} className="px-4 py-3 text-center align-middle">
                                    {hasPerm ? (
                                      <div
                                        title={`${r.name} has granted access to ${perm.label}`}
                                        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                                      >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                      </div>
                                    ) : (
                                      <div
                                        title={`${r.name} does NOT have access to ${perm.label}`}
                                        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600"
                                      >
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
        </div>
      )}
    </div>
  );
}
