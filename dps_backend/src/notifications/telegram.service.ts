import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN;
  private readonly defaultChatId = process.env.TELEGRAM_CHAT_ID;
  private readonly isEnabled = process.env.TELEGRAM_ENABLED !== 'false';

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
      this.logger.warn('Telegram chat ID is not configured.');
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

      this.logger.log(`Telegram notification successfully delivered to chat ${targetChat}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send Telegram notification:', error);
      return false;
    }
  }

  // Specialized formatted alerts for MA Manager & SA Admin
  async notifyNotificationCreated(
    title: string,
    message: string,
    type: string,
    miniAppName?: string,
  ) {
    const header = this.formatHeader(type);
    const appLabel = miniAppName ? `\n<b>Mini App:</b> ${miniAppName}` : '';
    const formatted = `
<b>${header}</b>
<b>Title:</b> ${title}${appLabel}
<b>Details:</b> ${message}
<i>DPS Super App Management Gateway</i>
    `.trim();

    return this.sendMessage(formatted);
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
