import React from 'react';
import { User } from '@/api';

// Permission Categories & Definition Catalog
export interface PermissionItem {
  key: string;
  label: string;
  desc: string;
  level: 'CRITICAL' | 'ELEVATED' | 'STANDARD' | 'SYSTEM';
}

export interface PermissionCategoryGroup {
  category: string;
  icon: string;
  description: string;
  color: string;
  permissions: PermissionItem[];
}

export const PERMISSION_GROUPS: PermissionCategoryGroup[] = [
  {
    category: 'MiniApp Management',
    icon: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z',
    description: 'Manage registration, builds, lifecycle states, and security actions for MiniApps',
    color: 'brand',
    permissions: [
      { key: 'miniapp:create', label: 'Create MiniApp', desc: 'Register new applications, drafts, and initial metadata', level: 'STANDARD' },
      { key: 'miniapp:read', label: 'View MiniApps', desc: 'Browse catalog, inspect details, artifacts, and build versions', level: 'STANDARD' },
      { key: 'miniapp:update', label: 'Update MiniApp', desc: 'Modify configurations, branding, and team assignments', level: 'STANDARD' },
      { key: 'miniapp:submit', label: 'Submit for Review', desc: 'Submit mini apps and new versions to the review queue', level: 'STANDARD' },
      { key: 'miniapp:approve', label: 'Approve MiniApp', desc: 'Authorize mini apps for staging and production rollout', level: 'CRITICAL' },
      { key: 'miniapp:reject', label: 'Reject / Request Revisions', desc: 'Issue rejection feedback and change requests', level: 'ELEVATED' },
      { key: 'miniapp:suspend', label: 'Suspend MiniApp', desc: 'Emergency take-down or suspension of running mini apps', level: 'CRITICAL' },
      { key: 'miniapp:delete', label: 'Delete MiniApp', desc: 'Permanently remove applications and associated artifacts', level: 'CRITICAL' },
    ],
  },
  {
    category: 'Capabilities & Proposals',
    icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
    description: 'Hardware/OS capability declarations, proposals, and platform approvals',
    color: 'amber',
    permissions: [
      { key: 'permission:read', label: 'View Capabilities Catalog', desc: 'Browse platform host capability catalog and requirements', level: 'STANDARD' },
      { key: 'permission:manage', label: 'Manage Capabilities Catalog', desc: 'Create, edit, or deprecate platform capability declarations', level: 'SYSTEM' },
      { key: 'permission_proposal:read', label: 'View Capability Proposals', desc: 'Inspect capability extension requests submitted by mini apps', level: 'STANDARD' },
      { key: 'permission_proposal:review', label: 'Review Capability Proposals', desc: 'Evaluate justification, risk score, and compliance impact', level: 'ELEVATED' },
      { key: 'permission_proposal:approve', label: 'Approve Capability Proposals', desc: 'Grant elevated device and bridge capabilities', level: 'CRITICAL' },
      { key: 'miniapp_permission:approve', label: 'Authorize Capability Bundles', desc: 'Batch authorize capability bundles for mini applications', level: 'CRITICAL' },
      { key: 'issue:resolve', label: 'Resolve Security Issues', desc: 'Override or clear flagged security gate and compliance items', level: 'ELEVATED' },
    ],
  },
  {
    category: 'SuperApp & Ecosystem',
    icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
    description: 'Host shell release pipeline orchestration, sandbox verification, and agency tenants',
    color: 'amber',
    permissions: [
      { key: 'super_app:read', label: 'View SuperApp Status', desc: 'Inspect release assembly, health digest, and license status', level: 'STANDARD' },
      { key: 'super_app:manage', label: 'Manage Host Releases', desc: 'Trigger Jenkins sandbox builds and release bundle publishing', level: 'CRITICAL' },
      { key: 'organization:read', label: 'View Organizations', desc: 'Browse registered partner agencies and tenant directory', level: 'STANDARD' },
      { key: 'organization:manage', label: 'Manage Organizations', desc: 'Create, onboard, and verify partner agencies', level: 'ELEVATED' },
    ],
  },
  {
    category: 'System & Security',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    description: 'Operator directory, RBAC governance, audit trails, and platform configurations',
    color: 'rose',
    permissions: [
      { key: 'user:read', label: 'View User Directory', desc: 'Access staff directory and operator accounts', level: 'STANDARD' },
      { key: 'user:manage', label: 'Manage User Accounts', desc: 'Create, update, deactivate staff accounts and assign roles', level: 'SYSTEM' },
      { key: 'role:read', label: 'View RBAC Roles', desc: 'Inspect role definitions and permission matrices', level: 'STANDARD' },
      { key: 'role:manage', label: 'Manage RBAC Roles', desc: 'Create custom roles and customize permission matrices', level: 'SYSTEM' },
      { key: 'audit_log:read', label: 'View Audit Logs', desc: 'Inspect immutable system governance and security audit logs', level: 'ELEVATED' },
      { key: 'settings:manage', label: 'Manage Global Settings', desc: 'Configure retention policies and CI/CD timers', level: 'SYSTEM' },
    ],
  },
];

