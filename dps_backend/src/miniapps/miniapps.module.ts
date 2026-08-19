import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MiniappsService } from './miniapps.service';
import { MiniappsController } from './miniapps.controller';
import { MiniApp } from './entities/miniapp.entity';
import { MiniAppPermissionRequest } from './entities/miniapp-permission-request.entity';
import { MiniAppIssue } from './entities/miniapp-issue.entity';

import { MailModule } from '../mail/mail.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { PermissionProposalsModule } from '../permission-proposals/permission-proposals.module';
import { SuperAppModule } from '../super-app/super-app.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MiniApp,
      MiniAppPermissionRequest,
      MiniAppIssue,
    ]),
    MailModule,
    AuthModule,
    NotificationsModule,
    PermissionsModule,
    PermissionProposalsModule,
    SuperAppModule,
  ],
  controllers: [MiniappsController],
  providers: [MiniappsService],
})
export class MiniappsModule {}
