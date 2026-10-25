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
  // Focus state: 'ALL' for matrix comparison, or specific role ID for isolated view
  const [selectedRoleId, setSelectedRoleId] = useState<string>('ALL');
  const [roleSearch, setRoleSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sensitivityFilter, setSensitivityFilter] = useState<string>('ALL');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Category filter dropdown options
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

  // Sensitivity filter dropdown options
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

  // Determine active displayed roles in the matrix columns
  const displayedRoles = useMemo(() => {
    if (selectedRoleId === 'ALL') return roles;
    return roles.filter((r) => r.id === selectedRoleId);
  }, [roles, selectedRoleId]);

  const activeFocusedRole = useMemo(() => {
    if (selectedRoleId === 'ALL') return null;
    return roles.find((r) => r.id === selectedRoleId) || null;
  }, [roles, selectedRoleId]);

  // Toggle category accordion
  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  // Toggle all categories collapse/expand
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

  // Check if any filters are active
  const isFiltered = roleSearch.trim() !== '' || categoryFilter !== 'ALL' || sensitivityFilter !== 'ALL' || selectedRoleId !== 'ALL';

  const resetAllFilters = () => {
    setRoleSearch('');
    setCategoryFilter('ALL');
    setSensitivityFilter('ALL');
    setSelectedRoleId('ALL');
  };

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* TIER 1: INTERACTIVE ROLES SHELF & DIRECT ACTIONS          */}
      {/* ========================================================= */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>RBAC Tier Shelf</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {roles.length} Configured
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select any role card below to inspect its scope, or use &ldquo;All Roles&rdquo; for full side-by-side matrix comparison.
            </p>
          </div>
        </div>

        {/* Roles Shelf Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 0: "All Roles (Compare)" Master Selector */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setSelectedRoleId('ALL')}
            onKeyDown={(e) => e.key === 'Enter' && setSelectedRoleId('ALL')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
              selectedRoleId === 'ALL'
                ? 'bg-brand-50/60 dark:bg-brand-950/20 border-brand-500 dark:border-brand-500 shadow-xs ring-1 ring-brand-500/30'
                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    selectedRoleId === 'ALL'
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M9 4v16m6-16v16" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    All Roles
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {TOTAL_PERMISSIONS_COUNT} total scopes
                  </p>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                  selectedRoleId === 'ALL'
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                {roles.length} Roles
              </span>
            </div>

            <div className="mt-3">
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 w-full" />
              </div>
            </div>
          </div>

          {/* Cards for each defined role */}
          {roles.map((role) => {
            const isSystemRole = ['SUPER_ADMIN', 'ADMIN'].includes(role.name);
            const theme = getRoleTheme(role.name);
            const permCount = role.permissions?.length || 0;
            const coveragePercent = Math.round((permCount / TOTAL_PERMISSIONS_COUNT) * 100);
            const isSelected = selectedRoleId === role.id;

            return (
              <div
                key={role.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedRoleId(isSelected ? 'ALL' : role.id)}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedRoleId(isSelected ? 'ALL' : role.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                  isSelected
                    ? 'bg-slate-50 dark:bg-slate-800/80 border-brand-500 dark:border-brand-400 shadow-xs ring-1 ring-brand-500/30'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Top: Icon + Role Name + Core Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${theme.iconBg} shadow-2xs`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {role.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {permCount} / {TOTAL_PERMISSIONS_COUNT} ({coveragePercent}%)
                      </p>
                    </div>
                  </div>

                  {/* Actions: Clean & Direct */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      title="Configure permissions"
                      onClick={() => onOpenEditRole(role)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>

                    <button
                      type="button"
                      title="Clone role"
                      onClick={() => onDuplicateRole(role)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </button>

                    {!isSystemRole && canManage && (
                      <button
                        type="button"
                        title="Delete role"
                        onClick={() => onDeleteRole(role)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Bottom: Progress bar */}
                <div className="mt-3">
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${theme.bar} transition-all duration-300`}
                      style={{ width: `${coveragePercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* TIER 2: SMART SEARCH & CONTROL TOOLBAR                    */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Input */}
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
              value={roleSearch}
              onChange={(e) => setRoleSearch(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs w-full"
            />
            {roleSearch && (
              <button
                type="button"
                onClick={() => setRoleSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter Dropdown */}
          <CleanDropdown
            label="Category"
            icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            }
            value={categoryFilter}
            options={categoryDropdownOptions}
            onChange={setCategoryFilter}
            dropdownWidth="w-64"
          />

          {/* Sensitivity Filter Dropdown */}
          <CleanDropdown
            label="Sensitivity"
            icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
            value={sensitivityFilter}
            options={sensitivityDropdownOptions}
            onChange={setSensitivityFilter}
            dropdownWidth="w-48"
          />

          {/* Clear Filters Button if any active */}
          {isFiltered && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline px-2 py-1"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Right toolbar controls: Expand/Collapse All */}
        <div className="flex items-center gap-2">
          {activeFocusedRole && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Focusing:</span>
              <span className="font-bold text-brand-600 dark:text-brand-400">{activeFocusedRole.name}</span>
              <button
                type="button"
                onClick={() => setSelectedRoleId('ALL')}
                title="Return to All Roles comparison"
                className="ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>
          )}

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
      </div>

      {/* ========================================================= */}
      {/* TIER 3: UNIFIED LIVING MATRIX & PERMISSION CATALOG TABLE  */}
      {/* ========================================================= */}
      <Card className="!p-0 overflow-hidden shadow-sm border border-slate-200/80 dark:border-slate-800">
        {loadingRoles ? (
          <div className="py-20 text-center text-slate-500">
            <div className="flex flex-col items-center justify-center gap-3">
              <svg className="animate-spin h-7 w-7 text-brand-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                Loading RBAC matrix and permission catalog schema...
              </span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto relative">
            <table className="w-full text-left border-collapse">
              {/* Sticky Table Header */}
              <thead className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {/* Left Column: Permission Catalog Specs */}
                  <th className="sticky left-0 z-30 bg-slate-100 dark:bg-slate-800 px-6 py-4 font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider w-[45%] min-w-[340px]">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span>Permission Scope & Definition</span>
                    </div>
                  </th>

                  {/* Right Columns: Role Matrix Columns */}
                  {displayedRoles.map((r) => {
                    const theme = getRoleTheme(r.name);
                    const isFocused = selectedRoleId === r.id;
                    const permCount = r.permissions?.length || 0;

                    return (
                      <th
                        key={r.id}
                        className={`px-4 py-3.5 text-center transition-colors min-w-[130px] ${
                          isFocused ? 'bg-brand-50/50 dark:bg-brand-950/20' : ''
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${theme.badge}`}>
                            {r.name}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {permCount} / {TOTAL_PERMISSIONS_COUNT} scopes
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {PERMISSION_GROUPS.map((group) => {
                  // Filter out category if categoryFilter is specific
                  if (categoryFilter !== 'ALL' && group.category !== categoryFilter) {
                    return null;
                  }

                  // Filter permissions matching search and sensitivity
                  const matchingPerms = group.permissions.filter((p) => {
                    if (sensitivityFilter !== 'ALL' && p.level !== sensitivityFilter) {
                      return false;
                    }

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
                      {/* Category Header Row (Collapsible Accordion) */}
                      <tr
                        onClick={() => toggleCategory(group.category)}
                        className="bg-slate-50/90 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800/90 transition-colors cursor-pointer select-none"
                      >
                        <td
                          colSpan={displayedRoles.length + 1}
                          className="px-6 py-3 font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider"
                        >
                          <div className="flex items-center justify-between">
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

                              <div className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={group.icon} />
                                </svg>
                              </div>

                              <span className="text-slate-900 dark:text-white font-bold">{group.category}</span>
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

                      {/* Permission Rows (only rendered if not collapsed) */}
                      {!isCollapsed &&
                        matchingPerms.map((perm) => (
                          <tr
                            key={perm.key}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                          >
                            {/* Left Cell: The Living Permission Catalog */}
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

                            {/* Right Cells: The Role Matrix Granted/Denied Indicators */}
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
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2.5}
                                          d="M5 13l4 4L19 7"
                                        />
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
        )}
      </Card>
    </div>
  );
}
