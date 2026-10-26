import { apiClient, unwrapData } from './client';

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
    apiClient<any>('/api/mini-apps/notifications').then((res) => unwrapData<NotificationItem>(res)),

  getById: (id: string) => {
    if (!id || id === 'undefined' || id === 'null') {
      return Promise.reject(new Error('Invalid notification ID'));
    }
    return apiClient<NotificationItem>(`/api/mini-apps/notifications/${id}`);
  },

  markAsRead: (id: string) => {
    if (!id || id === 'undefined' || id === 'null') {
      return Promise.resolve({ success: false });
    }
    return apiClient<{ success: boolean }>(`/api/mini-apps/notifications/${id}/mark-read`, {
      method: 'POST',
    });
  },

  markAllAsRead: () =>
    apiClient<{ success: boolean }>('/api/mini-apps/notifications/mark-all-read', {
      method: 'POST',
    }),

  delete: (id: string) => {
    if (!id || id === 'undefined' || id === 'null') {
      return Promise.resolve({ success: false });
    }
    return apiClient<{ success: boolean }>(`/api/mini-apps/notifications/${id}`, {
      method: 'DELETE',
    });
  },
};
