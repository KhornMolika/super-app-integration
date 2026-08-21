import { OrganizationsModule } from './organizations/organizations.module';
import { AuditModule } from './audit/audit.module';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module';
import { MiniappsModule } from './miniapps/miniapps.module';
import { AccessControlModule } from './access-control/access-control.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PermissionsModule } from './permissions/permissions.module';
import { PermissionProposalsModule } from './permission-proposals/permission-proposals.module';
import { SuperAppModule } from './super-app/super-app.module';
import { IntegrationsModule } from './integrations/integrations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env',
      ],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: Number(configService.get<string>('DB_PORT')),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),

    AuthModule,
    AccessControlModule,
    NotificationsModule,
    PermissionsModule,
    PermissionProposalsModule,
    SuperAppModule,
    MiniappsModule,
    OrganizationsModule,
    AuditModule,
    IntegrationsModule,
  ],
})

export class AppModule {}
