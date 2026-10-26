'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { notificationsApi, NotificationItem } from '@/api';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';
import { toast } from '@/components/ui/Toast';
import { BackButton } from '@/components/ui/BackButton';
import { AppLogoAvatar } from '@/components/ui/AppLogoAvatar';
import {
  getNotificationTarget,
  getNotificationTypeStyle,
  formatNotificationRelativeTime,
} from '@/lib/notification-target.helper';

export default function NotificationDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  const rawId =
    (typeof routeParams?.id === 'string'
      ? routeParams.id
      : Array.isArray(routeParams?.id)
      ? routeParams.id[0]
      : '') || '';
  const id = rawId && rawId !== 'undefined' && rawId !== 'null' ? rawId : '';

  const [notification, setNotification] = useState<NotificationItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionPending, setIsActionPending] = useState(false);
  const [isJsonExpanded, setIsJsonExpanded] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchNotification = useCallback(async () => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // 1. Try single item endpoint
      try {
        const item = await notificationsApi.getById(id);
        if (item && item.id && item.id !== 'undefined') {
          setNotification(item);
          // Auto-mark as read on open if currently unread
          if (!item.isRead) {
            notificationsApi.markAsRead(item.id).catch(() => {});
            setNotification((prev) => (prev ? { ...prev, isRead: true } : null));
          }
          return;
        }
      } catch (directErr) {
        // Fallback to searching all notifications list
      }

      // 2. Fallback to searching getAll() list
      const all = await notificationsApi.getAll();
      const list = Array.isArray(all) ? all : (all as any)?.data || [];
      const found = list.find((n: NotificationItem) => n && n.id === id);

      if (found) {
        setNotification(found);
        if (!found.isRead && found.id && found.id !== 'undefined') {
          notificationsApi.markAsRead(found.id).catch(() => {});
          setNotification((prev) => (prev ? { ...prev, isRead: true } : null));
        }
      } else {
        setNotification(null);
      }
    } catch (err) {
      console.error('Failed to load notification details:', err);
      toast.error('Could not load notification details.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchNotification();
  }, [fetchNotification]);

  // Handle live WebSocket updates for this notification
  const handleLiveEvent = useCallback(
    (eventData: any) => {
      const payload = eventData?.data?.id ? eventData.data : eventData;
      if (payload?.id && id && payload.id === id) {
        setNotification((prev) => (prev ? { ...prev, ...payload } : payload));
      }
    },
    [id]
  );
  useNotificationSocket(handleLiveEvent);

  const handleToggleReadStatus = async () => {
    if (!notification || !notification.id || notification.id === 'undefined' || isActionPending) return;
    setIsActionPending(true);
    const newStatus = !notification.isRead;
    try {
      if (newStatus) {
        await notificationsApi.markAsRead(notification.id);
        toast.success('Notification marked as read.', 'Status Updated');
      } else {
        // Optimistic toggle
        toast.info('Notification marked as unread.', 'Status Updated');
      }
      setNotification((prev) => (prev ? { ...prev, isRead: newStatus } : null));
    } catch (err) {
      console.error('Failed to update read state:', err);
      toast.error('Failed to update notification status.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleDelete = async () => {
    if (!notification || !notification.id || notification.id === 'undefined' || isActionPending) return;
    setIsActionPending(true);
    try {
      await notificationsApi.delete(notification.id);
      toast.info('Notification dismissed.', 'Deleted');
      router.push('/notifications');
    } catch (err) {
      console.error('Failed to delete notification:', err);
      toast.error('Failed to delete notification.');
      setIsActionPending(false);
    }
  };

  const handleCopyText = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/notifications" className="hover:text-slate-600 dark:hover:text-slate-200">
            Notifications
          </Link>
          <span>/</span>
          <span className="text-slate-600 dark:text-slate-300">Loading details...</span>
        </div>
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-16 flex flex-col items-center justify-center text-center shadow-xs">
          <svg className="animate-spin h-8 w-8 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-medium">
            Fetching notification details...
          </span>
        </div>
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="w-full space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/notifications" className="hover:text-slate-600 dark:hover:text-slate-200 inline-flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Notifications</span>
          </Link>
        </div>
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-12 text-center shadow-xs">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-200 dark:border-rose-800/40 flex items-center justify-center mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
            Notification Not Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            This notification might have been dismissed, deleted, or does not exist in the system.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link
              href="/notifications"
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-xs"
            >
              Back to Notifications
            </Link>
            <button
              onClick={fetchNotification}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const style = getNotificationTypeStyle(notification.type, notification.title);
  const target = getNotificationTarget(notification);
  const metadata = notification.metadata || notification.data || {};
  const hasMetadata = Object.keys(metadata).length > 0;
  const apkUrl = metadata.apkUrl || metadata.downloadUrl || metadata.nexusUrl;
  const errorDetails = metadata.error || metadata.errorMessage;
  const formattedDate = notification.createdAt
    ? new Date(notification.createdAt).toLocaleString(undefined, {
        dateStyle: 'full',
        timeStyle: 'medium',
      })
    : 'Unknown Date';

  const showTargetButton = target.href !== '/notifications' || target.isExternal;

  return (
    <div className="w-full min-w-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-12">
      {/* 1. Header Section matching other backoffice pages */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <BackButton href="/notifications" />
          <div>
            {/* Breadcrumb Navigation matching other backoffice pages */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <Link
                href="/notifications"
                className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
              >
                Notifications
              </Link>
              <span>/</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-sm">
                {notification.title}
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {notification.title}
              </h2>

              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${style.badge}`}>
                {style.category}
              </span>

              {notification.type && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {notification.type}
                </span>
              )}

              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                  notification.isRead
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    : 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200/60 dark:border-brand-800/50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${notification.isRead ? 'bg-slate-400' : 'bg-brand-500'}`} />
                <span>{notification.isRead ? 'Read' : 'Unread'}</span>
              </span>
            </div>

            <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs sm:text-sm flex items-center gap-2 flex-wrap">
              <span>{formattedDate}</span>
              <span>•</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {formatNotificationRelativeTime(notification.createdAt)}
              </span>
            </p>
          </div>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {showTargetButton && (
            target.isExternal ? (
              <a
                href={target.href}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>{target.actionText || 'Open Target'}</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ) : (
              <Link
                href={target.href}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>{target.actionText || 'View Target'}</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )
          )}

          <button
            onClick={handleToggleReadStatus}
            disabled={isActionPending}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{notification.isRead ? 'Mark as Unread' : 'Mark as Read'}</span>
          </button>

          <button
            onClick={handleDelete}
            disabled={isActionPending}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs cursor-pointer"
            title="Delete notification"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* 2. Responsive 12-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Notification Message Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-6 relative overflow-hidden">
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${style.bg} shadow-2xs [&_svg]:w-5 [&_svg]:h-5`}>
                {style.icon}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Event Description & Message
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Full notification narrative and operational status update
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-l-4 border-brand-500 dark:border-brand-400 border-y border-r border-slate-200/70 dark:border-slate-700/60">
              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line font-medium">
                {notification.message}
              </p>
            </div>

            {/* Action Destination Callout Banner */}
            {showTargetButton && (
              <div className="mt-5 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Action Target
                  </span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {target.label}
                  </p>
                </div>

                {target.isExternal ? (
                  <a
                    href={target.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors shadow-2xs self-start sm:self-center"
                  >
                    <span>{target.actionText || 'Open Resource'}</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ) : (
                  <Link
                    href={target.href}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors shadow-2xs self-start sm:self-center"
                  >
                    <span>{target.actionText || 'Open Destination'}</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Associated MiniApp Card */}
          {notification.miniApp && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <AppLogoAvatar
                    logo={(notification.miniApp as any)?.logo}
                    name={notification.miniApp.name}
                    size="md"
                  />
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {notification.miniApp.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Associated Mini Application Container
                    </p>
                  </div>
                </div>

                {notification.miniApp.status && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {notification.miniApp.status}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Application Name</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1 truncate">
                    {notification.miniApp.name}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">App ID</span>
                  <p className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-100 mt-1 truncate" title={notification.miniApp.appId || ''}>
                    {notification.miniApp.appId || '—'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Category</span>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-1">
                    {notification.miniApp.category || 'General'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Integration</span>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-1">
                    {notification.miniApp.integrationMethod || 'Default'}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Link
                  href={
                    notification.miniApp.id === 'superapp'
                      ? '/miniapps'
                      : `/miniapps/${notification.miniApp.id}`
                  }
                  className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Open MiniApp Overview</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          )}

          {/* Error Diagnostics Card (if error present) */}
          {errorDetails && (
            <div className="bg-rose-50/60 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900/50 p-6 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-rose-200/60 dark:border-rose-900/40">
                <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                  <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Error Diagnostics & Stack Log</span>
                </h3>

                <button
                  onClick={() => handleCopyText(typeof errorDetails === 'string' ? errorDetails : JSON.stringify(errorDetails, null, 2), 'error')}
                  className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  {copiedKey === 'error' ? 'Copied!' : 'Copy Error Log'}
                </button>
              </div>

              <pre className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-rose-200/70 dark:border-rose-900/60 text-xs font-mono text-rose-800 dark:text-rose-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {typeof errorDetails === 'string'
                  ? errorDetails
                  : JSON.stringify(errorDetails, null, 2)}
              </pre>
            </div>
          )}

          {/* APK & Artifact Download Card (if APK present) */}
          {apkUrl && (
            <div className="bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200">
                      Binary Android APK Package Ready
                    </h4>
                    <p className="text-xs text-indigo-700/80 dark:text-indigo-400/80 mt-0.5">
                      Automated pipeline verified test artifact package is ready for deployment and device testing.
                    </p>
                  </div>
                </div>

                <a
                  href={apkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs shrink-0 cursor-pointer"
                >
                  <span>Download APK</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Column (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Event Overview Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Event Overview</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Read Status</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${notification.isRead ? 'bg-slate-400' : 'bg-brand-500'}`} />
                  {notification.isRead ? 'Read' : 'Unread'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Category</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{style.category}</span>
              </div>

              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Event Type</span>
                <span className="font-mono text-[11px] font-semibold text-slate-900 dark:text-slate-100">{notification.type || 'SYSTEM'}</span>
              </div>

              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Target Resource</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[150px]" title={notification.miniApp?.name || 'Platform'}>
                  {notification.miniApp?.name || 'Platform'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Created At</span>
                <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  {formatNotificationRelativeTime(notification.createdAt)}
                </span>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-1">Notification UUID</span>
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 font-mono text-[10px] text-slate-700 dark:text-slate-300">
                  <span className="truncate flex-1">{notification.id}</span>
                  <button
                    onClick={() => handleCopyText(notification.id, 'uuid')}
                    className="p-1 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer"
                    title="Copy UUID"
                  >
                    {copiedKey === 'uuid' ? (
                      <span className="text-emerald-500 font-bold">✓</span>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Metadata Inspector Card */}
          {hasMetadata && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-5">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <span>Metadata Context</span>
                </h3>

                <button
                  onClick={() => setIsJsonExpanded((prev) => !prev)}
                  className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                >
                  {isJsonExpanded ? 'Hide Raw JSON' : 'Raw JSON'}
                </button>
              </div>

              {/* Attributes List */}
              <div className="space-y-2">
                {Object.entries(metadata)
                  .filter(([key]) => key !== 'error' && key !== 'errorMessage')
                  .map(([key, value]) => {
                    const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
                    return (
                      <div
                        key={key}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs"
                      >
                        <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">{key}</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate max-w-[160px] text-right" title={valStr}>
                          {valStr || '—'}
                        </span>
                      </div>
                    );
                  })}
              </div>

              {/* Collapsible Full JSON Tree */}
              {isJsonExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Payload JSON
                    </span>
                    <button
                      onClick={() => handleCopyText(JSON.stringify(metadata, null, 2), 'metadata')}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                    >
                      {copiedKey === 'metadata' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl bg-slate-950 text-slate-100 text-[11px] font-mono overflow-x-auto leading-relaxed border border-slate-800 max-h-60">
                    {JSON.stringify(metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
