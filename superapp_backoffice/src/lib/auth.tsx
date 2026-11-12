"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { authApi } from '@/api/auth.api';
import { usersApi } from '@/api/users.api';
import { resetSessionExpiredState } from '@/api/client';

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MA_DEVELOPER' | 'STAFF';

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: [
    'miniapp:create', 'miniapp:read', 'miniapp:update', 'miniapp:submit', 'miniapp:delete', 'miniapp:approve', 'miniapp:reject', 'miniapp:suspend',
    'miniapp_permission:approve', 'issue:resolve',
    'permission_proposal:read', 'permission_proposal:create', 'permission_proposal:review', 'permission_proposal:approve',
    'super_app:read', 'super_app:manage',
    'user:read', 'user:manage',
    'role:read', 'role:manage',
    'permission:read', 'permission:manage',
    'organization:read', 'organization:manage',
    'audit_log:read', 'settings:manage'
  ],
  ADMIN: [
    'miniapp:create', 'miniapp:read', 'miniapp:update', 'miniapp:submit', 'miniapp:delete', 'miniapp:approve', 'miniapp:reject', 'miniapp:suspend',
    'miniapp_permission:approve', 'issue:resolve',
    'permission_proposal:read', // regulatory admin: sees requests, only SUPER_ADMIN decides
    'super_app:read', 'super_app:manage',
    'user:read', 'user:manage',
    'role:read',
    'permission:read',
    'organization:read', 'organization:manage',
    'audit_log:read', 'settings:manage'
  ],
  MA_DEVELOPER: [
    'miniapp:create', 'miniapp:read', 'miniapp:update', 'miniapp:submit',
    'permission_proposal:read', 'permission_proposal:create',
    'permission:read',
    'super_app:read',
    'organization:read'
  ],
  // FSA staff using mobile services: no mini app or capability work
  STAFF: ['miniapp:read', 'super_app:read', 'organization:read'],
};

/** Role names as the backend may send them, mapped to the backoffice roles. */
const ROLE_ALIASES: Record<string, Role> = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SUPERADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MA_DEVELOPER: 'MA_DEVELOPER',
  MINI_APP_DEVELOPER: 'MA_DEVELOPER',
  DEVELOPER: 'MA_DEVELOPER',
  STAFF: 'STAFF',
};
const ROLE_PRIORITY: Role[] = ['SUPER_ADMIN', 'ADMIN', 'MA_DEVELOPER', 'STAFF'];

/** Role names from the backend, with known aliases normalised. */
function normaliseRoles(raw: unknown[]): string[] {
  return raw
    .map((r: any) => (typeof r === 'string' ? r : r?.name))
    .filter((n): n is string => typeof n === 'string' && !!n)
    .map((n) => ROLE_ALIASES[n.toUpperCase().trim()] ?? n);
}

/**
 * The role that drives the backoffice UI. A role it does not know gets the
 * least rights (STAFF), never developer rights.
 */
export function primaryRoleOf(roles: string[]): Role {
  return ROLE_PRIORITY.find((r) => roles.includes(r)) ?? 'STAFF';
}

export interface AuthUser {
  id?: string;
  name: string;
  email: string;
  role: Role;
  roles?: string[];
  permissions?: string[];
  status?: string;
  isActive?: boolean;
  avatarUrl?: string | null;
  organizationId?: string | null;
  organization?: {
    id: string;
    name: string;
    code?: string;
  } | null;
}

interface AuthContextType {
  role: Role;
  setRole: (role: Role) => void;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // Shared Real-Time Avatar State
  avatarUrl: string | null;
  setAvatarPreview: (url: string | null) => void;
  clearAvatarPreview: () => void;
  updateUserAvatar: (avatarUrl?: string | null) => void;
  updateCurrentUser: (updates: Partial<AuthUser>) => void;
  loginWithEmail: (
    email: string,
    password?: string,
  ) => Promise<{ success: boolean; error?: string; pendingApproval?: boolean; emailNotVerified?: boolean; noBackofficeAccess?: boolean }>;
  can: (permission: string) => boolean;
  hasRole: (role: Role) => boolean;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>('SUPER_ADMIN');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(null);

  // Dynamic shared avatar URL: preview overrides saved avatar if active
  const effectiveAvatarUrl =
    previewAvatarUrl !== null
      ? (previewAvatarUrl || null)
      : (currentUser?.avatarUrl || null);

  const setAvatarPreview = (url: string | null) => {
    setPreviewAvatarUrl(url);
  };

  const clearAvatarPreview = () => {
    setPreviewAvatarUrl(null);
  };

  const updateUserAvatar = (newAvatarUrl?: string | null) => {
    setPreviewAvatarUrl(null);
    setCurrentUser((prev) => (prev ? { ...prev, avatarUrl: newAvatarUrl || null } : null));
  };

