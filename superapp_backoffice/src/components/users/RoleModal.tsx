'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Label } from '@/components/ui/inputs';
import { ZapIcon, EyeIcon, DevicePhoneIcon } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { rolesApi, Role } from '@/api';
import { PERMISSION_GROUPS, TOTAL_PERMISSIONS_COUNT, getSensitivityBadge } from './types';

export interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingRole: Role | null;
  onSuccess: () => void;
}

export function RoleModal({
  isOpen,
  onClose,
  editingRole,
  onSuccess,
}: RoleModalProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roleModalSearch, setRoleModalSearch] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
    isActive: true,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setRoleModalSearch('');
      if (editingRole) {
        setFormData({
          name: editingRole.name,
          description: editingRole.description || '',
          permissions: editingRole.permissions || [],
          isActive: editingRole.isActive,
        });
      } else {
        setFormData({
          name: '',
          description: '',
          permissions: [],
          isActive: true,
        });
      }
    }
  }, [isOpen, editingRole]);

  const togglePermission = (permKey: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permKey)
        ? prev.permissions.filter((p) => p !== permKey)
        : [...prev.permissions, permKey],
    }));
  };

  const togglePermissionGroup = (groupKeys: string[]) => {
    const allInGroup = groupKeys.every((k) => formData.permissions.includes(k));
    setFormData((prev) => ({
      ...prev,
      permissions: allInGroup
        ? prev.permissions.filter((p) => !groupKeys.includes(p))
        : Array.from(new Set([...prev.permissions, ...groupKeys])),
    }));
  };

  const applyRolePreset = (preset: 'ALL' | 'READ_ONLY' | 'DEV' | 'MINI_APP' | 'CLEAR') => {
    if (preset === 'ALL') {
      const allKeys = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));
      setFormData((prev) => ({ ...prev, permissions: allKeys }));
    } else if (preset === 'READ_ONLY') {
      const readKeys = PERMISSION_GROUPS.flatMap((g) =>
        g.permissions.filter((p) => p.key.endsWith(':read')).map((p) => p.key)
      );
      setFormData((prev) => ({ ...prev, permissions: readKeys }));
    } else if (preset === 'MINI_APP') {
      const miniAppGroup = PERMISSION_GROUPS.find((g) => g.category === 'MiniApp Management');
      const keys = miniAppGroup?.permissions.map((p) => p.key) || [];
      setFormData((prev) => ({ ...prev, permissions: keys }));
    } else if (preset === 'CLEAR') {
      setFormData((prev) => ({ ...prev, permissions: [] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.warning('Role name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRole) {
        await rolesApi.update(editingRole.id, formData);
        toast.success(`Role '${formData.name}' updated successfully!`);
      } else {
        await rolesApi.create(formData);
        toast.success(`Role '${formData.name}' created successfully!`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save role.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={() => !isSubmitting && onClose()}
      />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full p-6 sm:p-7 shadow-2xl my-auto max-h-[calc(100vh-3rem)] overflow-y-auto z-10 animate-in zoom-in-95 duration-200">
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
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
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
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-brand-50 hover:text-brand-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ZapIcon className="w-3.5 h-3.5 text-amber-500" />
                    <span>All Permissions</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyRolePreset('READ_ONLY')}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-brand-50 hover:text-brand-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <EyeIcon className="w-3.5 h-3.5 text-sky-500" />
                    <span>Read Only</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyRolePreset('MINI_APP')}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-brand-50 hover:text-brand-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <DevicePhoneIcon className="w-3.5 h-3.5 text-accent-500" />
                    <span>MiniApp Focus</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyRolePreset('CLEAR')}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400 shrink-0">
                {formData.permissions.length} / {TOTAL_PERMISSIONS_COUNT} Selected ({Math.round((formData.permissions.length / TOTAL_PERMISSIONS_COUNT) * 100)}%)
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

              const allInGroup = groupKeys.every((k) => formData.permissions.includes(k));

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
                      className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline shrink-0 cursor-pointer"
                    >
                      {allInGroup ? 'Deselect Category' : 'Select Category'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {matchingGroupPerms.map((perm) => {
                      const isSelected = formData.permissions.includes(perm.key);
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
              onClick={onClose}
              disabled={isSubmitting}
              className="gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting ? (
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
  );
}
