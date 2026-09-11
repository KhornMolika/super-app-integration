"use client";

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export function HeaderProfile() {
  const { user } = useAuth();
  
  const initials = user.name
    .split(' ')
    .map(w => w.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <Link href="/settings" className="flex items-center space-x-3 cursor-pointer group ml-2" title="View Profile & Settings">
      <div className="text-right hidden sm:block">
        <span className="font-semibold text-sm text-slate-700 dark:text-slate-200 group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors block leading-tight">
          {user.name}
        </span>
        <span className="text-[11px] text-slate-400 block leading-tight mt-0.5">{user.email}</span>
      </div>
      <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-700 dark:text-brand-300 font-bold border-2 border-white dark:border-slate-900 shadow-sm shrink-0">
        {initials}
      </div>
    </Link>
  );
}
