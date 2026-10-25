'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { notificationsApi, NotificationItem } from '@/api';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';
import { toast } from '@/components/ui/Toast';
import {
  getNotificationTarget,
  getNotificationTypeStyle,
  formatNotificationRelativeTime,
} from '@/lib/notification-target.helper';
import {
  NotificationFilterModal,
} from '@/components/notifications/NotificationFilterModal';
import {
  NotificationCategory,
  NotificationFiltersState,
  NotificationReadStatus,
  DEFAULT_FILTERS,
  matchNotification,
  getNotificationCategory,
  countActiveFilters,
} from '@/components/notifications/notification-filter.types';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<NotificationFiltersState>(DEFAULT_FILTERS);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationsApi.getAll();
      setNotifications(Array.isArray(data) ? data : (data as any)?.data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleNewNotification = useCallback((newNotif: any) => {
    setNotifications((prev) => {
      if (prev.some((n) => n.id === newNotif.id)) {
        return prev.map((n) => (n.id === newNotif.id ? newNotif : n));
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
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      await notificationsApi.markAsRead(id);
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await notificationsApi.markAllAsRead();
      toast.success('All notifications marked as read.', 'Notifications');
    } catch (err) {
      console.error('Failed to mark all read:', err);
      toast.error('Failed to mark all notifications as read.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      await notificationsApi.delete(id);
      toast.info('Notification dismissed.', 'Removed');
    } catch (err) {
      console.error('Failed to delete notification:', err);
      toast.error('Failed to delete notification.');
    }
  };

  const handleCardClick = (e: React.MouseEvent, item: NotificationItem) => {
    // If clicked on an interactive button or action, don't trigger card navigation
    if ((e.target as HTMLElement).closest('button, a')) {
      return;
    }
    if (!item.isRead) {
      handleMarkAsRead(item.id);
    }
    router.push(`/notifications/${item.id}`);
  };

  // Live filter evaluation
  const filteredNotifications = useMemo(() => {
    const activeFiltersWithSearch: NotificationFiltersState = {
      ...filters,
      searchQuery,
    };
    return notifications.filter((n) => matchNotification(n, activeFiltersWithSearch));
  }, [notifications, filters, searchQuery]);

  // Status counts
  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);
  const readCount = useMemo(() => notifications.filter((n) => n.isRead).length, [notifications]);

  // Active filters count for deep filter button badge
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  // Handlers for Quick Status Tabs
  const handleSetReadStatus = (status: NotificationReadStatus) => {
    setFilters((prev) => ({ ...prev, readStatus: status }));
  };

  // Remove a specific category from active filters
  const handleRemoveCategory = (cat: NotificationCategory) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c !== cat),
    }));
  };

  const handleClearAllFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery('');
  };

  const hasAnyActiveFilters =
    filters.readStatus !== 'ALL' ||
    filters.categories.length > 0 ||
    filters.severity !== 'ALL' ||
    filters.timeframe !== 'ALL' ||
    searchQuery.trim().length > 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out space-y-6">
      {/* Top Header Section matching other pages */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Real-time platform alerts, security validation audits, and automated test build milestones.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isProcessing}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Mark all as read</span>
            </button>
          )}
          <button
            onClick={fetchNotifications}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 transition-all shadow-xs cursor-pointer"
            title="Refresh notifications"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter Toolbar & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Segment Control: All / Unread / Read */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            {[
              { id: 'ALL' as NotificationReadStatus, label: 'All', count: notifications.length },
              { id: 'UNREAD' as NotificationReadStatus, label: 'Unread', count: unreadCount },
              { id: 'READ' as NotificationReadStatus, label: 'Read', count: readCount },
            ].map((tab) => {
              const isActive = filters.readStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSetReadStatus(tab.id)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400'
                          : 'bg-slate-300/60 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Deep Filter Trigger & Search Bar */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Deep Filter Modal Button */}
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-2 cursor-pointer shadow-xs whitespace-nowrap ${
                activeFilterCount > 0
                  ? 'bg-brand-50 dark:bg-brand-950/50 border-brand-500 text-brand-600 dark:text-brand-400 ring-2 ring-brand-500/20'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60'
              }`}
            >
              <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Deep Filter</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Real-time Search */}
            <div className="relative flex-1 lg:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, mini app, message..."
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 pl-9 pr-8 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              />
              <svg className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Active Filter Chips / Indicators Row */}
        {hasAnyActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
            <span className="text-slate-400 dark:text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
              Active:
            </span>

            {/* Read Status Chip */}
            {filters.readStatus !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800/60">
                <span>Status: {filters.readStatus === 'UNREAD' ? 'Unread' : 'Read'}</span>
                <button
                  onClick={() => handleSetReadStatus('ALL')}
                  className="hover:text-rose-500 cursor-pointer ml-0.5"
                >
                  ✕
                </button>
              </span>
            )}

            {/* Categories Chips */}
            {filters.categories.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60"
              >
                <span>Category: {cat}</span>
                <button
                  onClick={() => handleRemoveCategory(cat)}
                  className="hover:text-rose-500 cursor-pointer ml-0.5"
                >
                  ✕
                </button>
              </span>
            ))}

            {/* Severity Chip */}
            {filters.severity !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                <span>Severity: {filters.severity}</span>
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, severity: 'ALL' }))}
                  className="hover:text-rose-500 cursor-pointer ml-0.5"
                >
                  ✕
                </button>
              </span>
            )}

            {/* Timeframe Chip */}
            {filters.timeframe !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <span>Time: {filters.timeframe}</span>
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, timeframe: 'ALL' }))}
                  className="hover:text-rose-500 cursor-pointer ml-0.5"
                >
                  ✕
                </button>
              </span>
            )}

            {/* Search query chip */}
            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <span>Query: &quot;{searchQuery}&quot;</span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="hover:text-rose-500 cursor-pointer ml-0.5"
                >
                  ✕
                </button>
              </span>
            )}

            {/* Clear All Button */}
            <button
              onClick={handleClearAllFilters}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer ml-1 inline-flex items-center gap-1"
            >
              <span>Reset all</span>
            </button>
          </div>
        )}
      </div>

      {/* Deep Filter Modal Dialog */}
      <NotificationFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={filters}
        onApply={(newFilters) => setFilters(newFilters)}
        notifications={notifications}
      />

      {/* Notifications Feed */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
          <svg className="animate-spin h-8 w-8 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-3 font-medium">Loading notifications...</span>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-12 text-center shadow-xs">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3 border border-slate-200 dark:border-slate-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
            {hasAnyActiveFilters ? 'No matching notifications found' : 'No notifications'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {hasAnyActiveFilters
              ? 'No notifications match the active filter criteria. Try resetting your filters or search query.'
              : "You're all caught up! New platform alerts and pipeline events will appear here in real time."}
          </p>
          {hasAnyActiveFilters && (
            <button
              onClick={handleClearAllFilters}
              className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>Reset all filters</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-700/50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/40">
          {filteredNotifications.map((item) => {
            const style = getNotificationTypeStyle(item.type, item.title);

            return (
              <div
                key={item.id}
                onClick={(e) => handleCardClick(e, item)}
                className={`group relative px-4 py-3 sm:px-5 sm:py-3.5 transition-all duration-150 flex items-center justify-between gap-3.5 cursor-pointer ${
                  !item.isRead
                    ? 'bg-blue-50/40 dark:bg-slate-800/90 hover:bg-blue-50/70 dark:hover:bg-slate-800'
                    : 'bg-white dark:bg-slate-800/40 hover:bg-slate-50/90 dark:hover:bg-slate-800/70'
                }`}
              >
                {/* Left: Indicator Icon & Clean Content */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Compact Category Icon */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${style.bg} shadow-2xs group-hover:scale-105 transition-transform [&_svg]:w-4 [&_svg]:h-4`}
                  >
                    {style.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Title Row with Relative Time & Unread Dot */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-brand-500 ring-2 ring-brand-500/20 flex-shrink-0" />
                      )}
                      <h4
                        className={`text-xs sm:text-sm font-semibold truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors ${
                          !item.isRead
                            ? 'text-slate-900 dark:text-white font-bold'
                            : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {item.title}
                      </h4>

                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono flex-shrink-0">
                        • {formatNotificationRelativeTime(item.createdAt)}
                      </span>

                      {item.miniApp?.name && (
                        <span className="hidden sm:inline-flex text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                          {item.miniApp.name}
                        </span>
                      )}
                    </div>

                    {/* Clean Message Subtitle */}
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {item.message}
                    </p>
                  </div>
                </div>

                {/* Right: Quick Actions & Chevron hint */}
                <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {!item.isRead ? (
                    <button
                      onClick={() => handleMarkAsRead(item.id)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                      title="Mark as read"
                    >
                      Mark read
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 px-1.5 py-0.5">Read</span>
                  )}

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Delete notification"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>

                  <div className="text-slate-400 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all pl-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
