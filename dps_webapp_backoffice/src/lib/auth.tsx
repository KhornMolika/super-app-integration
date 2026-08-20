"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MINI_APP_MANAGER' | 'DEVELOPER';

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
    'permission_proposal:read', 'permission_proposal:review',
    'super_app:read',
    'user:read',
    'permission:read',
    'organization:read'
  ],
  MINI_APP_MANAGER: [
    'miniapp:create', 'miniapp:read', 'miniapp:update', 'miniapp:submit',
    'permission_proposal:read',
    'permission:read',
    'organization:read'
  ],
  DEVELOPER: [
    'miniapp:read',
    'permission:read',
    'super_app:read'
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
    let email = 'dev@example.com';
    if (currentRole === 'SUPER_ADMIN') email = 'superadmin@example.com';
    else if (currentRole === 'ADMIN') email = 'admin@example.com';
    else if (currentRole === 'MINI_APP_MANAGER') email = 'manager@example.com';


    try {
      // Hit our new BFF proxy
      await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password' })
      });
    } catch(e) {
      console.error('Login failed', e);
    }
  };

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
