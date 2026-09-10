import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniApp } from '../entities/miniapp.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { MailService } from '../../mail/mail.service';
import { JenkinsService } from '../../integrations/jenkins/jenkins.service';
import {
  LocalSecurityScannerService,
  buildDynamicValidationStages,
  getDefaultChecksForMethod,
} from '../../integrations/validation/local-security-scanner.service';

@Injectable()
export class MiniappLifecycleHelper {
  private readonly logger = new Logger(MiniappLifecycleHelper.name);

  constructor(
    @InjectRepository(MiniApp)
    private miniappRepository: Repository<MiniApp>,

    private notificationsService: NotificationsService,
    private mailService: MailService,
    private jenkinsService: JenkinsService,
    private localSecurityScannerService: LocalSecurityScannerService,
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
    if (
      app.integrationMethod === 'WEBVIEW' &&
      app.integrationConfig?.productionUrl
    ) {
      const initialStages = buildDynamicValidationStages(
        'WEBVIEW',
        app.securityChecks,
      );
      app.validationStages = initialStages;
      app.status = 'SUBMITTED';
      app.validationStatus = 'RUNNING';
      await this.miniappRepository.save(app);

      const allowedDomains = Array.isArray(app.integrationConfig.allowedDomains)
        ? app.integrationConfig.allowedDomains
        : typeof app.integrationConfig.allowedDomains === 'string'
          ? app.integrationConfig.allowedDomains.split(',')
          : [];

      const envVal = (process.env.ENVIRONMENT || '').toUpperCase();
      const allowLocal = envVal === 'DEV';

      this.jenkinsService
        .triggerWebViewValidation({
          miniAppId: id,
          targetUrl: app.integrationConfig.productionUrl,
          allowedDomains,
          allowLocal,
          checks: app.securityChecks || getDefaultChecksForMethod('WEBVIEW'),
        })
        .then(async (res) => {
          if (!res?.success) {
            const reason = res?.message || 'Jenkins returned an unsuccessful status';
            this.logger.warn(
              `Jenkins unavailable (${reason}). Falling back to local security scanner.`,
            );
            await this.localSecurityScannerService.scanWebView(id, { fallbackReason: reason, securityChecks: app.securityChecks });
          }
        })
        .catch(async (err) => {
          const reason = `Jenkins connection failed: ${err.message}`;
          this.logger.error(
            `${reason}. Falling back to local security scanner.`,
          );
          await this.localSecurityScannerService.scanWebView(id, { fallbackReason: reason, securityChecks: app.securityChecks });
        });
    } else if (app.integrationMethod === 'FLUTTER_PACKAGE') {
      const initialStages = buildDynamicValidationStages(
        'FLUTTER_PACKAGE',
        app.securityChecks,
      );
      app.validationStages = initialStages;
      app.status = 'SUBMITTED';
      app.validationStatus = 'RUNNING';
      await this.miniappRepository.save(app);

      const cfg = app.integrationConfig || {};
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

      const declaredPerms = Array.isArray(app.permissions)
        ? app.permissions
            .map((p: any) => (typeof p === 'string' ? p : p.name || p.id))
            .filter(Boolean)
        : [];
      const requiredPerms = Array.isArray(app.permissions)
        ? app.permissions
            .filter((p: any) => p.isRequired)
            .map((p: any) => p.name || p.id)
            .filter(Boolean)
        : [];

      const allowedCaps =
        declaredPerms.length > 0
          ? declaredPerms
          : ['camera', 'geolocator', 'local_auth'];
      const requiredCaps = requiredPerms;
      const packageName = cfg.packageName || cfg.name || app.name;
      const packageVersion = cfg.packageVersion || cfg.version || '1.0.0';

      this.jenkinsService
        .triggerPackageValidation({
          miniAppId: id,
          packageName,
          version: packageVersion,
          integrationType: integrationType,
          sourceStoragePath: cfg.packageStoragePath || '',
          repoUrl,
          commitSha,
          gitProvider,
          allowedCapabilities: allowedCaps,
          requiredCapabilities: requiredCaps,
          checks: app.securityChecks || getDefaultChecksForMethod('FLUTTER_PACKAGE'),
        })
        .then(async (res) => {
          if (!res?.success) {
            const reason = res?.message || 'Jenkins returned an unsuccessful status';
            this.logger.warn(
              `Jenkins package validation unavailable (${reason}). Falling back to local scanner.`,
            );
            await this.localSecurityScannerService.scanFlutterPackage(id, { fallbackReason: reason, securityChecks: app.securityChecks });
          }
        })
        .catch(async (err) => {
          const reason = `Jenkins connection failed: ${err.message}`;
          this.logger.error(
            `${reason}. Falling back to local scanner.`,
          );
          await this.localSecurityScannerService.scanFlutterPackage(id, { fallbackReason: reason, securityChecks: app.securityChecks });
        });
    } else {
      app.status = 'IN_REVIEW';
      await this.miniappRepository.save(app);
    }

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

    const activeChecks =
      app.securityChecks && app.securityChecks.length > 0
        ? app.securityChecks
        : getDefaultChecksForMethod(app.integrationMethod);

    if (app.integrationMethod === 'FLUTTER_PACKAGE') {
      const initialStages = buildDynamicValidationStages(
        'FLUTTER_PACKAGE',
        activeChecks,
      );

      app.validationStages = initialStages;
      app.validationStatus = 'RUNNING';
      await this.miniappRepository.save(app);

      const cfg = app.integrationConfig || {};
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

      const declaredPerms = Array.isArray(app.permissions)
        ? app.permissions
            .map((p: any) => (typeof p === 'string' ? p : p.name || p.id))
            .filter(Boolean)
        : [];
      const requiredPerms = Array.isArray(app.permissions)
        ? app.permissions
            .filter((p: any) => p.isRequired)
            .map((p: any) => p.name || p.id)
            .filter(Boolean)
        : [];

      const allowedCaps =
        declaredPerms.length > 0
          ? declaredPerms
          : ['camera', 'geolocator', 'local_auth'];
      const requiredCaps = requiredPerms;
      const packageName = cfg.packageName || cfg.name || app.name;
      const packageVersion = cfg.packageVersion || cfg.version || '1.0.0';

      const jenkinsRes = await this.jenkinsService
        .triggerPackageValidation({
          miniAppId: id,
          packageName,
          version: packageVersion,
          integrationType: integrationType,
          sourceStoragePath: cfg.packageStoragePath || '',
          repoUrl,
          commitSha,
          gitProvider,
          allowedCapabilities: allowedCaps,
          requiredCapabilities: requiredCaps,
          checks: activeChecks,
        })
        .catch((err) => ({
          success: false,
          message: `Could not connect to Jenkins: ${err.message}`,
        }));

      if (!jenkinsRes.success) {
        const failureReason = jenkinsRes.message || 'Connection refused at Jenkins CI';
        this.logger.warn(
          `Jenkins package rescan unavailable (${failureReason}). Falling back to local scanner.`,
        );

        this.localSecurityScannerService.scanFlutterPackage(id, {
          fallbackReason: failureReason,
          securityChecks: activeChecks,
        });

        await this.notificationsService.createNotification(
          app.ownerId || '',
          'Local Security Scan Running',
          `Jenkins CI is unavailable (${failureReason}). Package security audit running via Local Security Engine.`,
          'SCAN_STARTED',
          app.id,
        );

        await logActivityFn(
          id,
          actorId,
          'VALIDATION',
          'Jenkins Offline - Local Fallback',
          `Jenkins CI is unavailable (${failureReason}). Package audit initiated using Local Security Engine.`,
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
        `Automated security scan re-initiated for Flutter Package "${app.name || 'Mini App'}".`,
        'SCAN_STARTED',
        app.id,
      );

      await logActivityFn(
        id,
        actorId,
        'VALIDATION',
        'Scan Re-run',
        'Flutter Package automated security scan re-triggered on Jenkins',
        'RESCAN_MINI_APP',
        null,
        app,
      );

      return {
        success: true,
        engine: 'JENKINS',
        message:
          'Flutter package security validation triggered successfully on Jenkins.',
        validationStatus: 'RUNNING',
        validationStages: initialStages,
      };
    }

    const targetUrl = (app.integrationConfig?.productionUrl || '').trim();
    if (!targetUrl) {
      throw new BadRequestException(
        'Mini App does not have a configured production URL to scan',
      );
    }

    const initialStages = buildDynamicValidationStages(
      'WEBVIEW',
      activeChecks,
    );

    app.validationStages = initialStages;
    app.validationStatus = 'RUNNING';
    await this.miniappRepository.save(app);

    const allowedDomains = Array.isArray(app.integrationConfig.allowedDomains)
      ? app.integrationConfig.allowedDomains
      : typeof app.integrationConfig.allowedDomains === 'string'
        ? app.integrationConfig.allowedDomains.split(',')
        : [];

    const envVal = (process.env.ENVIRONMENT || '').toUpperCase();
    const allowLocal = envVal === 'DEV';

    const jenkinsRes = await this.jenkinsService
      .triggerWebViewValidation({
        miniAppId: id,
        targetUrl,
        allowedDomains,
        allowLocal,
        checks: activeChecks,
      })
      .catch((err) => ({
        success: false,
        message: `Could not connect to Jenkins: ${err.message}`,
      }));

    if (!jenkinsRes.success) {
      const failureReason = jenkinsRes.message || 'Connection refused at Jenkins CI';
      this.logger.warn(
        `Jenkins rescan unavailable (${failureReason}). Falling back to local scanner.`,
      );

      this.localSecurityScannerService.scanWebView(id, {
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
    const validStatuses = ['IN_REVIEW', 'SUBMITTED'];
    if (!validStatuses.includes(app.status?.toUpperCase())) {
      throw new BadRequestException(
        `App is not in review (current status: ${app.status})`,
      );
    }
    app.status = 'APPROVED';
    await this.miniappRepository.save(app);
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
    const validStatuses = ['IN_REVIEW', 'SUBMITTED', 'APPROVED', 'TESTING'];
    if (!validStatuses.includes(app.status?.toUpperCase())) {
      throw new BadRequestException(
        `App cannot be rejected from current status: ${app.status}`,
      );
    }
    app.status = 'REJECTED';
    await this.miniappRepository.save(app);
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
    app.status = 'DRAFT';
    await this.miniappRepository.save(app);
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
    const validStatuses = ['APPROVED', 'BUILDING', 'IN_REVIEW'];
    if (!validStatuses.includes(app.status?.toUpperCase())) {
      throw new BadRequestException(
        `App must be in APPROVED or BUILDING status before moving to TESTING (current: ${app.status})`,
      );
    }

    if (app.status === 'APPROVED' || app.status === 'IN_REVIEW') {
      app.status = 'BUILDING';
      await this.miniappRepository.save(app);

      const releaseVersion = (app as any).version
        ? `v${(app as any).version}`
        : 'v1.1.0';
      try {
        this.logger.log(
          `Triggering Jenkins Super App test build for Mini App ${app.name} (${app.id})...`,
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

    app.status = 'TESTING';
    await this.miniappRepository.save(app);
    if (app.ownerId) {
      await this.notificationsService.createNotification(
        app.ownerId,
        'Testing Phase Started',
        `Mini App "${app.name}" has completed test build compilation and is ready for manual testing.`,
        'TESTING_STARTED',
        app.id,
      );
    }
    if (app.ownerEmail) {
      await this.mailService.sendTestBuildReadyEmail(
        app.ownerEmail,
        app.name || app.appId,
        (app as any).version || '1.0.0',
        'http://localhost:8081/repository/apk-test-builds/superapp/v1.1.0/app-debug.apk',
        `http://localhost:3002/miniapps/${app.id}`,
      );
    }
    await logActivityFn(
      id,
      actorId,
      'STATUS_CHANGE',
      'Testing Started',
      'Mini App promoted to manual sandbox testing phase',
      'START_TESTING',
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

    const releaseVersion = (app as any).version
      ? `v${(app as any).version}`
      : 'v1.1.0';
    try {
      this.logger.log(
        `Triggering Jenkins Production Release build for Mini App ${app.name} (${app.id})...`,
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
}
