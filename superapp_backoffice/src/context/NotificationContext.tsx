'use client';

import React, { useEffect, ReactNode, useCallback } from 'react';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const handleNewNotification = useCallback((notificationData: any) => {
    addNotification(notificationData);
  }, [addNotification]);

  useNotificationSocket(handleNewNotification);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

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
