import {
  Injectable,
  Logger,
  Optional,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { User } from '../../access-control/entities/user.entity';
import { MiniApp } from '../../miniapps/entities/miniapp.entity';
import { SettingsService } from '../../settings/settings.service';
import {
  resolveBackofficeBaseUrl,
  resolveAppUrl,
} from '../../common/utils/network.utils';

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
    this.fetchBotProfile();
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
    setTimeout(() => this.pollUpdates().catch(() => {}), 2000);
    this.pollingInterval = setInterval(() => {
      this.pollUpdates().catch(() => {});
    }, 10000);
  }

  getAddGroupUrl(param?: string): string {
    const p = param ? `?startgroup=${encodeURIComponent(param)}` : '?startgroup=true';
    return `https://t.me/${this.botUsername}${p}&admin=post_messages+manage_chat`;
  }

  async pollUpdates(): Promise<void> {
    if (!this.botToken || !this.isEnabled) return;
    try {
      const offsetParam = this.lastUpdateOffset ? `offset=${this.lastUpdateOffset}&` : '';
      const url = `https://api.telegram.org/bot${this.botToken}/getUpdates?${offsetParam}timeout=0&allowed_updates=["message","channel_post","my_chat_member","chat_member"]`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.ok || !Array.isArray(data.result) || data.result.length === 0) return;

      for (const update of data.result) {
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
    } catch (_) {}
  }

  async handleWebhookUpdate(update: any): Promise<{ ok: boolean }> {
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
    } catch (_) {}
    return { ok: true };
  }

  private async fetchBotProfile() {
    if (!this.botToken) return;
    try {
      const res = await fetch(`https://api.telegram.org/bot${this.botToken}/getMe`);
      if (res.ok) {
        const data = await res.json();
        if (data.result?.username) {
          this.botUsername = data.result.username;
        }
        if (data.result?.id) {
          this.botId = data.result.id;
        }
      }
    } catch (_) {}
  }

  getBotInfo() {
    return {
      isEnabled: this.isEnabled && !!this.botToken,
      botUsername: this.botUsername,
      hasDefaultChat: !!this.defaultChatId,
    };
  }

  async getUser(userId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  getDeepLinkUrl(userId: string): string {
    return `https://t.me/${this.botUsername}?start=${userId}`;
  }

  async sendMessage(
    text: string,
    chatId?: string,
    parseMode: 'HTML' | 'Markdown' = 'HTML',
    buttons?: TelegramInlineButton[][],
  ): Promise<boolean> {
    const res = await this.sendMessageWithDetails(text, chatId, parseMode, buttons);
    return res.success;
  }

  async sendMessageWithDetails(
    text: string,
    chatId?: string,
    parseMode: 'HTML' | 'Markdown' = 'HTML',
    buttons?: TelegramInlineButton[][],
  ): Promise<{ success: boolean; message?: string }> {
    if (!this.isEnabled || !this.botToken) {
      this.logger.debug(`[Telegram Disabled or Missing Token] Message: ${text}`);
      return { success: false, message: 'Telegram integration is disabled or bot token is missing.' };
    }

    const targetChat = chatId || this.defaultChatId;
    if (!targetChat) {
      this.logger.warn('Telegram target chat ID is not configured.');
      return { success: false, message: 'Telegram target chat ID is not configured.' };
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const payload: any = {
        chat_id: targetChat,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      };

      if (buttons && buttons.length > 0) {
        // Sanitize inline keyboard buttons: ensure public/LAN accessible URLs and valid Telegram protocols
        const sanitizedButtons: TelegramInlineButton[][] = [];
        for (const row of buttons) {
          const sanitizedRow: TelegramInlineButton[] = [];
          for (const btn of row) {
            if (btn.url) {
              let u = resolveAppUrl(btn.url.trim());

              // Replace internal Docker network hostnames with host/public endpoint
              if (u.includes('host.docker.internal')) {
                const nexusBase = (
                  process.env.NEXUS_BASE_URL || 'http://localhost:8081'
                ).replace(/\/+$/, '');
                u = u
                  .replace(/https?:\/\/host\.docker\.internal:8081/g, nexusBase)
                  .replace(
                    /https?:\/\/host\.docker\.internal:3000/g,
                    'http://localhost:3000',
                  )
                  .replace(/host\.docker\.internal/g, 'localhost');
                u = resolveAppUrl(u);
              }

              // Check if URL is acceptable by Telegram Bot API for inline buttons
              const isTelegramLink =
                u.startsWith('https://t.me/') || u.startsWith('tg://');
              const isStrictLocalhost =
                u.includes('localhost') ||
                u.includes('127.0.0.1') ||
                u.includes('0.0.0.0') ||
                u.includes('.internal');
              const isValidAddress =
                /^https?:\/\/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(:\d+)?(\/.*)?$/i.test(
                  u,
                );

              if (isTelegramLink || (isValidAddress && !isStrictLocalhost)) {
                sanitizedRow.push({ text: btn.text, url: u });
              } else if (btn.callback_data) {
                sanitizedRow.push({
                  text: btn.text,
                  callback_data: btn.callback_data,
                });
              } else {
                // For unresolvable local URLs, fallback to Bot deep link so Telegram API never rejects the button with BUTTON_URL_INVALID
                sanitizedRow.push({
                  text: btn.text,
                  url: `https://t.me/${this.botUsername}`,
                });
              }
            } else if (btn.callback_data) {
              sanitizedRow.push(btn);
            }
          }
          if (sanitizedRow.length > 0) {
            sanitizedButtons.push(sanitizedRow);
          }
        }

        if (sanitizedButtons.length > 0) {
          payload.reply_markup = {
            inline_keyboard: sanitizedButtons,
          };
        }
      }

      let response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Auto-retry without reply_markup if Telegram API rejects inline buttons (e.g. invalid button URL)
      if (!response.ok && payload.reply_markup) {
        const errorText = await response.clone().text();
        if (
          errorText.includes('BUTTON_URL_INVALID') ||
          errorText.includes('wrong HTTP URL') ||
          errorText.includes('URL host is empty') ||
          response.status === 400
        ) {
          this.logger.warn(
            `Telegram API rejected inline keyboard (${errorText}). Retrying message delivery without inline buttons to ${targetChat}...`,
          );
          delete payload.reply_markup;
          response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }
      }

      if (!response.ok) {
        const errorBody = await response.text();
        let description = errorBody;
        try {
          const parsed = JSON.parse(errorBody);
          description = parsed.description || errorBody;
        } catch (_) {}

        if (response.status === 403 || response.status === 400) {
          this.logger.warn(`Telegram Chat (${targetChat}) Error: ${description}`);
          if (
            description.includes('group chat was deleted') ||
            description.includes('chat not found') ||
            description.includes('deactivated')
          ) {
            return {
              success: false,
              message: `Telegram group "${targetChat}" no longer exists or was deleted. Please select an active group.`,
            };
          }
          if (
            description.includes('bot was kicked') ||
            description.includes('bot is not a member')
          ) {
            return {
              success: false,
              message: `Bot was removed from Telegram group "${targetChat}". Please re-add @${this.botUsername} with admin permissions.`,
            };
          }
          return {
            success: false,
            message: `Telegram access forbidden (${description}). Please make sure the group exists and @${this.botUsername} is added with admin permissions.`,
          };
        }

        this.logger.warn(`Telegram API Error (${response.status}): ${description}`);
        return {
          success: false,
          message: `Telegram Error: ${description}`,
        };
      }

      this.logger.log(`Telegram notification delivered to chat ${targetChat}`);
      return { success: true, message: 'Telegram notification delivered successfully.' };
    } catch (error: any) {
      this.logger.error('Failed to send Telegram notification:', error);
      return { success: false, message: error.message || 'Network error sending Telegram notification.' };
    }
  }

  // Live-verify chat existence and bot accessibility via Telegram getChat & getChatMember API
  async validateChat(
    chatId: string,
  ): Promise<{ isValid: boolean; title?: string; type?: string; error?: string }> {
    if (!this.botToken || !chatId) {
      return { isValid: false, error: 'Telegram bot token or Chat ID is missing.' };
    }

    try {
      const res = await fetch(
        `https://api.telegram.org/bot${this.botToken}/getChat?chat_id=${encodeURIComponent(chatId)}`,
      );
      const data = await res.json();

      if (!res.ok || !data.ok || !data.result) {
        const description = data.description || 'Chat inaccessible or deleted';
        return {
          isValid: false,
          error: description,
        };
      }

      const chat = data.result;
      const title = chat.title || chat.username || chat.first_name || 'Active Group';
      const type = chat.type;

      // For groups, supergroups, and channels, verify that the bot is an active member
      if (type === 'group' || type === 'supergroup' || type === 'channel') {
        if (!this.botId) {
          await this.fetchBotProfile();
        }

        if (this.botId) {
          try {
            const memberRes = await fetch(
              `https://api.telegram.org/bot${this.botToken}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${this.botId}`,
            );
            const memberData = await memberRes.json();
            if (!memberRes.ok || !memberData.ok || !memberData.result) {
              return {
                isValid: false,
                title,
                type,
                error: memberData.description || 'Bot is not a member of this group',
              };
            }

            const status = memberData.result.status;
            if (status === 'left' || status === 'kicked') {
              return {
                isValid: false,
                title,
                type,
                error:
                  status === 'kicked'
                    ? 'Bot was removed from this group'
                    : 'Group chat was deleted or bot has left',
              };
            }
          } catch (mErr: any) {
            this.logger.warn(`Failed to verify bot chat membership for ${chatId}: ${mErr.message}`);
          }
        }
      }

      if (type === 'group' || type === 'supergroup' || type === 'channel') {
        this.persistDiscoveredGroup(chatId, title, type).catch(() => {});
      }

      return {
        isValid: true,
        title,
        type,
      };
    } catch (err: any) {
      return {
        isValid: false,
        error: err.message || 'Network error verifying group status with Telegram',
      };
    }
  }

  /**
   * Persistently records a discovered or verified Telegram group into SettingsService
   */
  async persistDiscoveredGroup(
    chatId: string,
    title?: string,
    type: string = 'group',
  ): Promise<void> {
    if (!this.settingsService || !chatId) return;
    try {
      const existing = await this.settingsService.getSetting<any[]>(
        'TELEGRAM_DISCOVERED_GROUPS',
        [],
      );
      const list = Array.isArray(existing) ? [...existing] : [];
      const idx = list.findIndex((g) => g.id === chatId);
      if (idx >= 0) {
        if (title) list[idx].title = title;
        if (type) list[idx].type = type;
        list[idx].lastVerifiedAt = new Date().toISOString();
      } else {
        list.push({
          id: chatId,
          title: title || 'Verified Telegram Channel',
          type,
          associatedWith: [
            { type: 'BOT_SCAN', label: 'Verified Telegram Channel' },
          ],
          savedAt: new Date().toISOString(),
          lastVerifiedAt: new Date().toISOString(),
        });
      }
      await this.settingsService.setSetting(
        'TELEGRAM_DISCOVERED_GROUPS',
        list,
        'Persistently discovered Telegram groups and channels',
      );
    } catch (err: any) {
      this.logger.warn(`Failed to persist Telegram group ${chatId}: ${err.message}`);
    }
  }

  // Reassign all Mini Apps (and optionally user profile) from an old group ID to a new group ID (or null to unlink)
  async reassignTelegramGroup(
    oldChatId: string,
    newChatId: string | null,
    userId?: string,
  ): Promise<{ success: boolean; updatedCount: number; message: string }> {
    if (!oldChatId) {
      return { success: false, updatedCount: 0, message: 'Old Chat ID is required.' };
    }

    const trimmedOld = oldChatId.trim();
    const trimmedNew = newChatId?.trim() || null;

    let updatedCount = 0;

    // 1. Find all relevant mini apps
    let userApps: MiniApp[] = [];
    if (userId) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: { roles: true },
      });
      const isAdmin = user?.roles?.some(
        (r) => r.name === 'SUPER_ADMIN' || r.name === 'ADMIN',
      );
      userApps = isAdmin
        ? await this.miniAppRepository.find()
        : await this.miniAppRepository.find({ where: { ownerId: userId } });

      // Update user profile teamTelegramChatId if matching
      if (user && user.teamTelegramChatId?.trim() === trimmedOld) {
        user.teamTelegramChatId = trimmedNew || undefined;
        await this.userRepository.save(user);
      }
    } else {
      userApps = await this.miniAppRepository.find();
    }

    for (const app of userApps) {
      const currentChatId = app.teamTelegramChatId || app.pendingRevision?.teamTelegramChatId;
      if (!currentChatId) continue;
      const ids = currentChatId
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (ids.includes(trimmedOld)) {
        if (trimmedNew) {
          const updatedIds = Array.from(
            new Set(ids.map((id) => (id === trimmedOld ? trimmedNew : id))),
          );
          app.teamTelegramChatId = updatedIds.join(',');
          if (app.pendingRevision) {
            app.pendingRevision = {
              ...app.pendingRevision,
              teamTelegramChatId: updatedIds.join(','),
            };
          }
        } else {
          const remainingIds = ids.filter((id) => id !== trimmedOld);
          const finalVal = remainingIds.length > 0 ? remainingIds.join(',') : null;
          app.teamTelegramChatId = finalVal as any;
          if (app.pendingRevision) {
            app.pendingRevision = {
              ...app.pendingRevision,
              teamTelegramChatId: finalVal,
            };
          }
        }
        await this.miniAppRepository.save(app);
        updatedCount++;
      }
    }

    const actionText = trimmedNew ? `reassigned to "${trimmedNew}"` : 'unlinked';
    return {
      success: true,
      updatedCount,
      message: `Successfully ${actionText} for ${updatedCount} Mini App(s).`,
    };
  }

  // Assign or move a specific Mini App to a new Telegram group ID (or clear if null)
  async assignMiniAppToGroup(
    miniAppId: string,
    newChatId: string | null,
    userId?: string,
  ): Promise<{ success: boolean; miniApp?: MiniApp; message: string }> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(miniAppId);
    const app = isUuid
      ? await this.miniAppRepository.findOne({ where: { id: miniAppId } })
      : await this.miniAppRepository.findOne({ where: [{ id: miniAppId }, { appId: miniAppId }] });

    if (!app) {
      return { success: false, message: `Mini App "${miniAppId}" not found.` };
    }

    if (userId) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: { roles: true },
      });
      const isAdmin = user?.roles?.some(
        (r) => r.name === 'SUPER_ADMIN' || r.name === 'ADMIN',
      );
      if (!isAdmin && app.ownerId !== userId) {
        return { success: false, message: 'You do not have permission to modify this Mini App.' };
      }
    }

    const trimmedNew = newChatId?.trim() || null;
    app.teamTelegramChatId = trimmedNew as any;
    if (app.pendingRevision) {
      app.pendingRevision = {
        ...app.pendingRevision,
        teamTelegramChatId: trimmedNew,
      };
    }
    await this.miniAppRepository.save(app);

    return {
      success: true,
      miniApp: app,
      message: trimmedNew
        ? `Mini App "${app.name}" assigned to group ${trimmedNew} successfully!`
        : `Telegram group unlinked from Mini App "${app.name}".`,
    };
  }

  // Batch clean up inactive / deleted groups across user's Mini Apps
  async cleanupInactiveGroups(
    userId?: string,
  ): Promise<{ success: boolean; cleanedCount: number; message: string }> {
    const userGroups = await this.getUserTelegramGroups(userId);
    const deadGroups = userGroups.filter((g) => g.isLive === false);

    if (deadGroups.length === 0) {
      return { success: true, cleanedCount: 0, message: 'No inactive groups detected.' };
    }

    let fallbackChatId: string | null = null;
    const liveDefault = userGroups.find(
      (g) => g.isLive && (g.isDefaultProfileChat || g.id === this.defaultChatId),
    );
    if (liveDefault) {
      fallbackChatId = liveDefault.id;
    }

    let totalCleaned = 0;
    for (const dead of deadGroups) {
      const res = await this.reassignTelegramGroup(dead.id, fallbackChatId, userId);
      totalCleaned += res.updatedCount;
    }

    return {
      success: true,
      cleanedCount: totalCleaned,
      message: fallbackChatId
        ? `Cleaned up ${deadGroups.length} inactive group(s). Migrated ${totalCleaned} Mini App(s) to "${liveDefault?.title || fallbackChatId}".`
        : `Cleaned up ${deadGroups.length} inactive group(s) across ${totalCleaned} Mini App(s).`,
    };
  }

  // 1-Click Link Telegram Account via Start Token / Webhook
  async linkTelegramAccount(
    userId: string,
    chatId: string | number,
    username?: string,
    firstName?: string,
  ): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      this.logger.warn(`Cannot link Telegram: User ${userId} not found.`);
      return null;
    }

    user.telegramChatId = chatId.toString();
    user.telegramUsername = username || undefined;
    user.telegramConnectedAt = new Date();
    await this.userRepository.save(user);

    // Send instant welcome / confirmation message
    const displayName = firstName || user.name || 'User';
    await this.sendMessage(
      `<b>⚡ Super App Gateway: Telegram Connected</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<pre><code class="language-diff">
+ [STATUS] Account Link Verified
+ [USER]   ${displayName} (${user.email})
+ [ALERTS] Real-time security, build & review notifications active
</code></pre>
<blockquote>Hello <b>${displayName}</b>, your Telegram account is connected to <b>${user.email}</b>. You will receive real-time alerts for your Mini Apps, security scans, review decisions, and test build artifacts.</blockquote>`,
      chatId.toString(),
    );

    this.logger.log(`Linked Telegram ${chatId} (@${username}) to user ${user.email}`);
    return user;
  }

  // Poll Telegram updates to automatically catch /start <userId>
  async checkAndSyncUserUpdates(userId: string): Promise<{ linked: boolean; user?: User; message?: string }> {
    if (!this.botToken) {
      return { linked: false, message: 'Telegram bot token is not configured.' };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${this.botToken}/getUpdates`);
      if (!res.ok) {
        return { linked: false, message: 'Failed to query Telegram API updates.' };
      }

      const data = await res.json();
      const updates = data.result || [];

      for (const update of updates.reverse()) {
        const msg = update.message;
        if (!msg || !msg.text) continue;

        const text = msg.text.trim();
        if (text === `/start ${userId}` || (text.startsWith('/start') && text.includes(userId))) {
          const chatId = msg.chat?.id;
          const username = msg.from?.username;
          const firstName = msg.from?.first_name;

          if (chatId) {
            const user = await this.linkTelegramAccount(userId, chatId, username, firstName);
            return { linked: true, user: user || undefined };
          }
        }
      }

      const existingUser = await this.userRepository.findOne({ where: { id: userId } });
      if (existingUser?.telegramChatId) {
        return { linked: true, user: existingUser };
      }

      return {
        linked: false,
        message: 'No start command found yet. Please tap START in the Telegram bot.',
      };
    } catch (err: any) {
      return { linked: false, message: err.message };
    }
  }

  // Check if a specific Telegram user is an active member or admin in a chat
  async isUserInChat(chatId: string, telegramUserId: string): Promise<boolean> {
    if (!this.botToken || !chatId || !telegramUserId) return false;
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${this.botToken}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${encodeURIComponent(telegramUserId)}`,
      );
      const data = await res.json();
      if (res.ok && data.ok && data.result) {
        const status = data.result.status;
        return ['creator', 'administrator', 'member', 'restricted'].includes(status);
      }
      return false;
    } catch {
      return false;
    }
  }

  async getUserTelegramGroups(userId?: string): Promise<TelegramGroupItem[]> {
    const groupsMap = new Map<string, TelegramGroupItem>();

    let dbUser: User | null = null;
    let userTelegramId: string | null = null;
    if (userId) {
      dbUser = await this.userRepository.findOne({ where: { id: userId } });
      userTelegramId = dbUser?.telegramChatId || null;
    }

    // 1. User's saved profile team chat ID
    if (dbUser?.teamTelegramChatId) {
      const chatId = dbUser.teamTelegramChatId.trim();
      groupsMap.set(chatId, {
        id: chatId,
        title: 'User Default Team Channel',
        type: 'group',
        isLive: true,
        isDefaultProfileChat: true,
        associatedWith: [
          {
            type: 'PROFILE',
            name: `${dbUser.name || 'Account'} Team Channel`,
            label: 'Default Account Channel',
          },
        ],
      });
    }

    // 2. Scan all mini apps owned by this user (or all mini apps if SUPER_ADMIN / ADMIN)
    const isAdmin = dbUser?.roles?.some(
      (r) => r.name === 'SUPER_ADMIN' || r.name === 'ADMIN',
    );

    const miniApps = isAdmin
      ? await this.miniAppRepository.find()
      : userId
      ? await this.miniAppRepository.find({ where: { ownerId: userId } })
      : [];

    for (const app of miniApps) {
      if (app.teamTelegramChatId && app.teamTelegramChatId.trim()) {
        const rawIds = app.teamTelegramChatId
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        for (const chatId of rawIds) {
          const appAssoc: TelegramGroupAssociation = {
            type: 'MINIAPP',
            id: app.id,
            name: app.name,
            appId: app.appId,
            status: app.status,
            category: app.category,
            logo: app.logo,
            label: `Mini App: ${app.name}`,
          };

          const existing = groupsMap.get(chatId);
          if (existing) {
            if (!existing.associatedWith.some((a) => a.id === app.id)) {
              existing.associatedWith.push(appAssoc);
            }
          } else {
            groupsMap.set(chatId, {
              id: chatId,
              title: `${app.name} Channel`,
              type: 'group',
              isLive: true,
              associatedWith: [appAssoc],
            });
          }
        }
      }
    }

    // 3. Load persistently stored groups from SettingsService
    if (this.settingsService) {
      try {
        const cached = await this.settingsService.getSetting<any[]>(
          'TELEGRAM_DISCOVERED_GROUPS',
          [],
        );
        if (Array.isArray(cached)) {
          for (const g of cached) {
            if (g?.id && !groupsMap.has(g.id)) {
              groupsMap.set(g.id, {
                id: g.id,
                title: g.title || 'Saved Telegram Group',
                type: g.type || 'group',
                isLive: true,
                associatedWith: g.associatedWith || [
                  { type: 'BOT_SCAN', label: 'Persisted Telegram Group' },
                ],
              });
            }
          }
        }
      } catch (cErr: any) {
        this.logger.warn(`Failed to load cached Telegram groups: ${cErr.message}`);
      }
    }

    // 4. Scan recent updates from Telegram bot (with explicit allowed_updates)
    if (this.botToken) {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${this.botToken}/getUpdates?allowed_updates=["message","channel_post","my_chat_member","chat_member"]`,
        );
        if (res.ok) {
          const data = await res.json();
          const updates = data.result || [];
          let newlyFound = false;
          for (const update of updates) {
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
              const existing = groupsMap.get(chatId);
              if (existing) {
                if (chat.title) existing.title = chat.title;
                if (chat.type) existing.type = chat.type;
              } else {
                newlyFound = true;
                groupsMap.set(chatId, {
                  id: chatId,
                  title: chat.title || 'Discovered Telegram Group',
                  type: chat.type,
                  isLive: true,
                  associatedWith: [
                    {
                      type: 'BOT_SCAN',
                      label: 'Discovered from Bot Activity',
                    },
                  ],
                });
              }
            }
          }

          if (newlyFound && this.settingsService) {
            const allCached = Array.from(groupsMap.values()).map((g) => ({
              id: g.id,
              title: g.title,
              type: g.type,
              associatedWith: g.associatedWith,
              lastDiscoveredAt: new Date().toISOString(),
            }));
            this.settingsService
              .setSetting(
                'TELEGRAM_DISCOVERED_GROUPS',
                allCached,
                'Persistently discovered Telegram groups and channels',
              )
              .catch(() => {});
          }
        }
      } catch (err) {
        this.logger.warn('Failed to query Telegram getUpdates for groups:', err);
      }
    }

    // 4. Default platform operations channel (if set in env)
    if (this.defaultChatId && isAdmin) {
      const defaultId = this.defaultChatId.trim();
      const existing = groupsMap.get(defaultId);
      if (existing) {
        if (!existing.associatedWith.some((a) => a.type === 'SUPER_APP')) {
          existing.associatedWith.push({
            type: 'SUPER_APP',
            label: 'Platform Operations Channel (Default)',
          });
        }
      } else {
        groupsMap.set(defaultId, {
          id: defaultId,
          title: 'Platform Operations Channel',
          type: 'group',
          isLive: true,
          associatedWith: [
            {
              type: 'SUPER_APP',
              label: 'Platform Operations Channel (Default)',
            },
          ],
        });
      }
    }

    // 5. Live-validate all candidate groups in parallel via Telegram getChat API
    const entries = Array.from(groupsMap.entries());
    const validationResults = await Promise.allSettled(
      entries.map(async ([chatId, group]) => {
        const check = await this.validateChat(chatId);
        return { chatId, group, check };
      }),
    );

    const resultList: TelegramGroupItem[] = [];
    for (const val of validationResults) {
      if (val.status === 'fulfilled') {
        const { chatId, group, check } = val.value;
        if (check.isValid) {
          resultList.push({
            ...group,
            id: chatId,
            title: check.title || group.title,
            type: check.type || group.type,
            isLive: true,
          });
        } else {
          // If group is associated with User or MiniApp, include it with isLive: false and error explanation
          const isLinkedToUserOrApp = group.associatedWith.some(
            (a) => a.type === 'MINIAPP' || a.type === 'PROFILE',
          );
          if (isLinkedToUserOrApp) {
            resultList.push({
              ...group,
              id: chatId,
              isLive: false,
              error:
                check.error ||
                'Group chat is inaccessible or was deleted on Telegram',
            });
          } else {
            this.logger.debug(
              `Excluding non-existent Telegram group ${chatId} (${group.title}): ${check.error}`,
            );
          }
        }
      }
    }

    return resultList;
  }

  async getRecentGroups(userId?: string): Promise<Array<{ id: string; title: string; type: string; associatedWith?: TelegramGroupAssociation[]; isLive?: boolean; error?: string }>> {
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

  // Retrieve recent direct users and groups who interacted with the bot for Auto-Detection
  async getRecentBotChats(): Promise<Array<{
    chatId: string;
    type: 'private' | 'group' | 'supergroup' | 'channel';
    name: string;
    username?: string;
    lastActive?: string;
    isDirectUser: boolean;
  }>> {
    const contactsMap = new Map<string, {
      chatId: string;
      type: 'private' | 'group' | 'supergroup' | 'channel';
      name: string;
      username?: string;
      lastActive?: string;
      isDirectUser: boolean;
    }>();

    if (this.settingsService) {
      try {
        const cached = await this.settingsService.getSetting<any[]>(
          'TELEGRAM_DISCOVERED_GROUPS',
          [],
        );
        if (Array.isArray(cached)) {
          for (const g of cached) {
            if (g?.id && !contactsMap.has(g.id)) {
              contactsMap.set(g.id, {
                chatId: g.id,
                type: g.type || 'group',
                name: g.title || 'Saved Telegram Group',
                lastActive: g.lastDiscoveredAt || g.savedAt || new Date().toISOString(),
                isDirectUser: false,
              });
            }
          }
        }
      } catch (_) {}
    }

    if (this.botToken) {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${this.botToken}/getUpdates?allowed_updates=["message","channel_post","my_chat_member","chat_member"]`,
        );
        if (res.ok) {
          const data = await res.json();
          const updates = data.result || [];
          for (const update of updates.reverse()) {
            const msg = update.message || update.channel_post || update.my_chat_member;
            const chat = msg?.chat;
            const from = msg?.from || update.message?.from;
            if (chat && chat.id) {
              const chatId = chat.id.toString();
              if (!contactsMap.has(chatId)) {
                const isPrivate = chat.type === 'private';
                const displayName = isPrivate
                  ? [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.username || 'Telegram User'
                  : chat.title || 'Telegram Group';

                contactsMap.set(chatId, {
                  chatId,
                  type: chat.type,
                  name: displayName,
                  username: chat.username || from?.username || undefined,
                  lastActive: msg.date ? new Date(msg.date * 1000).toISOString() : new Date().toISOString(),
                  isDirectUser: isPrivate,
                });
              }
            }
          }
        }
      } catch (err) {
        this.logger.warn('Failed to query getUpdates for getRecentBotChats:', err);
      }
    }

    // Also include existing users with saved Telegram credentials
    try {
      const existingUsers = await this.userRepository.find({ where: {} });
      for (const u of existingUsers) {
        if (u.telegramChatId && !contactsMap.has(u.telegramChatId)) {
          contactsMap.set(u.telegramChatId, {
            chatId: u.telegramChatId,
            type: 'private',
            name: u.name || 'Registered Operator',
            username: u.telegramUsername,
            lastActive: u.updatedAt ? u.updatedAt.toISOString() : undefined,
            isDirectUser: true,
          });
        }
      }
    } catch (_) {}

    return Array.from(contactsMap.values());
  }

  async unlinkTelegramAccount(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return false;

    user.telegramChatId = undefined;
    user.telegramUsername = undefined;
    user.telegramConnectedAt = undefined;
    await this.userRepository.save(user);
    return true;
  }

  async saveUserTeamChatId(userId: string, teamChatId?: string | null): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return null;

    user.teamTelegramChatId = teamChatId ? teamChatId.trim() : undefined;
    await this.userRepository.save(user);
    return user;
  }

  // Structured dispatching for notifications with Rich Cards and Action Buttons
  async notifyNotificationCreated(
    title: string,
    message: string,
    type: string,
    miniAppName?: string,
    customChatIds: string[] = [],
    metadata?: any,
  ) {
    const { text, buttons } = this.buildRichCard(
      title,
      message,
      type,
      miniAppName,
      metadata,
    );

    let allowButtons = true;
    if (this.settingsService) {
      try {
        const timing = await this.settingsService.getPipelineTiming();
        if (timing && timing.enableTelegramActionButtons === false) {
          allowButtons = false;
        }
      } catch (_) {}
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
      const version = metadata?.version || metadata?.releaseVersion || 'v1.0.0';
      const rawApkUrl = metadata?.apkUrl || '';
      const resolvedName = miniAppName || 'Super App';
      for (const chatId of dispatchedChats) {
        this.sendApkDocument(chatId, rawApkUrl, version, resolvedName).catch(
          (err) => {
            this.logger.debug(
              `Could not attach APK document to chat ${chatId}: ${err.message}`,
            );
          },
        );
      }
    }
  }

  /**
   * Dispatches the compiled APK artifact directly into the Telegram chat as a downloadable document
   */
  async sendApkDocument(
    chatId: string,
    apkUrlOrPath: string,
    version: string,
    appName: string,
  ): Promise<boolean> {
    if (!this.isEnabled || !this.botToken || !chatId) return false;

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendDocument`;
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append(
        'caption',
        `📲 <b>Direct APK Download:</b> <code>${appName}</code> (<code>${version}</code>)\nTap the file above to install directly on Android.`,
      );
      formData.append('parse_mode', 'HTML');

      // Candidate local build paths
      const mobileDir = this.configService.get<string>('MOBILE_APP_DIR');
      const candidatePaths = [
        ...(mobileDir
          ? [
              path.resolve(mobileDir, 'build/app/outputs/flutter-apk/app-debug.apk'),
              path.resolve(mobileDir, 'build/app/outputs/apk/debug/app-debug.apk'),
            ]
          : []),
        path.resolve(
          process.cwd(),
          'superapp_mobile/build/app/outputs/flutter-apk/app-debug.apk',
        ),
        path.resolve(
          process.cwd(),
          '../superapp_mobile/build/app/outputs/flutter-apk/app-debug.apk',
        ),
        path.resolve(
          process.cwd(),
          'dps_mobile_app/build/app/outputs/flutter-apk/app-debug.apk',
        ),
        path.resolve(
          process.cwd(),
          '../dps_mobile_app/build/app/outputs/flutter-apk/app-debug.apk',
        ),
        path.resolve(
          process.cwd(),
          'superapp_mobile/build/app/outputs/apk/debug/app-debug.apk',
        ),
        path.resolve(
          process.cwd(),
          '../superapp_mobile/build/app/outputs/apk/debug/app-debug.apk',
        ),
        path.resolve(
          process.cwd(),
          'dps_mobile_app/build/app/outputs/apk/debug/app-debug.apk',
        ),
        path.resolve(
          process.cwd(),
          '../dps_mobile_app/build/app/outputs/apk/debug/app-debug.apk',
        ),
        path.resolve(
          process.cwd(),
          'ma_flutter_trust_regulator/example/build/app/outputs/flutter-apk/app-debug.apk',
        ),
        path.resolve(
          process.cwd(),
          'dsp_miniapp_trust_regulator/example/build/app/outputs/flutter-apk/app-debug.apk',
        ),
        apkUrlOrPath,
      ];

      let attached = false;
      for (const p of candidatePaths) {
        if (p && !p.startsWith('http') && fs.existsSync(p)) {
          const fileBuffer = fs.readFileSync(p);
          const blob = new Blob([fileBuffer], {
            type: 'application/vnd.android.package-archive',
          });
          formData.append(
            'document',
            blob,
            `superapp-${version || 'test'}-debug.apk`,
          );
          attached = true;
          break;
        }
      }

      if (!attached && apkUrlOrPath && apkUrlOrPath.startsWith('http')) {
        formData.append('document', apkUrlOrPath);
        attached = true;
      }

      if (!attached) return false;

      const res = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      return res.ok;
    } catch (err: any) {
      this.logger.warn(
        `Failed to dispatch APK document to ${chatId}: ${err.message}`,
      );
      return false;
    }
  }

  /**
   * Builds distinct, beautifully formatted Telegram status cards
   */
  private buildRichCard(
    title: string,
    message: string,
    type: string,
    miniAppName?: string,
    metadata?: any,
  ): { text: string; buttons?: TelegramInlineButton[][] } {
    const appDisplayName = miniAppName || 'Super App Mini App';
    const miniAppId = metadata?.miniAppId || metadata?.id;
    const detailsUrl = miniAppId
      ? `${this.backofficeBaseUrl}/miniapps/${miniAppId}`
      : `${this.backofficeBaseUrl}/miniapps`;

    const buttons: TelegramInlineButton[][] = [];

    switch (type) {
      case 'MINIAPP_REGISTERED':
      case 'MINIAPP_CREATED': {
        const method = metadata?.integrationMethod || 'WEBVIEW';
        const category = metadata?.category || 'Standard';
        const teamName = metadata?.teamName || 'Engineering Team';

        const text = `
🟢 <b>[REGISTERED] NEW MINI APP REGISTERED</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>Mini App:</b> ${appDisplayName}
🏷️ <b>Method:</b> <code>${method}</code>
📁 <b>Category:</b> ${category}
👥 <b>Team:</b> ${teamName}

<pre><code class="language-diff">
+ [REGISTERED] Application profile created
+ [STATUS]     Draft initialized & queued for verification
+ [INTEGRATION] ${method}
</code></pre>

<blockquote>Mini App <b>"${appDisplayName}"</b> has been registered on the Super App Gateway and is undergoing automated pre-flight security scanning.</blockquote>

🔗 <b>Action Links:</b>
👉 <a href="${detailsUrl}"><b>Open Mini App in Backoffice</b></a>
        `.trim();

        buttons.push([
          { text: '🔍 View Mini App in Portal', url: detailsUrl },
        ]);
        return { text, buttons };
      }

      case 'VALIDATION_RUNNING':
      case 'SCAN_STARTED': {
        const text = `
🔵 <b>[IN PROGRESS] VALIDATION SCAN RUNNING</b>
━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>Mini App:</b> ${appDisplayName}
⚙️ <b>Status:</b> Automated Security Verification Started

<pre><code class="language-diff">
! Static Code SAST Scan   : In Progress...
! Package Integrity Check : Running
! Network Boundary (SSRF) : Probing
! Web Sandbox Build       : Queued
</code></pre>

<blockquote>Automated security engines are verifying network SSRF boundaries, TLS certificates, and sandboxed bridge capabilities.</blockquote>

🔗 <b>Action Links:</b>
👉 <a href="${detailsUrl}"><b>View Security Scan in Backoffice</b></a>
        `.trim();

        buttons.push([{ text: '🔍 View in Backoffice', url: detailsUrl }]);
        return { text, buttons };
      }

      case 'VALIDATION_SUCCESS':
      case 'SECURITY_PASSED': {
        const score = metadata?.score ?? 100;
        const text = `
🟢 <b>[PASSED] AUTOMATED VALIDATION VERIFIED</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>Mini App:</b> ${appDisplayName}
🏆 <b>Score:</b> <b>${score} / 100</b> (Compliance Verified)
🛡️ <b>Status:</b> All Security Checks Passed

<pre><code class="language-diff">
+ [PASS] Static Analysis (SAST) : 0 Critical Findings
+ [PASS] Network Boundary (SSRF): Verified Secure
+ [PASS] API Association Digest : Signature Valid
+ [PASS] Capability Gatekeeper  : Approved
</code></pre>

<blockquote>Application compliance verified. Status has advanced to <b>IN_REVIEW</b> for administrator review.</blockquote>

🔗 <b>Action Links:</b>
👉 <a href="${detailsUrl}"><b>View Full Audit Report in Backoffice</b></a>
        `.trim();

        buttons.push([
          { text: '📋 View Audit Report', url: detailsUrl },
          { text: '🔍 Open Backoffice', url: detailsUrl },
        ]);
        return { text, buttons };
      }

      case 'VALIDATION_FAILED':
      case 'SECURITY_FAILED': {
        const score = metadata?.score ?? 0;
        const cleanIssue = message
          ? message
              .split('\n')
              .filter(Boolean)
              .map((l) => `- ${l}`)
              .join('\n')
          : '- Security compliance gate requirements not satisfied';

        const text = `
🔴 <b>[ACTION REQUIRED] VALIDATION FAILED</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>Mini App:</b> ${appDisplayName}
⚠️ <b>Score:</b> <b>${score} / 100</b> (Violations Detected)
🛡️ <b>Status:</b> Compliance Gate Failed

<pre><code class="language-diff">
- [FAIL] Compliance Gate: Action Required
${cleanIssue}
</code></pre>

<blockquote>Please address identified security policy violations in the backoffice and re-submit for validation.</blockquote>

🔗 <b>Action Links:</b>
👉 <a href="${detailsUrl}"><b>Remediate Violations in Backoffice</b></a>
        `.trim();

        buttons.push([
          { text: '🛠️ Remediate Violations', url: detailsUrl },
          { text: '📋 View Full Report', url: detailsUrl },
        ]);
        return { text, buttons };
      }

      case 'MINIAPP_APPROVED': {
        const text = `
🟢 <b>[APPROVED] MINI APP APPROVED</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>Mini App:</b> ${appDisplayName}
👤 <b>Reviewer:</b> Super App Administrator
🏢 <b>Status:</b> <b>APPROVED</b> (Scheduled for Build)

<pre><code class="language-diff">
+ [APPROVED] Review Decision: Mini App Approved
+ [STATUS]   Queued for Super App assembly & test build packaging
</code></pre>

<blockquote>Mini App <b>"${appDisplayName}"</b> has been formally approved and queued for Super App test build assembly & sandbox packaging.</blockquote>

🔗 <b>Action Links:</b>
👉 <a href="${detailsUrl}"><b>View Mini App Details in Backoffice</b></a>
        `.trim();

        buttons.push([
          { text: '🔍 View Mini App Details', url: detailsUrl },
        ]);
        return { text, buttons };
      }

      case 'BUILD_STARTED':
      case 'BUILDING': {
        const version = metadata?.version || metadata?.releaseVersion || 'v1.0.0';
        const text = `
🔵 <b>[BUILDING] SUPER APP BUILD IN PROGRESS</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>Mini App:</b> ${appDisplayName}
🏷️ <b>Version:</b> <code>${version}</code>
⚙️ <b>Pipeline:</b> Jenkins Sandbox & Android APK Assembler

<pre><code class="language-diff">
! [BUILDING] Compiling Flutter Native Engine
! [BUILDING] Resolving Package Dependencies
! [BUILDING] Packaging Android APK & Web Sandbox
</code></pre>

<blockquote>Stand by while binary artifacts are assembled and uploaded to Sonatype Nexus repository.</blockquote>

🔗 <b>Action Links:</b>
👉 <a href="${detailsUrl}"><b>Monitor Build Progress in Backoffice</b></a>
        `.trim();

        buttons.push([
          { text: '📊 View Build Progress', url: detailsUrl },
        ]);
        return { text, buttons };
      }

      case 'TEST_BUILD_READY': {
        const version = metadata?.version || metadata?.releaseVersion || 'v1.0.0';
        const rawApkUrl = metadata?.apkUrl;
        const downloadProxyUrl = `${this.backofficeBaseUrl}/api/download-apk?type=test&version=${encodeURIComponent(version)}&appName=superapp`;
        const apkUrl =
          rawApkUrl && !rawApkUrl.includes('host.docker.internal')
            ? rawApkUrl
            : downloadProxyUrl;
        const sandboxUrl = miniAppId
          ? `${this.backofficeBaseUrl}/miniapps/${miniAppId}?preview=true`
          : `${this.backofficeBaseUrl}/super-app?preview=true`;

        const text = `
🟢 <b>[BUILD READY] SUPER APP TEST BUILD READY</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>Mini App:</b> ${appDisplayName}
🏷️ <b>Version:</b> <code>${version}</code>
📦 <b>Artifacts:</b> Android APK & Web Sandbox Build Ready

<pre><code class="language-diff">
+ [READY] Android APK : Built & Uploaded to Nexus
+ [READY] Web Sandbox : Live & Interactive
+ [READY] Release     : ${version}
</code></pre>

<blockquote>Super App test binary packaging is complete! You can download the test APK or launch the interactive Web Sandbox.</blockquote>

🔗 <b>Action Links:</b>
📲 <a href="${apkUrl}"><b>Download Test APK (.apk)</b></a>
🌐 <a href="${sandboxUrl}"><b>Launch Interactive Web Sandbox</b></a>
🔍 <a href="${detailsUrl}"><b>View Details in Backoffice Portal</b></a>
        `.trim();

        const actionRow: TelegramInlineButton[] = [];
        if (apkUrl) {
          actionRow.push({ text: '📲 Download Test APK', url: apkUrl });
        }
        actionRow.push({ text: '🌐 Launch Sandbox', url: sandboxUrl });

        buttons.push(actionRow);
        buttons.push([{ text: '📋 View in Backoffice', url: detailsUrl }]);
        return { text, buttons };
      }

      case 'BUILD_FAILED': {
        const version = metadata?.version || metadata?.releaseVersion || 'latest';
        const cleanReason = message
          ? message
              .split('\n')
              .filter(Boolean)
              .map((l) => `- ${l}`)
              .join('\n')
          : '- Fastlane packaging or Nexus publish failed';

        const text = `
🔴 <b>[BUILD FAILED] SUPER APP BUILD ERROR</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>Mini App:</b> ${appDisplayName}
🏷️ <b>Version:</b> <code>${version}</code>
⚙️ <b>Pipeline:</b> Jenkins Assembler CI

<pre><code class="language-diff">
- [FAILED] Build Pipeline Failure
${cleanReason}
</code></pre>

<blockquote>The Super App build packaging failed. Please check the build logs in the portal to diagnose and remediate.</blockquote>

🔗 <b>Action Links:</b>
👉 <a href="${detailsUrl}"><b>View Build Logs & Diagnostics</b></a>
        `.trim();

        buttons.push([
          { text: '🛠️ View Build Logs', url: detailsUrl },
        ]);
        return { text, buttons };
      }

      case 'CHANGES_REQUESTED': {
        const cleanFeedback = message
          ? message
              .split('\n')
              .filter(Boolean)
              .map((l) => `! ${l}`)
              .join('\n')
          : '! Reviewer requested revisions before approval';

        const text = `
🟡 <b>[CHANGES REQUESTED] REVIEW FEEDBACK</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>Mini App:</b> ${appDisplayName}
👤 <b>Reviewer:</b> Super App Administrator
📝 <b>Feedback:</b> ${message}

<pre><code class="language-diff">
! [ACTION REQUIRED] Reviewer Feedback:
${cleanFeedback}
</code></pre>

<blockquote>Please review the requested changes in the Backoffice Portal and submit an updated revision.</blockquote>

🔗 <b>Action Links:</b>
👉 <a href="${detailsUrl}"><b>Update Mini App in Backoffice</b></a>
        `.trim();

        buttons.push([
          { text: '✏️ Update Mini App', url: detailsUrl },
        ]);
        return { text, buttons };
      }

      case 'MINIAPP_REJECTED': {
        const cleanReason = message
          ? message
              .split('\n')
              .filter(Boolean)
              .map((l) => `- ${l}`)
              .join('\n')
          : '- Submission does not meet platform integration requirements';

        const text = `
🔴 <b>[REJECTED] REVIEW DECISION: MINI APP REJECTED</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>Mini App:</b> ${appDisplayName}
👤 <b>Decision:</b> Not Approved
📝 <b>Reason:</b> ${message}

<pre><code class="language-diff">
- [REJECTED] Submission Not Approved
${cleanReason}
</code></pre>

<blockquote>The submission for "${appDisplayName}" did not meet the required integration or compliance policies.</blockquote>

🔗 <b>Action Links:</b>
👉 <a href="${detailsUrl}"><b>View Decision in Portal</b></a>
        `.trim();

        buttons.push([
          { text: '🔍 View Decision in Portal', url: detailsUrl },
        ]);
        return { text, buttons };
      }

      case 'REVISION_SUBMITTED': {
        const text = `
🟣 <b>[REVISION SUBMITTED] NEW REVISION INGESTED</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>Mini App:</b> ${appDisplayName}
📝 <b>Title:</b> ${title}
📄 <b>Details:</b> ${message}

<pre><code class="language-diff">
! [REVISION] New Version Submitted
! [STATUS]   Queued for Automated Security Scanning & Admin Review
</code></pre>

<blockquote>A new revision has been submitted for automated security scanning and administrator review.</blockquote>

🔗 <b>Action Links:</b>
👉 <a href="${detailsUrl}"><b>Review Proposed Revision in Backoffice</b></a>
        `.trim();

        buttons.push([
          { text: '⚖️ Review Revision', url: detailsUrl },
        ]);
        return { text, buttons };
      }

      default: {
        const header = this.formatHeader(type);
        const isError = type.includes('ERROR') || type.includes('FAIL');
        const isSuccess = type.includes('SUCCESS') || type.includes('PASS');
        const prefix = isError ? '-' : isSuccess ? '+' : '!';
        const badge = isError ? '🔴' : isSuccess ? '🟢' : '🔵';

        const text = `
${badge} <b>${header}</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>Mini App:</b> ${appDisplayName}
<b>Title:</b> ${title}

<pre><code class="language-diff">
${prefix} [DETAIL] ${message ? message.split('\n')[0] : 'Notification update'}
</code></pre>

<i>Super App Management Gateway</i>

${miniAppId ? `🔗 <b>Portal Link:</b> <a href="${detailsUrl}"><b>Open Backoffice</b></a>` : ''}
        `.trim();

        if (miniAppId) {
          buttons.push([{ text: '🔍 Open Backoffice', url: detailsUrl }]);
        }
        return { text, buttons };
      }
    }
  }

  private formatHeader(type: string): string {
    switch (type) {
      case 'SUCCESS':
        return 'Operation Completed';
      case 'ERROR':
        return 'Alert: Error Occurred';
      case 'WARNING':
        return 'Warning Notice';
      default:
        return 'Super App Notification';
    }
  }
}
