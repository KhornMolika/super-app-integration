import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../access-control/entities/user.entity';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN;
  private readonly defaultChatId = process.env.TELEGRAM_CHAT_ID;
  private readonly isEnabled = process.env.TELEGRAM_ENABLED !== 'false';
  private botUsername = 'superapp_notification_bot';

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    this.fetchBotProfile();
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
  ): Promise<boolean> {
    if (!this.isEnabled || !this.botToken) {
      this.logger.debug(`[Telegram Disabled or Missing Token] Message: ${text}`);
      return false;
    }

    const targetChat = chatId || this.defaultChatId;
    if (!targetChat) {
      this.logger.warn('Telegram target chat ID is not configured.');
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChat,
          text,
          parse_mode: parseMode,
          disable_web_page_preview: true,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`Telegram API Error (${response.status}): ${errorBody}`);
        return false;
      }

      this.logger.log(`Telegram notification delivered to chat ${targetChat}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send Telegram notification:', error);
      return false;
    }
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
      `<b>Super App Telegram Alerts Connected</b>\n\nHello ${displayName}, your Telegram account is now connected to your DPS Super App account (<b>${user.email}</b>).\n\nYou will receive real-time alerts for your Mini Apps, security scans, review feedback, and test builds.`,
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

      // Find message matching /start <userId> or from this user
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

      // Check if user is already linked
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

  // Structured dispatching for notifications
  async notifyNotificationCreated(
    title: string,
    message: string,
    type: string,
    miniAppName?: string,
    customChatIds: string[] = [],
  ) {
    const header = this.formatHeader(type);
    const appLabel = miniAppName ? `\n<b>Mini App:</b> ${miniAppName}` : '';
    const formatted = `
<b>${header}</b>
<b>Title:</b> ${title}${appLabel}
<b>Details:</b> ${message}
<i>DPS Super App Management Gateway</i>
    `.trim();

    const dispatched = new Set<string>();

    for (const chatId of customChatIds) {
      if (chatId && !dispatched.has(chatId)) {
        dispatched.add(chatId);
        await this.sendMessage(formatted, chatId);
      }
    }

    // If no custom chat IDs, fallback to default admin chat
    if (dispatched.size === 0 && this.defaultChatId) {
      await this.sendMessage(formatted, this.defaultChatId);
    }
  }

  private formatHeader(type: string): string {
    switch (type) {
      case 'SUCCESS':
        return 'Notification: Operation Completed';
      case 'ERROR':
        return 'Alert: Action Required / Error';
      case 'WARNING':
        return 'Warning: Security or Validation Notice';
      case 'SECURITY_PASSED':
        return 'Security Gate: Validation Passed';
      case 'SECURITY_FAILED':
        return 'Security Gate: Validation Failed';
      case 'REVISION_SUBMITTED':
        return 'Review Required: New Revision Submitted';
      case 'TEST_BUILD_READY':
        return 'Test Build: Ready for Verification';
      default:
        return 'Super App Notification';
    }
  }
}
