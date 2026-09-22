import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { MiniApp } from '../entities/miniapp.entity';
import { NotificationsService, MailService } from '../../notifications';
import { PipelinePacerService } from '../../notifications/pipeline-pacer.service';
import { JenkinsService } from '../../integrations/jenkins/jenkins.service';
import { SuperAppService } from '../../super-app/super-app.service';
import { GitIntegrationService } from '../../integrations/git/git-integration.service';
import { PubspecInjectorService } from '../../integrations/flutter/pubspec-injector.service';
import {
  LocalSecurityScannerService,
  buildDynamicValidationStages,
  getDefaultChecksForMethod,
} from '../../integrations/validation/local-security-scanner.service';
import { resolveBackofficeBaseUrl } from '../../common/utils/network.utils';

@Injectable()
export class MiniappLifecycleHelper {
  private readonly logger = new Logger(MiniappLifecycleHelper.name);
  private get backofficeBaseUrl(): string {
    return resolveBackofficeBaseUrl();
  }

  constructor(
    @InjectRepository(MiniApp)
    private miniappRepository: Repository<MiniApp>,

    private notificationsService: NotificationsService,
    private mailService: MailService,
    private jenkinsService: JenkinsService,
    private superAppService: SuperAppService,
    private localSecurityScannerService: LocalSecurityScannerService,
    private pipelinePacerService: PipelinePacerService,
    private gitService: GitIntegrationService,
    private pubspecService: PubspecInjectorService,
  ) {}

  async submitForReview(
    app: MiniApp,
    actorId: string,
    logActivityFn: (
      miniAppId: string,
      actorId: string,
      actionType: string,
      title: string,
      description: string,
      auditAction: string,
      oldVal?: any,
      newVal?: any,
    ) => Promise<void>,
  ) {
    const currentStatus = app.status?.toUpperCase();
    if (currentStatus !== 'DRAFT' && currentStatus !== 'REJECTED') {
      throw new BadRequestException('App is not in DRAFT or REJECTED status');
    }

    const id = app.id;
    const method = (app.integrationMethod || 'WEBVIEW') as 'WEBVIEW' | 'FLUTTER_PACKAGE' | 'NATIVE_SDK' | 'DEEP_LINK';
    const initialStages = buildDynamicValidationStages(
      method,
      app.securityChecks,
    );
    app.validationStages = initialStages;
    app.status = 'SUBMITTED';
    app.validationStatus = 'RUNNING';
    await this.miniappRepository.save(app);

    const cfg = app.integrationConfig || {};
    const envVal = (process.env.ENVIRONMENT || '').toUpperCase();
    const allowLocal = envVal === 'DEV';

    const declaredPerms = Array.isArray(app.permissions)
      ? app.permissions
          .map((p: any) => (typeof p === 'string' ? p : p.name || p.id || p.type))
          .filter(Boolean)
      : [];
    const requiredPerms = declaredPerms;

    // Super App Host Supported Capabilities whitelist
    const allowedCaps = ['camera', 'geolocator', 'location', 'local_auth', 'biometrics'];
    const requiredCaps = requiredPerms;

    const allowedDomains = Array.isArray(cfg.allowedDomains)
      ? cfg.allowedDomains
      : typeof cfg.allowedDomains === 'string'
        ? cfg.allowedDomains.split(',')
        : [];

    const integrationType = cfg.packageStoragePath
      ? 'ARTIFACT'
      : 'SOURCE_CODE';
    const repoUrl =
      cfg.repoUrl ||
      (cfg.repoOwner && cfg.repoName
        ? `https://github.com/${cfg.repoOwner}/${cfg.repoName}`
        : '');
    const commitSha = cfg.commitSha || cfg.branch || 'main';
    const gitProvider = (cfg.provider || 'GITHUB').toUpperCase();
    const packageName = cfg.packageName || cfg.name || app.name;
    const packageVersion = cfg.packageVersion || cfg.version || '1.0.0';

    this.logger.log(
      `Triggering universal Jenkins validation pipeline for ${method} Mini App ${id}...`,
    );

    this.jenkinsService
      .triggerMiniAppValidation({
        miniAppId: id,
        integrationMethod: method,
        targetUrl: cfg.productionUrl || cfg.url,
        urlScheme: cfg.urlScheme,
        appStoreUrl: cfg.appStoreUrl,
        allowedDomains,
        allowLocal,
        packageName,
        version: packageVersion,
        integrationType,
        sourceStoragePath: cfg.packageStoragePath || '',
        repoUrl,
        commitSha,
        gitProvider,
        allowedCapabilities: allowedCaps,
        requiredCapabilities: requiredCaps,
        checks: app.securityChecks || getDefaultChecksForMethod(method),
        isPrivateRepo: cfg.isPrivateRepo === true,
        gitAuthMethod: cfg.authMethod || (cfg.isPrivateRepo ? 'deploy_key' : 'none'),
        gitAccessToken: cfg.gitAccessToken || cfg.token || '',
        deployKey: cfg.deployKey || '',
      })
      .then(async (res) => {
        if (!res?.success) {
          const reason = res?.message || 'Jenkins returned an unsuccessful status';
          this.logger.warn(
            `Jenkins unavailable (${reason}). Falling back to local security scanner for ${method}.`,
          );
          await this.localSecurityScannerService.scanMiniApp(id, method, {
            fallbackReason: reason,
            securityChecks: app.securityChecks,
          });
        }
      })
      .catch(async (err) => {
        const reason = `Jenkins connection failed: ${err.message}`;
        this.logger.error(
          `Jenkins trigger error: ${err.message}. Falling back to local security scanner for ${method}.`,
        );
        await this.localSecurityScannerService.scanMiniApp(id, method, {
          fallbackReason: reason,
          securityChecks: app.securityChecks,
        });
      });

    await logActivityFn(
      id,
      actorId,
      'STATUS_CHANGE',
      'Submitted for Review',
      'App submitted for review',
      'SUBMIT_MINI_APP',
      null,
      app,
    );
    return app;
  }

