"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

type NavItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const mainNavGroups: NavGroup[] = [
  {
    label: 'DASHBOARD',
    items: [
      {
        name: 'Dashboard',
        href: '/',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
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
        name: 'Users',
        href: '/users',
        requiredPermission: 'user:read',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        ),
      },
      {
        name: 'Roles & Permissions',
        href: '/roles',
        requiredPermission: 'role:read',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
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
        name: 'Issues',
        href: '/issues',
        requiredPermission: 'miniapp:read',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        ),
      }
    ]
  },
  {
    label: 'SYSTEM',
    items: [
      {
        name: 'Notifications',
        href: '/notifications',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        ),
      },
      {
        name: 'Audit Logs',
        href: '/audit-logs',
        requiredPermission: 'audit_log:read',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
        ),
      },
      {
        name: 'Settings',
        href: '/settings/profile',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        ),
      },
    ]
  }
];

const settingsNavGroups: NavGroup[] = [
  {
    label: 'SETTINGS',
    items: [
      {
        name: 'Profile & Account',
        href: '/settings/profile',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        ),
      },
      {
        name: 'Access Tokens (PAT)',
        href: '/settings/tokens',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
        ),
      },
      {
        name: 'Telegram & Alerts',
        href: '/settings/telegram',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        ),
      },
      {
        name: 'CI/CD Timing',
        href: '/settings/cicd',
        requiredRole: ['SUPER_ADMIN'],
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        ),
      },
      {
        name: 'Storage Retention',
        href: '/settings/retention',
        requiredRole: ['SUPER_ADMIN'],
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
        ),
      },
      {
        name: 'Guide & Rules',
        href: '/settings/guide',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        ),
      },
    ]
  }
];

import { useSidebar } from '@/components/ui/SidebarContext';
import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

type NavItemWithTab = NavItem & {
  tabKey?: string;
  stepNumber?: number;
};

type NavGroupWithTab = {
  label: string;
  items: NavItemWithTab[];
};

const miniAppRegisterNavGroups: NavGroupWithTab[] = [
  {
    label: 'REGISTRATION WIZARD',
    items: [
      {
        name: 'Basic Information',
        href: '/miniapps/register?step=1',
        tabKey: '1',
        stepNumber: 1,
        icon: null as any,
      },
      {
        name: 'Legal & Compliance',
        href: '/miniapps/register?step=2',
        tabKey: '2',
        stepNumber: 2,
        icon: null as any,
      },
      {
        name: 'Technical Integration',
        href: '/miniapps/register?step=3',
        tabKey: '3',
        stepNumber: 3,
        icon: null as any,
      },
      {
        name: 'Capabilities & Scopes',
        href: '/miniapps/register?step=4',
        tabKey: '4',
        stepNumber: 4,
        icon: null as any,
      },
      {
        name: 'Security Profile',
        href: '/miniapps/register?step=5',
        tabKey: '5',
        stepNumber: 5,
        icon: null as any,
      },
      {
        name: 'Review & Submit',
        href: '/miniapps/register?step=6',
        tabKey: '6',
        stepNumber: 6,
        icon: null as any,
      },
    ],
  },
];

const getMiniAppNavGroups = (miniAppId: string): NavGroupWithTab[] => [
  {
    label: 'CONFIGURATION',
    items: [
      {
        name: 'General Information',
        href: `/miniapps/${miniAppId}?tab=overview`,
        tabKey: 'overview',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        name: 'Legal & Compliance',
        href: `/miniapps/${miniAppId}?tab=legal`,
        tabKey: 'legal',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
      },
      {
        name: 'Developer & Team',
        href: `/miniapps/${miniAppId}?tab=team`,
        tabKey: 'team',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
      },
      {
        name: 'Package & Integration',
        href: `/miniapps/${miniAppId}?tab=integration`,
        tabKey: 'integration',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        ),
      },
      {
        name: 'Capabilities & Scopes',
        href: `/miniapps/${miniAppId}?tab=permissions`,
        tabKey: 'permissions',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'OPERATIONS & RELEASES',
    items: [
      {
        name: 'Version History',
        href: `/miniapps/${miniAppId}?tab=versions`,
        tabKey: 'versions',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        ),
      },
      {
        name: 'Security & Validation',
        href: `/miniapps/${miniAppId}?tab=report`,
        tabKey: 'report',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
      },
      {
        name: 'Activity History',
        href: `/miniapps/${miniAppId}?tab=activity`,
        tabKey: 'activity',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
    ],
  },
];

const getCapabilityNavGroups = (capabilityId: string): NavGroupWithTab[] => [
  {
    label: 'CAPABILITY SPECIFICATIONS',
    items: [
      {
        name: 'Runtime & Bridge Specs',
        href: `/capabilities/${capabilityId}?tab=specs`,
        tabKey: 'specs',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        ),
      },
      {
        name: 'Associated MiniApps',
        href: `/capabilities/${capabilityId}?tab=apps`,
        tabKey: 'apps',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        ),
      },
      {
        name: 'Governance & Edit',
        href: `/capabilities/${capabilityId}?tab=config`,
        tabKey: 'config',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
      },
    ],
  },
];

