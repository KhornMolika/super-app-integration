import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../access-control/entities/user.entity';
import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { NotificationGateway } from './notification.gateway';
import { NotificationsService } from './notifications.service';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User, MiniApp]),
    AuthModule,
  ],
  controllers: [TelegramController],
  providers: [NotificationGateway, NotificationsService, TelegramService],
  exports: [NotificationsService, TelegramService],
})
export class NotificationsModule {}
