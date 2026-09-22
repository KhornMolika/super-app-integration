import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../access-control/entities/user.entity';
import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { NotificationGateway } from './notification.gateway';
import { NotificationsService } from './notifications.service';
import { TelegramService } from './channels/telegram.service';
import { NotificationsController } from './notifications.controller';
import { TelegramController } from './channels/telegram.controller';
import { MailService } from './channels/mail.service';
import { MailController } from './channels/mail.controller';
import { PipelinePacerService } from './pipeline-pacer.service';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User, MiniApp]),
    AuthModule,
  ],
  controllers: [NotificationsController, TelegramController, MailController],
  providers: [
    NotificationGateway,
    NotificationsService,
    TelegramService,
    MailService,
    PipelinePacerService,
  ],
  exports: [
    NotificationsService,
    TelegramService,
    MailService,
    PipelinePacerService,
  ],
})
export class NotificationsModule {}
