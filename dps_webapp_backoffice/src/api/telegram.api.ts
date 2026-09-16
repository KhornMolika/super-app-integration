import { apiClient } from './client';

export interface TelegramStatus {
  isConnected?: boolean;
  enabled?: boolean;
  botUsername?: string;
  user?: {
    name?: string;
    email?: string;
    telegramChatId?: string;
    teamTelegramChatId?: string;
    telegramUsername?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface TelegramGroup {
  id: string;
  title: string;
  type: string;
  isLive?: boolean;
  [key: string]: any;
}

export const telegramApi = {
  getStatus: () =>
    apiClient<TelegramStatus>('/api/telegram/status'),

  getUserGroups: () =>
    apiClient<{ groups: TelegramGroup[] }>('/api/telegram/user-groups'),

  getRecentGroups: () =>
    apiClient<{ groups: TelegramGroup[] }>('/api/telegram/recent-groups'),

  validateChat: (chatId: string) =>
    apiClient<{ valid: boolean; title?: string }>('/api/telegram/validate-chat', {
      params: { chatId },
    }),

  testTeamAlert: (chatId: string, miniAppName: string, message?: string) =>
    apiClient<{ success: boolean; message?: string }>('/api/telegram/test-team', {
      method: 'POST',
      body: { chatId, miniAppName, message },
    }),

  testUserAlert: () =>
    apiClient<{ success: boolean; message?: string }>('/api/telegram/test-user', {
      method: 'POST',
    }),

  testEmail: (email: string) =>
    apiClient<{ success: boolean; message?: string; error?: string }>('/api/mail/test', {
      method: 'POST',
      body: { email },
    }),

  getConnectUrl: () =>
    apiClient<{ url: string }>('/api/telegram/connect-url'),

  checkSync: () =>
    apiClient<{ linked: boolean; message?: string }>('/api/telegram/check-sync', {
      method: 'POST',
    }),

  manualConnect: (data: { chatId: string; username?: string }) =>
    apiClient<{ success: boolean; message?: string }>('/api/telegram/manual-connect', {
      method: 'POST',
      body: data,
    }),

  saveTeamChat: (data: { teamTelegramChatId: string }) =>
    apiClient<{ success: boolean; message?: string }>('/api/telegram/save-team-chat', {
      method: 'POST',
      body: data,
    }),

  disconnect: () =>
    apiClient<{ success: boolean; message?: string }>('/api/telegram/disconnect', {
      method: 'POST',
    }),

  reassignGroup: (data: { oldChatId: string; newChatId: string | null }) =>
    apiClient<{ success: boolean; message?: string }>('/api/telegram/reassign-group', {
      method: 'POST',
      body: data,
    }),

  assignAppGroup: (data: { miniAppId: string; newChatId: string | null }) =>
    apiClient<{ success: boolean; message?: string }>('/api/telegram/assign-app-group', {
      method: 'POST',
      body: data,
    }),

  cleanupInactive: () =>
    apiClient<{ success: boolean; message?: string }>('/api/telegram/cleanup-inactive', {
      method: 'POST',
    }),
};

