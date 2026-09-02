'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { API_URL } from '@/lib/config';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';

interface MiniAppMeta {
  id: string;
  name: string;
  appId: string;
  category?: string;
  status?: string;
  integrationMethod?: string;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  miniAppId?: string;
  miniApp?: MiniAppMeta;
  createdAt: string;
  metadata?: any;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'security' | 'testing' | 'review'>('all');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/mini-apps/notifications`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleNewNotification = useCallback((newNotif: any) => {
    setNotifications(prev => {
      if (prev.some(n => n.id === newNotif.id)) {
        return prev.map(n => (n.id === newNotif.id ? newNotif : n));
      }
      return [newNotif, ...prev];
    });
  }, []);

  useNotificationSocket(handleNewNotification);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
      await fetch(`${API_URL}/mini-apps/${id}/mark-read`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      await fetch(`${API_URL}/mini-apps/notifications/mark-all-read`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to mark all read:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setNotifications(prev => prev.filter(n => n.id !== id));
      await fetch(`${API_URL}/mini-apps/notifications/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  // Classify notification into tabs
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      // Tab filter
      if (activeFilter === 'unread' && n.isRead) return false;
      if (activeFilter === 'security') {
        const isSec =
          n.type === 'SCAN_STARTED' ||
          n.type === 'ISSUE_CREATED' ||
          n.type?.includes('SECURITY') ||
          n.title?.toLowerCase().includes('validation') ||
          n.title?.toLowerCase().includes('security');
        if (!isSec) return false;
      }
      if (activeFilter === 'testing') {
        const isTest =
          n.type === 'TESTING_STARTED' ||
          n.type === 'BUILD_COMPLETED' ||
          n.title?.toLowerCase().includes('test') ||
          n.title?.toLowerCase().includes('apk') ||
          n.title?.toLowerCase().includes('build');
        if (!isTest) return false;
      }
      if (activeFilter === 'review') {
        const isRev =
          n.type === 'REVIEW_STARTED' ||
          n.type === 'PROPOSAL_CREATED' ||
          n.title?.toLowerCase().includes('review') ||
          n.title?.toLowerCase().includes('approved') ||
          n.title?.toLowerCase().includes('proposal');
        if (!isRev) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = n.title?.toLowerCase().includes(q);
        const matchesMsg = n.message?.toLowerCase().includes(q);
        const matchesApp = n.miniApp?.name?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesMsg && !matchesApp) return false;
      }

      return true;
    });
  }, [notifications, activeFilter, searchQuery]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getTypeStyle = (type: string, title: string) => {
    const text = `${type} ${title}`.toLowerCase();
    if (text.includes('passed') || text.includes('approved') || text.includes('activated')) {
      return {
        bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        icon: (
          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        ),
      };
    }
    if (text.includes('failed') || text.includes('issue') || text.includes('rejected')) {
      return {
        bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        icon: (
          <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        ),
      };
    }
    if (text.includes('test') || text.includes('apk') || text.includes('build')) {
      return {
        bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        icon: (
          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
        ),
      };
    }
    if (text.includes('scan') || text.includes('security')) {
      return {
        bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        icon: (
          <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
        ),
      };
    }
    return {
      bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      icon: (
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
      ),
    };
  };

  const formatRelativeTime = (isoString?: string) => {
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
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Notifications Center
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time audit alerts, automated security pipeline milestones, and test build assemblies.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isProcessing}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 transition-all shadow-sm flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
              <span>Mark all as read</span>
            </button>
          )}
          <button
            onClick={fetchNotifications}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 transition-all shadow-sm"
            title="Refresh notifications"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
          {[
            { id: 'all', label: 'All', count: notifications.length },
            { id: 'unread', label: 'Unread', count: unreadCount },
            { id: 'security', label: 'Security', count: notifications.filter(n => n.title?.toLowerCase().includes('validation') || n.title?.toLowerCase().includes('security')).length },
            { id: 'testing', label: 'Testing & Builds', count: notifications.filter(n => n.title?.toLowerCase().includes('test') || n.title?.toLowerCase().includes('apk')).length },
            { id: 'review', label: 'Review', count: notifications.filter(n => n.title?.toLowerCase().includes('review') || n.title?.toLowerCase().includes('proposal')).length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeFilter === tab.id
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeFilter === tab.id
                    ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-bold'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Real-time Search */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search notifications..."
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-1.5 pl-9 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Notifications Feed */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <svg className="animate-spin h-8 w-8 text-brand-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xs text-slate-400 mt-3">Loading notifications...</span>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3 border border-slate-200 dark:border-slate-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            {searchQuery ? 'No matching notifications found' : 'No notifications'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery ? `Try adjusting your search query "${searchQuery}".` : "You're all caught up! New platform alerts and pipeline events will appear here in real time."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map(item => {
            const style = getTypeStyle(item.type, item.title);
            return (
              <div
                key={item.id}
                className={`group relative p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                  !item.isRead
                    ? 'bg-white dark:bg-slate-850 border-brand-200 dark:border-brand-900/60 shadow-md ring-1 ring-brand-500/10'
                    : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 hover:bg-white dark:hover:bg-slate-850 shadow-sm'
                }`}
              >
                {/* Left Content */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Category Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 border ${style.bg} shadow-sm`}>
                    {style.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-sm font-bold ${!item.isRead ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                        {item.title}
                      </h4>

                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-brand-500 ring-4 ring-brand-500/20"></span>
                      )}

                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono ml-auto sm:ml-0">
                        • {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      {item.message}
                    </p>

                    {/* Associated Mini App pill */}
                    {(item.miniApp || item.miniAppId) && (
                      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/miniapps/${item.miniApp?.id || item.miniAppId}`}
                          onClick={() => !item.isRead && handleMarkAsRead(item.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800/60 hover:bg-brand-100 transition-colors shadow-2xs"
                        >
                          <svg className="w-3 h-3 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                          <span>{item.miniApp?.name || 'View Mini App'}</span>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>

                        {item.miniApp?.status && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {item.miniApp.status}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-1.5 sm:self-center flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  {!item.isRead ? (
                    <button
                      onClick={() => handleMarkAsRead(item.id)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                      title="Mark as read"
                    >
                      Mark read
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 px-2 py-1">Read</span>
                  )}

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete notification"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