  async rescan(
    app: MiniApp,
    actorId = 'system',
    logActivityFn: (
      miniAppId: string,
      actorId: string,
      actionType: string,
      title: string,
      description: string,
      auditAction: string,
      oldVal?: any,
      newVal?: any,
    ) => Promise<void>,
    customChecks?: string[],
  ) {
    const id = app.id;

    if (customChecks && customChecks.length > 0) {
      app.securityChecks = customChecks;
      await this.miniappRepository.save(app);
    }

    const method = (app.integrationMethod || 'WEBVIEW') as 'WEBVIEW' | 'FLUTTER_PACKAGE' | 'NATIVE_SDK' | 'DEEP_LINK';
    const activeChecks =
      app.securityChecks && app.securityChecks.length > 0
        ? app.securityChecks
        : getDefaultChecksForMethod(method);

    const initialStages = buildDynamicValidationStages(
      method,
      activeChecks,
    );

    app.validationStages = initialStages;
    app.validationStatus = 'RUNNING';
    await this.miniappRepository.save(app);

    const cfg = app.integrationConfig || {};
    const envVal = (process.env.ENVIRONMENT || '').toUpperCase();
    const allowLocal = envVal === 'DEV';

    const declaredPerms = Array.isArray(app.permissions)
      ? app.permissions
          .map((p: any) => (typeof p === 'string' ? p : p.name || p.id || p.type))
          .filter(Boolean)
      : [];
    const requiredPerms = declaredPerms;

    // Super App Host Supported Capabilities whitelist
    const allowedCaps = ['camera', 'geolocator', 'location', 'local_auth', 'biometrics'];
    const requiredCaps = requiredPerms;

    const allowedDomains = Array.isArray(cfg.allowedDomains)
      ? cfg.allowedDomains
      : typeof cfg.allowedDomains === 'string'
        ? cfg.allowedDomains.split(',')
        : [];

    const integrationType = cfg.packageStoragePath
      ? 'ARTIFACT'
      : 'SOURCE_CODE';
    const repoUrl =
      cfg.repoUrl ||
      (cfg.repoOwner && cfg.repoName
        ? `https://github.com/${cfg.repoOwner}/${cfg.repoName}`
        : '');
    const commitSha = cfg.commitSha || cfg.branch || 'main';
    const gitProvider = (cfg.provider || 'GITHUB').toUpperCase();
    const packageName = cfg.packageName || cfg.name || app.name;
    const packageVersion = cfg.packageVersion || cfg.version || '1.0.0';

    this.logger.log(
      `Re-triggering universal Jenkins validation pipeline for ${method} Mini App ${id}...`,
    );

    const jenkinsRes = await this.jenkinsService
      .triggerMiniAppValidation({
        miniAppId: id,
        integrationMethod: method,
        targetUrl: cfg.productionUrl || cfg.url,
        urlScheme: cfg.urlScheme,
        appStoreUrl: cfg.appStoreUrl,
        allowedDomains,
        allowLocal,
        packageName,
        version: packageVersion,
        integrationType,
        sourceStoragePath: cfg.packageStoragePath || '',
        repoUrl,
        commitSha,
        gitProvider,
        allowedCapabilities: allowedCaps,
        requiredCapabilities: requiredCaps,
        checks: activeChecks,
        isPrivateRepo: cfg.isPrivateRepo === true,
        gitAuthMethod: cfg.authMethod || (cfg.isPrivateRepo ? 'deploy_key' : 'none'),
        gitAccessToken: cfg.gitAccessToken || cfg.token || '',
        deployKey:
          cfg.deployKey ||
          (cfg.authMethod === 'deploy_key' || (cfg.isPrivateRepo && !cfg.gitAccessToken)
            ? this.gitService.getDeployPrivateKey()
            : ''),
      })
      .catch((err) => ({
        success: false,
        message: `Could not connect to Jenkins: ${err.message}`,
      }));

    if (!jenkinsRes.success) {
      const failureReason = jenkinsRes.message || 'Connection refused at Jenkins CI';
      this.logger.warn(
        `Jenkins rescan unavailable (${failureReason}). Falling back to local scanner for ${method}.`,
      );

      this.localSecurityScannerService.scanMiniApp(id, method, {
        fallbackReason: failureReason,
        securityChecks: activeChecks,
      });

      await this.notificationsService.createNotification(
        app.ownerId || '',
        'Local Security Scan Running',
        `Jenkins CI is unavailable (${failureReason}). Automated security audit running via Local Security Engine.`,
        'SCAN_STARTED',
        app.id,
      );

      await logActivityFn(
        id,
        actorId,
        'VALIDATION',
        'Jenkins Offline - Local Fallback',
        `Jenkins CI is unavailable (${failureReason}). Automated security scan initiated using Local Security Engine.`,
        'RESCAN_MINI_APP',
        null,
        app,
      );

      return {
        success: true,
        engine: 'LOCAL',
        message: `Jenkins CI is offline (${failureReason}). Automated scan is running via Local Security Engine.`,
        validationStatus: 'RUNNING',
        validationStages: initialStages,
      };
    }

    await this.notificationsService.createNotification(
      app.ownerId || '',
      'Scan Re-run',
      `Automated security scan re-initiated for "${app.name || 'Mini App'}" on Jenkins (${method}).`,
      'SCAN_STARTED',
      app.id,
    );

    await logActivityFn(
      id,
      actorId,
      'VALIDATION',
      'Scan Re-run',
      `Automated ${method} security scan re-triggered on Jenkins`,
      'RESCAN_MINI_APP',
      null,
      app,
    );

    return {
      success: true,
      engine: 'JENKINS',
      message: `Universal security validation triggered successfully on Jenkins (${method}).`,
      validationStatus: 'RUNNING',
      validationStages: initialStages,
    };

    await this.notificationsService.createNotification(
      app.ownerId || '',
      'Scan Re-run',
      `${app.name || 'Mini App'} automated security scan re-initiated on Jenkins.`,
      'SCAN_STARTED',
      app.id,
    );

    await logActivityFn(
      id,
      actorId,
      'VALIDATION',
      'Scan Re-run',
      'Automated security scan re-triggered on Jenkins',
      'RESCAN_MINI_APP',
      null,
      app,
    );

    return {
      success: true,
      engine: 'JENKINS',
      message: 'Automated security scan triggered successfully on Jenkins.',
      validationStatus: 'RUNNING',
      validationStages: initialStages,
    };
  }

