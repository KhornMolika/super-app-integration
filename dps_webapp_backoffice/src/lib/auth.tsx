"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MINI_APP_MANAGER' | 'DEVELOPER' | 'VIEWER';

// Note: These mock permissions correspond to the backend permissions.
// In a real application, the backend would return the user's specific permissions.
const ROLE_PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: [
    'miniapp:create', 'miniapp:read', 'miniapp:update', 'miniapp:delete',
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
    'miniapp:create', 'miniapp:read', 'miniapp:update', 'miniapp:delete',
    'miniapp_permission:approve', 'issue:resolve',
    'permission_proposal:read', 'permission_proposal:review',
    'super_app:read',
    'user:read',
    'permission:read',
    'organization:read'
  ],
  MINI_APP_MANAGER: [
    'miniapp:create', 'miniapp:read', 'miniapp:update',
    'permission_proposal:read',
    'permission:read',
    'organization:read'
  ],
  DEVELOPER: [
    'miniapp:read',
    'permission:read',
    'super_app:read'
  ],
  VIEWER: [
    'miniapp:read',
    'permission:read',
    'super_app:read',
    'permission_proposal:read',
    'organization:read',
    'user:read'
  ]
};

interface AuthContextType {
  role: Role;
  setRole: (role: Role) => void;
  can: (permission: string) => boolean;
  hasRole: (role: Role) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>('SUPER_ADMIN');
  const [mounted, setMounted] = useState(false);

  const performLogin = async (currentRole: Role) => {
    const email = ['SUPER_ADMIN', 'ADMIN', 'MINI_APP_MANAGER'].includes(currentRole) 
      ? 'admin@example.com' 
      : 'dev@example.com';

    try {
      // Use original fetch to avoid infinite loop with our interceptor
      const fetchFn = (window as any).__original_fetch || window.fetch;
      const res = await fetchFn(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.access_token) {
          localStorage.setItem('dps_jwt', data.access_token);
          document.cookie = `dps_jwt=${data.access_token}; path=/`;
        }
      }
    } catch(e) {
      console.error('Mock login failed', e);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).__fetch_overridden) {
      (window as any).__original_fetch = window.fetch;
      window.fetch = async (...args) => {
        let [resource, config] = args;
        const token = localStorage.getItem('dps_jwt');
        if (token && typeof resource === 'string' && resource.includes(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000')) {
          config = config || {};
          config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${token}`
          };
        }
        return (window as any).__original_fetch(resource, config);
      };
      (window as any).__fetch_overridden = true;
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('dps_mock_role') as Role;
    if (saved && ROLE_PERMISSIONS[saved]) {
      setRoleState(saved);
    }
    setMounted(true);
    performLogin(saved || 'SUPER_ADMIN');
  }, []);

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    localStorage.setItem('dps_mock_role', newRole);
    performLogin(newRole);
  };

  const can = (permission: string) => {
    if (!mounted) return false;
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
  };

  const hasRole = (r: Role) => {
    if (!mounted) return false;
    return role === r;
  };

  if (!mounted) return null;

  return (
    <AuthContext.Provider value={{ role, setRole, can, hasRole }}>
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
