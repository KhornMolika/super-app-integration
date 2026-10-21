"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { authApi } from '@/api/auth.api';
import { usersApi } from '@/api/users.api';

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MINI_APP_DEVELOPER';

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: [
    'miniapp:create', 'miniapp:read', 'miniapp:update', 'miniapp:submit', 'miniapp:delete', 'miniapp:approve', 'miniapp:reject', 'miniapp:suspend',
    'miniapp_permission:approve', 'issue:resolve',
    'permission_proposal:read', 'permission_proposal:review', 'permission_proposal:approve',
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
    'permission_proposal:read', 'permission_proposal:review', 'permission_proposal:approve',
    'super_app:read', 'super_app:manage',
    'user:read', 'user:manage',
    'role:read',
    'permission:read',
    'organization:read', 'organization:manage',
    'audit_log:read', 'settings:manage'
  ],
  MINI_APP_DEVELOPER: [
    'miniapp:create', 'miniapp:read', 'miniapp:update', 'miniapp:submit',
    'permission_proposal:read',
    'permission:read',
    'super_app:read',
    'organization:read'
  ],
};

export interface AuthUser {
  id?: string;
  name: string;
  email: string;
  role: Role;
  roles?: string[];
  permissions?: string[];
  status?: string;
  isActive?: boolean;
}

interface AuthContextType {
  role: Role;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithEmail: (email: string, password?: string) => Promise<{ success: boolean; error?: string; pendingApproval?: boolean }>;
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

  const fetchSession = async () => {
    try {
      const profile = await usersApi.getProfile();
      if (profile && profile.email) {
        const userRoles: string[] = (profile.roles || []).map((r: any) => typeof r === 'string' ? r : r?.name);
        const primaryRole: Role = (userRoles.find((r) => ['SUPER_ADMIN', 'ADMIN', 'MINI_APP_DEVELOPER'].includes(r)) as Role) || 'MINI_APP_DEVELOPER';

        setRoleState(primaryRole);
        setCurrentUser({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: primaryRole,
          roles: userRoles,
          isActive: profile.isActive,
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
    fetchSession();
  }, []);

  const loginWithEmail = async (email: string, password?: string) => {
    try {
      const res = await authApi.login({ email, password });
      if (res?.user) {
        const userRoles: string[] = (res.user.roles || []).map((r: any) => typeof r === 'string' ? r : r?.name);
        const primaryRole: Role = (userRoles.find((r) => ['SUPER_ADMIN', 'ADMIN', 'MINI_APP_DEVELOPER'].includes(r)) as Role) || 'MINI_APP_DEVELOPER';

        setRoleState(primaryRole);
        setCurrentUser({
          id: res.user.id,
          name: res.user.name || 'Platform User',
          email: res.user.email || email,
          role: primaryRole,
          roles: userRoles,
          permissions: res.user.permissions,
        });
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: 'Invalid credentials or user not found' };
    } catch (err: any) {
      const isPending = err?.data?.pendingApproval || err?.message?.toLowerCase().includes('pending approval');
      return {
        success: false,
        pendingApproval: isPending,
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

  const can = (permission: string) => {
    if (role === 'SUPER_ADMIN') return true;
    const defaultPerms = ROLE_PERMISSIONS[role] || [];
    const userPerms = currentUser?.permissions || [];
    return defaultPerms.includes(permission) || userPerms.includes(permission);
  };

  const hasRole = (r: Role) => {
    return role === r;
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        user: currentUser,
        isAuthenticated,
        isLoading,
        loginWithEmail,
        can,
        hasRole,
        logout,
        refreshSession: fetchSession,
      }}
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
