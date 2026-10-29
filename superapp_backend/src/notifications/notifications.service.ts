import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../access-control/entities/user.entity';
import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { NotificationGateway } from './notification.gateway';
import { TelegramService } from './channels/telegram.service';
import { MailService } from './channels/mail.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { createPaginatedResponse } from '../common/utils/pagination.util';
import { escapeLikeString } from '../common/utils/sql.util';
import { SortOrder } from '../common/dto/pagination-query.dto';

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
    skipTelegram = false,
  ) {
    let saved: Notification | null = null;
    try {
      const notification = this.notificationRepository.create({
        userId,
        title,
        message,
        type,
        miniAppId,
        metadata,
      });
      saved = await this.notificationRepository.save(notification);

      // 1. Emit live WebSocket event to Backoffice UI
      this.notificationGateway.emitNotification({
        type: 'notification.created',
        data: saved,
      });
    } catch (dbErr: any) {
      this.logger.warn(
        `Could not persist notification record in DB: ${dbErr.message}`,
      );
    }

    // 2. Dispatch Telegram rich cards to MA Manager, MiniApp Team Group & SA Admins
    if (!skipTelegram) {
      try {
        const targetChatIds: string[] = [];

        // Check target user's personal Telegram & team chat
        if (userId) {
          const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: { role: true },
          });
          if (
            user?.telegramChatId &&
            !targetChatIds.includes(user.telegramChatId)
          ) {
            targetChatIds.push(user.telegramChatId);
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
              appEntity.alertTelegramChatId ||
              (appEntity as any).teamTelegramChatId ||
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
          relations: { role: true },
        });
        const adminUsers = allUsers.filter((u) => {
          const rList = (u as any).roles || (u.role ? [u.role] : []);
          return rList.some(
            (r: any) => r.name === 'SUPER_ADMIN' || r.name === 'ADMIN',
          );
        });

        for (const admin of adminUsers) {
          if (
            admin.telegramChatId &&
            !targetChatIds.includes(admin.telegramChatId)
          ) {
            targetChatIds.push(admin.telegramChatId);
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
    }

    return saved;
  }

  /**
   * Broadcasts an administrative alert to all Super Admins & Admins
   * (In-App DB, Live WebSockets, and Telegram Channels)
   */
  async notifyAdmins(
    title: string,
    message: string,
    type: string,
    miniAppId?: string,
    metadata?: any,
  ) {
    try {
      const allUsers = await this.userRepository.find({
        relations: { role: true },
      });
      const admins = allUsers.filter((u) => {
        const rList = (u as any).roles || (u.role ? [u.role] : []);
        return rList.some(
          (r: any) => r.name === 'SUPER_ADMIN' || r.name === 'ADMIN',
        );
      });

      const targets =
        admins.length > 0 ? admins : allUsers.length > 0 ? [allUsers[0]] : [];

      for (let i = 0; i < targets.length; i++) {
        await this.createNotification(
          targets[i].id,
          title,
          message,
          type,
          miniAppId,
          metadata,
          i > 0,
        );
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to dispatch admin notification: ${err.message}`,
      );
    }
  }

  async findByUserId(
    userId: string,
    query?: QueryNotificationsDto,
  ): Promise<PaginatedResult<Notification> | Notification[]> {
    if (!query) {
      return this.notificationRepository.find({
        relations: { miniApp: true },
        order: { createdAt: 'DESC' },
        take: 100,
      });
    }

    const {
      page = 1,
      limit = 20,
      search,
      isRead,
      type,
      sortBy = 'createdAt',
      sortOrder = SortOrder.DESC,
    } = query;

    const qb = this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.miniApp', 'miniApp');

    if (isRead !== undefined) {
      qb.andWhere('notification.isRead = :isRead', { isRead });
    }

    if (type && type !== 'all' && type !== 'ALL') {
      qb.andWhere('LOWER(notification.type) = LOWER(:type)', { type });
    }

    if (search?.trim()) {
      const sanitized = escapeLikeString(search.trim());
      qb.andWhere(
        '(notification.title ILIKE :search OR notification.message ILIKE :search OR miniApp.name ILIKE :search)',
        { search: `%${sanitized}%` },
      );
    }

    const sortColumns: Record<string, string> = {
      createdAt: 'notification.createdAt',
      type: 'notification.type',
    };
    const orderColumn = sortColumns[sortBy] || 'notification.createdAt';
    const direction = sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';

    qb.orderBy(orderColumn, direction).addOrderBy('notification.id', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, totalItems] = await qb.getManyAndCount();
    return createPaginatedResponse(items, totalItems, page, limit);
  }

  async findById(id: string): Promise<Notification | null> {
    return this.notificationRepository.findOne({
      where: { id },
      relations: { miniApp: true },
    });
  }

  async markAsRead(id: string): Promise<{ success: boolean }> {
    await this.notificationRepository.update(id, { isRead: true });
    return { success: true };
  }

  async markAllAsRead(): Promise<{ success: boolean }> {
    await this.notificationRepository.update(
      { isRead: false },
      { isRead: true },
    );
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
