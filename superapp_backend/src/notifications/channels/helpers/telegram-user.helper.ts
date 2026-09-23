import { Repository } from 'typeorm';
import { User } from '../../../access-control/entities/user.entity';
import { TelegramApiHelper } from './telegram-api.helper';
import { TelegramSyncUserResult, TelegramLogger } from './telegram.types';

export class TelegramUserHelper {
  /**
   * Links a Telegram account to a user and sends an instant confirmation card
   */
  static async linkTelegramAccount(
    userId: string,
    chatId: string | number,
    username: string | undefined,
    firstName: string | undefined,
    userRepository: Repository<User>,
    sendMessageFn?: (text: string, chatId: string) => Promise<boolean>,
    logger?: TelegramLogger,
  ): Promise<User | null> {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      logger?.warn?.(`Cannot link Telegram: User ${userId} not found.`);
      return null;
    }

    user.telegramChatId = chatId.toString();
    user.telegramUsername = username || undefined;
    user.telegramConnectedAt = new Date();
    await userRepository.save(user);

    // Send instant welcome / confirmation message
    const displayName = firstName || user.name || 'User';
    if (sendMessageFn) {
      await sendMessageFn(
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
    }

    logger?.log?.(
      `Linked Telegram ${chatId} (@${username}) to user ${user.email}`,
    );
    return user;
  }

  /**
   * Unlinks Telegram credentials from a user profile
   */
  static async unlinkTelegramAccount(
    userId: string,
    userRepository: Repository<User>,
  ): Promise<boolean> {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) return false;

    user.telegramChatId = undefined;
    user.telegramUsername = undefined;
    user.telegramConnectedAt = undefined;
    await userRepository.save(user);
    return true;
  }

  /**
   * Updates the default team Telegram chat ID for a user
   */
  static async saveUserTeamChatId(
    userId: string,
    teamChatId: string | null | undefined,
    userRepository: Repository<User>,
  ): Promise<User | null> {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) return null;

    user.teamTelegramChatId = teamChatId ? teamChatId.trim() : undefined;
    await userRepository.save(user);
    return user;
  }

  /**
   * Polls Telegram updates to automatically detect `/start <userId>` commands
   */
  static async checkAndSyncUserUpdates(
    userId: string,
    botToken: string | undefined,
    userRepository: Repository<User>,
    linkAccountFn: (
      userId: string,
      chatId: string | number,
      username?: string,
      firstName?: string,
    ) => Promise<User | null>,
  ): Promise<TelegramSyncUserResult> {
    if (!botToken) {
      return {
        linked: false,
        message: 'Telegram bot token is not configured.',
      };
    }

    try {
      const updates = await TelegramApiHelper.fetchUpdates(botToken);

      for (const update of [...updates].reverse()) {
        const msg = update.message;
        if (!msg || !msg.text) continue;

        const text = msg.text.trim();
        if (
          text === `/start ${userId}` ||
          (text.startsWith('/start') && text.includes(userId))
        ) {
          const chatId = msg.chat?.id;
          const username = msg.from?.username;
          const firstName = msg.from?.first_name;

          if (chatId) {
            const user = await linkAccountFn(
              userId,
              chatId,
              username,
              firstName,
            );
            return { linked: true, user: user || undefined };
          }
        }
      }

      const existingUser = await userRepository.findOne({
        where: { id: userId },
      });
      if (existingUser?.telegramChatId) {
        return { linked: true, user: existingUser };
      }

      return {
        linked: false,
        message:
          'No start command found yet. Please tap START in the Telegram bot.',
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { linked: false, message };
    }
  }
}
