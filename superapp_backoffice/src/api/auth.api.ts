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

export interface DeveloperTokenItem {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
  isActive: boolean;
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

  getDeveloperTokens: () =>
    apiClient<{ success: boolean; tokens: DeveloperTokenItem[] }>('/api/auth/developer-tokens', {
      method: 'GET',
    }),

  createDeveloperToken: (data: { name: string; expirationDays?: number; scopes?: string[] }) =>
    apiClient<{ success: boolean; token: string; tokenItem: DeveloperTokenItem }>('/api/auth/developer-tokens', {
      method: 'POST',
      body: data,
    }),

  revokeDeveloperToken: (id: string) =>
    apiClient<{ success: boolean }>('/api/auth/developer-tokens/' + id, {
      method: 'DELETE',
    }),
};
