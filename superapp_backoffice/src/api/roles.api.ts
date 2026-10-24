import { apiClient, unwrapData, PaginatedResponse } from './client';

export interface Role {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  userCount?: number;
  permissions: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PermissionDefinition {
  id: string;
  name: string;
  description?: string;
  resource?: string;
  action?: string;
}

export const rolesApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }) =>
    apiClient<PaginatedResponse<Role> | Role[]>('/api/roles', { params }).then(
      (res) => unwrapData<Role>(res),
    ),

  getById: (id: string) =>
    apiClient<Role>(`/api/roles/${id}`),

  getPermissions: () =>
    apiClient<PermissionDefinition[]>('/api/roles/permissions'),

  create: (data: {
    name: string;
    description?: string;
    permissions?: string[];
    permissionNames?: string[];
  }) =>
    apiClient<Role>('/api/roles', {
      method: 'POST',
      body: data,
    }),

  update: (
    id: string,
    data: {
      name?: string;
      description?: string;
      permissions?: string[];
      permissionNames?: string[];
      isActive?: boolean;
    },
  ) =>
    apiClient<Role>(`/api/roles/${id}`, {
      method: 'PUT',
      body: data,
    }),

  delete: (id: string) =>
    apiClient<{ success: boolean; message: string }>(`/api/roles/${id}`, {
      method: 'DELETE',
    }),
};
