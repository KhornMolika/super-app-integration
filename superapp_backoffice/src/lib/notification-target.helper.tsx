import React from 'react';
import { NotificationItem } from '@/api';

export interface NotificationTarget {
  label: string;
  href: string;
  isExternal: boolean;
  actionText?: string;
}

export function getNotificationTarget(item: NotificationItem): NotificationTarget {
  const metadata = item.metadata || item.data || {};

  // 1. Explicit link or URL in metadata
  const link = metadata.link || metadata.url || metadata.targetUrl || metadata.actionUrl;
  if (link && typeof link === 'string') {
    const isExt = link.startsWith('http://') || link.startsWith('https://');
    return {
      label: 'Open External Link',
      href: link,
      isExternal: isExt,
      actionText: 'Open Resource',
    };
  }

  // 2. APK or Download URL
  const downloadUrl = metadata.apkUrl || metadata.downloadUrl || metadata.nexusUrl;
  if (downloadUrl && typeof downloadUrl === 'string') {
    return {
      label: 'Download APK Package',
      href: downloadUrl,
      isExternal: true,
      actionText: 'Download Artifact',
    };
  }

  // 3. SuperApp Build or SuperApp status
  const rawAppId = item.miniApp?.id || item.miniAppId;
  const isSuperApp =
    rawAppId === 'superapp' ||
    item.type?.includes('BUILD') ||
    item.type === 'TEST_BUILD_READY' ||
    item.type === 'BUILD_COMPLETED' ||
    item.type === 'BUILD_FAILED' ||
    item.title?.toLowerCase().includes('superapp') ||
    metadata.appName === 'superapp' ||
    metadata.target === 'superapp';

  if (isSuperApp) {
    if (downloadUrl && typeof downloadUrl === 'string') {
      return {
        label: 'Download APK Package',
        href: downloadUrl,
        isExternal: true,
        actionText: 'Download Artifact',
      };
    }
    return {
      label: 'Notifications Center',
      href: '/notifications',
      isExternal: false,
      actionText: 'View Notification',
    };
  }

  // 4. MiniApp Details (valid ID only - prevent /miniapps/superapp)
  if (rawAppId && rawAppId !== 'superapp') {
    const appName = item.miniApp?.name || metadata.miniAppName;
    return {
      label: appName ? `${appName} Dashboard` : 'MiniApp Details',
      href: `/miniapps/${rawAppId}`,
      isExternal: false,
      actionText: 'View MiniApp',
    };
  }

  // 5. Capability Proposals
  if (
    item.type === 'PROPOSAL_CREATED' ||
    item.type?.includes('PERMISSION') ||
    item.type?.includes('CAPABILITY') ||
    item.title?.toLowerCase().includes('capability') ||
    item.title?.toLowerCase().includes('proposal')
  ) {
    return {
      label: 'Capability Proposals',
      href: '/capabilities',
      isExternal: false,
      actionText: 'Review Proposals',
    };
  }

  // 6. Security issues & Audits
  if (item.type?.includes('ISSUE') || item.title?.toLowerCase().includes('issue')) {
    return {
      label: 'Security Issues',
      href: '/issues',
      isExternal: false,
      actionText: 'Inspect Issue',
    };
  }

  // 7. Audit logs
  if (item.type?.includes('AUDIT') || item.title?.toLowerCase().includes('audit')) {
    return {
      label: 'Audit Trail Logs',
      href: '/audit-logs',
      isExternal: false,
      actionText: 'View Audit Logs',
    };
  }

  // 8. Default back to notifications
  return {
    label: 'Notifications Center',
    href: '/notifications',
    isExternal: false,
    actionText: 'All Notifications',
  };
}

export function getNotificationTypeStyle(type?: string, title?: string) {
  const text = `${type || ''} ${title || ''}`.toLowerCase();

  if (text.includes('passed') || text.includes('approved') || text.includes('activated') || text.includes('success')) {
    return {
      category: 'Success',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
      badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
      icon: (
        <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    };
  }

  if (text.includes('failed') || text.includes('issue') || text.includes('rejected') || text.includes('unreachable') || text.includes('error')) {
    return {
      category: 'Alert',
      bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/50',
      badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
      icon: (
        <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    };
  }

  if (text.includes('test') || text.includes('apk') || text.includes('build')) {
    return {
      category: 'Build & Testing',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50',
      badge: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
      icon: (
        <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
    };
  }

  if (text.includes('scan') || text.includes('security')) {
    return {
      category: 'Security',
      bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
      badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
      icon: (
        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    };
  }

  return {
    category: 'System',
    bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
    badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    icon: (
      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  };
}

export function formatNotificationRelativeTime(isoString?: string): string {
  if (!isoString) return 'recently';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
