export interface TelegramInlineButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface TelegramMessageOptions {
  chatId?: string;
  parseMode?: 'HTML' | 'Markdown';
  buttons?: TelegramInlineButton[][];
}

export interface TelegramGroupAssociation {
  type: 'PROFILE' | 'MINIAPP' | 'SUPER_APP' | 'BOT_SCAN';
  id?: string;
  name?: string;
  appId?: string;
  status?: string;
  category?: string;
  logo?: string;
  label?: string;
}

export interface TelegramGroupItem {
  id: string;
  title: string;
  type: string;
  isLive: boolean;
  error?: string;
  associatedWith: TelegramGroupAssociation[];
  isDefaultProfileChat?: boolean;
}

export interface TelegramRecentChat {
  chatId: string;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  name: string;
  username?: string;
  lastActive?: string;
  isDirectUser: boolean;
}

export interface TelegramValidateChatResult {
  isValid: boolean;
  title?: string;
  type?: string;
  error?: string;
}

export interface TelegramSendResult {
  success: boolean;
  message?: string;
}

export interface TelegramBotInfo {
  isEnabled: boolean;
  botUsername: string;
  hasDefaultChat: boolean;
}

export interface TelegramReassignResult {
  success: boolean;
  updatedCount: number;
  message: string;
}

export interface TelegramAssignAppResult {
  success: boolean;
  miniApp?: unknown;
  message: string;
}

export interface TelegramCleanupResult {
  success: boolean;
  cleanedCount: number;
  message: string;
}

export interface TelegramSyncUserResult {
  linked: boolean;
  user?: unknown;
  message?: string;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number | string;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

export interface TelegramChatMemberUpdated {
  chat: TelegramChat;
  from: TelegramUser;
  date: number;
  new_chat_member?: {
    status: string;
    user: TelegramUser;
  };
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  channel_post?: TelegramMessage;
  my_chat_member?: TelegramChatMemberUpdated;
  chat_member?: TelegramChatMemberUpdated;
}

export interface TelegramGetMeResponse {
  ok: boolean;
  result?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username: string;
  };
  description?: string;
}

export interface TelegramGetUpdatesResponse {
  ok: boolean;
  result?: TelegramUpdate[];
  description?: string;
}

export interface TelegramGetChatResponse {
  ok: boolean;
  result?: TelegramChat;
  description?: string;
}

export interface TelegramGetChatMemberResponse {
  ok: boolean;
  result?: {
    status: string;
    user?: TelegramUser;
  };
  description?: string;
}

export interface TelegramSendMessagePayload {
  chat_id: string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown';
  disable_web_page_preview?: boolean;
  reply_markup?: {
    inline_keyboard: TelegramInlineButton[][];
  };
}

export interface TelegramCardMetadata {
  miniAppId?: string;
  id?: string;
  integrationMethod?: string;
  category?: string;
  teamName?: string;
  score?: number;
  version?: string;
  releaseVersion?: string;
  apkUrl?: string;
  [key: string]: unknown;
}

export interface TelegramDiscoveredGroup {
  id: string;
  title: string;
  type: string;
  associatedWith?: TelegramGroupAssociation[];
  lastDiscoveredAt?: string;
  savedAt?: string;
  lastVerifiedAt?: string;
}

export interface TelegramLogger {
  log?: (message: string, ...optionalParams: unknown[]) => void;
  warn?: (message: string, ...optionalParams: unknown[]) => void;
  error?: (message: string, ...optionalParams: unknown[]) => void;
  debug?: (message: string, ...optionalParams: unknown[]) => void;
}