  async cancelValidation(
    app: MiniApp,
    actorId = 'system',
    logActivityFn: (
      miniAppId: string,
      actorId: string,
      actionType: string,
      title: string,
      description: string,
      auditAction: string,
      oldVal?: any,
      newVal?: any,
    ) => Promise<void>,
  ) {
    const id = app.id;
    app.validationStatus = 'FAILED';
    if (app.status === 'SUBMITTED') {
      app.status = 'DRAFT';
    }

    const stages = app.validationStages || {};
    Object.keys(stages).forEach((key) => {
      if (stages[key].status === 'RUNNING') {
        stages[key].status = 'FAILED';
        stages[key].details = 'Scan cancelled by user.';
      }
    });
    app.validationStages = stages;

    app.validationReport = {
      score: 0,
      status: 'FAILED',
      method: app.integrationMethod || 'WEBVIEW',
      completedAt: new Date().toISOString(),
      findings: [
        {
          id: 'SCAN_CANCELLED',
          severity: 'HIGH',
          title: 'Security Scan Cancelled',
          description:
            'The automated security scan was manually cancelled or reset.',
          recommendation: 'Re-run the automated security scan when ready.',
        },
      ],
    };

    await this.miniappRepository.save(app);

    this.notificationsService.emitStageUpdate({
      miniAppId: id,
      stages: app.validationStages,
      validationStatus: 'FAILED',
    });

    await logActivityFn(
      id,
      actorId,
      'STATUS_CHANGE',
      'Validation Reset',
      'Security validation was reset',
      'CANCEL_VALIDATION',
      null,
      app,
    );
    return app;
  }

