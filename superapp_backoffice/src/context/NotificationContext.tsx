'use client';

import React, { useEffect, ReactNode, useCallback } from 'react';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';
import { useAuth } from '@/lib/auth';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const userId = isAuthenticated ? (user?.id ?? null) : null;

  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const syncUserScope = useNotificationStore((s) => s.syncUserScope);

  const handleNewNotification = useCallback((notificationData: any) => {
    const item = notificationData?.data && typeof notificationData.data === 'object'
      ? notificationData.data
      : notificationData;
    const targetUserId = item?.userId;
    if (userId && targetUserId && targetUserId !== userId) {
      return;
    }
    addNotification(notificationData);
  }, [addNotification, userId]);

  useNotificationSocket(handleNewNotification, userId);

  useEffect(() => {
    syncUserScope(userId);
    if (userId) {
      fetchNotifications();
    }
  }, [userId, syncUserScope, fetchNotifications]);

  return <>{children}</>;
}

export function useNotifications() {
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const readCount = useNotificationStore((s) => s.readCount);
  const isLoading = useNotificationStore((s) => s.isLoading);
  const refreshNotifications = useNotificationStore((s) => s.fetchNotifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const deleteNotification = useNotificationStore((s) => s.deleteNotification);

  return {
    notifications,
    unreadCount,
    readCount,
    isLoading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
