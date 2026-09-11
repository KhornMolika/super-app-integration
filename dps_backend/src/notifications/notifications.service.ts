import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationGateway } from './notification.gateway';
import { TelegramService } from './telegram.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
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

    // 2. Dispatch Telegram direct message to MA Manager & SA Admin
    try {
      let miniAppName: string | undefined;
      if (miniAppId) {
        const loaded = await this.notificationRepository.findOne({
          where: { id: saved.id },
          relations: { miniApp: true },
        });
        miniAppName = loaded?.miniApp?.name;
      }
      await this.telegramService.notifyNotificationCreated(
        title,
        message,
        type,
        miniAppName,
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