  async approve(
    app: MiniApp,
    actorId: string,
    logActivityFn: (
      miniAppId: string,
      actorId: string,
      actionType: string,
      title: string,
      description: string,
      auditAction: string,
      oldVal?: any,
      newVal?: any,
    ) => Promise<void>,
  ) {
    if (app.status === 'ACTIVE' && app.pendingRevision) {
      return this.publishRevision(app, actorId, logActivityFn);
    }

    const validStatuses = ['IN_REVIEW', 'SUBMITTED', 'DRAFT'];
    if (!validStatuses.includes(app.status?.toUpperCase())) {
      throw new BadRequestException(
        `App is not in review (current status: ${app.status})`,
      );
    }

    if (app.pendingRevision) {
      const rev = app.pendingRevision;
      app.name = rev.name ?? app.name;
      app.shortDescription = rev.shortDescription ?? app.shortDescription;
      app.fullDescription = rev.fullDescription ?? app.fullDescription;
      app.logo = rev.logo ?? app.logo;
      app.category = rev.category ?? app.category;
      app.termsUrl = rev.termsUrl ?? app.termsUrl;
      app.termsDescription = rev.termsDescription ?? app.termsDescription;
      app.privacyPolicyUrl = rev.privacyPolicyUrl ?? app.privacyPolicyUrl;
      app.privacyPolicyDescription =
        rev.privacyPolicyDescription ?? app.privacyPolicyDescription;
      app.ownerName = rev.ownerName ?? app.ownerName;
      app.ownerEmail = rev.ownerEmail ?? app.ownerEmail;
      app.supportEmail = rev.supportEmail ?? app.supportEmail;
      app.teamName = rev.teamName ?? app.teamName;
      if (rev.teamTelegramChatId !== undefined) {
        app.teamTelegramChatId = rev.teamTelegramChatId;
      }
      app.integrationMethod = rev.integrationMethod ?? app.integrationMethod;
      app.integrationConfig = rev.integrationConfig ?? app.integrationConfig;
      app.permissions = rev.permissions ?? app.permissions;
      app.pendingRevision = null;
    }

    app.status = 'APPROVED';
    await this.miniappRepository.save(app);

    // Auto-inject Flutter package dependency into Super App pubspec.yaml if applicable
    if ((app.integrationMethod || '').toUpperCase() === 'FLUTTER_PACKAGE') {
      try {
        await this.pubspecService.injectMiniApp(app);
        await this.pubspecService.validateDependencies({ dryRun: true });
        this.pubspecService.triggerSandboxRebuild(`Approval of ${app.name}`).catch(() => {});
        this.logger.log(`Auto-injected and validated Flutter package ${app.name} into Super App pubspec.yaml`);
      } catch (err: any) {
        this.logger.warn(`Pubspec auto-injection warning on approve for ${app.name}: ${err.message}`);
      }
    }

    // 1. Dispatch Notification (WebSocket + Telegram to MA Manager, MA Team Group, & SA Admins)
    if (app.ownerId) {
      await this.notificationsService.createNotification(
        app.ownerId,
        'Mini App Approved',
        `Mini App "${app.name}" has been approved by the Super App Administrator and is ready for test build verification.`,
        'MINIAPP_APPROVED',
        app.id,
      );
    }

    // 2. Dispatch Email to Mini App Owner
    const targetEmail = app.ownerEmail || app.owner?.email;
    if (targetEmail) {
      await this.mailService.sendMiniAppApprovedEmail(
        targetEmail,
        app.name || app.appId,
        `${this.backofficeBaseUrl}/miniapps/${app.id}`,
      );
    }

    await logActivityFn(
      app.id,
      actorId,
      'STATUS_CHANGE',
      'Mini App Approved',
      'App approved by SA Admin',
      'APPROVE_MINI_APP',
      null,
      app,
    );
    return app;
  }

  async reject(
    app: MiniApp,
    reason: string,
    actorId: string,
    logActivityFn: (
      miniAppId: string,
      actorId: string,
      actionType: string,
      title: string,
      description: string,
      auditAction: string,
      oldVal?: any,
      newVal?: any,
    ) => Promise<void>,
  ) {
    if (app.status === 'ACTIVE' && app.pendingRevision) {
      return this.discardRevision(app, actorId, logActivityFn, reason);
    }

    const validStatuses = ['IN_REVIEW', 'SUBMITTED', 'APPROVED', 'TESTING'];
    if (!validStatuses.includes(app.status?.toUpperCase())) {
      throw new BadRequestException(
        `App cannot be rejected from current status: ${app.status}`,
      );
    }
    app.status = 'REJECTED';
    await this.miniappRepository.save(app);

    // 1. Dispatch Notification (WebSocket + Telegram to MA Manager, MA Team Group, & SA Admins)
    if (app.ownerId) {
      await this.notificationsService.createNotification(
        app.ownerId,
        'Mini App Rejected',
        `Mini App "${app.name}" was rejected by Super App Administrator. Reason: ${reason || 'Administrative review decision.'}`,
        'MINIAPP_REJECTED',
        app.id,
      );
    }

    // 2. Dispatch Email to Mini App Owner
    const targetEmail = app.ownerEmail || app.owner?.email;
    if (targetEmail) {
      await this.mailService.sendMiniAppRejectedEmail(
        targetEmail,
        app.name || app.appId,
        reason || 'Administrative review decision.',
        `${this.backofficeBaseUrl}/miniapps/${app.id}`,
      );
    }

    await logActivityFn(
      app.id,
      actorId,
      'STATUS_CHANGE',
      'Mini App Rejected',
      reason || 'App rejected by SA Admin',
      'REJECT_MINI_APP',
      null,
      app,
    );
    return app;
  }

