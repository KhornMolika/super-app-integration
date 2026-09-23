import { Repository } from 'typeorm';
import { User } from '../../../access-control/entities/user.entity';
import { MiniApp } from '../../../miniapps/entities/miniapp.entity';
import { SettingsService } from '../../../settings/settings.service';
import { TelegramApiHelper } from './telegram-api.helper';
import {
  TelegramGroupAssociation,
  TelegramGroupItem,
  TelegramRecentChat,
  TelegramReassignResult,
  TelegramAssignAppResult,
  TelegramCleanupResult,
  TelegramDiscoveredGroup,
  TelegramLogger,
} from './telegram.types';

export class TelegramGroupHelper {
  /**
   * Aggregates and live-validates all Telegram groups associated with the user, mini-apps, and bot activity
   */
  static async getUserTelegramGroups(
    userId?: string,
    userRepository?: Repository<User>,
    miniAppRepository?: Repository<MiniApp>,
    settingsService?: SettingsService,
    botToken?: string,
    botId?: number | null,
    defaultChatId?: string,
    logger?: TelegramLogger,
  ): Promise<TelegramGroupItem[]> {
    const groupsMap = new Map<string, TelegramGroupItem>();

    let dbUser: User | null = null;
    if (userId && userRepository) {
      dbUser = await userRepository.findOne({
        where: { id: userId },
        relations: { roles: true },
      });
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

    let miniApps: MiniApp[] = [];
    if (miniAppRepository) {
      miniApps = isAdmin
        ? await miniAppRepository.find()
        : userId
          ? await miniAppRepository.find({ where: { ownerId: userId } })
          : [];
    }

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
    if (settingsService) {
      try {
        const cached = await settingsService.getSetting<
          TelegramDiscoveredGroup[]
        >('TELEGRAM_DISCOVERED_GROUPS', []);
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
      } catch (cErr: unknown) {
        const msg = cErr instanceof Error ? cErr.message : String(cErr);
        logger?.warn?.(`Failed to load cached Telegram groups: ${msg}`);
      }
    }

    // 4. Scan recent updates from Telegram bot (with explicit allowed_updates)
    if (botToken) {
      try {
        const updates = await TelegramApiHelper.fetchUpdates(botToken);
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

        if (newlyFound && settingsService) {
          const allCached = Array.from(groupsMap.values()).map((g) => ({
            id: g.id,
            title: g.title,
            type: g.type,
            associatedWith: g.associatedWith,
            lastDiscoveredAt: new Date().toISOString(),
          }));
          settingsService
            .setSetting(
              'TELEGRAM_DISCOVERED_GROUPS',
              allCached,
              'Persistently discovered Telegram groups and channels',
            )
            .catch(() => {
              /* ignore */
            });
        }
      } catch (err) {
        logger?.warn?.('Failed to query Telegram getUpdates for groups:', err);
      }
    }

    // 5. Default platform operations channel (if set in env)
    if (defaultChatId && isAdmin) {
      const defaultId = defaultChatId.trim();
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

    // 6. Live-validate all candidate groups in parallel via Telegram getChat API
    if (!botToken) {
      return Array.from(groupsMap.values());
    }

    const entries = Array.from(groupsMap.entries());
    const validationResults = await Promise.allSettled(
      entries.map(async ([chatId, group]) => {
        const check = await TelegramApiHelper.validateChat(
          botToken,
          botId ?? null,
          chatId,
          logger,
        );
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
            logger?.debug?.(
              `Excluding non-existent Telegram group ${chatId} (${group.title}): ${check.error}`,
            );
          }
        }
      }
    }

    return resultList;
  }

  /**
   * Retrieves recent direct contacts and groups who interacted with the bot for Auto-Detection
   */
  static async getRecentBotChats(
    userRepository?: Repository<User>,
    settingsService?: SettingsService,
    botToken?: string,
    logger?: TelegramLogger,
  ): Promise<TelegramRecentChat[]> {
    const contactsMap = new Map<string, TelegramRecentChat>();

    if (settingsService) {
      try {
        const cached = await settingsService.getSetting<
          TelegramDiscoveredGroup[]
        >('TELEGRAM_DISCOVERED_GROUPS', []);
        if (Array.isArray(cached)) {
          for (const g of cached) {
            if (g?.id && !contactsMap.has(g.id)) {
              contactsMap.set(g.id, {
                chatId: g.id,
                type: (g.type as TelegramRecentChat['type']) || 'group',
                name: g.title || 'Saved Telegram Group',
                lastActive:
                  g.lastDiscoveredAt || g.savedAt || new Date().toISOString(),
                isDirectUser: false,
              });
            }
          }
        }
      } catch {
        // Ignore setting lookup failure
      }
    }

    if (botToken) {
      try {
        const updates = await TelegramApiHelper.fetchUpdates(botToken);
        for (const update of [...updates].reverse()) {
          const msg =
            update.message || update.channel_post || update.my_chat_member;
          const chat = msg?.chat;
          const from =
            msg && 'from' in msg
              ? (msg as { from?: { username?: string } }).from
              : update.message?.from;
          if (chat && chat.id) {
            const chatId = chat.id.toString();
            if (!contactsMap.has(chatId)) {
              const isPrivate = chat.type === 'private';
              const displayName = isPrivate
                ? [chat.first_name, chat.last_name].filter(Boolean).join(' ') ||
                  chat.username ||
                  'Telegram User'
                : chat.title || 'Telegram Group';

              contactsMap.set(chatId, {
                chatId,
                type: chat.type,
                name: displayName,
                username: chat.username || from?.username || undefined,
                lastActive:
                  msg && 'date' in msg && typeof msg.date === 'number'
                    ? new Date(msg.date * 1000).toISOString()
                    : new Date().toISOString(),
                isDirectUser: isPrivate,
              });
            }
          }
        }
      } catch (err) {
        logger?.warn?.(
          'Failed to query getUpdates for getRecentBotChats:',
          err,
        );
      }
    }

    // Also include existing users with saved Telegram credentials
    if (userRepository) {
      try {
        const existingUsers = await userRepository.find({ where: {} });
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
      } catch {
        // Ignore user lookup failure
      }
    }

    return Array.from(contactsMap.values());
  }

  /**
   * Persistently records a discovered or verified Telegram group into SettingsService
   */
  static async persistDiscoveredGroup(
    settingsService: SettingsService | undefined,
    chatId: string,
    title?: string,
    type: string = 'group',
    logger?: TelegramLogger,
  ): Promise<void> {
    if (!settingsService || !chatId) return;
    try {
      const existing = await settingsService.getSetting<
        TelegramDiscoveredGroup[]
      >('TELEGRAM_DISCOVERED_GROUPS', []);
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
      await settingsService.setSetting(
        'TELEGRAM_DISCOVERED_GROUPS',
        list,
        'Persistently discovered Telegram groups and channels',
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger?.warn?.(`Failed to persist Telegram group ${chatId}: ${msg}`);
    }
  }

  /**
   * Reassigns all Mini Apps (and optionally user profile) from an old group ID to a new group ID
   */
  static async reassignTelegramGroup(
    oldChatId: string,
    newChatId: string | null,
    userId: string | undefined,
    userRepository: Repository<User>,
    miniAppRepository: Repository<MiniApp>,
  ): Promise<TelegramReassignResult> {
    if (!oldChatId) {
      return {
        success: false,
        updatedCount: 0,
        message: 'Old Chat ID is required.',
      };
    }

    const trimmedOld = oldChatId.trim();
    const trimmedNew = newChatId?.trim() || null;

    let updatedCount = 0;

    let userApps: MiniApp[] = [];
    if (userId) {
      const user = await userRepository.findOne({
        where: { id: userId },
        relations: { roles: true },
      });
      const isAdmin = user?.roles?.some(
        (r) => r.name === 'SUPER_ADMIN' || r.name === 'ADMIN',
      );
      userApps = isAdmin
        ? await miniAppRepository.find()
        : await miniAppRepository.find({ where: { ownerId: userId } });

      // Update user profile teamTelegramChatId if matching
      if (user && user.teamTelegramChatId?.trim() === trimmedOld) {
        user.teamTelegramChatId = trimmedNew || undefined;
        await userRepository.save(user);
      }
    } else {
      userApps = await miniAppRepository.find();
    }

    for (const app of userApps) {
      const pendingRev = app.pendingRevision as
        | { teamTelegramChatId?: string | null; [key: string]: unknown }
        | null
        | undefined;
      const currentChatId =
        app.teamTelegramChatId || pendingRev?.teamTelegramChatId;
      if (!currentChatId) continue;
      const ids: string[] = currentChatId
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (ids.includes(trimmedOld)) {
        if (trimmedNew) {
          const updatedIds = Array.from(
            new Set(ids.map((id) => (id === trimmedOld ? trimmedNew : id))),
          );
          app.teamTelegramChatId = updatedIds.join(',');
          if (pendingRev) {
            pendingRev.teamTelegramChatId = updatedIds.join(',');
            app.pendingRevision = pendingRev;
          }
        } else {
          const remainingIds = ids.filter((id) => id !== trimmedOld);
          const finalVal =
            remainingIds.length > 0 ? remainingIds.join(',') : null;
          app.teamTelegramChatId = finalVal || undefined;
          if (pendingRev) {
            pendingRev.teamTelegramChatId = finalVal;
            app.pendingRevision = pendingRev;
          }
        }
        await miniAppRepository.save(app);
        updatedCount++;
      }
    }

    const actionText = trimmedNew
      ? `reassigned to "${trimmedNew}"`
      : 'unlinked';
    return {
      success: true,
      updatedCount,
      message: `Successfully ${actionText} for ${updatedCount} Mini App(s).`,
    };
  }

  /**
   * Assigns or moves a specific Mini App to a new Telegram group ID (or clear if null)
   */
  static async assignMiniAppToGroup(
    miniAppId: string,
    newChatId: string | null,
    userId: string | undefined,
    userRepository: Repository<User>,
    miniAppRepository: Repository<MiniApp>,
  ): Promise<TelegramAssignAppResult> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        miniAppId,
      );
    const app = isUuid
      ? await miniAppRepository.findOne({ where: { id: miniAppId } })
      : await miniAppRepository.findOne({
          where: [{ id: miniAppId }, { appId: miniAppId }],
        });

    if (!app) {
      return { success: false, message: `Mini App "${miniAppId}" not found.` };
    }

    if (userId) {
      const user = await userRepository.findOne({
        where: { id: userId },
        relations: { roles: true },
      });
      const isAdmin = user?.roles?.some(
        (r) => r.name === 'SUPER_ADMIN' || r.name === 'ADMIN',
      );
      if (!isAdmin && app.ownerId !== userId) {
        return {
          success: false,
          message: 'You do not have permission to modify this Mini App.',
        };
      }
    }

    const trimmedNew = newChatId?.trim() || null;
    app.teamTelegramChatId = trimmedNew || undefined;
    const pendingRev = app.pendingRevision as
      | { teamTelegramChatId?: string | null; [key: string]: unknown }
      | null
      | undefined;
    if (pendingRev) {
      pendingRev.teamTelegramChatId = trimmedNew || undefined;
      app.pendingRevision = pendingRev;
    }
    await miniAppRepository.save(app);

    return {
      success: true,
      miniApp: app,
      message: trimmedNew
        ? `Mini App "${app.name}" assigned to group ${trimmedNew} successfully!`
        : `Telegram group unlinked from Mini App "${app.name}".`,
    };
  }

  /**
   * Batch cleans up inactive / deleted groups across user's Mini Apps
   */
  static async cleanupInactiveGroups(
    userGroups: TelegramGroupItem[],
    reassignFn: (
      oldChatId: string,
      newChatId: string | null,
      userId?: string,
    ) => Promise<TelegramReassignResult>,
    userId?: string,
    defaultChatId?: string,
  ): Promise<TelegramCleanupResult> {
    const deadGroups = userGroups.filter((g) => g.isLive === false);

    if (deadGroups.length === 0) {
      return {
        success: true,
        cleanedCount: 0,
        message: 'No inactive groups detected.',
      };
    }

    let fallbackChatId: string | null = null;
    const liveDefault = userGroups.find(
      (g) => g.isLive && (g.isDefaultProfileChat || g.id === defaultChatId),
    );
    if (liveDefault) {
      fallbackChatId = liveDefault.id;
    }

    let totalCleaned = 0;
    for (const dead of deadGroups) {
      const res = await reassignFn(dead.id, fallbackChatId, userId);
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
}
