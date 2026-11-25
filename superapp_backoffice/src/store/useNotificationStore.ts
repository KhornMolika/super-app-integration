import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { notificationsApi, NotificationItem } from '@/api';

interface NotificationStoreState {
  notifications: NotificationItem[];
  unreadCount: number;
  readCount: number;
  isLoading: boolean;
  isInitialized: boolean;
  ownerUserId: string | null;

  syncUserScope: (userId: string | null) => void;
  fetchNotifications: () => Promise<void>;
  addNotification: (raw: any) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

function computeCounts(items: NotificationItem[]) {
  let unread = 0;
  let read = 0;
  for (const n of items) {
    const isRead = n.isRead === true || (n.isRead as any) === 'true';
    if (isRead) read++;
    else unread++;
  }
  return { unreadCount: unread, readCount: read };
}

export const useNotificationStore = create<NotificationStoreState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      readCount: 0,
      isLoading: false,
      isInitialized: false,
      ownerUserId: null,

      syncUserScope: (userId: string | null) => {
        if (get().ownerUserId !== userId) {
          set({
            notifications: [],
            unreadCount: 0,
            readCount: 0,
            isInitialized: false,
            ownerUserId: userId,
          });
        }
      },

      fetchNotifications: async () => {
        set({ isLoading: true });
        try {
          const res = await notificationsApi.getAll();
          const rawList = Array.isArray(res) ? res : (res as any)?.data || [];
          const validList: NotificationItem[] = rawList.filter(
            (n: any) => n && typeof n === 'object' && n.id && n.id !== 'undefined'
          );
          const counts = computeCounts(validList);
          set({
            notifications: validList,
            unreadCount: counts.unreadCount,
            readCount: counts.readCount,
            isLoading: false,
            isInitialized: true,
          });
        } catch (err) {
          console.error('[NotificationStore] Failed to fetch notifications:', err);
          set({ isLoading: false, isInitialized: true });
        }
      },

      addNotification: (notificationData: any) => {
        const item: NotificationItem =
          notificationData?.data && typeof notificationData.data === 'object' && notificationData.data.id
            ? notificationData.data
            : notificationData;

        if (!item || !item.id || item.id === 'undefined') return;

        const current = get().notifications;
        let updated: NotificationItem[];
        if (current.some((n) => n.id === item.id)) {
          updated = current.map((n) => (n.id === item.id ? { ...n, ...item } : n));
        } else {
          updated = [item, ...current];
        }

        const counts = computeCounts(updated);
        set({
          notifications: updated,
          unreadCount: counts.unreadCount,
          readCount: counts.readCount,
        });
      },

      markAsRead: async (id: string) => {
        if (!id || id === 'undefined' || id === 'null') return;
        const current = get().notifications;
        const updated = current.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        );
        const counts = computeCounts(updated);
        set({
          notifications: updated,
          unreadCount: counts.unreadCount,
          readCount: counts.readCount,
        });

        try {
          await notificationsApi.markAsRead(id);
        } catch (err) {
          console.error('[NotificationStore] Failed to mark as read on server:', err);
        }
      },

      markAllAsRead: async () => {
        const current = get().notifications;
        const updated = current.map((n) => ({ ...n, isRead: true }));
        const counts = computeCounts(updated);
        set({
          notifications: updated,
          unreadCount: counts.unreadCount,
          readCount: counts.readCount,
        });

        try {
          await notificationsApi.markAllAsRead();
        } catch (err) {
          console.error('[NotificationStore] Failed to mark all as read on server:', err);
        }
      },

      deleteNotification: async (id: string) => {
        if (!id || id === 'undefined' || id === 'null') return;
        const current = get().notifications;
        const updated = current.filter((n) => n.id !== id);
        const counts = computeCounts(updated);
        set({
          notifications: updated,
          unreadCount: counts.unreadCount,
          readCount: counts.readCount,
        });

        try {
          await notificationsApi.delete(id);
        } catch (err) {
          console.error('[NotificationStore] Failed to delete notification on server:', err);
        }
      },
    }),
    {
      name: 'superapp-notifications-cache',
      partialize: (state) => ({
        notifications: state.notifications,
        ownerUserId: state.ownerUserId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.notifications)) {
          const counts = computeCounts(state.notifications);
          state.unreadCount = counts.unreadCount;
          state.readCount = counts.readCount;
        }
      },
    }
  )
);