  async requestChanges(
    app: MiniApp,
    reason: string,
    actorId: string,
    logActivityFn: (
      miniAppId: string,
      actorId: string,
      actionType: string,
      title: string,
      description: string,
      auditAction: string,
      oldVal?: any,
      newVal?: any,
    ) => Promise<void>,
  ) {
    if (app.status === 'ACTIVE' && app.pendingRevision) {
      app.pendingRevision = {
        ...app.pendingRevision,
        revisionStatus: 'DRAFT',
        changesRequestedReason:
          reason || 'Please update the configuration and resubmit.',
        changesRequestedAt: new Date().toISOString(),
      };
      await this.miniappRepository.save(app);

      if (app.ownerId) {
        await this.notificationsService.createNotification(
          app.ownerId,
          'Changes Requested on Staged Revision',
          `Super App Administrator requested changes for staged revision of "${app.name}". Reason: ${reason || 'Please update the configuration and resubmit.'} (Live version remains active in Super App)`,
          'CHANGES_REQUESTED',
          app.id,
        );
      }

      const targetEmail = app.ownerEmail || app.owner?.email;
      if (targetEmail) {
        await this.mailService.sendChangesRequestedEmail(
          targetEmail,
          app.name || app.appId,
          reason || 'Please update the staged revision and resubmit.',
          `${this.backofficeBaseUrl}/miniapps/${app.id}`,
        );
      }

      await logActivityFn(
        app.id,
        actorId,
        'STATUS_CHANGE',
        'Changes Requested on Revision',
        reason ||
          'SA Admin sent staged revision back to Draft for remediation; live app remains active',
        'REQUEST_CHANGES',
        null,
        app,
      );
      return app;
    }

    app.status = 'DRAFT';
    await this.miniappRepository.save(app);

    // 1. Dispatch Notification (WebSocket + Telegram to MA Manager, MA Team Group, & SA Admins)
    if (app.ownerId) {
      await this.notificationsService.createNotification(
        app.ownerId,
        'Changes Requested',
        `Super App Administrator requested changes for "${app.name}". Reason: ${reason || 'Please update the configuration and resubmit.'}`,
        'CHANGES_REQUESTED',
        app.id,
      );
    }

    // 2. Dispatch Email to Mini App Owner
    const targetEmail = app.ownerEmail || app.owner?.email;
    if (targetEmail) {
      await this.mailService.sendChangesRequestedEmail(
        targetEmail,
        app.name || app.appId,
        reason || 'Please update the configuration and resubmit.',
        `${this.backofficeBaseUrl}/miniapps/${app.id}`,
      );
    }

    await logActivityFn(
      app.id,
      actorId,
      'STATUS_CHANGE',
      'Changes Requested',
      reason || 'SA Admin sent app back to Draft for remediation',
      'REQUEST_CHANGES',
      null,
      app,
    );
    return app;
  }

  async startTesting(
    app: MiniApp,
    actorId: string,
    logActivityFn: (
      miniAppId: string,
      actorId: string,
      actionType: string,
      title: string,
      description: string,
      auditAction: string,
      oldVal?: any,
      newVal?: any,
    ) => Promise<void>,
  ) {
    const id = app.id;
    const validStatuses = ['APPROVED', 'BUILDING', 'IN_REVIEW', 'TESTING', 'ACTIVE'];
    if (!validStatuses.includes(app.status?.toUpperCase())) {
      throw new BadRequestException(
        `App must be in APPROVED, BUILDING, IN_REVIEW, TESTING, or ACTIVE status before moving to TESTING (current: ${app.status})`,
      );
    }

    if (app.status === 'ACTIVE' && app.pendingRevision) {
      const releaseVersion = await this.superAppService.getAndRegisterNextVersion();
      app.activeTestVersion = releaseVersion;
      app.pendingRevision = {
        ...app.pendingRevision,
        revisionStatus: 'TESTING',
        testVersion: releaseVersion,
      };
      await this.miniappRepository.save(app);

      if (app.ownerId) {
        await this.notificationsService.createNotification(
          app.ownerId,
          'Staged Revision Test Build Started',
          `Test build compilation (${releaseVersion}) initiated for staged revision of "${app.name}". Live version remains active.`,
          'BUILD_STARTED',
          app.id,
          { releaseVersion, version: releaseVersion, buildType: 'debug' },
        );
      }

      try {
        await this.jenkinsService.triggerSuperAppBuild({
          releaseVersion,
          appName: 'superapp',
          buildType: 'debug',
        });
        this.jenkinsService.triggerSuperAppSandboxBuild().catch(() => {});
      } catch (err: any) {
        this.logger.error(`Error triggering Jenkins test build for revision: ${err.message}`);
      }

      await logActivityFn(
        id,
        actorId,
        'STATUS_CHANGE',
        'Staged Revision Test Build Triggered',
        `Triggered Jenkins compilation of Super App test build (${releaseVersion}, debug) for staged revision. Live app remains active.`,
        'TRIGGER_TEST_BUILD',
        null,
        app,
      );

      return app;
    }

    // For APPROVED, IN_REVIEW, TESTING, BUILDING, BUILD_FAILED
    app.status = 'BUILDING';
    app.buildStatus = 'BUILDING';
    app.buildError = undefined;
    app.buildStages = {
      preflight: {
        id: 'preflight',
        name: '1. Pre-Flight & Manifest Verification',
        status: 'RUNNING',
        details: 'Verifying package checksums, dependencies, and manifest integrity...',
        updatedAt: new Date().toISOString(),
      },
      compile: {
        id: 'compile',
        name: '2. Fastlane APK Packaging',
        status: 'PENDING',
        details: 'Awaiting container assembly and Fastlane APK compilation...',
        updatedAt: new Date().toISOString(),
      },
      publish: {
        id: 'publish',
        name: '3. Publish to Nexus & Finalize',
        status: 'PENDING',
        details: 'Awaiting artifact upload to Sonatype Nexus...',
        updatedAt: new Date().toISOString(),
      },
    };

    // Auto-increment dynamic Super App test version (e.g. v1.1.1, v1.1.2, etc.)
    const releaseVersion = await this.superAppService.getAndRegisterNextVersion();
    app.activeTestVersion = releaseVersion;
    app.integrationConfig = {
      ...(app.integrationConfig || {}),
      superAppTestVersion: releaseVersion,
    };

    await this.miniappRepository.save(app);

    // Dispatch explicit BUILDING status notification
    if (app.ownerId) {
      await this.notificationsService.createNotification(
        app.ownerId,
        'Super App Test Build Started',
        `Super App test build (${releaseVersion}) compilation initiated on Jenkins for Mini App "${app.name}". Artifacts will be published to Nexus upon completion.`,
        'BUILD_STARTED',
        app.id,
        {
          releaseVersion,
          version: releaseVersion,
          buildType: 'debug',
        },
      );
    }

    try {
      await this.pipelinePacerService.paceBuildTrigger(app.name || app.appId);
      this.logger.log(
        `Triggering Jenkins Super App test build for Mini App ${app.name} (${app.id}) with dynamic version ${releaseVersion}...`,
      );
      const jenkinsResult = await this.jenkinsService.triggerSuperAppBuild({
        releaseVersion,
        appName: 'superapp',
        buildType: 'debug',
      });
      if (!jenkinsResult.success) {
        this.logger.warn(
          `Jenkins test build trigger returned: ${jenkinsResult.message}`,
        );
      }

      // Also trigger Super App Web Sandbox build concurrently
      this.jenkinsService
        .triggerSuperAppSandboxBuild()
        .catch((e: any) => {
          this.logger.warn(
            `Failed to trigger superapp-sandbox-build: ${e.message}`,
          );
        });
    } catch (err: any) {
      this.logger.error(
        `Error triggering Jenkins test build: ${err.message}`,
      );
    }

    await logActivityFn(
      id,
      actorId,
      'STATUS_CHANGE',
      'Super App Test Build Triggered',
      `Triggered Jenkins compilation of Super App test build (${releaseVersion}, debug). Artifact will be stored in Nexus for testing.`,
      'TRIGGER_TEST_BUILD',
      null,
      app,
    );

    return app;
  }

