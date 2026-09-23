import * as fs from 'fs';
import * as path from 'path';
import { resolveAppUrl } from '../../../common/utils/network.utils';
import {
  TelegramInlineButton,
  TelegramSendResult,
  TelegramValidateChatResult,
  TelegramSendMessagePayload,
  TelegramUpdate,
  TelegramGetMeResponse,
  TelegramGetUpdatesResponse,
  TelegramGetChatResponse,
  TelegramGetChatMemberResponse,
  TelegramLogger,
} from './telegram.types';

export class TelegramApiHelper {
  /**
   * Sanitizes inline keyboard buttons: ensures public/LAN accessible URLs and valid Telegram protocols
   */
  static sanitizeButtons(
    buttons: TelegramInlineButton[][],
    botUsername: string,
  ): TelegramInlineButton[][] {
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
            // For unresolvable local URLs, fallback to Bot deep link so Telegram API never rejects the button
            sanitizedRow.push({
              text: btn.text,
              url: `https://t.me/${botUsername}`,
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

    return sanitizedButtons;
  }

  /**
   * Dispatches a message via Telegram Bot API with automatic button sanitization and retry
   */
  static async sendMessage(
    botToken: string,
    targetChat: string,
    text: string,
    parseMode: 'HTML' | 'Markdown' = 'HTML',
    buttons?: TelegramInlineButton[][],
    botUsername: string = 'superapp_notification_bot',
    logger?: TelegramLogger,
  ): Promise<TelegramSendResult> {
    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const payload: TelegramSendMessagePayload = {
        chat_id: targetChat,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      };

      if (buttons && buttons.length > 0) {
        const sanitized = TelegramApiHelper.sanitizeButtons(
          buttons,
          botUsername,
        );
        if (sanitized.length > 0) {
          payload.reply_markup = {
            inline_keyboard: sanitized,
          };
        }
      }

      let response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Auto-retry without reply_markup if Telegram API rejects inline buttons
      if (!response.ok && payload.reply_markup) {
        const errorText = await response.clone().text();
        if (
          errorText.includes('BUTTON_URL_INVALID') ||
          errorText.includes('wrong HTTP URL') ||
          errorText.includes('URL host is empty') ||
          response.status === 400
        ) {
          logger?.warn?.(
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
          const parsed = JSON.parse(errorBody) as { description?: string };
          description = parsed.description || errorBody;
        } catch {
          // Ignore JSON parse errors
        }

        if (response.status === 403 || response.status === 400) {
          logger?.warn?.(`Telegram Chat (${targetChat}) Error: ${description}`);
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
              message: `Bot was removed from Telegram group "${targetChat}". Please re-add @${botUsername} with admin permissions.`,
            };
          }
          return {
            success: false,
            message: `Telegram access forbidden (${description}). Please make sure the group exists and @${botUsername} is added with admin permissions.`,
          };
        }

        logger?.warn?.(
          `Telegram API Error (${response.status}): ${description}`,
        );
        return {
          success: false,
          message: `Telegram Error: ${description}`,
        };
      }

      logger?.log?.(`Telegram notification delivered to chat ${targetChat}`);
      return {
        success: true,
        message: 'Telegram notification delivered successfully.',
      };
    } catch (error: unknown) {
      logger?.error?.('Failed to send Telegram notification:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Network error sending Telegram notification.';
      return {
        success: false,
        message,
      };
    }
  }

  /**
   * Fetches the bot identity and username from Telegram Bot API
   */
  static async fetchBotProfile(
    botToken: string,
  ): Promise<{ botUsername: string; botId: number | null }> {
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      if (res.ok) {
        const data = (await res.json()) as TelegramGetMeResponse;
        return {
          botUsername: data.result?.username || 'superapp_notification_bot',
          botId: data.result?.id || null,
        };
      }
    } catch {
      // Ignore network errors fetching profile
    }
    return { botUsername: 'superapp_notification_bot', botId: null };
  }

