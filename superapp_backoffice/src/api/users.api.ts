import { apiClient, PaginatedResponse } from './client';

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
    apiClient<any>('/api/users/me').then((res) =>
      res?.data && res?.email === undefined ? res.data : res,
    ),

  updateProfile: (data: {
    name?: string;
    avatarUrl?: string;
    telegramChatId?: string;
    telegramUsername?: string;
    teamTelegramChatId?: string;
  }) =>
    apiClient<any>('/api/users/me', {
      method: 'PUT',
      body: data,
    }).then((res) => (res?.data && res?.email === undefined ? res.data : res)),

  getAll: (params?: Record<string, any>) =>
    apiClient<PaginatedResponse<User> | User[]>('/api/users', { params }),

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
