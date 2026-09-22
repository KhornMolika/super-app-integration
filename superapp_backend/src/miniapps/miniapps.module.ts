import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MiniappsService } from './miniapps.service';
import { MiniappsController } from './miniapps.controller';
import { MiniApp } from './entities/miniapp.entity';
import { MiniAppIssue } from './entities/miniapp-issue.entity';
import { MiniAppActivity } from './entities/miniapp-activity.entity';

import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { PermissionProposalsModule } from '../permission-proposals/permission-proposals.module';
import { SuperAppModule } from '../super-app/super-app.module';
import { AuditModule } from '../audit/audit.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { StorageModule } from '../storage/storage.module';
import { NativeSdkCodegenModule } from '../native-sdk-codegen/native-sdk-codegen.module';
import { SdkArtifactsModule } from '../sdk-artifacts/sdk-artifacts.module';

import { PermissionDetectorHelper } from './helpers/permission-detector.helper';
import { MiniappValidationHelper } from './helpers/miniapp-validation.helper';
import { MiniappLifecycleHelper } from './helpers/miniapp-lifecycle.helper';
import { ArtifactDistributionHelper } from './helpers/artifact-distribution.helper';
import { DomainAssociationHelper } from './helpers/domain-association.helper';
import { MiniappMutationHelper } from './helpers/miniapp-mutation.helper';
import { UrlProbeHelper } from './helpers/url-probe.helper';

@Module({
  imports: [
    TypeOrmModule.forFeature([MiniApp, MiniAppIssue, MiniAppActivity]),
    AuthModule,
    NotificationsModule,
    PermissionsModule,
    PermissionProposalsModule,
    SuperAppModule,
    AuditModule,
    IntegrationsModule,
    StorageModule,
    NativeSdkCodegenModule,
    SdkArtifactsModule,
  ],
  controllers: [MiniappsController],
  providers: [
    MiniappsService,
    PermissionDetectorHelper,
    MiniappValidationHelper,
    MiniappLifecycleHelper,
    ArtifactDistributionHelper,
    DomainAssociationHelper,
    MiniappMutationHelper,
    UrlProbeHelper,
  ],
  exports: [
    MiniappsService,
    PermissionDetectorHelper,
    MiniappValidationHelper,
    MiniappLifecycleHelper,
    ArtifactDistributionHelper,
    DomainAssociationHelper,
    MiniappMutationHelper,
    UrlProbeHelper,
  ],
})
export class MiniappsModule {}
