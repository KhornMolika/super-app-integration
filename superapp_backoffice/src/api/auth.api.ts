import { apiClient } from './client';

export interface LoginPayload {
  email: string;
  password?: string;
  role?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password?: string;
  organization?: string;
}

export interface AuthUserResponse {
  id?: string;
  email?: string;
  name?: string;
  roles?: string[];
  role?: string;
  permissions?: string[];
  [key: string]: any;
}

export const authApi = {
  login: (data: LoginPayload) =>
    apiClient<{ success: boolean; user: AuthUserResponse; expires_in?: number }>('/api/auth/login', {
      method: 'POST',
      body: data,
    }),

  register: (data: RegisterPayload) =>
    apiClient<{ success: boolean; user: AuthUserResponse; expires_in?: number }>('/api/auth/register', {
      method: 'POST',
      body: data,
    }),

  refreshToken: () =>
    apiClient<{ success: boolean; user?: AuthUserResponse }>('/api/auth/refresh', {
      method: 'POST',
    }),

  logout: () =>
    apiClient<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
    }),

  getSsoProviders: () =>
    apiClient<Array<{ id: string; name: string; enabled: boolean }>>('/api/auth/sso/providers', {
      method: 'GET',
    }),
};
