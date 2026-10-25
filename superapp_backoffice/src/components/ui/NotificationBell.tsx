'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { notificationsApi, NotificationItem } from '@/api';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';
import {
  getNotificationTarget,
  getNotificationTypeStyle,
  formatNotificationRelativeTime,
} from '@/lib/notification-target.helper';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const data = await notificationsApi.getAll();
      setNotifications(Array.isArray(data) ? data : (data as any)?.data || []);
    } catch (error) {
      console.error('Failed to fetch initial notifications', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewNotification = useCallback((notificationData: any) => {
    setNotifications((prev) => {
      if (prev.some((n) => n.id === notificationData.id)) {
        return prev.map((n) => (n.id === notificationData.id ? notificationData : n));
      }
      return [notificationData, ...prev];
    });
  }, []);

  useNotificationSocket(handleNewNotification);

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close dropdown on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const hasUnread = unreadCount > 0;
  const isActive = pathname.startsWith('/notifications') || isOpen;

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMarkingAll || unreadCount === 0) return;
    setIsMarkingAll(true);
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await notificationsApi.markAllAsRead();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleItemClick = (item: NotificationItem) => {
    // 1. Mark as read immediately if unread
    if (!item.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      notificationsApi.markAsRead(item.id).catch(() => {});
    }

    // 2. Close dropdown and navigate to dedicated Notification Detail Page
    setIsOpen(false);
    router.push(`/notifications/${item.id}`);
  };

  const handleQuickNavigate = (e: React.MouseEvent, item: NotificationItem) => {
    e.stopPropagation();
    if (!item.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      notificationsApi.markAsRead(item.id).catch(() => {});
    }
    setIsOpen(false);

    const target = getNotificationTarget(item);
    if (target.isExternal) {
      window.open(target.href, '_blank', 'noopener,noreferrer');
    } else {
      router.push(target.href);
    }
  };

  const displayedNotifications = notifications.slice(0, 6);

  return (
    <div ref={containerRef} className="relative">
      {/* 1. Header Trigger Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors relative focus:outline-none cursor-pointer rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800/50"
        title="Notifications Center"
        aria-label="Toggle notifications dropdown"
        aria-expanded={isOpen}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs animate-in zoom-in duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 2. Notifications Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Dropdown Header */}
          <div className="p-3.5 sm:px-4 sm:py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Notifications
              </h4>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  {unreadCount} new
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  All read
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAll}
                className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors cursor-pointer"
              >
                {isMarkingAll ? 'Marking...' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* Notification Items List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 no-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2 text-slate-400">
                <svg className="animate-spin h-5 w-5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-[11px] font-medium">Loading notifications...</span>
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-2.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  No notifications
                </h5>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  You are all caught up!
                </p>
              </div>
            ) : (
              displayedNotifications.map((item) => {
                const style = getNotificationTypeStyle(item.type, item.title);
                const target = getNotificationTarget(item);
                const showQuickAction = target.href !== '/notifications' || target.isExternal;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`p-3 sm:p-3.5 transition-all duration-150 flex items-start gap-3 cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-800/70 ${
                      !item.isRead ? 'bg-brand-50/20 dark:bg-slate-800/40' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${style.bg} shadow-2xs mt-0.5`}>
                      {style.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <h5 className={`text-xs truncate ${!item.isRead ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-700 dark:text-slate-300'}`}>
                          {item.title}
                        </h5>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-medium">
                          {formatNotificationRelativeTime(item.createdAt)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                        {item.message}
                      </p>

                      <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                        {showQuickAction ? (
                          <button
                            type="button"
                            onClick={(e) => handleQuickNavigate(e, item)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/40 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors shadow-2xs cursor-pointer"
                          >
                            <span>{target.label}</span>
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            Notification Detail
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 dark:text-slate-500 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors font-medium">
                          Page Details →
                        </span>
                      </div>
                    </div>

                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-brand-600 dark:bg-brand-400 ring-4 ring-brand-500/20 shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Dropdown Footer */}
          <div className="p-2 sm:px-3 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="w-full py-2 text-center text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 hover:bg-brand-50/60 dark:hover:bg-brand-950/40 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <span>View all notifications</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