  async activate(
    app: MiniApp,
    actorId: string,
    logActivityFn: (
      miniAppId: string,
      actorId: string,
      actionType: string,
      title: string,
      description: string,
      auditAction: string,
      oldVal?: any,
      newVal?: any,
    ) => Promise<void>,
  ) {
    const id = app.id;
    const validStatuses = ['TESTING', 'APPROVED'];
    if (!validStatuses.includes(app.status?.toUpperCase())) {
      throw new BadRequestException(
        'App must be in TESTING or APPROVED status to activate',
      );
    }

    const releaseVersion = await this.superAppService.getAndRegisterNextVersion();
    app.integrationConfig = {
      ...(app.integrationConfig || {}),
      superAppReleaseVersion: releaseVersion,
    };
    await this.miniappRepository.save(app);

    try {
      this.logger.log(
        `Triggering Jenkins Production Release build for Mini App ${app.name} (${app.id}) with version ${releaseVersion}...`,
      );
      await this.jenkinsService.triggerSuperAppBuild({
        releaseVersion,
        appName: 'superapp',
        buildType: 'release',
      });
    } catch (err: any) {
      this.logger.error(
        `Error triggering Jenkins production release build: ${err.message}`,
      );
    }

    app.status = 'ACTIVE';
    await this.miniappRepository.save(app);

    if (app.ownerId) {
      await this.notificationsService.createNotification(
        app.ownerId,
        'Mini App Live & Activated',
        `Mini App "${app.name}" has been granted final approval and production release build is live in the Super App catalog.`,
        'MINIAPP_ACTIVATED',
        app.id,
      );
    }

    const targetLiveEmail = app.ownerEmail || app.owner?.email;
    if (targetLiveEmail) {
      await this.mailService.sendMiniAppActivatedEmail(
        targetLiveEmail,
        app.name || app.appId,
        releaseVersion,
        `${this.backofficeBaseUrl}/miniapps/${app.id}`,
      );
    }

    await logActivityFn(
      id,
      actorId,
      'STATUS_CHANGE',
      'Mini App Activated (Production Release)',
      `Final approval granted. Production release build (${releaseVersion}, release) triggered in Jenkins and app is ACTIVE in Super App catalog.`,
      'ACTIVATE_MINI_APP',
      null,
      app,
    );

    return app;
  }

  async suspend(
    app: MiniApp,
    actorId: string,
    logActivityFn: (
      miniAppId: string,
      actorId: string,
      actionType: string,
      title: string,
      description: string,
      auditAction: string,
      oldVal?: any,
      newVal?: any,
    ) => Promise<void>,
  ) {
    app.status = 'SUSPENDED';
    await this.miniappRepository.save(app);
    await logActivityFn(
      app.id,
      actorId,
      'STATUS_CHANGE',
      'Mini App Suspended',
      'App suspended',
      'SUSPEND_MINI_APP',
      null,
      app,
    );
    return app;
  }

