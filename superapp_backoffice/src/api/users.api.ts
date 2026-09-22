import { apiClient } from './client';

export interface User {
  id: string;
  name: string;
  email: string;
  telegramChatId?: string | null;
  telegramUsername?: string | null;
  isActive?: boolean;
  roles: { id: string; name: string }[];
  createdAt?: string;
  updatedAt?: string;
}

export const usersApi = {
  getAll: () =>
    apiClient<User[]>('/api/users'),

  getById: (id: string) =>
    apiClient<User>(`/api/users/${id}`),

  create: (data: {
    name: string;
    email: string;
    roleNames?: string[];
    roleIds?: string[];
    telegramChatId?: string;
    telegramUsername?: string;
    isActive?: boolean;
  }) =>
    apiClient<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (
    id: string,
    data: {
      name?: string;
      email?: string;
      roleNames?: string[];
      roleIds?: string[];
      telegramChatId?: string;
      telegramUsername?: string;
      isActive?: boolean;
    },
  ) =>
    apiClient<User>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiClient<{ success: boolean; message: string }>(`/api/users/${id}`, {
      method: 'DELETE',
    }),
};

