import { apiClient, unwrapItem } from './client';
import type {
  SuperAppBanner,
  BannerAudience,
} from '@/types/banner.types';

export const bannersApi = {
  getAll: (params?: {
    search?: string;
    isActive?: boolean;
    targetAudience?: BannerAudience;
  }) => {
    return apiClient<SuperAppBanner[]>('/api/banners', { params });
  },

  getById: async (id: string): Promise<SuperAppBanner> => {
    const res = await apiClient<any>(`/api/banners/${id}`);
    return unwrapItem<SuperAppBanner>(res);
  },

  create: async (formData: FormData): Promise<SuperAppBanner> => {
    const res = await apiClient<any>('/api/banners', {
      method: 'POST',
      body: formData,
    });
    return unwrapItem<SuperAppBanner>(res);
  },

  update: async (id: string, formData: FormData): Promise<SuperAppBanner> => {
    const res = await apiClient<any>(`/api/banners/${id}`, {
      method: 'PUT',
      body: formData,
    });
    return unwrapItem<SuperAppBanner>(res);
  },

  delete: (id: string) => {
    return apiClient<{ success: boolean }>(`/api/banners/${id}`, {
      method: 'DELETE',
    });
  },

  reorder: (items: Array<{ id: string; displayOrder: number }>) => {
    return apiClient<{ success: boolean }>('/api/banners/reorder', {
      method: 'PATCH',
      body: { items },
    });
  },
};
