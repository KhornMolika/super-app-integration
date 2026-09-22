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
import { PermissionsModule } from '../permissions/permissions.module';
import { DomainVerificationService } from './webview/domain-verification.service';
import { ValidationCallbackController } from './validation/validation-callback.controller';
import { JenkinsService } from './jenkins/jenkins.service';
import { LocalSecurityScannerService } from './validation/local-security-scanner.service';
import { PubspecInjectorService } from './flutter/pubspec-injector.service';
import { PubspecPrecheckService } from './flutter/pubspec-precheck.service';
import { SandboxBuildManagerService } from './flutter/sandbox-build-manager.service';
import { PubVulnerabilityScannerService } from './validation/pub-vulnerability-scanner.service';
import { PubspecInjectorController } from './flutter/pubspec-injector.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([MiniApp, MiniAppIssue]),
    NotificationsModule,
    AuditModule,
    PermissionsModule,
  ],
  controllers: [
    GitIntegrationController,
    NexusIntegrationController,
    ReleaseAssemblyVerificationController,
    ValidationCallbackController,
    PubspecInjectorController,
  ],
  providers: [
    GitIntegrationService,
    GitHubProvider,
    GitLabProvider,
    NexusIntegrationService,
    ReleaseAssemblyVerificationService,
    DomainVerificationService,
    JenkinsService,
    LocalSecurityScannerService,
    PubspecInjectorService,
    PubspecPrecheckService,
    SandboxBuildManagerService,
    PubVulnerabilityScannerService,
  ],
  exports: [
    GitIntegrationService,
    GitHubProvider,
    GitLabProvider,
    NexusIntegrationService,
    ReleaseAssemblyVerificationService,
    DomainVerificationService,
    JenkinsService,
    LocalSecurityScannerService,
    PubspecInjectorService,
    PubspecPrecheckService,
    SandboxBuildManagerService,
    PubVulnerabilityScannerService,
  ],
})
export class IntegrationsModule {}