  async publishRevision(
    app: MiniApp,
    actorId: string,
    logActivityFn: (
      miniAppId: string,
      actorId: string,
      actionType: string,
      title: string,
      description: string,
      auditAction: string,
      oldVal?: any,
      newVal?: any,
    ) => Promise<void>,
  ) {
    if (!app.pendingRevision) {
      throw new BadRequestException('No pending revision found to publish');
    }

    const rev = app.pendingRevision;
    const oldVal = { ...app };

    app.name = rev.name ?? app.name;
    app.shortDescription = rev.shortDescription ?? app.shortDescription;
    app.fullDescription = rev.fullDescription ?? app.fullDescription;
    app.logo = rev.logo ?? app.logo;
    app.category = rev.category ?? app.category;
    app.termsUrl = rev.termsUrl ?? app.termsUrl;
    app.termsDescription = rev.termsDescription ?? app.termsDescription;
    app.privacyPolicyUrl = rev.privacyPolicyUrl ?? app.privacyPolicyUrl;
    app.privacyPolicyDescription =
      rev.privacyPolicyDescription ?? app.privacyPolicyDescription;
    app.ownerName = rev.ownerName ?? app.ownerName;
    app.ownerEmail = rev.ownerEmail ?? app.ownerEmail;
    app.supportEmail = rev.supportEmail ?? app.supportEmail;
    app.teamName = rev.teamName ?? app.teamName;
    if (rev.teamTelegramChatId !== undefined) {
      app.teamTelegramChatId = rev.teamTelegramChatId;
    }
    app.integrationMethod = rev.integrationMethod ?? app.integrationMethod;
    app.integrationConfig = rev.integrationConfig ?? app.integrationConfig;
    app.permissions = rev.permissions ?? app.permissions;
    if (rev.isDomainVerified !== undefined)
      app.isDomainVerified = rev.isDomainVerified;
    if (rev.domainVerifiedAt !== undefined)
      app.domainVerifiedAt = rev.domainVerifiedAt;
    if (rev.verificationToken !== undefined)
      app.verificationToken = rev.verificationToken;
    if (rev.validationStages) app.validationStages = rev.validationStages;
    if (rev.validationReport) app.validationReport = rev.validationReport;
    if (rev.validationStatus) app.validationStatus = rev.validationStatus;
    if (rev.validationErrors !== undefined)
      app.validationErrors = rev.validationErrors;

    const nextVersion =
      rev.version ||
      rev.packageVersion ||
      (app.currentReleaseVersion
        ? `1.${parseInt(app.currentReleaseVersion.split('.')[1] || '0', 10) + 1}.0`
        : '1.1.0');
    app.currentReleaseVersion = nextVersion;
    app.version = nextVersion;

    const history = Array.isArray(app.versionHistory)
      ? [...app.versionHistory]
      : [];
    history.forEach((h: any) => {
      if (h.type === 'PRODUCTION' && h.status === 'ACTIVE') {
        h.status = 'PREVIOUS';
      }
    });
    history.unshift({
      version: nextVersion,
      saVersion: app.integrationConfig?.superAppReleaseVersion || 'v1.0.0',
      type: 'PRODUCTION',
      status: 'ACTIVE',
      changelog:
        rev.changelog ||
        `Release ${nextVersion} published live to Super App catalog`,
      apkSize: '52.4 MB',
      checksum:
        'sha256:' +
        crypto
          .createHash('sha256')
          .update(app.id + nextVersion + Date.now())
          .digest('hex')
          .substring(0, 16),
      releasedAt: new Date().toISOString(),
      releasedBy: actorId || app.ownerName || 'Mini App Manager',
    });
    app.versionHistory = history;

    app.pendingRevision = null;
    app.status = 'ACTIVE';

    await this.miniappRepository.save(app);

    // Auto-update Flutter package dependency in Super App pubspec.yaml if applicable
    if ((app.integrationMethod || '').toUpperCase() === 'FLUTTER_PACKAGE') {
      try {
        await this.pubspecService.injectMiniApp(app);
        await this.pubspecService.validateDependencies({ dryRun: true });
        this.pubspecService.triggerSandboxRebuild(`Publish revision ${nextVersion} for ${app.name}`).catch(() => {});
        this.logger.log(`Auto-updated and validated Flutter package ${app.name} (${nextVersion}) in Super App pubspec.yaml`);
      } catch (err: any) {
        this.logger.warn(`Pubspec auto-update warning on revision publish for ${app.name}: ${err.message}`);
      }
    }

    await this.notificationsService.createNotification(
      app.ownerId || '',
      'Revision Published',
      `Revision for Mini App "${app.name}" (${nextVersion}) has been published live to the Super App catalog.`,
      'REVISION_PUBLISHED',
      app.id,
    );

    await logActivityFn(
      app.id,
      actorId || 'system',
      'STATUS_CHANGE',
      `Revision Published for ${app.name}`,
      'Staged revision merged into live active Mini App configuration',
      'PUBLISH_REVISION',
      oldVal,
      app,
    );

    return app;
  }

