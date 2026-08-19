"use client";

import { useAuth } from '@/lib/auth';

export function SidebarProfile() {
  const { role } = useAuth();
  
  // Format role name for display (e.g. SUPER_ADMIN -> Super Admin)
  const displayRole = role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  const initials = role.split('_').map(w => w.charAt(0)).join('').substring(0, 2);

  return (
    <div className="p-4 mt-auto">
      <div className="bg-brand-900 dark:bg-brand-900/50 rounded-xl p-4 border border-brand-800 dark:border-brand-800 flex items-center space-x-3 transition-colors">
        <div className="w-10 h-10 rounded-full bg-brand-100/10 dark:bg-brand-900/40 flex items-center justify-center border-2 border-brand-700/50">
          <span className="text-sm font-bold text-brand-200">{initials}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{displayRole}</p>
          <p className="text-xs text-brand-200">admin@fsa.gov</p>
        </div>
      </div>
    </div>
  );
}
