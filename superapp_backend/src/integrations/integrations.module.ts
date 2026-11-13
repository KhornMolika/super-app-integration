import { SuperAppModule } from '../super-app/super-app.module';
import { SuperAppBuildsController } from './super-app-builds/super-app-builds.controller';
import { MiniAppRunsModule } from '../miniapps/miniapp-runs.module';
import { AuthModule } from '../auth/auth.module';
import { Module, forwardRef } from '@nestjs/common';
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
import { SuperAppCapability } from '../super-app/entities/super-app-capability.entity';
import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { MiniAppIssue } from '../miniapps/entities/miniapp-issue.entity';
import { Identity } from '../identities/entities/identity.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { CapabilitiesModule } from '../capabilities/capabilities.module';
import { StorageModule } from '../storage/storage.module';
import { DomainVerificationService } from './webview/domain-verification.service';
import { ValidationCallbackController } from './validation/validation-callback.controller';
import { ScanSourceController } from './validation/scan-source.controller';
import { JenkinsService } from './jenkins/jenkins.service';
import { LocalSecurityScannerService } from './validation/local-security-scanner.service';
import { ScanFinalizerService } from './validation/scan-finalizer.service';
import { ScannedArtifactPublisherService } from './validation/scanned-artifact-publisher.service';
import { WebViewSecurityScanner } from './validation/scanners/webview-security.scanner';
import { FlutterPackageSecurityScanner } from './validation/scanners/flutter-package-security.scanner';
import { NativeSdkSecurityScanner } from './validation/scanners/native-sdk-security.scanner';
import { DeepLinkSecurityScanner } from './validation/scanners/deep-link-security.scanner';
import { PubspecInjectorService } from './flutter/pubspec-injector.service';
import { PubspecPrecheckService } from './flutter/pubspec-precheck.service';
import { SandboxBuildManagerService } from './flutter/sandbox-build-manager.service';
import { ApkBuildManagerService } from './flutter/apk-build-manager.service';
import { PubVulnerabilityScannerService } from './validation/pub-vulnerability-scanner.service';
import { PubspecInjectorController } from './flutter/pubspec-injector.controller';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => AuthModule),
    TypeOrmModule.forFeature([MiniApp, MiniAppIssue, Identity, SuperAppCapability]),
    NotificationsModule,
    forwardRef(() => AuditModule),
    CapabilitiesModule,
    forwardRef(() => StorageModule),
    MiniAppRunsModule,
    SuperAppModule,
  ],
  controllers: [
    GitIntegrationController,
    NexusIntegrationController,
    ReleaseAssemblyVerificationController,
    ValidationCallbackController,
    ScanSourceController,
    PubspecInjectorController,
    SuperAppBuildsController,
  ],
  providers: [
    GitIntegrationService,
    GitHubProvider,
    GitLabProvider,
    NexusIntegrationService,
    ReleaseAssemblyVerificationService,
    DomainVerificationService,
    JenkinsService,
    ScanFinalizerService,
    ScannedArtifactPublisherService,
    WebViewSecurityScanner,
    FlutterPackageSecurityScanner,
    NativeSdkSecurityScanner,
    DeepLinkSecurityScanner,
    LocalSecurityScannerService,
    PubspecInjectorService,
    PubspecPrecheckService,
    SandboxBuildManagerService,
    ApkBuildManagerService,
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
    ScanFinalizerService,
    ScannedArtifactPublisherService,
    WebViewSecurityScanner,
    FlutterPackageSecurityScanner,
    NativeSdkSecurityScanner,
    DeepLinkSecurityScanner,
    LocalSecurityScannerService,
    PubspecInjectorService,
    PubspecPrecheckService,
    SandboxBuildManagerService,
    ApkBuildManagerService,
    PubVulnerabilityScannerService,
  ],
})
export class IntegrationsModule {}
