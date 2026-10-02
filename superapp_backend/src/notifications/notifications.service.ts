import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../access-control/entities/user.entity';
import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { NotificationGateway } from './notification.gateway';
import { TelegramService } from './channels/telegram.service';
import { MailService } from './channels/mail.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(MiniApp)
    private miniAppRepository: Repository<MiniApp>,
    private notificationGateway: NotificationGateway,
    private telegramService: TelegramService,
    private mailService: MailService,
  ) {}

  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: string,
    miniAppId?: string,
    metadata?: any,
  ) {
    const notification = this.notificationRepository.create({
      userId,
      title,
      message,
      type,
      miniAppId,
      metadata,
    });
    const saved = await this.notificationRepository.save(notification);

    // 1. Emit live WebSocket event to Backoffice UI
    this.notificationGateway.emitNotification({
      type: 'notification.created',
      data: saved,
    });

    // 2. Dispatch Telegram rich cards to MA Manager, MiniApp Team Group & SA Admins
    try {
      const targetChatIds: string[] = [];

      // Check target user's personal Telegram & team chat
      if (userId) {
        const user = await this.userRepository.findOne({
          where: { id: userId },
          relations: { roles: true },
        });
        if (
          user?.telegramChatId &&
          !targetChatIds.includes(user.telegramChatId)
        ) {
          targetChatIds.push(user.telegramChatId);
        }
        if (user?.teamTelegramChatId) {
          const splitUserTeamIds = user.teamTelegramChatId
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          for (const uId of splitUserTeamIds) {
            if (!targetChatIds.includes(uId)) {
              targetChatIds.push(uId);
            }
          }
        }
      }

      // Check MiniApp team Telegram group & owner's Telegram
      let miniAppName: string | undefined;
      let appEntity: MiniApp | null = null;
      if (miniAppId) {
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            miniAppId,
          );
        appEntity = isUuid
          ? await this.miniAppRepository.findOne({
              where: { id: miniAppId },
              relations: { owner: true },
            })
          : await this.miniAppRepository.findOne({
              where: [{ id: miniAppId }, { appId: miniAppId }],
              relations: { owner: true },
            });

        if (appEntity) {
          miniAppName = appEntity.name;
          const groupChatId =
            appEntity.teamTelegramChatId ||
            appEntity.pendingRevision?.teamTelegramChatId;
          if (groupChatId) {
            const splitIds = groupChatId
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            for (const cId of splitIds) {
              if (!targetChatIds.includes(cId)) {
                targetChatIds.push(cId);
              }
            }
          }
          if (
            appEntity.owner?.telegramChatId &&
            !targetChatIds.includes(appEntity.owner.telegramChatId)
          ) {
            targetChatIds.push(appEntity.owner.telegramChatId);
          }
          if (appEntity.owner?.teamTelegramChatId) {
            const splitOwnerTeamIds = appEntity.owner.teamTelegramChatId
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            for (const otId of splitOwnerTeamIds) {
              if (!targetChatIds.includes(otId)) {
                targetChatIds.push(otId);
              }
            }
          }
        }
      }

      // Check explicit metadata team chat ID
      if (metadata?.teamTelegramChatId) {
        const splitMetaIds = String(metadata.teamTelegramChatId)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        for (const mId of splitMetaIds) {
          if (!targetChatIds.includes(mId)) {
            targetChatIds.push(mId);
          }
        }
      }

      // Check Super Admins & Platform Admins personal Telegram and Ops Group
      const allUsers = await this.userRepository.find({
        relations: { roles: true },
      });
      const adminUsers = allUsers.filter((u) =>
        u.roles?.some((r) => r.name === 'SUPER_ADMIN' || r.name === 'ADMIN'),
      );

      for (const admin of adminUsers) {
        if (
          admin.telegramChatId &&
          !targetChatIds.includes(admin.telegramChatId)
        ) {
          targetChatIds.push(admin.telegramChatId);
        }
        if (admin.teamTelegramChatId) {
          const splitAdminTeamIds = admin.teamTelegramChatId
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          for (const aId of splitAdminTeamIds) {
            if (!targetChatIds.includes(aId)) {
              targetChatIds.push(aId);
            }
          }
        }
      }

      const mergedMeta = {
        miniAppId,
        miniAppName,
        appId: appEntity?.appId,
        ...(metadata || {}),
      };

      await this.telegramService.notifyNotificationCreated(
        title,
        message,
        type,
        miniAppName,
        targetChatIds,
        mergedMeta,
      );
    } catch (err: any) {
      this.logger.warn(`Failed to deliver Telegram alert: ${err.message}`);
    }

    return saved;
  }

  async findByUserId(userId: string) {
    return this.notificationRepository.find({
      relations: { miniApp: true },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async markAsRead(id: string): Promise<{ success: boolean }> {
    await this.notificationRepository.update(id, { isRead: true });
    return { success: true };
  }

  async markAllAsRead(): Promise<{ success: boolean }> {
    await this.notificationRepository.update({ isRead: false }, { isRead: true });
    return { success: true };
  }

  async delete(id: string): Promise<{ success: boolean }> {
    await this.notificationRepository.delete(id);
    return { success: true };
  }

  emitStageUpdate(data: any) {
    this.notificationGateway.emitStageUpdate(data);
  }

  emitBuildStageUpdate(data: any) {
    this.notificationGateway.emitBuildStageUpdate(data);
  }

  emitBuildCompleted(data: any) {
    this.notificationGateway.emitBuildCompleted(data);
  }
}

