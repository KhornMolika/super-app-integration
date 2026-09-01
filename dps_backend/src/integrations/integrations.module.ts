import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GitIntegrationController } from './git/git-integration.controller';
import { GitIntegrationService } from './git/git-integration.service';
import { GitHubProvider } from './git/providers/github.provider';
import { GitLabProvider } from './git/providers/gitlab.provider';
import { NexusIntegrationController } from './nexus/nexus-integration.controller';
import { NexusIntegrationService } from './nexus/nexus-integration.service';

import { ReleaseAssemblyVerificationController } from './release-assembly/release-assembly-verification.controller';
import { ReleaseAssemblyVerificationService } from './release-assembly/release-assembly-verification.service';

import { TypeOrmModule } from '@nestjs/typeorm';
import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { MiniAppIssue } from '../miniapps/entities/miniapp-issue.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { DomainVerificationService } from './webview/domain-verification.service';
import { ValidationCallbackController } from './validation/validation-callback.controller';
import { JenkinsService } from './jenkins/jenkins.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([MiniApp, MiniAppIssue]),
    NotificationsModule,
    AuditModule,
  ],
  controllers: [
    GitIntegrationController,
    NexusIntegrationController,
    ReleaseAssemblyVerificationController,
    ValidationCallbackController,
  ],
  providers: [
    GitIntegrationService,
    GitHubProvider,
    GitLabProvider,
    NexusIntegrationService,
    ReleaseAssemblyVerificationService,
    DomainVerificationService,
    JenkinsService,
  ],
  exports: [
    GitIntegrationService,
    GitHubProvider,
    GitLabProvider,
    NexusIntegrationService,
    ReleaseAssemblyVerificationService,
    DomainVerificationService,
    JenkinsService,
  ],
})
export class IntegrationsModule {}