  const updateCurrentUser = (updates: Partial<AuthUser>) => {
    setCurrentUser((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const fetchSession = async () => {
    try {
      const rawProfile: any = await usersApi.getProfile();
      const profile =
        rawProfile?.data && rawProfile?.email === undefined
          ? rawProfile.data
          : rawProfile;
      if (profile && profile.email) {
        const rawRoleList =
          profile.roles && profile.roles.length > 0
            ? profile.roles
            : profile.role
            ? [profile.role]
            : [];
        const userRoles = normaliseRoles(rawRoleList);
        const primaryRole = primaryRoleOf(userRoles);

        setRoleState(primaryRole);
        setCurrentUser({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: primaryRole,
          roles: userRoles,
          isActive: profile.isActive,
          avatarUrl: profile.avatarUrl || null,
          organizationId: profile.organizationId || profile.organization?.id || null,
          organization: profile.organization || null,
        });
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    } catch (_) {
      setIsAuthenticated(false);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Skip session checks on login/signup pages to avoid redundant 401 calls and refresh loops
    const isPublicPage =
      typeof window !== 'undefined' &&
      (window.location.pathname.startsWith('/login') ||
        window.location.pathname.startsWith('/signup') ||
        window.location.pathname.startsWith('/verify-otp') ||
        window.location.pathname.startsWith('/forgot-password') ||
        window.location.pathname.startsWith('/legal'));

    if (isPublicPage) {
      setIsLoading(false);
      return;
    }

    fetchSession();

    // 1. Proactive Keep-Alive: Ping refresh endpoint every 4 minutes (tokens last 15 mins)
    // Ensures uninterrupted continuous session without sudden logouts
    const refreshInterval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        try {
          const res = await fetch('/api/auth/refresh', { method: 'POST' });
          if (!res.ok && res.status === 401) {
            setIsAuthenticated(false);
            setCurrentUser(null);
            if (typeof window !== 'undefined') {
              const currentPath = window.location.pathname;
              const redirectParam = currentPath && currentPath !== '/' ? `?redirect=${encodeURIComponent(currentPath)}&expired=true` : '?expired=true';
              window.location.href = `/login${redirectParam}`;
            }
          }
        } catch (_) {}
      }
    }, 4 * 60 * 1000); // 4 minutes

    // 2. On window focus / tab visibility change: re-verify session when returning to tab
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchSession();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loginWithEmail = async (email: string, password?: string) => {
    try {
      resetSessionExpiredState();
      const res = await authApi.login({ email, password });
      if (res?.user) {
        const userRoles = normaliseRoles(res.user.roles || []);
        const primaryRole = primaryRoleOf(userRoles);

        setRoleState(primaryRole);
        setCurrentUser({
          id: res.user.id,
          name: res.user.name || 'Platform User',
          email: res.user.email || email,
          role: primaryRole,
          roles: userRoles,
          permissions: res.user.permissions,
          avatarUrl: res.user.avatarUrl || null,
          organizationId: res.user.organizationId || res.user.organization?.id || null,
          organization: res.user.organization || null,
        });
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: res?.message || 'Invalid credentials or user not found' };
    } catch (err: any) {
      const isPending = err?.data?.pendingApproval || err?.message?.toLowerCase().includes('pending approval');
      return {
        success: false,
        pendingApproval: isPending,
        // Correct password but email never verified: the login page offers a new OTP
        emailNotVerified: err?.data?.code === 'EMAIL_NOT_VERIFIED',
        // Correct password, but the role (e.g. STAFF) is for the mobile app only
        noBackofficeAccess: Boolean(err?.data?.noBackofficeAccess),
        error: err.message || (isPending ? 'Your account is pending Super Administrator approval.' : 'Login failed'),
      };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (_) {}
    setIsAuthenticated(false);
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const can = useCallback(
    (permission: string) => {
      if (role === 'SUPER_ADMIN') return true;
      const defaultPerms = ROLE_PERMISSIONS[role] || [];
      const userPerms = currentUser?.permissions || [];
      return defaultPerms.includes(permission) || userPerms.includes(permission);
    },
    [role, currentUser?.permissions]
  );

  const hasRole = useCallback((r: Role) => role === r, [role]);

  const authValue = useMemo(
    () => ({
      role,
      setRole: setRoleState,
      user: currentUser,
      isAuthenticated,
      isLoading,
      avatarUrl: effectiveAvatarUrl,
      setAvatarPreview,
      clearAvatarPreview,
      updateUserAvatar,
      updateCurrentUser,
      loginWithEmail,
      can,
      hasRole,
      logout,
      refreshSession: fetchSession,
    }),
    [
      role,
      currentUser,
      isAuthenticated,
      isLoading,
      effectiveAvatarUrl,
      can,
      hasRole,
    ]
  );

  return (
    <AuthContext.Provider value={authValue}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useHeaderAvatar() {
  const { avatarUrl, setAvatarPreview, clearAvatarPreview, updateUserAvatar } = useAuth();
  return {
    avatarUrl,
    setAvatarPreview,
    clearAvatarPreview,
    updateUserAvatar,
  };
}