  /**
   * Polls updates from the Telegram Bot API
   */
  static async fetchUpdates(
    botToken: string,
    offset: number = 0,
  ): Promise<TelegramUpdate[]> {
    try {
      const offsetParam = offset ? `offset=${offset}&` : '';
      const url = `https://api.telegram.org/bot${botToken}/getUpdates?${offsetParam}timeout=0&allowed_updates=["message","channel_post","my_chat_member","chat_member"]`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = (await res.json()) as TelegramGetUpdatesResponse;
      if (!data.ok || !Array.isArray(data.result)) return [];
      return data.result;
    } catch {
      return [];
    }
  }

  /**
   * Validates chat existence and bot accessibility via getChat and getChatMember API
   */
  static async validateChat(
    botToken: string,
    botId: number | null,
    chatId: string,
    logger?: TelegramLogger,
  ): Promise<TelegramValidateChatResult> {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${botToken}/getChat?chat_id=${encodeURIComponent(chatId)}`,
      );
      const data = (await res.json()) as TelegramGetChatResponse;

      if (!res.ok || !data.ok || !data.result) {
        const description = data.description || 'Chat inaccessible or deleted';
        return {
          isValid: false,
          error: description,
        };
      }

      const chat = data.result;
      const title =
        chat.title || chat.username || chat.first_name || 'Active Group';
      const type = chat.type;

      // For groups, supergroups, and channels, verify that the bot is an active member
      if (
        botId &&
        (type === 'group' || type === 'supergroup' || type === 'channel')
      ) {
        try {
          const memberRes = await fetch(
            `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${botId}`,
          );
          const memberData =
            (await memberRes.json()) as TelegramGetChatMemberResponse;
          if (!memberRes.ok || !memberData.ok || !memberData.result) {
            return {
              isValid: false,
              title,
              type,
              error:
                memberData.description || 'Bot is not a member of this group',
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
        } catch (mErr: unknown) {
          const msg = mErr instanceof Error ? mErr.message : String(mErr);
          logger?.warn?.(
            `Failed to verify bot chat membership for ${chatId}: ${msg}`,
          );
        }
      }

      return {
        isValid: true,
        title,
        type,
      };
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Network error verifying group status with Telegram';
      return {
        isValid: false,
        error: message,
      };
    }
  }

  /**
   * Checks if a specific Telegram user is an active member or admin in a chat
   */
  static async isUserInChat(
    botToken: string,
    chatId: string,
    telegramUserId: string,
  ): Promise<boolean> {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${encodeURIComponent(telegramUserId)}`,
      );
      const data = (await res.json()) as TelegramGetChatMemberResponse;
      if (res.ok && data.ok && data.result) {
        const status = data.result.status;
        return ['creator', 'administrator', 'member', 'restricted'].includes(
          status,
        );
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Dispatches the compiled APK artifact directly into the Telegram chat as a downloadable document
   */
  static async sendApkDocument(
    botToken: string,
    chatId: string,
    apkUrlOrPath: string,
    version: string,
    appName: string,
    logger?: TelegramLogger,
  ): Promise<boolean> {
    try {
      const url = `https://api.telegram.org/bot${botToken}/sendDocument`;
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append(
        'caption',
        `📲 <b>Direct APK Download:</b> <code>${appName}</code> (<code>${version}</code>)\nTap the file above to install directly on Android.`,
      );
      formData.append('parse_mode', 'HTML');

      // Candidate local build paths
      const mobileDir = process.env.MOBILE_APP_DIR;
      const candidatePaths = [
        ...(mobileDir
          ? [
              path.resolve(
                mobileDir,
                'build/app/outputs/flutter-apk/app-debug.apk',
              ),
              path.resolve(
                mobileDir,
                'build/app/outputs/apk/debug/app-debug.apk',
              ),
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger?.warn?.(
        `Failed to dispatch APK document to ${chatId}: ${message}`,
      );
      return false;
    }
  }
}
