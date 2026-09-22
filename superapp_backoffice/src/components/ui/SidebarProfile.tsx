"use client";

import { useAuth } from '@/lib/auth';
import { useSidebar } from '@/components/ui/SidebarContext';

export function SidebarProfile() {
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();
  
  const userName = user?.name || 'Administrator';
  const userEmail = user?.email || (process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL || 'admin@superapp.local');
  const initials = userName
    .split(' ')
    .map(w => w.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className={`${isCollapsed ? 'p-2' : 'p-4'} mt-auto transition-all duration-300`}>
      <div 
        title={isCollapsed ? `${userName} (${userEmail})` : undefined}
        className={`bg-brand-900 dark:bg-brand-900/50 rounded-xl ${
          isCollapsed ? 'p-2 justify-center' : 'p-3.5 space-x-3'
        } border border-brand-800 dark:border-brand-800 flex items-center transition-colors`}
      >
        <div className="w-9 h-9 rounded-full bg-brand-100/10 dark:bg-brand-900/40 flex items-center justify-center border-2 border-brand-700/50 shrink-0">
          <span className="text-xs font-bold text-brand-200">{initials}</span>
        </div>
        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{userName}</p>
            <p className="text-xs text-brand-200 truncate">{userEmail}</p>
          </div>
        )}
      </div>
    </div>
  );
}
