"use client";

import React from 'react';
import { useAuth, Role } from '@/lib/auth';

export function RoleSwitcher() {
  const { role, setRole } = useAuth();
  
  const roles: Role[] = ['SUPER_ADMIN', 'ADMIN', 'MINI_APP_MANAGER', 'DEVELOPER'];
  
  return (
    <select 
      value={role}
      onChange={(e) => setRole(e.target.value as Role)}
      className="bg-transparent border border-slate-300 dark:border-slate-700 rounded-md text-xs font-semibold p-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
    >
      {roles.map(r => (
        <option key={r} value={r} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
          {r.replace(/_/g, ' ')}
        </option>
      ))}
    </select>
  );
}
