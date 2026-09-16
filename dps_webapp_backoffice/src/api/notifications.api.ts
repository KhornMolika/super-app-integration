import { apiClient } from './client';

export interface NotificationItem {
  id: string;
  miniAppId?: string;
  miniApp?: {
    id: string;
    name: string;
    appId: string;
    category?: string;
    status?: string;
    integrationMethod?: string;
  };
  title: string;
  message: string;
  type?: string;
  isRead: boolean;
  createdAt: string;
  metadata?: any;
  data?: any;
}

export const notificationsApi = {
  getAll: () =>
    apiClient<NotificationItem[]>('/api/mini-apps/notifications'),

  markAsRead: (id: string) =>
    apiClient<{ success: boolean }>(`/api/mini-apps/${id}/mark-read`, {
      method: 'POST',
    }),

  markAllAsRead: () =>
    apiClient<{ success: boolean }>('/api/mini-apps/notifications/mark-all-read', {
      method: 'POST',
    }),

  delete: (id: string) =>
    apiClient<{ success: boolean }>(`/api/mini-apps/notifications/${id}`, {
      method: 'DELETE',
    }),
};
