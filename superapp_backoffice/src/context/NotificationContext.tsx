'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { notificationsApi, NotificationItem } from '@/api';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';

export interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  readCount: number;
  isLoading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshNotifications = useCallback(async () => {
    try {
      const data = await notificationsApi.getAll();
      const rawList = Array.isArray(data) ? data : (data as any)?.data || [];
      const validList = rawList.filter(
        (n: any) => n && typeof n === 'object' && n.id && n.id !== 'undefined'
      );
      setNotifications(validList);
    } catch (error) {
      console.error('Failed to load notifications in context:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle incoming live websocket notifications
  const handleNewNotification = useCallback((notificationData: any) => {
    const item: NotificationItem =
      notificationData?.data && typeof notificationData.data === 'object' && notificationData.data.id
        ? notificationData.data
        : notificationData;

    if (!item || !item.id || item.id === 'undefined') return;

    setNotifications((prev) => {
      if (prev.some((n) => n.id === item.id)) {
        return prev.map((n) => (n.id === item.id ? { ...n, ...item } : n));
      }
      return [item, ...prev];
    });
  }, []);

  useNotificationSocket(handleNewNotification);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    if (!id || id === 'undefined' || id === 'null') return;
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    try {
      await notificationsApi.markAsRead(id);
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await notificationsApi.markAllAsRead();
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    if (!id || id === 'undefined' || id === 'null') return;
    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await notificationsApi.delete(id);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const readCount = useMemo(
    () => notifications.filter((n) => n.isRead).length,
    [notifications]
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      readCount,
      isLoading,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
      deleteNotification,
    }),
    [
      notifications,
      unreadCount,
      readCount,
      isLoading,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
      deleteNotification,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
