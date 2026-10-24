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

export interface AccessTokenItem {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
  isActive: boolean;
}

// Backwards-compatible alias
export type DeveloperTokenItem = AccessTokenItem;

export const authApi = {
  login: (data: LoginPayload) =>
    apiClient<{ success: boolean; user?: AuthUserResponse; message?: string; pendingApproval?: boolean; expires_in?: number }>('/api/auth/login', {
      method: 'POST',
      body: data,
    }),

  register: (data: RegisterPayload) =>
    apiClient<{ success: boolean; user?: AuthUserResponse; message?: string; pendingApproval?: boolean; expires_in?: number }>('/api/auth/register', {
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

  getAccessTokens: () =>
    apiClient<{ success: boolean; tokens: AccessTokenItem[] }>('/api/auth/access-tokens', {
      method: 'GET',
    }),

  createAccessToken: (data: { name: string; expirationDays?: number; scopes?: string[] }) =>
    apiClient<{ success: boolean; token: string; tokenItem: AccessTokenItem }>('/api/auth/access-tokens', {
      method: 'POST',
      body: data,
    }),

  revokeAccessToken: (id: string) =>
    apiClient<{ success: boolean }>('/api/auth/access-tokens/' + id, {
      method: 'DELETE',
    }),

  // Backwards-compatible aliases
  getDeveloperTokens: () =>
    apiClient<{ success: boolean; tokens: AccessTokenItem[] }>('/api/auth/access-tokens', {
      method: 'GET',
    }),

  createDeveloperToken: (data: { name: string; expirationDays?: number; scopes?: string[] }) =>
    apiClient<{ success: boolean; token: string; tokenItem: AccessTokenItem }>('/api/auth/access-tokens', {
      method: 'POST',
      body: data,
    }),

  revokeDeveloperToken: (id: string) =>
    apiClient<{ success: boolean }>('/api/auth/access-tokens/' + id, {
      method: 'DELETE',
    }),

  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    apiClient<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: data,
    }),

  requestOtp: (data: { email: string; purpose?: 'PASSWORD_RESET' | 'EMAIL_VERIFICATION' }) =>
    apiClient<{
      success: boolean;
      message: string;
      expiresInSeconds?: number;
      emailDispatched?: boolean;
    }>('/api/auth/request-otp', {
      method: 'POST',
      body: data,
    }),

  verifyOtp: (data: {
    email: string;
    code: string;
    purpose?: 'PASSWORD_RESET' | 'EMAIL_VERIFICATION';
  }) =>
    apiClient<{
      success: boolean;
      resetToken?: string;
      verified?: boolean;
      message: string;
    }>('/api/auth/verify-otp', {
      method: 'POST',
      body: data,
    }),

  requestRecoveryOtp: (email: string) =>
    apiClient<{
      success: boolean;
      message: string;
      expiresInSeconds?: number;
      emailDispatched?: boolean;
    }>('/api/auth/forgot-password', {
      method: 'POST',
      body: { email, purpose: 'PASSWORD_RESET' },
    }),

  verifyRecoveryOtp: (email: string, code: string) =>
    apiClient<{
      success: boolean;
      resetToken: string;
      message: string;
    }>('/api/auth/verify-otp', {
      method: 'POST',
      body: { email, code, purpose: 'PASSWORD_RESET' },
    }),

  resetPassword: (resetToken: string, newPassword: string) =>
    apiClient<{ success: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: { resetToken, newPassword },
    }),
};

