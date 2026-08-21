import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MiniappsService } from './miniapps.service';
import { MiniappsController } from './miniapps.controller';
import { MiniApp } from './entities/miniapp.entity';
import { MiniAppIssue } from './entities/miniapp-issue.entity';
import { MiniAppActivity } from './entities/miniapp-activity.entity';

import { MailModule } from '../mail/mail.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { PermissionProposalsModule } from '../permission-proposals/permission-proposals.module';
import { SuperAppModule } from '../super-app/super-app.module';
import { AuditModule } from '../audit/audit.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MiniApp,
      MiniAppIssue,
      MiniAppActivity,
    ]),
    MailModule,
    AuthModule,
    NotificationsModule,
    PermissionsModule,
    PermissionProposalsModule,
    SuperAppModule,
    AuditModule,
    IntegrationsModule,
  ],
  controllers: [MiniappsController],
  providers: [MiniappsService],
})
export class MiniappsModule {}
