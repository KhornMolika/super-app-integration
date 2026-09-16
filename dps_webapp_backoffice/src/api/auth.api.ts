import { apiClient } from './client';

export interface LoginPayload {
  email: string;
  role?: string;
}

export interface AuthUserResponse {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  [key: string]: any;
}

export const authApi = {
  login: (data: LoginPayload) =>
    apiClient<AuthUserResponse>('/api/auth/login', {
      method: 'POST',
      body: data,
    }),

  logout: () =>
    apiClient<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
    }),
};
