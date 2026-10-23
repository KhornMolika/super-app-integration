"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

type NavItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
  requiredPermission?: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: 'DASHBOARD',
    items: [
      {
        name: 'Dashboard',
        href: '/',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
        ),
      },
      {
        name: 'Notifications',
        href: '/notifications',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        ),
      }
    ]
  },
  {
    label: 'ORGANIZATION',
    items: [
      {
        name: 'Organizations',
        href: '/organizations',
        requiredPermission: 'organization:read',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
        ),
      },
      {
        name: 'Users & Roles',
        href: '/users',
        requiredPermission: 'user:read',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        ),
      }
    ]
  },
  {
    label: 'ECOSYSTEM',
    items: [
      {
        name: 'MiniApps',
        href: '/miniapps',
        requiredPermission: 'miniapp:read',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
        ),
      },
      {
        name: 'Capabilities',
        href: '/capabilities',
        requiredPermission: 'permission:read',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
        ),
      },
      {
        name: 'SuperApp',
        href: '/super-app',
        requiredPermission: 'super_app:read',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
        ),
      }
    ]
  },
  {
    label: 'SYSTEM',
    items: [
      {
        name: 'Audit Logs',
        href: '/audit-logs',
        requiredPermission: 'audit_log:read',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
        ),
      },
      {
        name: 'Settings & Profile',
        href: '/settings',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        ),
      }
    ]
  }
];

import { useSidebar } from '@/components/ui/SidebarContext';

export function SidebarNav() {
  const pathname = usePathname();
  const { can, user, role } = useAuth();
  const isSuperOrAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN' || can('organization:manage');
  const { isCollapsed } = useSidebar();

  return (
    <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-4'} mt-4 overflow-y-auto overflow-x-hidden no-scrollbar pb-6 space-y-4 transition-all duration-300`}>
      {navGroups.map((group) => {
        // Filter items based on permissions
        const visibleItems = group.items.filter(item => 
          !item.requiredPermission || can(item.requiredPermission)
        );

        if (visibleItems.length === 0) return null;

        return (
          <div key={group.label} className="space-y-1">
            {!isCollapsed ? (
              <h3 className="px-3 text-[10px] font-bold uppercase tracking-widest text-brand-400 mb-1.5">{group.label}</h3>
            ) : (
              <div className="h-px bg-brand-900/60 dark:bg-slate-800/80 my-2 mx-2" />
            )}
            <div className="space-y-1">
              {visibleItems.map((item) => {
                let targetHref = item.href;
                let displayName = item.name;

                if (item.href === '/organizations') {
                  if (!isSuperOrAdmin) {
                    displayName = 'My Organization';
                    targetHref = user?.organizationId ? `/organizations/${user.organizationId}` : '/organizations';
                  }
                }

                const isActive = pathname === targetHref || (targetHref !== '/' && pathname.startsWith(targetHref));
                
                return (
                  <Link 
                    key={item.href} 
                    href={targetHref} 
                    title={isCollapsed ? displayName : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 group relative ${
                      isActive 
                        ? 'bg-brand-500/10 text-white font-bold border-l-2 border-brand-400 pl-[10px]' 
                        : 'text-brand-100 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? 'text-brand-400' : 'text-brand-300 group-hover:text-white'
                    }`}>
                      {item.icon}
                    </span>
                    {!isCollapsed && (
                      <span className="truncate tracking-wide">{displayName}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
