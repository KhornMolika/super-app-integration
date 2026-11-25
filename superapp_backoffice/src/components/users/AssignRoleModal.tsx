'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/inputs';
import { ShieldCheckIcon, CheckIcon } from '@/components/ui/Icons';
import { toast } from '@/components/ui/Toast';
import { usersApi, User, Role, unwrapItem } from '@/api';
import { useAuth } from '@/lib/auth';
import { isPlatformOwnerOrgCode } from '@/lib/config';
import { getRoleTheme, getUserRoles } from './types';

interface RoleOption {
  key: string;
  label: string;
  badge: string;
  desc: string;
}

const DEFAULT_ROLE_OPTIONS: RoleOption[] = [
  {
    key: 'MA_DEVELOPER',
    label: 'MiniApp Developer',
    badge: 'Developer',
    desc: 'Build, configure, test in sandbox, publish mini applications and submit capability proposals',
  },
  {
    key: 'ORG_ADMIN',
    label: 'Organization Admin',
    badge: 'Org Admin',
    desc: 'Manages the users, promotional banners, and mini apps of their own organization',
  },
  {
    key: 'APP_REVIEWER',
    label: 'App Reviewer & Auditor',
    badge: 'Reviewer',
    desc: 'Reviews MiniApp source code, bundle diffs, CycloneDX SBOMs, and approves/rejects submissions',
  },
  {
    key: 'PLATFORM_ADMIN',
    label: 'Platform Administrator',
    badge: 'Platform Admin',
    desc: 'Operates ecosystem releases, partner organizations, and global settings',
  },
  {
    key: 'SUPER_ADMIN',
    label: 'Super Administrator',
    badge: 'Super Admin',
    desc: 'Runs the platform across every organization (platform owner organization only)',
  },
  {
    key: 'STAFF',
    label: 'Organization Staff',
    badge: 'Staff',
    desc: 'Internal team member for mobile and backoffice support',
  },
];

export interface AssignRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  roles?: Role[];
  onRoleUpdated: (updatedUser: User) => void;
}

export function AssignRoleModal({
  isOpen,
  onClose,
  user,
  roles = [],
  onRoleUpdated,
}: AssignRoleModalProps) {
  const { user: currentUser, hasRole, refreshSession } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [selectedRole, setSelectedRole] = useState('MA_DEVELOPER');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userRoles = useMemo(() => getUserRoles(user), [user]);
  const currentPrimaryRole = useMemo(() => {
    const raw = userRoles[0]?.name || user.role?.name || 'MA_DEVELOPER';
    return raw === 'ADMIN' ? 'ORG_ADMIN' : raw;
  }, [user, userRoles]);

  useEffect(() => {
    if (isOpen) {
      setSelectedRole(currentPrimaryRole);
    }
  }, [isOpen, currentPrimaryRole]);

  const isTargetSuperAdmin =
    currentPrimaryRole === 'SUPER_ADMIN' ||
    userRoles.some((r) => r.name === 'SUPER_ADMIN');

  const isSuper = hasRole('SUPER_ADMIN') || hasRole('PLATFORM_ADMIN');
  const isSelf = Boolean(
    currentUser &&
      (currentUser.id === user.id ||
        (currentUser.email &&
          user.email &&
          currentUser.email.toLowerCase() === user.email.toLowerCase())),
  );

  const roleOptions = useMemo(() => {
    const map = new Map<string, RoleOption>();
    for (const opt of DEFAULT_ROLE_OPTIONS) {
      map.set(opt.key, opt);
    }
    for (const r of roles) {
      if (!r?.name) continue;
      const key = r.name === 'ADMIN' ? 'ORG_ADMIN' : r.name;
      if (!map.has(key)) {
        const theme = getRoleTheme(key);
        map.set(key, {
          key,
          label: theme.label || key,
          badge: theme.label || key,
          desc: r.description || 'Custom RBAC role',
        });
      }
    }

    return Array.from(map.values()).filter((opt) => {
      if (opt.key === 'SUPER_ADMIN') {
        return (
          isTargetSuperAdmin ||
          (isSuper && isPlatformOwnerOrgCode(user.organization?.code))
        );
      }
      if (!isSuper) {
        return (['ORG_ADMIN', 'ADMIN', 'MA_DEVELOPER', 'STAFF'] as string[]).includes(
          opt.key,
        );
      }
      return true;
    });
  }, [roles, isTargetSuperAdmin, isSuper, user.organization?.code]);

  const handleSave = async () => {
    if (!selectedRole) return;
    if (isSelf && !hasRole('SUPER_ADMIN')) {
      toast.error('Users cannot change their own roles.');
      return;
    }
    if (isTargetSuperAdmin && selectedRole !== 'SUPER_ADMIN') {
      toast.error(
        'Protected Role Guard: Super Admin clearance level cannot be downgraded or revoked.',
      );
      return;
    }

    try {
      setSaving(true);
      const updated = await usersApi.update(user.id, {
        roleNames: [selectedRole],
      });
      const unwrapped = unwrapItem<User>(updated);
      onRoleUpdated(unwrapped);

      if (isSelf) {
        await refreshSession?.();
      }

      const theme = getRoleTheme(selectedRole);
      toast.success(
        `Role for "${user.name}" updated to ${theme.label || selectedRole}.`,
        'Role Assigned',
      );
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to assign role');
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/50 border border-brand-200/70 dark:border-brand-800/60 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
              <ShieldCheckIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                Assign Role — {user.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Role Grid */}
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {roleOptions.map((opt) => {
              const isSelected = selectedRole === opt.key;
              const isLocked = isTargetSuperAdmin && opt.key !== 'SUPER_ADMIN';
              const theme = getRoleTheme(opt.key);

              return (
                <button
                  key={opt.key}
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    if (isLocked) {
                      toast.error(
                        'Protected Role Guard: Super Admin clearance level cannot be downgraded or revoked.',
                      );
                      return;
                    }
                    setSelectedRole(opt.key);
                  }}
                  className={`text-left p-3.5 rounded-xl border-2 transition-all flex flex-col justify-between gap-2.5 ${
                    isLocked
                      ? 'opacity-40 cursor-not-allowed border-slate-200/60 dark:border-slate-800/60 bg-slate-50/20 dark:bg-slate-900/20'
                      : isSelected
                      ? 'border-brand-500 bg-brand-50/30 dark:bg-brand-500/10 shadow-sm cursor-pointer'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-800/30 cursor-pointer'
                  }`}
                >
                  <div className="space-y-2 w-full">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${theme.badge}`}
                      >
                        {opt.badge}
                      </span>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center shrink-0">
                          <CheckIcon className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      {opt.label}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-3">
                      {opt.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving || selectedRole === currentPrimaryRole}
            className="gap-1.5"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <CheckIcon className="w-3.5 h-3.5" />
                Save Role
              </>
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
