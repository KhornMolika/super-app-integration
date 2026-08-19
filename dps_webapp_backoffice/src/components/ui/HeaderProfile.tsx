"use client";

import { useAuth } from '@/lib/auth';

export function HeaderProfile() {
  const { role } = useAuth();
  
  const displayRole = role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  const initials = role.split('_').map(w => w.charAt(0)).join('').substring(0, 2);

  return (
    <div className="flex items-center space-x-3 cursor-pointer group ml-2">
      <span className="font-semibold text-sm text-slate-600 dark:text-slate-300 group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">{displayRole}</span>
      <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-700 dark:text-brand-300 font-bold border-2 border-white dark:border-slate-900 shadow-sm">
        {initials}
      </div>
    </div>
  );
}
