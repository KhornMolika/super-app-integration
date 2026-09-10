'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { API_URL } from '@/lib/config';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';

type Notification = {
  id: string;
  miniAppId?: string;
  title: string;
  message: string;
  isRead: boolean;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const pathname = usePathname();

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/mini-apps/notifications`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch initial notifications', error);
    }
  };

  const handleNewNotification = useCallback((notificationData: any) => {
    setNotifications((prev) => {
      if (prev.some(n => n.id === notificationData.id)) {
        return prev.map(n => n.id === notificationData.id ? notificationData : n);
      }
      return [notificationData, ...prev];
    });
  }, []);

  useNotificationSocket(handleNewNotification);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const hasUnread = unreadCount > 0;
  const isActive = pathname === '/notifications';

  return (
    <Link
      href="/notifications"
      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors relative focus:outline-none ${
        isActive
          ? 'bg-brand-50 text-brand-600 dark:bg-slate-800 dark:text-brand-400'
          : 'text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-brand-400 dark:hover:bg-slate-800'
      }`}
      title="Notifications Center"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {hasUnread && (
        <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border-2 border-white dark:border-slate-900"></span>
        </span>
      )}
    </Link>
  );
}
