import {
  Injectable,
  Logger,
  Optional,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../access-control/entities/user.entity';
import { MiniApp } from '../../miniapps/entities/miniapp.entity';
import { SettingsService } from '../../settings/settings.service';
import { resolveBackofficeBaseUrl } from '../../common/utils/network.utils';
import {
  TelegramInlineButton,
  TelegramMessageOptions,
  TelegramGroupAssociation,
  TelegramGroupItem,
  TelegramRecentChat,
  TelegramValidateChatResult,
  TelegramSendResult,
  TelegramBotInfo,
  TelegramReassignResult,
  TelegramAssignAppResult,
  TelegramCleanupResult,
  TelegramSyncUserResult,
  TelegramUpdate,
  TelegramCardMetadata,
} from './helpers/telegram.types';
import { TelegramCardHelper } from './helpers/telegram-card.helper';
import { TelegramApiHelper } from './helpers/telegram-api.helper';
import { TelegramGroupHelper } from './helpers/telegram-group.helper';
import { TelegramUserHelper } from './helpers/telegram-user.helper';

export type {
  TelegramInlineButton,
  TelegramMessageOptions,
  TelegramGroupAssociation,
  TelegramGroupItem,
  TelegramRecentChat,
  TelegramValidateChatResult,
  TelegramSendResult,
  TelegramBotInfo,
  TelegramReassignResult,
  TelegramAssignAppResult,
  TelegramCleanupResult,
  TelegramSyncUserResult,
  TelegramUpdate,
  TelegramCardMetadata,
};

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN;
  private readonly defaultChatId = process.env.TELEGRAM_CHAT_ID;
  private readonly isEnabled = process.env.TELEGRAM_ENABLED !== 'false';
  private botId: number | null = null;
  private botUsername = 'superapp_notification_bot';
  private lastUpdateOffset = 0;
  private pollingInterval: NodeJS.Timeout | null = null;

  private get backofficeBaseUrl(): string {
    return resolveBackofficeBaseUrl();
  }

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(MiniApp)
    private miniAppRepository: Repository<MiniApp>,
    @Optional()
    private readonly settingsService?: SettingsService,
  ) {
    void this.fetchBotProfile();
  }

  async onModuleInit() {
    await this.fetchBotProfile();
    this.startBackgroundPoller();
  }

  onModuleDestroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private startBackgroundPoller() {
    if (!this.botToken || !this.isEnabled) return;
    setTimeout(() => {
      void this.pollUpdates().catch(() => {
        /* ignore */
      });
    }, 2000);
    this.pollingInterval = setInterval(() => {
      void this.pollUpdates().catch(() => {
        /* ignore */
      });
    }, 10000);
  }

  private async fetchBotProfile() {
    if (!this.botToken) return;
    const profile = await TelegramApiHelper.fetchBotProfile(this.botToken);
    this.botUsername = profile.botUsername;
    this.botId = profile.botId;
  }

  getBotInfo(): TelegramBotInfo {
    return {
      isEnabled: this.isEnabled && !!this.botToken,
      botUsername: this.botUsername,
      hasDefaultChat: !!this.defaultChatId,
    };
  }

  getAddGroupUrl(param?: string): string {
    const p = param
      ? `?startgroup=${encodeURIComponent(param)}`
      : '?startgroup=true';
    return `https://t.me/${this.botUsername}${p}&admin=post_messages+manage_chat`;
  }

  getDeepLinkUrl(userId: string): string {
    return `https://t.me/${this.botUsername}?start=${userId}`;
  }

  async getUser(userId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  async pollUpdates(): Promise<void> {
    if (!this.botToken || !this.isEnabled) return;
    try {
      const updates = await TelegramApiHelper.fetchUpdates(
        this.botToken,
        this.lastUpdateOffset,
      );
      if (!updates || updates.length === 0) return;

      for (const update of updates) {
        if (update.update_id >= this.lastUpdateOffset) {
          this.lastUpdateOffset = update.update_id + 1;
        }

        const chat =
          update.message?.chat ||
          update.my_chat_member?.chat ||
          update.channel_post?.chat;

        if (
          chat &&
          (chat.type === 'group' ||
            chat.type === 'supergroup' ||
            chat.type === 'channel')
        ) {
          const chatId = chat.id.toString();
          const title = chat.title || 'Discovered Telegram Group';
          await this.persistDiscoveredGroup(chatId, title, chat.type);
        }
      }
    } catch {
      // Ignore polling errors
    }
  }

  async handleWebhookUpdate(update: TelegramUpdate): Promise<{ ok: boolean }> {
    if (!update) return { ok: true };
    try {
      const chat =
        update.message?.chat ||
        update.my_chat_member?.chat ||
        update.channel_post?.chat;

      if (
        chat &&
        (chat.type === 'group' ||
          chat.type === 'supergroup' ||
          chat.type === 'channel')
      ) {
        const chatId = chat.id.toString();
        const title = chat.title || 'Discovered Telegram Group';
        await this.persistDiscoveredGroup(chatId, title, chat.type);
      }
    } catch {
      // Ignore webhook processing errors
    }
    return { ok: true };
  }

  async sendMessage(
    text: string,
    chatId?: string,
    parseMode: 'HTML' | 'Markdown' = 'HTML',
    buttons?: TelegramInlineButton[][],
  ): Promise<boolean> {
    const res = await this.sendMessageWithDetails(
      text,
      chatId,
      parseMode,
      buttons,
    );
    return res.success;
  }

  async sendMessageWithDetails(
    text: string,
    chatId?: string,
    parseMode: 'HTML' | 'Markdown' = 'HTML',
    buttons?: TelegramInlineButton[][],
  ): Promise<TelegramSendResult> {
    if (!this.isEnabled || !this.botToken) {
      this.logger.debug(
        `[Telegram Disabled or Missing Token] Message: ${text}`,
      );
      return {
        success: false,
        message: 'Telegram integration is disabled or bot token is missing.',
      };
    }

    const targetChat = chatId || this.defaultChatId;
    if (!targetChat) {
      this.logger.warn('Telegram target chat ID is not configured.');
      return {
        success: false,
        message: 'Telegram target chat ID is not configured.',
      };
    }

    return TelegramApiHelper.sendMessage(
      this.botToken,
      targetChat,
      text,
      parseMode,
      buttons,
      this.botUsername,
      this.logger,
    );
  }

  async validateChat(chatId: string): Promise<TelegramValidateChatResult> {
    if (!this.botToken || !chatId) {
      return {
        isValid: false,
        error: 'Telegram bot token or Chat ID is missing.',
      };
    }

    if (!this.botId) {
      await this.fetchBotProfile();
    }

    const result = await TelegramApiHelper.validateChat(
      this.botToken,
      this.botId,
      chatId,
      this.logger,
    );

    if (
      result.isValid &&
      (result.type === 'group' ||
        result.type === 'supergroup' ||
        result.type === 'channel')
    ) {
      void this.persistDiscoveredGroup(chatId, result.title, result.type).catch(
        () => {
          /* ignore */
        },
      );
    }

    return result;
  }

  async persistDiscoveredGroup(
    chatId: string,
    title?: string,
    type: string = 'group',
  ): Promise<void> {
    return TelegramGroupHelper.persistDiscoveredGroup(
      this.settingsService,
      chatId,
      title,
      type,
      this.logger,
    );
  }

  async reassignTelegramGroup(
    oldChatId: string,
    newChatId: string | null,
    userId?: string,
  ): Promise<TelegramReassignResult> {
    return TelegramGroupHelper.reassignTelegramGroup(
      oldChatId,
      newChatId,
      userId,
      this.userRepository,
      this.miniAppRepository,
    );
  }

  async assignMiniAppToGroup(
    miniAppId: string,
    newChatId: string | null,
    userId?: string,
  ): Promise<TelegramAssignAppResult> {
    return TelegramGroupHelper.assignMiniAppToGroup(
      miniAppId,
      newChatId,
      userId,
      this.userRepository,
      this.miniAppRepository,
    );
  }

  async cleanupInactiveGroups(userId?: string): Promise<TelegramCleanupResult> {
    const userGroups = await this.getUserTelegramGroups(userId);
    return TelegramGroupHelper.cleanupInactiveGroups(
      userGroups,
      (oldId, newId, uId) => this.reassignTelegramGroup(oldId, newId, uId),
      userId,
      this.defaultChatId,
    );
  }

  async linkTelegramAccount(
    userId: string,
    chatId: string | number,
    username?: string,
    firstName?: string,
  ): Promise<User | null> {
    return TelegramUserHelper.linkTelegramAccount(
      userId,
      chatId,
      username,
      firstName,
      this.userRepository,
      (text, cId) => this.sendMessage(text, cId),
      this.logger,
    );
  }

  async checkAndSyncUserUpdates(
    userId: string,
  ): Promise<TelegramSyncUserResult> {
    return TelegramUserHelper.checkAndSyncUserUpdates(
      userId,
      this.botToken,
      this.userRepository,
      (uId, cId, uName, fName) =>
        this.linkTelegramAccount(uId, cId, uName, fName),
    );
  }

  async isUserInChat(chatId: string, telegramUserId: string): Promise<boolean> {
    if (!this.botToken || !chatId || !telegramUserId) return false;
    return TelegramApiHelper.isUserInChat(
      this.botToken,
      chatId,
      telegramUserId,
    );
  }

  async getUserTelegramGroups(userId?: string): Promise<TelegramGroupItem[]> {
    return TelegramGroupHelper.getUserTelegramGroups(
      userId,
      this.userRepository,
      this.miniAppRepository,
      this.settingsService,
      this.botToken,
      this.botId,
      this.defaultChatId,
      this.logger,
    );
  }

  async getRecentGroups(userId?: string): Promise<
    Array<{
      id: string;
      title: string;
      type: string;
      associatedWith?: TelegramGroupAssociation[];
      isLive?: boolean;
      error?: string;
    }>
  > {
    const userGroups = await this.getUserTelegramGroups(userId);
    return userGroups.map((g) => ({
      id: g.id,
      title: g.title,
      type: g.type,
      associatedWith: g.associatedWith,
      isLive: g.isLive,
      error: g.error,
    }));
  }

  async getRecentBotChats(): Promise<TelegramRecentChat[]> {
    return TelegramGroupHelper.getRecentBotChats(
      this.userRepository,
      this.settingsService,
      this.botToken,
      this.logger,
    );
  }

  async unlinkTelegramAccount(userId: string): Promise<boolean> {
    return TelegramUserHelper.unlinkTelegramAccount(
      userId,
      this.userRepository,
    );
  }

  async saveUserTeamChatId(
    userId: string,
    teamChatId?: string | null,
  ): Promise<User | null> {
    return TelegramUserHelper.saveUserTeamChatId(
      userId,
      teamChatId,
      this.userRepository,
    );
  }

  async notifyNotificationCreated(
    title: string,
    message: string,
    type: string,
    miniAppName?: string,
    customChatIds: string[] = [],
    metadata?: TelegramCardMetadata,
  ) {
    const { text, buttons } = TelegramCardHelper.buildRichCard(
      title,
      message,
      type,
      miniAppName,
      metadata,
      this.backofficeBaseUrl,
    );

    let allowButtons = true;
    if (this.settingsService) {
      try {
        const timing = await this.settingsService.getPipelineTiming();
        if (timing && timing.enableTelegramActionButtons === false) {
          allowButtons = false;
        }
      } catch {
        // Ignore settings lookup failure
      }
    }

    const finalButtons = allowButtons ? buttons : undefined;
    const dispatched = new Set<string>();

    const targetList = [...customChatIds];
    if (this.defaultChatId) {
      targetList.push(this.defaultChatId);
    }

    const dispatchedChats: string[] = [];
    for (const rawChatId of targetList) {
      if (!rawChatId) continue;
      const splitChatIds = String(rawChatId)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const chatId of splitChatIds) {
        if (chatId && !dispatched.has(chatId)) {
          dispatched.add(chatId);
          dispatchedChats.push(chatId);
          await this.sendMessage(text, chatId, 'HTML', finalButtons);
        }
      }
    }

    // When a test build is ready, deliver the APK binary directly into the Telegram chats
    if (type === 'TEST_BUILD_READY') {
      const version = String(
        metadata?.version || metadata?.releaseVersion || 'v1.0.0',
      );
      const rawApkUrl = String(metadata?.apkUrl || '');
      const resolvedName = miniAppName || 'Super App';
      for (const chatId of dispatchedChats) {
        void this.sendApkDocument(
          chatId,
          rawApkUrl,
          version,
          resolvedName,
        ).catch((err: unknown) => {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.debug(
            `Could not attach APK document to chat ${chatId}: ${errMsg}`,
          );
        });
      }
    }
  }

  async sendApkDocument(
    chatId: string,
    apkUrlOrPath: string,
    version: string,
    appName: string,
  ): Promise<boolean> {
    if (!this.isEnabled || !this.botToken || !chatId) return false;
    return TelegramApiHelper.sendApkDocument(
      this.botToken,
      chatId,
      apkUrlOrPath,
      version,
      appName,
      this.logger,
    );
  }
}
