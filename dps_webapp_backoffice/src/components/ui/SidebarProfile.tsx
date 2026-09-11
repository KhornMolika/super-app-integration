"use client";

import { useAuth } from '@/lib/auth';

export function SidebarProfile() {
  const { user } = useAuth();
  
  const initials = user.name
    .split(' ')
    .map(w => w.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="p-4 mt-auto">
      <div className="bg-brand-900 dark:bg-brand-900/50 rounded-xl p-4 border border-brand-800 dark:border-brand-800 flex items-center space-x-3 transition-colors">
        <div className="w-10 h-10 rounded-full bg-brand-100/10 dark:bg-brand-900/40 flex items-center justify-center border-2 border-brand-700/50 shrink-0">
          <span className="text-sm font-bold text-brand-200">{initials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{user.name}</p>
          <p className="text-xs text-brand-200 truncate">{user.email}</p>
        </div>
      </div>
    </div>
  );
}