export const ALL_FLAT_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.permissions);
export const TOTAL_PERMISSIONS_COUNT = ALL_FLAT_PERMISSIONS.length;

// Helper styling for roles - defined at module level
export const getRoleTheme = (roleName: string) => {
  switch (roleName) {
    case 'SUPER_ADMIN':
      return {
        badge: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/30',
        gradient: 'from-rose-500/10 via-rose-500/5 to-transparent border-rose-200/80 dark:border-rose-500/30',
        iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300',
        bar: 'bg-rose-500',
        label: 'Super Admin',
      };
    case 'ADMIN':
      return {
        badge: 'bg-accent-50 text-accent-800 dark:bg-accent-500/10 dark:text-accent-300 border-accent-200 dark:border-accent-500/30',
        gradient: 'from-accent-500/10 via-accent-500/5 to-transparent border-accent-200/80 dark:border-accent-500/30',
        iconBg: 'bg-accent-50 text-accent-600 dark:bg-accent-500/20 dark:text-accent-300',
        bar: 'bg-accent-500',
        label: 'System Admin',
      };
    case 'MA_DEVELOPER':
    case 'MINI_APP_DEVELOPER':
    case 'DEVELOPER':
      return {
        badge: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 border-sky-200 dark:border-sky-500/30',
        gradient: 'from-sky-500/10 via-sky-500/5 to-transparent border-sky-200/80 dark:border-sky-500/30',
        iconBg: 'bg-sky-50 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300',
        bar: 'bg-sky-500',
        label: 'MiniApp Developer',
      };
    default:
      return {
        badge: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 border-brand-200 dark:border-brand-500/30',
        gradient: 'from-brand-500/10 via-brand-500/5 to-transparent border-brand-200/80 dark:border-brand-500/30',
        iconBg: 'bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300',
        bar: 'bg-brand-500',
        label: roleName,
      };
  }
};

// Pure helper: Extract assigned roles from User record
export const getUserRoles = (user: User): { id?: string; name: string }[] => {
  if (user.roles && user.roles.length > 0) return user.roles;
  if (user.role) return [user.role];
  return [];
};

// Pure helper: Determine effective status directly from database record
export const getUserEffectiveStatus = (user: User): 'ACTIVE' | 'PENDING_APPROVAL' | 'INACTIVE' => {
  if (user.status === 'PENDING_APPROVAL') return 'PENDING_APPROVAL';
  const isUserActive = user.status === 'ACTIVE' || user.isActive !== false;
  return isUserActive ? 'ACTIVE' : 'INACTIVE';
};

// Sensitivity badge renderer for permissions
export const getSensitivityBadge = (level: 'CRITICAL' | 'ELEVATED' | 'STANDARD' | 'SYSTEM') => {
  switch (level) {
    case 'CRITICAL':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
          <svg className="w-2.5 h-2.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Critical
        </span>
      );
    case 'ELEVATED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
          <svg className="w-2.5 h-2.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Elevated
        </span>
      );
    case 'SYSTEM':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20">
          <svg className="w-2.5 h-2.5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
          System
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          Standard
        </span>
      );
  }
};