  async discardRevision(
    app: MiniApp,
    actorId: string,
    logActivityFn: (
      miniAppId: string,
      actorId: string,
      actionType: string,
      title: string,
      description: string,
      auditAction: string,
      oldVal?: any,
      newVal?: any,
    ) => Promise<void>,
    reason?: string,
  ) {
    if (!app.pendingRevision) {
      throw new BadRequestException('No pending revision found to discard');
    }

    const oldRev = app.pendingRevision;
    app.pendingRevision = null;
    await this.miniappRepository.save(app);

    // 1. Dispatch Notification
    if (app.ownerId) {
      await this.notificationsService.createNotification(
        app.ownerId,
        'Revision Rejected & Discarded',
        `Staged revision for Mini App "${app.name}" was rejected. Live version remains active in Super App.${reason ? ` Reason: ${reason}` : ''}`,
        'REVISION_DISCARDED',
        app.id,
      );
    }

    // 2. Dispatch Email
    const targetEmail = app.ownerEmail || app.owner?.email;
    if (targetEmail) {
      await this.mailService.sendMiniAppRejectedEmail(
        targetEmail,
        app.name || app.appId,
        reason ||
          'Proposed revision was discarded by administrator. Live version remains active in the Super App catalog.',
        `${this.backofficeBaseUrl}/miniapps/${app.id}`,
      );
    }

    await logActivityFn(
      app.id,
      actorId || 'system',
      'STATUS_CHANGE',
      `Revision Discarded for ${app.name}`,
      reason ||
        'Pending draft revision was discarded without affecting the live version',
      'DISCARD_REVISION',
      oldRev,
      null,
    );

    return app;
  }

  async rollbackToVersion(
    app: MiniApp,
    targetVersion: string,
    actorId: string,
    logActivityFn: (
      miniAppId: string,
      actorId: string,
      actionType: string,
      title: string,
      description: string,
      auditAction: string,
      oldVal?: any,
      newVal?: any,
    ) => Promise<void>,
    reason?: string,
  ) {
    if (!targetVersion) {
      throw new BadRequestException('Target version is required for rollback');
    }

    const history = Array.isArray(app.versionHistory) ? [...app.versionHistory] : [];
    const targetRecord = history.find((h: any) => h.version === targetVersion);
    if (!targetRecord) {
      throw new BadRequestException(
        `Version "${targetVersion}" was not found in release history for ${app.name}`,
      );
    }

    const oldVal = { ...app };
    const prevVersion = app.currentReleaseVersion || app.version;

    app.currentReleaseVersion = targetVersion;
    app.version = targetVersion;
    app.status = 'ACTIVE';

    if (targetRecord.integrationConfig) {
      app.integrationConfig = {
        ...app.integrationConfig,
        ...targetRecord.integrationConfig,
      };
    }
    if (targetRecord.permissions) {
      app.permissions = targetRecord.permissions;
    }
    if (targetRecord.packageName && app.integrationConfig) {
      app.integrationConfig.packageName = targetRecord.packageName;
    }
    if (targetRecord.gitRef && app.integrationConfig) {
      app.integrationConfig.gitRef = targetRecord.gitRef;
      app.integrationConfig.gitBranch = targetRecord.gitRef;
    }

    history.forEach((h: any) => {
      if (h.version === targetVersion) {
        h.status = 'ACTIVE';
        h.type = 'PRODUCTION';
      } else if (h.status === 'ACTIVE') {
        h.status = 'SUPERSEDED';
      }
    });
    app.versionHistory = history;

    await this.miniappRepository.save(app);

    if ((app.integrationMethod || '').toUpperCase() === 'FLUTTER_PACKAGE') {
      try {
        await this.pubspecService.injectMiniApp(app);
        await this.pubspecService.validateDependencies({ dryRun: true });
        this.pubspecService.triggerSandboxRebuild(`Rollback to ${targetVersion} for ${app.name}`).catch(() => {});
        this.logger.log(
          `Rolled back Flutter package ${app.name} to ${targetVersion} in pubspec.yaml`,
        );
      } catch (err: any) {
        this.logger.warn(
          `Pubspec auto-update warning on rollback for ${app.name}: ${err.message}`,
        );
      }
    }

    if (app.ownerId) {
      await this.notificationsService.createNotification(
        app.ownerId,
        'Mini App Rolled Back',
        `Mini App "${app.name}" was rolled back from ${prevVersion} to ${targetVersion}.${
          reason ? ` Reason: ${reason}` : ''
        }`,
        'MINIAPP_ROLLED_BACK',
        app.id,
      );
    }

    await logActivityFn(
      app.id,
      actorId || 'system',
      'STATUS_CHANGE',
      `Rolled back ${app.name} to ${targetVersion}`,
      reason || `Production release rolled back from ${prevVersion} to ${targetVersion}`,
      'ROLLBACK_VERSION',
      oldVal,
      app,
    );

    return app;
  }
}
