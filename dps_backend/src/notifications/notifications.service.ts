import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private notificationGateway: NotificationGateway,
  ) {}

  async createNotification(userId: string, title: string, message: string, type: string) {
    const notification = this.notificationRepository.create({
      userId,
      title,
      message,
      type,
    });
    const saved = await this.notificationRepository.save(notification);
    this.notificationGateway.emitNotification({
      type: 'notification.created',
      data: saved
    });
    return saved;
  }

  async findByUserId(userId: string) {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(id: string): Promise<void> {
    await this.notificationRepository.update(id, { isRead: true });
  }
}
