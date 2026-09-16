import { apiClient } from './client';

export interface User {
  id: string;
  name: string;
  email: string;
  telegramChatId?: string | null;
  telegramUsername?: string | null;
  roles: { id: string; name: string }[];
}

export const usersApi = {
  getAll: () =>
    apiClient<User[]>('/api/users'),
};