const getUserNavGroups = (userId: string): NavGroupWithTab[] => [
  {
    label: 'USER PROFILE & ACCESS',
    items: [
      {
        name: 'Overview & Identity',
        href: `/users/${userId}?tab=overview`,
        tabKey: 'overview',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
      },
      {
        name: 'Roles & Permissions',
        href: `/users/${userId}?tab=permissions`,
        tabKey: 'permissions',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
      },
      {
        name: 'Associated MiniApps',
        href: `/users/${userId}?tab=miniapps`,
        tabKey: 'miniapps',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
          </svg>
        ),
      },
      {
        name: 'Audit Activity',
        href: `/users/${userId}?tab=activity`,
        tabKey: 'activity',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
    ],
  },
];

function SidebarNavContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { can, user, role } = useAuth();
  const isSuperOrAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN' || can('organization:manage');
  const { isCollapsed, isWizardStepAllowed, completedWizardSteps } = useSidebar();

  const isSettingsMode = pathname.startsWith('/settings');
  const isMiniAppRegisterMode = pathname.startsWith('/miniapps/register');
  const isMiniAppDetailMode =
    !isMiniAppRegisterMode &&
    pathname.startsWith('/miniapps/') &&
    pathname !== '/miniapps';
  const isCapabilityDetailMode =
    pathname.startsWith('/capabilities/') &&
    pathname !== '/capabilities';
  const isUserDetailMode =
    pathname.startsWith('/users/') &&
    pathname !== '/users';

  const miniAppId = isMiniAppDetailMode ? pathname.split('/')[2] || '' : '';
  const capabilityId = isCapabilityDetailMode ? pathname.split('/')[2] || '' : '';
  const userId = isUserDetailMode ? pathname.split('/')[2] || '' : '';
  const currentTab = searchParams?.get('tab') || (isCapabilityDetailMode ? 'specs' : 'overview');
  const currentStep = parseInt(searchParams?.get('step') || '1', 10);

  let activeNavGroups: (NavGroup | NavGroupWithTab)[] = mainNavGroups;
  if (isSettingsMode) {
    activeNavGroups = settingsNavGroups;
  } else if (isMiniAppRegisterMode) {
    activeNavGroups = miniAppRegisterNavGroups;
  } else if (isMiniAppDetailMode) {
    activeNavGroups = getMiniAppNavGroups(miniAppId);
  } else if (isCapabilityDetailMode) {
    activeNavGroups = getCapabilityNavGroups(capabilityId);
  } else if (isUserDetailMode) {
    activeNavGroups = getUserNavGroups(userId);
  }

  return (
    <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-4'} mt-4 overflow-y-auto overflow-x-hidden no-scrollbar pb-6 space-y-4 transition-all duration-300`}>
      {/* Contextual Back Button when inside Settings */}
      {isSettingsMode && (
        <div className="mb-2 pb-2 border-b border-brand-900/60 dark:border-slate-800/80">
          <Link
            href="/"
            title={isCollapsed ? 'Back to Main Menu' : undefined}
            className={`flex items-center ${
              isCollapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-2'
            } rounded-lg text-sm font-semibold text-brand-200 hover:text-white hover:bg-white/10 transition-all duration-200 group`}
          >
            <svg
              className="w-4 h-4 text-brand-400 group-hover:text-white transition-transform duration-200 group-hover:-translate-x-1 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {!isCollapsed && <span className="tracking-wide">Back to Main Menu</span>}
          </Link>
        </div>
      )}

      {/* Contextual Back Button when inside MiniApp Detail or Register */}
      {(isMiniAppDetailMode || isMiniAppRegisterMode) && (
        <div className="mb-2 pb-2 border-b border-brand-900/60 dark:border-slate-800/80">
          <Link
            href="/miniapps"
            title={isCollapsed ? 'Back to MiniApps' : undefined}
            className={`flex items-center ${
              isCollapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-2'
            } rounded-lg text-sm font-semibold text-brand-200 hover:text-white hover:bg-white/10 transition-all duration-200 group`}
          >
            <svg
              className="w-4 h-4 text-brand-400 group-hover:text-white transition-transform duration-200 group-hover:-translate-x-1 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {!isCollapsed && <span className="tracking-wide">Back to MiniApps</span>}
          </Link>
        </div>
      )}

      {/* Contextual Back Button when inside Capability Detail */}
      {isCapabilityDetailMode && (
        <div className="mb-2 pb-2 border-b border-brand-900/60 dark:border-slate-800/80">
          <Link
            href="/capabilities"
            title={isCollapsed ? 'Back to Capabilities' : undefined}
            className={`flex items-center ${
              isCollapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-2'
            } rounded-lg text-sm font-semibold text-brand-200 hover:text-white hover:bg-white/10 transition-all duration-200 group`}
          >
            <svg
              className="w-4 h-4 text-brand-400 group-hover:text-white transition-transform duration-200 group-hover:-translate-x-1 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {!isCollapsed && <span className="tracking-wide">Back to Capabilities</span>}
          </Link>
        </div>
      )}

      {/* Contextual Back Button when inside User Detail */}
      {isUserDetailMode && (
        <div className="mb-2 pb-2 border-b border-brand-900/60 dark:border-slate-800/80">
          <Link
            href="/users"
            title={isCollapsed ? 'Back to Users' : undefined}
            className={`flex items-center ${
              isCollapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-2'
            } rounded-lg text-sm font-semibold text-brand-200 hover:text-white hover:bg-white/10 transition-all duration-200 group`}
          >
            <svg
              className="w-4 h-4 text-brand-400 group-hover:text-white transition-transform duration-200 group-hover:-translate-x-1 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {!isCollapsed && <span className="tracking-wide">Back to Users</span>}
          </Link>
        </div>
      )}

      {/* Registration Progress Summary (Expanded sidebar only) */}
      {isMiniAppRegisterMode && !isCollapsed && (
        <div className="mb-3 px-3 py-2.5 rounded-xl bg-brand-900/40 dark:bg-slate-900/60 border border-brand-800/40 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-brand-200">Wizard Progress</span>
            <span className="font-mono text-brand-400 font-bold">{Math.round((currentStep / 6) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full bg-brand-950 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${(currentStep / 6) * 100}%` }}
            />
          </div>
        </div>
      )}

      {activeNavGroups.map((group) => {
        // Filter items based on permissions and roles
        const visibleItems = group.items.filter((item: NavItemWithTab) => {
          if (item.requiredPermission && !can(item.requiredPermission)) return false;
          if (item.requiredRole && (!role || !item.requiredRole.includes(role))) return false;
          return true;
        });

        if (visibleItems.length === 0) return null;

        return (
          <div key={group.label} className="space-y-1">
            {!isCollapsed ? (
              <h3 className="px-3 text-[11px] font-bold uppercase tracking-widest text-brand-400 mb-1.5">{group.label}</h3>
            ) : (
              <div className="h-px bg-brand-900/60 dark:bg-slate-800/80 my-2 mx-2" />
            )}
            <div className="space-y-1">
              {visibleItems.map((item: NavItemWithTab) => {
                let targetHref = item.href;
                let displayName = item.name;

                if (item.href === '/organizations') {
                  if (!isSuperOrAdmin) {
                    displayName = 'My Organization';
                    targetHref = user?.organizationId ? `/organizations/${user.organizationId}` : '/organizations';
                  }
                }

                let isActive = false;
                let itemIcon = item.icon;

                if (isMiniAppRegisterMode) {
                  const stepNum = item.stepNumber || 1;
                  isActive = currentStep === stepNum;
                  const isCompleted = Boolean(completedWizardSteps[stepNum]);
                  const isAllowed = isWizardStepAllowed(stepNum);

                  itemIcon = isActive ? (
                    <span className="w-5 h-5 flex items-center justify-center rounded-md text-xs font-bold bg-brand-500 text-white shadow-sm border border-brand-400">
                      {stepNum}
                    </span>
                  ) : isCompleted ? (
                    <span className="w-5 h-5 flex items-center justify-center rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  ) : isAllowed ? (
                    <span className="w-5 h-5 flex items-center justify-center rounded-md text-xs font-medium text-brand-300/80 border border-brand-700/80">
                      {stepNum}
                    </span>
                  ) : (
                    <span className="w-5 h-5 flex items-center justify-center rounded-md text-xs font-medium text-slate-500 border border-slate-700/50 bg-slate-900/30">
                      {stepNum}
                    </span>
                  );

                  if (!isAllowed) {
                    return (
                      <div
                        key={item.href}
                        title={isCollapsed ? `Step ${stepNum}: Complete required info to unlock` : 'Complete required information to unlock this step'}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold opacity-35 cursor-not-allowed select-none text-slate-400"
                      >
                        <span className="shrink-0">{itemIcon}</span>
                        {!isCollapsed && <span className="truncate tracking-wide">{displayName}</span>}
                      </div>
                    );
                  }
                } else if (isMiniAppDetailMode || isCapabilityDetailMode || isUserDetailMode) {
                  isActive = item.tabKey ? currentTab === item.tabKey : false;
                } else {
                  isActive = pathname === targetHref || (targetHref !== '/' && pathname.startsWith(targetHref));
                }
                
                return (
                  <Link 
                    key={item.href} 
                    href={targetHref} 
                    title={isCollapsed ? (isMiniAppRegisterMode ? `Step ${item.stepNumber}: ${displayName}` : displayName) : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 group relative ${
                      isActive 
                        ? 'bg-brand-500/10 text-white font-bold border-l-2 border-brand-400 pl-[10px]' 
                        : 'text-brand-100 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className={`shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                      isActive ? 'text-brand-400' : 'text-brand-300 group-hover:text-white'
                    }`}>
                      {itemIcon}
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

export function SidebarNav() {
  return (
    <Suspense fallback={<nav className="flex-1 px-4 mt-4 overflow-y-auto" />}>
      <SidebarNavContent />
    </Suspense>
  );
}
