import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../access-control/entities/user.entity';
import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { NotificationGateway } from './notification.gateway';
import { TelegramService } from './telegram.service';

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
  ) {}

  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: string,
    miniAppId?: string,
  ) {
    const notification = this.notificationRepository.create({
      userId,
      title,
      message,
      type,
      miniAppId,
    });
    const saved = await this.notificationRepository.save(notification);

    // 1. Emit live WebSocket event to Backoffice UI
    this.notificationGateway.emitNotification({
      type: 'notification.created',
      data: saved,
    });

    // 2. Dispatch Telegram direct messages to MA Manager, MiniApp Team Group & SA Admins
    try {
      const targetChatIds: string[] = [];

      // Check target user's personal Telegram (e.g. MA Manager or actor)
      if (userId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (user?.telegramChatId && !targetChatIds.includes(user.telegramChatId)) {
          targetChatIds.push(user.telegramChatId);
        }
      }

      // Check MiniApp team Telegram group & owner's Telegram
      let miniAppName: string | undefined;
      if (miniAppId) {
        const miniApp = await this.miniAppRepository.findOne({
          where: { id: miniAppId },
          relations: { owner: true },
        });
        if (miniApp) {
          miniAppName = miniApp.name;
          if (miniApp.teamTelegramChatId && !targetChatIds.includes(miniApp.teamTelegramChatId)) {
            targetChatIds.push(miniApp.teamTelegramChatId);
          }
          if (miniApp.owner?.telegramChatId && !targetChatIds.includes(miniApp.owner.telegramChatId)) {
            targetChatIds.push(miniApp.owner.telegramChatId);
          }
        }
      }

      // Check Super Admins & Platform Admins personal Telegram and Ops Group
      const allUsers = await this.userRepository.find();
      const adminUsers = allUsers.filter((u) =>
        u.roles?.some((r) => r.name === 'SUPER_ADMIN' || r.name === 'ADMIN'),
      );

      for (const admin of adminUsers) {
        if (admin.telegramChatId && !targetChatIds.includes(admin.telegramChatId)) {
          targetChatIds.push(admin.telegramChatId);
        }
        if (admin.teamTelegramChatId && !targetChatIds.includes(admin.teamTelegramChatId)) {
          targetChatIds.push(admin.teamTelegramChatId);
        }
      }

      await this.telegramService.notifyNotificationCreated(
        title,
        message,
        type,
        miniAppName,
        targetChatIds,
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

  async markAsRead(id: string): Promise<void> {
    await this.notificationRepository.update(id, { isRead: true });
  }

  async markAllAsRead(): Promise<void> {
    await this.notificationRepository.update({}, { isRead: true });
  }

  async delete(id: string): Promise<void> {
    await this.notificationRepository.delete(id);
  }

  emitStageUpdate(data: any) {
    this.notificationGateway.emitStageUpdate(data);
  }
}
