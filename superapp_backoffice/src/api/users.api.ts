import { apiClient } from './client';

export interface UserRole {
  id: string;
  name: string;
}

export interface UserOrganization {
  id: string;
  name: string;
  code?: string;
  parentAuthority?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  telegramChatId?: string | null;
  telegramUsername?: string | null;
  isActive?: boolean;
  status?: string;
  role?: UserRole;
  roles?: UserRole[];
  organizationId?: string | null;
  organization?: UserOrganization | null;
  createdAt?: string;
  updatedAt?: string;
}

export const usersApi = {
  getProfile: () =>
    apiClient<User>('/api/users/me'),

  updateProfile: (data: {
    name?: string;
    avatarUrl?: string;
    telegramChatId?: string;
    telegramUsername?: string;
    teamTelegramChatId?: string;
  }) =>
    apiClient<User>('/api/users/me', {
      method: 'PUT',
      body: data,
    }),

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
      body: data,
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
      body: data,
    }),

  delete: (id: string) =>
    apiClient<{ success: boolean; message: string }>(`/api/users/${id}`, {
      method: 'DELETE',
    }),

  approve: (id: string, roleName = 'MA_DEVELOPER') =>
    apiClient<User>(`/api/users/${id}/approve`, {
      method: 'POST',
      body: { roleName },
    }),
};
