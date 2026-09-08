import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniApp } from '../entities/miniapp.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { MailService } from '../../mail/mail.service';
import { JenkinsService } from '../../integrations/jenkins/jenkins.service';

@Injectable()
export class MiniappLifecycleHelper {
  private readonly logger = new Logger(MiniappLifecycleHelper.name);

  constructor(
    @InjectRepository(MiniApp)
    private miniappRepository: Repository<MiniApp>,

    private notificationsService: NotificationsService,
    private mailService: MailService,
    private jenkinsService: JenkinsService,
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
      newVal?: any
    ) => Promise<void>
  ) {
    const currentStatus = app.status?.toUpperCase();
    if (currentStatus !== 'DRAFT' && currentStatus !== 'REJECTED') {
      throw new BadRequestException('App is not in DRAFT or REJECTED status');
    }

    const id = app.id;
    if (app.integrationMethod === 'WEBVIEW' && app.integrationConfig?.productionUrl) {
      const initialStages = {
        ssrf: { id: 'ssrf', name: '1. Pre-Flight & SSRF Defense', status: 'RUNNING', details: 'Resolving DNS & verifying IP routes...' },
        tls: { id: 'tls', name: '2. TLS & HTTPS Security', status: 'PENDING', details: 'Awaiting cipher suite verification...' },
        zap: { id: 'zap', name: '3. OWASP ZAP DAST Scan', status: 'PENDING', details: 'Awaiting XSS & CSP header audit...' },
        nuclei: { id: 'nuclei', name: '4. Exposure & Vulnerability Audit', status: 'PENDING', details: 'Awaiting CVE & endpoint check...' },
      };
      app.validationStages = initialStages;
      app.status = 'SUBMITTED';
      app.validationStatus = 'RUNNING';
      await this.miniappRepository.save(app);

      const allowedDomains = Array.isArray(app.integrationConfig.allowedDomains)
        ? app.integrationConfig.allowedDomains
        : (typeof app.integrationConfig.allowedDomains === 'string'
            ? app.integrationConfig.allowedDomains.split(',')
            : []);

      const envVal = (process.env.ENVIRONMENT || '').toUpperCase();
      const allowLocal = envVal === 'DEV' || envVal === 'DEVELOPMENT';

      this.jenkinsService
        .triggerWebViewValidation({
          miniAppId: id,
          targetUrl: app.integrationConfig.productionUrl,
          allowedDomains,
          allowLocal,
          checks: app.securityChecks || [],
        })
        .catch((err) => this.logger.error(`Jenkins trigger failed: ${err.message}`));
    } else if (app.integrationMethod === 'FLUTTER_PACKAGE') {
      const initialStages = {
        ingest: { id: 'ingest', name: '1. Ingestion & Integrity Verification', status: 'RUNNING', details: 'Unpacking source & verifying cryptographic checksum...' },
        secrets: { id: 'secrets', name: '2. Secret & Credential Leak Detection', status: 'PENDING', details: 'Awaiting Gitleaks secret scan...' },
        malware_sast: { id: 'malware_sast', name: '3. Malware & Static Code Analysis (SAST)', status: 'PENDING', details: 'Awaiting Dart analyzer & code safety audit...' },
        sca: { id: 'sca', name: '4. Software Composition Analysis (SCA)', status: 'PENDING', details: 'Awaiting dependency CVE scan...' },
        capability_gate: { id: 'capability_gate', name: '5. Host Capability Gatekeeper Audit', status: 'PENDING', details: 'Awaiting Super App capability compliance check...' },
      };
      app.validationStages = initialStages;
      app.status = 'SUBMITTED';
      app.validationStatus = 'RUNNING';
      await this.miniappRepository.save(app);

      const cfg = app.integrationConfig || {};
      const integrationType = cfg.packageStoragePath ? 'ARTIFACT' : 'SOURCE_CODE';
      const repoUrl = cfg.repoUrl || (cfg.repoOwner && cfg.repoName ? `https://github.com/${cfg.repoOwner}/${cfg.repoName}` : '');
      const commitSha = cfg.commitSha || cfg.branch || 'main';
      const gitProvider = (cfg.provider || 'GITHUB').toUpperCase();

      const declaredPerms = Array.isArray(app.permissions)
        ? app.permissions.map((p: any) => typeof p === 'string' ? p : p.name || p.id).filter(Boolean)
        : [];
      const requiredPerms = Array.isArray(app.permissions)
        ? app.permissions.filter((p: any) => p.isRequired).map((p: any) => p.name || p.id).filter(Boolean)
        : [];

      const allowedCaps = declaredPerms.length > 0 ? declaredPerms : ['camera', 'geolocator', 'local_auth'];
      const requiredCaps = requiredPerms;
      const packageName = cfg.packageName || cfg.name || app.name;
      const packageVersion = cfg.packageVersion || cfg.version || '1.0.0';

      this.jenkinsService
        .triggerPackageValidation({
          miniAppId: id,
          packageName,
          version: packageVersion,
          integrationType: integrationType as 'ARTIFACT' | 'SOURCE_CODE',
          sourceStoragePath: cfg.packageStoragePath || '',
          repoUrl,
          commitSha,
          gitProvider,
          allowedCapabilities: allowedCaps,
          requiredCapabilities: requiredCaps,
        })
        .catch((err) => this.logger.error(`Jenkins package trigger failed: ${err.message}`));
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
      app
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
      newVal?: any
    ) => Promise<void>
  ) {
    const id = app.id;

    if (app.integrationMethod === 'FLUTTER_PACKAGE') {
      const initialStages = {
        ingest: { id: 'ingest', name: '1. Ingestion & Integrity Verification', status: 'RUNNING', details: 'Unpacking source & verifying cryptographic checksum...' },
        secrets: { id: 'secrets', name: '2. Secret & Credential Leak Detection', status: 'PENDING', details: 'Awaiting Gitleaks secret scan...' },
        malware_sast: { id: 'malware_sast', name: '3. Malware & Static Code Analysis (SAST)', status: 'PENDING', details: 'Awaiting Dart analyzer & code safety audit...' },
        sca: { id: 'sca', name: '4. Software Composition Analysis (SCA)', status: 'PENDING', details: 'Awaiting dependency CVE scan...' },
        capability_gate: { id: 'capability_gate', name: '5. Host Capability Gatekeeper Audit', status: 'PENDING', details: 'Awaiting Super App capability compliance check...' },
      };

      app.validationStages = initialStages;
      app.validationStatus = 'RUNNING';
      await this.miniappRepository.save(app);

      const cfg = app.integrationConfig || {};
      const integrationType = cfg.packageStoragePath ? 'ARTIFACT' : 'SOURCE_CODE';
      const repoUrl = cfg.repoUrl || (cfg.repoOwner && cfg.repoName ? `https://github.com/${cfg.repoOwner}/${cfg.repoName}` : '');
      const commitSha = cfg.commitSha || cfg.branch || 'main';
      const gitProvider = (cfg.provider || 'GITHUB').toUpperCase();

      const declaredPerms = Array.isArray(app.permissions)
        ? app.permissions.map((p: any) => typeof p === 'string' ? p : p.name || p.id).filter(Boolean)
        : [];
      const requiredPerms = Array.isArray(app.permissions)
        ? app.permissions.filter((p: any) => p.isRequired).map((p: any) => p.name || p.id).filter(Boolean)
        : [];

      const allowedCaps = declaredPerms.length > 0 ? declaredPerms : ['camera', 'geolocator', 'local_auth'];
      const requiredCaps = requiredPerms;
      const packageName = cfg.packageName || cfg.name || app.name;
      const packageVersion = cfg.packageVersion || cfg.version || '1.0.0';

      this.jenkinsService
        .triggerPackageValidation({
          miniAppId: id,
          packageName,
          version: packageVersion,
          integrationType: integrationType as 'ARTIFACT' | 'SOURCE_CODE',
          sourceStoragePath: cfg.packageStoragePath || '',
          repoUrl,
          commitSha,
          gitProvider,
          allowedCapabilities: allowedCaps,
          requiredCapabilities: requiredCaps,
        })
        .catch((err) => this.logger.error(`Jenkins package rescan trigger failed: ${err.message}`));

      await this.notificationsService.createNotification(
        app.ownerId || '',
        'Scan Re-run',
        `Automated security scan re-initiated for Flutter Package "${app.name || 'Mini App'}".`,
        'SCAN_STARTED',
        app.id
      );

      await logActivityFn(
        id,
        actorId,
        'VALIDATION',
        'Scan Re-run',
        'Flutter Package automated security scan re-triggered on Jenkins',
        'RESCAN_MINI_APP',
        null,
        app
      );

      return {
        success: true,
        message: 'Flutter package security validation triggered successfully on Jenkins.',
      };
    }

    const targetUrl = (app.integrationConfig?.productionUrl || '').trim();
    if (!targetUrl) {
      throw new BadRequestException('Mini App does not have a configured production URL to scan');
    }

    const initialStages = {
      ssrf: { id: 'ssrf', name: '1. Pre-Flight & SSRF Defense', status: 'RUNNING', details: 'Resolving DNS & verifying IP routes...' },
      tls: { id: 'tls', name: '2. TLS & HTTPS Security', status: 'PENDING', details: 'Awaiting cipher suite verification...' },
      zap: { id: 'zap', name: '3. OWASP ZAP DAST Scan', status: 'PENDING', details: 'Awaiting XSS & CSP header audit...' },
      nuclei: { id: 'nuclei', name: '4. Exposure & Vulnerability Audit', status: 'PENDING', details: 'Awaiting CVE & endpoint check...' },
    };

    app.validationStages = initialStages;
    app.validationStatus = 'RUNNING';
    await this.miniappRepository.save(app);

    const allowedDomains = Array.isArray(app.integrationConfig.allowedDomains)
      ? app.integrationConfig.allowedDomains
      : (typeof app.integrationConfig.allowedDomains === 'string'
          ? app.integrationConfig.allowedDomains.split(',')
          : []);

    const envVal = (process.env.ENVIRONMENT || '').toUpperCase();
    const allowLocal = envVal === 'DEV' || envVal === 'DEVELOPMENT';

    this.jenkinsService
      .triggerWebViewValidation({
        miniAppId: id,
        targetUrl,
        allowedDomains,
        allowLocal,
        checks: app.securityChecks || [],
      })
      .catch((err) => this.logger.error(`Jenkins rescan trigger failed: ${err.message}`));

    await this.notificationsService.createNotification(
      app.ownerId || '',
      'Scan Re-run',
      `${app.name || 'Mini App'} automated security scan re-initiated.`,
      'SCAN_STARTED',
      app.id
    );

    await logActivityFn(
      id,
      actorId,
      'VALIDATION',
      'Scan Re-run',
      'Automated security scan re-triggered on Jenkins',
      'RESCAN_MINI_APP',
      null,
      app
    );

    return {
      success: true,
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
      newVal?: any
    ) => Promise<void>
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
          description: 'The automated security scan was manually cancelled or reset.',
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
      app
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
      newVal?: any
    ) => Promise<void>
  ) {
    const validStatuses = ['IN_REVIEW', 'SUBMITTED'];
    if (!validStatuses.includes(app.status?.toUpperCase())) {
      throw new BadRequestException(`App is not in review (current status: ${app.status})`);
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
      app
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
      newVal?: any
    ) => Promise<void>
  ) {
    const validStatuses = ['IN_REVIEW', 'SUBMITTED', 'APPROVED', 'TESTING'];
    if (!validStatuses.includes(app.status?.toUpperCase())) {
      throw new BadRequestException(`App cannot be rejected from current status: ${app.status}`);
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
      app
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
      newVal?: any
    ) => Promise<void>
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
      app
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
      newVal?: any
    ) => Promise<void>
  ) {
    const id = app.id;
    const validStatuses = ['APPROVED', 'BUILDING', 'IN_REVIEW'];
    if (!validStatuses.includes(app.status?.toUpperCase())) {
      throw new BadRequestException(
        `App must be in APPROVED or BUILDING status before moving to TESTING (current: ${app.status})`
      );
    }

    if (app.status === 'APPROVED' || app.status === 'IN_REVIEW') {
      app.status = 'BUILDING';
      await this.miniappRepository.save(app);

      const releaseVersion = (app as any).version ? `v${(app as any).version}` : 'v1.1.0';
      try {
        this.logger.log(`Triggering Jenkins Super App test build for Mini App ${app.name} (${app.id})...`);
        const jenkinsResult = await this.jenkinsService.triggerSuperAppBuild({
          releaseVersion,
          appName: 'superapp',
          buildType: 'debug',
        });
        if (!jenkinsResult.success) {
          this.logger.warn(`Jenkins test build trigger returned: ${jenkinsResult.message}`);
        }
      } catch (err: any) {
        this.logger.error(`Error triggering Jenkins test build: ${err.message}`);
      }

      await logActivityFn(
        id,
        actorId,
        'STATUS_CHANGE',
        'Super App Test Build Triggered',
        `Triggered Jenkins compilation of Super App test build (${releaseVersion}, debug). Artifact will be stored in Nexus for testing.`,
        'TRIGGER_TEST_BUILD',
        null,
        app
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
        app.id
      );
    }
    if (app.ownerEmail) {
      await this.mailService.sendTestBuildReadyEmail(
        app.ownerEmail,
        app.name || app.appId,
        (app as any).version || '1.0.0',
        'http://localhost:8081/repository/apk-test-builds/superapp/v1.1.0/app-debug.apk',
        `http://localhost:3002/miniapps/${app.id}`
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
      app
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
      newVal?: any
    ) => Promise<void>
  ) {
    const id = app.id;
    const validStatuses = ['TESTING', 'APPROVED'];
    if (!validStatuses.includes(app.status?.toUpperCase())) {
      throw new BadRequestException('App must be in TESTING or APPROVED status to activate');
    }

    const releaseVersion = (app as any).version ? `v${(app as any).version}` : 'v1.1.0';
    try {
      this.logger.log(`Triggering Jenkins Production Release build for Mini App ${app.name} (${app.id})...`);
      await this.jenkinsService.triggerSuperAppBuild({
        releaseVersion,
        appName: 'superapp',
        buildType: 'release',
      });
    } catch (err: any) {
      this.logger.error(`Error triggering Jenkins production release build: ${err.message}`);
    }

    app.status = 'ACTIVE';
    await this.miniappRepository.save(app);

    if (app.ownerId) {
      await this.notificationsService.createNotification(
        app.ownerId,
        'Mini App Live & Activated',
        `Mini App "${app.name}" has been granted final approval and production release build is live in the Super App catalog.`,
        'MINIAPP_ACTIVATED',
        app.id
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
      app
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
      newVal?: any
    ) => Promise<void>
  ) {
    app.status = 'SUSPENDED';
    await this.miniappRepository.save(app);
    await logActivityFn(app.id, actorId, 'STATUS_CHANGE', 'Mini App Suspended', 'App suspended', 'SUSPEND_MINI_APP', null, app);
    return app;
  }
}
