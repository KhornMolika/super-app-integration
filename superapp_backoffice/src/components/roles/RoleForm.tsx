'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Shield,
  Check,
  Search,
  Lock,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import {
  PERMISSION_GROUPS,
  TOTAL_PERMISSIONS_COUNT,
  getSensitivityBadge,
} from '@/components/users/types';

export interface RoleFormData {
  name: string;
  description: string;
  permissions: string[];
  isActive: boolean;
}

export interface RoleFormProps {
  initialData?: RoleFormData;
  isSystemRole?: boolean;
  isEditing?: boolean;
  onSubmit: (data: RoleFormData) => Promise<void>;
  isSubmitting: boolean;
  cancelHref?: string;
}

export function RoleForm({
  initialData = {
    name: '',
    description: '',
    permissions: [],
    isActive: true,
  },
  isSystemRole = false,
  isEditing = false,
  onSubmit,
  isSubmitting,
  cancelHref = '/roles',
}: RoleFormProps) {
  const [name, setName] = useState(initialData.name);
  const [description, setDescription] = useState(initialData.description);
  const [permissions, setPermissions] = useState<string[]>(initialData.permissions);
  const [isActive, setIsActive] = useState(initialData.isActive);
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Form Validation
  const [errors, setErrors] = useState<{ name?: string }>({});

  const togglePermission = (key: string) => {
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const toggleCategory = (groupKeys: string[]) => {
    const allSelected = groupKeys.every((k) => permissions.includes(k));
    if (allSelected) {
      setPermissions((prev) => prev.filter((k) => !groupKeys.includes(k)));
    } else {
      setPermissions((prev) => Array.from(new Set([...prev, ...groupKeys])));
    }
  };

  const applyPreset = (preset: 'ALL' | 'READ_ONLY' | 'MINI_APP' | 'CLEAR') => {
    switch (preset) {
      case 'ALL': {
        const allKeys = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));
        setPermissions(allKeys);
        break;
      }
      case 'READ_ONLY': {
        const readKeys = PERMISSION_GROUPS.flatMap((g) =>
          g.permissions.filter((p) => p.key.endsWith(':read')).map((p) => p.key),
        );
        setPermissions(readKeys);
        break;
      }
      case 'MINI_APP': {
        const group = PERMISSION_GROUPS.find((g) => g.category === 'MiniApp Management');
        const keys = group?.permissions.map((p) => p.key) || [];
        setPermissions(keys);
        break;
      }
      case 'CLEAR':
        setPermissions([]);
        break;
    }
  };

  const toggleCategoryCollapse = (category: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Filter permission groups based on search
  const filteredGroups = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return PERMISSION_GROUPS;

    return PERMISSION_GROUPS.map((group) => {
      const matching = group.permissions.filter(
        (p) =>
          p.label.toLowerCase().includes(q) ||
          p.key.toLowerCase().includes(q) ||
          p.desc.toLowerCase().includes(q) ||
          group.category.toLowerCase().includes(q),
      );
      return {
        ...group,
        permissions: matching,
      };
    }).filter((g) => g.permissions.length > 0);
  }, [searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Role name is required.';
    } else if (!/^[A-Za-z0-9_-]+$/.test(name.trim())) {
      newErrors.name = 'Role name may only contain letters, numbers, underscores, and dashes.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    await onSubmit({
      name: name.trim().toUpperCase(),
      description: description.trim(),
      permissions,
      isActive,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* System Role Warning Notice */}
      {isSystemRole && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <strong className="font-semibold block text-sm">Protected System Role</strong>
            <p>
              This is a built-in platform role. The role identifier cannot be renamed or deleted, but you can review and customize permissions if authorized.
            </p>
          </div>
        </div>
      )}

      {/* Role Metadata Card */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <span>Role Details</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Role Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Role Name / Identifier <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              disabled={isSystemRole}
              onChange={(e) => {
                setName(e.target.value.toUpperCase());
                if (errors.name) setErrors({});
              }}
              placeholder="e.g. COMPLIANCE_OFFICER"
              className={`w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono ${
                errors.name
                  ? 'border-rose-500 focus:ring-rose-500'
                  : 'border-slate-200 dark:border-slate-700'
              } ${isSystemRole ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
            {errors.name ? (
              <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.name}</p>
            ) : (
              <p className="text-[11px] text-slate-400 mt-1">
                Unique uppercase identifier for system authorization checks.
              </p>
            )}
          </div>

          {/* Status Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Active Status
            </label>
            <div className="flex items-center gap-3 pt-2">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-slate-700"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {isActive ? 'Role is Active' : 'Role is Inactive (Disabled)'}
                </span>
              </label>
              <span className="text-[11px] text-slate-400">
                Inactive roles cannot be assigned to staff members.
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the responsibilities and scope granted to this role..."
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Permissions Matrix Picker */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Permissions Catalog
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20">
                {permissions.length} / {TOTAL_PERMISSIONS_COUNT} Scopes Selected
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select the granular API capabilities and admin scopes granted to this role.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-medium mr-1">Presets:</span>
            <button
              type="button"
              onClick={() => applyPreset('ALL')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              All Scopes
            </button>
            <button
              type="button"
              onClick={() => applyPreset('READ_ONLY')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Read-Only
            </button>
            <button
              type="button"
              onClick={() => applyPreset('MINI_APP')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              MiniApp Dev
            </button>
            <button
              type="button"
              onClick={() => applyPreset('CLEAR')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Search Permissions */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search permissions by key (e.g. miniapp:read), label, or scope..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Category Accordions */}
        <div className="space-y-3 pt-2">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No permissions found matching &ldquo;{searchTerm}&rdquo;
            </div>
          ) : (
            filteredGroups.map((group) => {
              const groupKeys = group.permissions.map((p) => p.key);
              const selectedCount = groupKeys.filter((k) => permissions.includes(k)).length;
              const allSelected = groupKeys.length > 0 && selectedCount === groupKeys.length;
              const isCollapsed = !!collapsedCategories[group.category];

              return (
                <div
                  key={group.category}
                  className="rounded-xl border border-slate-200/80 dark:border-slate-700/60 overflow-hidden bg-slate-50/50 dark:bg-slate-900/40"
                >
                  {/* Category Header */}
                  <div className="p-3.5 flex items-center justify-between gap-3 bg-white dark:bg-slate-800/80 border-b border-slate-200/60 dark:border-slate-700/50">
                    <div
                      className="flex items-center gap-2.5 cursor-pointer flex-1 select-none"
                      onClick={() => toggleCategoryCollapse(group.category)}
                    >
                      <div className="w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={group.icon} />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {group.category}
                          </h4>
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {selectedCount} / {group.permissions.length}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {group.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCategory(groupKeys)}
                        className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline px-2 py-1 cursor-pointer"
                      >
                        {allSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                  </div>

                  {/* Permissions Checklist */}
                  {!isCollapsed && (
                    <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {group.permissions.map((perm) => {
                        const isChecked = permissions.includes(perm.key);

                        return (
                          <div
                            key={perm.key}
                            onClick={() => togglePermission(perm.key)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                              isChecked
                                ? 'bg-brand-50/50 dark:bg-brand-950/20 border-brand-300 dark:border-brand-500/40 shadow-2xs'
                                : 'bg-white dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-700/40 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // Controlled by wrapper div
                              className="w-4 h-4 mt-0.5 rounded text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-slate-600 shrink-0 pointer-events-none"
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  {perm.label}
                                </span>
                                {getSensitivityBadge(perm.level)}
                              </div>
                              <div className="text-[11px] font-mono text-brand-600 dark:text-brand-400 pt-0.5">
                                {perm.key}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                {perm.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 p-4 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-lg">
        <Link
          href={cancelHref}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Cancel</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
            <strong className="text-slate-800 dark:text-slate-200">{permissions.length}</strong> scopes will be assigned
          </span>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{isEditing ? 'Save Role Changes' : 'Create Custom Role'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
