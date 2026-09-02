import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniApp } from './entities/miniapp.entity';
import { isEmail } from 'class-validator';
import { IsUrlReachableConstraint } from '../common/validators/is-url-reachable.validator';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PermissionsService } from '../permissions/permissions.service';
import { PermissionProposalsService } from '../permission-proposals/permission-proposals.service';
import { SuperAppService } from '../super-app/super-app.service';
import { MiniAppIssue } from './entities/miniapp-issue.entity';
import { MiniAppActivity } from './entities/miniapp-activity.entity';
import { AuditService } from '../audit/audit.service';
import { GitIntegrationService } from '../integrations/git/git-integration.service';
import { NexusIntegrationService } from '../integrations/nexus/nexus-integration.service';
import { DomainVerificationService } from '../integrations/webview/domain-verification.service';
import { JenkinsService } from '../integrations/jenkins/jenkins.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class MiniappsService {
  private readonly logger = new Logger(MiniappsService.name);

  constructor(
    @InjectRepository(MiniApp)
    private miniappRepository: Repository<MiniApp>,
    
    @InjectRepository(MiniAppActivity)
    private activityRepository: Repository<MiniAppActivity>,
    private auditService: AuditService,
    
    @InjectRepository(MiniAppIssue)
    private issueRepository: Repository<MiniAppIssue>,
    
    private mailService: MailService,
    private notificationsService: NotificationsService,
    private permissionsService: PermissionsService,
    private permissionProposalsService: PermissionProposalsService,
    private superAppService: SuperAppService,
    private gitService: GitIntegrationService,
    private nexusService: NexusIntegrationService,
    private domainVerificationService: DomainVerificationService,
    private jenkinsService: JenkinsService,
    private storageService: StorageService,
  ) {}

  async logActivity(miniAppId: string, actorId: string, actionType: string, title: string, description: string, auditAction: string, oldVal?: any, newVal?: any) {
    try {
      await this.activityRepository.save(this.activityRepository.create({ miniAppId, actorId, type: actionType, title, description }));
    } catch (e: any) {
      this.logger.warn(`Failed to log activity: ${e.message}`);
    }
    if (auditAction) {
       await this.auditService.log({ actorId, action: auditAction, resourceType: 'MiniApp', resourceId: miniAppId, oldValue: oldVal, newValue: newVal });
    }
  }

  async create(data: Partial<MiniApp>, actorId?: string) {
    delete data.status;
    data.status = 'PROCESSING';
    
    // Automatically upload base64 image data to MinIO object storage
    if (data.logo && (data.logo.startsWith('data:image/') || data.logo.length > 500)) {
      try {
        data.logo = await this.storageService.uploadBase64(data.logo, `${data.name || 'logo'}.png`);
      } catch (err: any) {
        this.logger.error(`Failed to store logo in MinIO: ${err.message}`);
      }
    }

    if (!data.permissions) {
      data.permissions = [];
    }

    if (data.integrationMethod === 'WEBVIEW') {
      if (!data.verificationToken) {
        data.verificationToken = data.integrationConfig?.verificationToken || this.domainVerificationService.generateVerificationToken();
      }
      if (data.integrationConfig) {
        data.integrationConfig.verificationToken = data.verificationToken;
      }
    }

    const app = this.miniappRepository.create(data);
    let savedApp: MiniApp;
    try {
      savedApp = await this.miniappRepository.save(app);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new BadRequestException('An app with this App ID already exists.');
      }
      throw error;
    }
    
    // Kick off async validation
    this.validateMiniAppAsync(savedApp.id, data).catch(err => {
      this.logger.error(`Error in async validation for app ${savedApp.id}:`, err);
    });

    await this.logActivity(savedApp.id, actorId || 'system', 'CREATE', `App ${savedApp.name} Created`, 'Initial draft creation', 'CREATE_MINI_APP', null, savedApp);

    return savedApp;
  }

  async validateMiniAppAsync(id: string, initialData?: any) {
    const app = await this.findOne(id);
    if (!app) return;

    const errors: Record<string, string> = {};
    const urlValidator = new IsUrlReachableConstraint();
    const checks: Promise<void>[] = [];

    if (!app.ownerEmail || !isEmail(app.ownerEmail)) {
      errors.ownerEmail = 'ownerEmail must be a valid email address.';
    }
    if (app.supportEmail && !isEmail(app.supportEmail)) {
      errors.supportEmail = 'supportEmail must be a valid email address.';
    }

    if (app.logo && app.logo.trim() !== '') {
      if (app.logo.startsWith('data:image/') || app.logo.startsWith('/uploads/')) {
        // Uploaded image format is valid
      } else {
        checks.push(
          urlValidator.validate(app.logo, null as any).then(isValid => {
            if (!isValid) errors.logo = 'logo must be a reachable and accessible URL.';
          })
        );
      }
    }

    if (app.integrationMethod === 'WEBVIEW') {
      const envVal = (process.env.ENVIRONMENT || process.env.NODE_ENV || '').toUpperCase();
      const isDev = envVal === 'DEV' || envVal === 'DEVELOPMENT' || process.env.NODE_ENV !== 'production';

      if (!app.integrationConfig?.productionUrl) {
        errors['integrationConfigWebView.productionUrl'] = 'productionUrl is required for WebView integration.';
      } else {
        const prodUrl = app.integrationConfig.productionUrl;
        let isValidProdUrl = true;
        let parsedUrl: URL | null = null;

        try {
          parsedUrl = new URL(prodUrl);
        } catch {
          errors['integrationConfigWebView.productionUrl'] = 'Production URL has an invalid URL format.';
          isValidProdUrl = false;
        }
        
        if (parsedUrl) {
          if (!isDev) {
            if (parsedUrl.protocol !== 'https:') {
              errors['integrationConfigWebView.productionUrl'] = 'Production URL must use HTTPS.';
              isValidProdUrl = false;
            } else if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
              errors['integrationConfigWebView.productionUrl'] = 'Production URL cannot be localhost in production.';
              isValidProdUrl = false;
            }
          }
        }
        
        if (isValidProdUrl) {
          checks.push(
            urlValidator.validate(prodUrl, null as any).then(isValid => {
              if (!isValid) errors['integrationConfigWebView.productionUrl'] = 'productionUrl must be a reachable and accessible URL.';
            })
          );
        }
      }

      // Check stagingUrl format and reachability if provided
      if (app.integrationConfig?.stagingUrl) {
        const stagingUrl = app.integrationConfig.stagingUrl;
        let isValidStaging = true;
        let parsedStaging: URL | null = null;

        try {
          parsedStaging = new URL(stagingUrl);
        } catch {
          errors['integrationConfigWebView.stagingUrl'] = 'Staging URL has an invalid URL format.';
          isValidStaging = false;
        }

        if (parsedStaging && !isDev && parsedStaging.protocol !== 'https:') {
          errors['integrationConfigWebView.stagingUrl'] = 'Staging URL must use HTTPS.';
          isValidStaging = false;
        }

        if (isValidStaging) {
          checks.push(
            urlValidator.validate(stagingUrl, null as any).then(isValid => {
              if (!isValid) errors['integrationConfigWebView.stagingUrl'] = 'stagingUrl must be a reachable and accessible URL.';
            })
          );
        }
      }

      // Check domain verification
      const prodUrl = app.integrationConfig?.productionUrl;
      if (!app.isDomainVerified) {
        if (prodUrl && app.verificationToken && app.appId) {
          checks.push(
            this.domainVerificationService.verifyDomainOwnership(
              prodUrl,
              app.appId,
              app.verificationToken
            ).then(result => {
              if (result.success) {
                app.isDomainVerified = true;
                app.domainVerifiedAt = result.verifiedAt || new Date();
                if (result.allowedDomains && result.allowedDomains.length > 0) {
                  const currentAllowed = Array.isArray(app.integrationConfig?.allowedDomains) ? app.integrationConfig.allowedDomains : [];
                  app.integrationConfig = {
                    ...app.integrationConfig,
                    allowedDomains: Array.from(new Set([...currentAllowed, ...result.allowedDomains])),
                  };
                }
              } else {
                errors['integrationConfigWebView.domainVerification'] = result.message || 'Domain ownership has not been verified. Please host the verification token at /.well-known/superapp-miniapp-association.json and verify.';
              }
            }).catch(() => {
              errors['integrationConfigWebView.domainVerification'] = 'Domain ownership has not been verified. Please host the verification token at /.well-known/superapp-miniapp-association.json and verify.';
            })
          );
        } else {
          errors['integrationConfigWebView.domainVerification'] = 'Domain ownership has not been verified. Please host the verification token at /.well-known/superapp-miniapp-association.json and verify.';
        }
      }

      // Check allowed domains format
      if (app.integrationConfig?.allowedDomains && Array.isArray(app.integrationConfig.allowedDomains)) {
        for (const domain of app.integrationConfig.allowedDomains) {
          if (typeof domain !== 'string' || domain.includes('/') || domain.includes('://')) {
            errors['integrationConfigWebView.allowedDomains'] = `Invalid domain "${domain}". allowedDomains must only contain valid hostnames (e.g. "api.domain.com").`;
            break;
          }
        }
      }
      
    } else if (app.integrationMethod === 'FLUTTER_PACKAGE') {
      const flutterConfig = app.integrationConfig || {};
      const isArtifact = flutterConfig.sourceType === 'ARTIFACT' || (!flutterConfig.sourceType && flutterConfig.packageName);

      if (isArtifact) {
        const packageName = flutterConfig.packageName?.trim();
        if (!packageName) {
          errors['integrationConfigFlutter.packageName'] = 'Package name is required for Artifact integration.';
        } else {
          checks.push(
            this.nexusService.getPackageInfo(packageName).then(result => {
              if (!result.exists) {
                errors['integrationConfigFlutter.packageName'] =
                  `Package "${packageName}" was not found in Nexus repository (pub-group). Please publish the package before submitting for review.`;
              }
            }).catch(err => {
              errors['integrationConfigFlutter.packageName'] =
                `Could not verify package "${packageName}" on Nexus: ${err.message}`;
            })
          );
        }
      } else {
        const gitUrl = flutterConfig.gitUrl?.trim();
        if (!gitUrl) {
          errors['integrationConfigFlutter.gitUrl'] = 'Git URL is required for Source Code integration.';
        } else {
          checks.push(
            this.gitService
              .validatePackage(
                gitUrl,
                flutterConfig.gitBranch || flutterConfig.ref,
                flutterConfig.gitProvider || flutterConfig.provider,
                flutterConfig.gitAccessToken || flutterConfig.token,
                flutterConfig.gitPath || flutterConfig.path,
              )
              .then(async result => {
                if (!result.validation.isValid) {
                  errors['integrationConfigFlutter.gitUrl'] =
                    result.validation.error || `Git repository or pubspec.yaml could not be verified for ${gitUrl}.`;
                } else {
                  this.logger.log(`Git repository metadata verified for ${gitUrl}. Automated security scanning and build integration will be orchestrated via Jenkins.`);
                }
              })
              .catch(err => {
                errors['integrationConfigFlutter.gitUrl'] =
                  `Could not verify Git repository "${gitUrl}": ${err.message}`;
              })
          );
        }
      }
    } else if (app.integrationMethod === 'DEEP_LINK') {
      if (!app.integrationConfig?.urlScheme) {
        errors['integrationConfigDeepLink.urlScheme'] = 'urlScheme is required for Deep Link integration.';
      }
      if (app.integrationConfig?.appStoreUrl && app.integrationConfig.appStoreUrl.trim() !== '') {
        checks.push(
          urlValidator.validate(app.integrationConfig.appStoreUrl, null as any).then(isValid => {
            if (!isValid) errors['integrationConfigDeepLink.appStoreUrl'] = 'App Store fallback URL must be a valid, reachable URL.';
          })
        );
      }
    }

    if (app.termsUrl && app.termsUrl.trim() !== '') {
      checks.push(
        urlValidator.validate(app.termsUrl, null as any).then(isValid => {
          if (!isValid) errors.termsUrl = 'The Terms & Conditions URL is unreachable. Please verify the link is publicly accessible.';
        })
      );
    }

    if (app.privacyPolicyUrl && app.privacyPolicyUrl.trim() !== '') {
      checks.push(
        urlValidator.validate(app.privacyPolicyUrl, null as any).then(isValid => {
          if (!isValid) errors.privacyPolicyUrl = 'The Privacy Policy URL is unreachable. Please verify the link is publicly accessible.';
        })
      );
    }

    if (app.permissions && Array.isArray(app.permissions)) {
      for (let index = 0; index < app.permissions.length; index++) {
        const perm = app.permissions[index];
        const permKey = perm.type || 'unknown';

        if (!perm.purpose || perm.purpose.trim() === '') {
          errors[`permissions.${index}.purpose`] = `Please describe why your Mini App requires ${permKey} access.`;
        }

        // Permission Catalog & Compatibility Check
        const permissionDef = await this.permissionsService.findByKey(permKey);

        if (!permissionDef) {
           // UNKNOWN PERMISSION -> create proposal in permission_proposals
           await this.createPermissionProposal(app, permKey);
           if (perm.required) {
              errors[`permissions.${index}.unsupported`] = `The requested permission "${permKey}" is not currently supported in the platform catalog. A proposal has been created for review.`;
           }
        } else {
           // Known permission, check Super App Runtime Compatibility
           const latestCapability = await this.superAppService.findLatestCapability();
           const supportedCaps = latestCapability 
             ? (Array.isArray(latestCapability.capabilities) ? latestCapability.capabilities : String(latestCapability.capabilities).split(',')).map(c => c.trim().toLowerCase())
             : ['camera', 'location', 'storage', 'microphone', 'biometrics'];
           
           const isSupported = supportedCaps.includes(permissionDef.key.toLowerCase()) || supportedCaps.includes(permissionDef.name.toLowerCase());
           
           if (!isSupported) {
              await this.createPermissionProposal(app, permissionDef.key, permissionDef.name);
              if (perm.required) {
                 errors[`permissions.${index}.unsupported`] = `The requested permission "${permissionDef.key}" is not supported by the current Super App runtime. A proposal has been created for review.`;
              }
           }
        }
      }
    }

    await Promise.all(checks);

    // Clear old issues
    await this.issueRepository.delete({ miniAppId: id });

    if (Object.keys(errors).length > 0) {
      await this.miniappRepository.update(id, {
        status: 'DRAFT',
        validationErrors: errors as any,
      });

      // Create persistent issues
      const issues = Object.entries(errors).map(([key, value]) => {
        return this.issueRepository.create({
          miniAppId: id,
          type: 'VALIDATION_ERROR',
          severity: 'HIGH',
          description: value,
          status: 'OPEN',
          metadata: { field: key }
        });
      });
      await this.issueRepository.save(issues);

      // Create a notification
      await this.notificationsService.createNotification(app.ownerId || '', 'Validation Failed', `${app.name || 'Mini App'} has ${issues.length} validation issue(s).`, 'ISSUE_CREATED', app.id);
      await this.logActivity(id, 'system', 'VALIDATION', 'Validation Failed', `Found ${issues.length} issues`, 'VALIDATE_MINI_APP', app, await this.findOne(id));

      if (app.ownerEmail) {
        await this.mailService.sendRegistrationFailureEmail(app.ownerEmail, app.name || app.appId || 'Unknown App', errors);
      }
    } else {
      if (app.integrationMethod === 'WEBVIEW' && app.integrationConfig?.productionUrl) {
        const initialStages = {
          ssrf: { id: 'ssrf', name: '1. Pre-Flight & SSRF Defense', status: 'RUNNING', details: 'Resolving DNS & verifying IP routes...' },
          tls: { id: 'tls', name: '2. TLS & HTTPS Security', status: 'PENDING', details: 'Awaiting cipher suite verification...' },
          zap: { id: 'zap', name: '3. OWASP ZAP DAST Scan', status: 'PENDING', details: 'Awaiting XSS & CSP header audit...' },
          nuclei: { id: 'nuclei', name: '4. Exposure & Vulnerability Audit', status: 'PENDING', details: 'Awaiting CVE & endpoint check...' },
        };
        await this.miniappRepository.update(id, {
          status: 'SUBMITTED',
          validationStatus: 'RUNNING',
          validationStages: initialStages as any,
          validationErrors: null as any,
        });

        const allowedDomains = Array.isArray(app.integrationConfig.allowedDomains)
          ? app.integrationConfig.allowedDomains
          : (typeof app.integrationConfig.allowedDomains === 'string' ? app.integrationConfig.allowedDomains.split(',') : []);

        const envVal = (process.env.ENVIRONMENT || '').toUpperCase();
        const allowLocal = envVal === 'DEV' || envVal === 'DEVELOPMENT';

        this.logger.log(`Triggering Jenkins automated security scan for Mini App ${id}...`);
        this.jenkinsService.triggerWebViewValidation({
          miniAppId: id,
          targetUrl: app.integrationConfig.productionUrl,
          allowedDomains,
          allowLocal,
        }).catch(err => this.logger.error(`Jenkins trigger error: ${err.message}`));

        await this.notificationsService.createNotification(app.ownerId || '', 'Validation Running', `${app.name || 'Mini App'} automated security scans initiated on Jenkins.`, 'SCAN_STARTED', app.id);
        await this.logActivity(id, 'system', 'VALIDATION', 'Validation Running', 'Automated security scan pipeline triggered on Jenkins', 'VALIDATE_MINI_APP', app, await this.findOne(id));
      } else {
        await this.miniappRepository.update(id, {
          status: 'IN_REVIEW',
          validationErrors: null as any,
        });
        
        await this.notificationsService.createNotification(app.ownerId || '', 'Validation Passed', `${app.name || 'Mini App'} has passed validation and is now ready for review.`, 'REVIEW_STARTED', app.id);
        await this.logActivity(id, 'system', 'VALIDATION', 'Validation Passed', 'No issues found', 'VALIDATE_MINI_APP', app, await this.findOne(id));

        if (app.ownerEmail) {
          await this.mailService.sendRegistrationSuccessEmail(app.ownerEmail, app.name || app.appId || 'Unknown App');
        }
      }
    }
  }

  private async createPermissionProposal(app: MiniApp, permissionKey: string, permissionName?: string) {
    const [existing] = await this.permissionProposalsService.findPendingByKey(permissionKey);
    if (existing) {
      return existing;
    }

    const proposal = await this.permissionProposalsService.create({
      permissionKey,
      permissionName: permissionName || permissionKey,
      description: `Automatically created from MiniApp "${app.name}" requesting unsupported permission "${permissionKey}"`,
      miniApp: app,
      requestedBy: app.owner,
      status: 'PENDING_REVIEW'
    });

    // Notify admins
    const admins = await this.miniappRepository.manager.query(
      `SELECT u.id FROM "user" u 
       JOIN "user_roles" ur ON u.id = ur."userId"
       JOIN "role" r ON ur."roleId" = r.id
       JOIN "role_permissions" rp ON r.id = rp."roleId"
       JOIN "permission" p ON rp."permissionId" = p.id
       WHERE p.name = 'permission_proposal:review'`
    );

    for (const admin of admins) {
      await this.notificationsService.createNotification(admin.id, 'New Permission Proposal', `Mini App "${app.name}" requested unsupported permission "${permissionKey}".`, 'PROPOSAL_CREATED', app.id);
    }

    return proposal;
  }

  async findAllIssues() {
    return this.issueRepository.find({
      relations: { miniApp: true },
      order: { createdAt: 'DESC' }
    });
  }

  findAll(query: any = {}) {
    return this.miniappRepository.find({ 
      where: query, 
      order: { createdAt: 'DESC' },
      relations: { issues: true }
    });
  }

  getNotifications(userId: string) {
    return this.notificationsService.findByUserId(userId);
  }

  async markNotificationRead(id: string) {
    await this.notificationsService.markAsRead(id);
    return { success: true };
  }

  async markAllNotificationsRead() {
    await this.notificationsService.markAllAsRead();
    return { success: true };
  }

  async deleteNotification(id: string) {
    await this.notificationsService.delete(id);
    return { success: true };
  }

  async getActivities(id: string) {
    return this.activityRepository.find({
      where: { miniAppId: id },
      order: { createdAt: 'DESC' }
    });
  }

  async checkExists(appId?: string, name?: string, excludeId?: string) {
    const exists = { appIdExists: false, nameExists: false };
    
    if (appId) {
      const q = this.miniappRepository.createQueryBuilder('app').where('app.appId = :appId', { appId });
      if (excludeId) q.andWhere('app.id != :excludeId', { excludeId });
      if (await q.getOne()) exists.appIdExists = true;
    }
    
    if (name) {
      const q = this.miniappRepository.createQueryBuilder('app').where('app.name = :name', { name });
      if (excludeId) q.andWhere('app.id != :excludeId', { excludeId });
      if (await q.getOne()) exists.nameExists = true;
    }
    
    return exists;
  }

  async findOne(id: string) {
    const app = await this.miniappRepository.findOne({ 
      where: { id },
      relations: { issues: true }
    });
    if (!app) return null;

    // Auto-reconciliation: If validation is marked RUNNING, verify with Jenkins
    if (app.validationStatus === 'RUNNING') {
      try {
        const lastBuild = await this.jenkinsService.getLastBuild('webview-validation');
        if (lastBuild && lastBuild.building === false) {
          if (lastBuild.result === 'FAILURE' || lastBuild.result === 'ABORTED') {
            this.logger.warn(`Mini App ${id} validation auto-reconciled: Jenkins build #${lastBuild.number} failed (${lastBuild.result})`);
            app.validationStatus = 'FAILED';
            if (app.status === 'SUBMITTED') {
              app.status = 'DRAFT';
            }

            const stages = app.validationStages || {};
            Object.keys(stages).forEach(key => {
              if (stages[key].status === 'RUNNING') {
                stages[key].status = 'FAILED';
                stages[key].details = `Jenkins build #${lastBuild.number} finished with ${lastBuild.result}.`;
              }
            });
            app.validationStages = stages;

            if (!app.validationReport || !app.validationReport.findings?.length) {
              app.validationReport = {
                score: 0,
                status: 'FAILED',
                method: app.integrationMethod || 'WEBVIEW',
                completedAt: new Date().toISOString(),
                findings: [
                  {
                    id: 'PIPELINE_ERROR',
                    severity: 'CRITICAL',
                    title: 'Security Validation Pipeline Interrupted',
                    description: `The automated Jenkins pipeline build #${lastBuild.number} terminated with result ${lastBuild.result}. Check Jenkins logs.`,
                    recommendation: 'Verify target URL accessibility and re-run the scan.',
                  }
                ]
              };
            }

            await this.miniappRepository.save(app);

            this.notificationsService.emitStageUpdate({
              miniAppId: id,
              stages: app.validationStages,
              validationStatus: 'FAILED',
            });
          }
        }
      } catch (e: any) {
        this.logger.debug(`Reconciliation check skipped: ${e.message}`);
      }
    }

    return app;
  }

  async cancelValidation(id: string, actorId = 'system') {
    const app = await this.miniappRepository.findOne({ where: { id } });
    if (!app) throw new BadRequestException('App not found');

    app.validationStatus = 'FAILED';
    if (app.status === 'SUBMITTED') {
      app.status = 'DRAFT';
    }

    const stages = app.validationStages || {};
    Object.keys(stages).forEach(key => {
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
        }
      ]
    };

    await this.miniappRepository.save(app);

    this.notificationsService.emitStageUpdate({
      miniAppId: id,
      stages: app.validationStages,
      validationStatus: 'FAILED',
    });

    await this.logActivity(id, actorId, 'STATUS_CHANGE', 'Validation Reset', 'Security validation was reset', 'CANCEL_VALIDATION', null, app);
    return app;
  }

  async update(id: string, data: Partial<MiniApp>, actorId?: string) {
    delete data.status;
    const existing = await this.findOne(id);
    if (!existing) throw new BadRequestException('App not found');

    if (data.permissions && Array.isArray(data.permissions)) {
      // Deduplicate permissions array by type
      data.permissions = Array.from(
        new Map(data.permissions.map((p: any) => [p.type, p])).values()
      );
    }

    data.status = 'PROCESSING';

    // Automatically upload base64 image data to MinIO object storage
    if (data.logo && (data.logo.startsWith('data:image/') || data.logo.length > 500)) {
      try {
        data.logo = await this.storageService.uploadBase64(data.logo, `${data.name || existing.name || 'logo'}.png`);
      } catch (err: any) {
        this.logger.error(`Failed to store logo in MinIO: ${err.message}`);
      }
    }

    const merged = this.miniappRepository.merge(existing, data);
    if (data.permissions) {
      merged.permissions = data.permissions;
    }

    // Reset domain verification status if productionUrl changes
    const oldProdUrl = (existing.integrationConfig as any)?.productionUrl;
    const newProdUrl = (data.integrationConfig as any)?.productionUrl;
    if (newProdUrl && oldProdUrl && newProdUrl.trim() !== oldProdUrl.trim()) {
      merged.isDomainVerified = false;
      merged.domainVerifiedAt = null as any;
    }
    
    await this.miniappRepository.save(merged);
    
    // Kick off async validation
    this.validateMiniAppAsync(id, data).catch(err => {
      this.logger.error(`Error in async validation for app ${id}:`, err);
    });

    const updated = await this.findOne(id);
    await this.logActivity(id, actorId || 'system', 'UPDATE', `App updated`, 'Draft changes saved', 'UPDATE_MINI_APP', existing, updated);
    return updated;
  }

  async remove(id: string, actorId?: string) {
    const existing = await this.findOne(id);
    if (existing) {
       await this.logActivity(id, actorId || 'system', 'DELETE', `App ${existing.name || existing.appId} Deleted`, 'App removed', 'DELETE_MINI_APP', existing, null);
    }
    return this.miniappRepository.delete(id);
  }

  async submitForReview(id: string, actorId: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');
    const currentStatus = app.status?.toUpperCase();
    if (currentStatus !== 'DRAFT' && currentStatus !== 'REJECTED') {
      throw new BadRequestException('App is not in DRAFT or REJECTED status');
    }

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
        : (typeof app.integrationConfig.allowedDomains === 'string' ? app.integrationConfig.allowedDomains.split(',') : []);

      const envVal = (process.env.ENVIRONMENT || '').toUpperCase();
      const allowLocal = envVal === 'DEV' || envVal === 'DEVELOPMENT';

      this.jenkinsService.triggerWebViewValidation({
        miniAppId: id,
        targetUrl: app.integrationConfig.productionUrl,
        allowedDomains,
        allowLocal,
      }).catch(err => this.logger.error(`Jenkins trigger failed: ${err.message}`));
    } else {
      app.status = 'IN_REVIEW';
      await this.miniappRepository.save(app);
    }

    await this.logActivity(id, actorId, 'STATUS_CHANGE', 'Submitted for Review', 'App submitted for review', 'SUBMIT_MINI_APP', null, app);
    return app;
  }

  async rescan(id: string, actorId = 'system') {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');

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
      : (typeof app.integrationConfig.allowedDomains === 'string' ? app.integrationConfig.allowedDomains.split(',') : []);

    const envVal = (process.env.ENVIRONMENT || '').toUpperCase();
    const allowLocal = envVal === 'DEV' || envVal === 'DEVELOPMENT';

    this.jenkinsService.triggerWebViewValidation({
      miniAppId: id,
      targetUrl,
      allowedDomains,
      allowLocal,
    }).catch(err => this.logger.error(`Jenkins rescan trigger failed: ${err.message}`));

    await this.notificationsService.createNotification(
      app.ownerId || '',
      'Scan Re-run',
      `${app.name || 'Mini App'} automated security scan re-initiated.`,
      'SCAN_STARTED',
      app.id
    );

    await this.logActivity(id, actorId, 'VALIDATION', 'Scan Re-run', 'Automated security scan re-triggered on Jenkins', 'RESCAN_MINI_APP', null, app);

    return {
      success: true,
      message: 'Automated security scan re-initiated on Jenkins',
      validationStatus: 'RUNNING',
      validationStages: initialStages,
    };
  }

  async approve(id: string, actorId: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');
    const validStatuses = ['IN_REVIEW', 'SUBMITTED'];
    if (!validStatuses.includes(app.status?.toUpperCase())) {
      throw new BadRequestException(`App is not in review (current status: ${app.status})`);
    }
    app.status = 'APPROVED';
    await this.miniappRepository.save(app);
    await this.logActivity(id, actorId, 'STATUS_CHANGE', 'Mini App Approved', 'App approved by SA Admin', 'APPROVE_MINI_APP', null, app);
    return app;
  }

  async reject(id: string, reason: string, actorId: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');
    const validStatuses = ['IN_REVIEW', 'SUBMITTED', 'APPROVED', 'TESTING'];
    if (!validStatuses.includes(app.status?.toUpperCase())) {
      throw new BadRequestException(`App cannot be rejected from current status: ${app.status}`);
    }
    app.status = 'REJECTED';
    await this.miniappRepository.save(app);
    await this.logActivity(id, actorId, 'STATUS_CHANGE', 'Mini App Rejected', reason || 'App rejected by SA Admin', 'REJECT_MINI_APP', null, app);
    return app;
  }

  async requestChanges(id: string, reason: string, actorId: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');
    app.status = 'DRAFT';
    await this.miniappRepository.save(app);
    await this.logActivity(id, actorId, 'STATUS_CHANGE', 'Changes Requested', reason || 'SA Admin sent app back to Draft for remediation', 'REQUEST_CHANGES', null, app);
    return app;
  }

  async startTesting(id: string, actorId: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');
    const validStatuses = ['APPROVED', 'BUILDING', 'IN_REVIEW'];
    if (!validStatuses.includes(app.status?.toUpperCase())) {
      throw new BadRequestException(`App must be in APPROVED or BUILDING status before moving to TESTING (current: ${app.status})`);
    }

    if (app.status === 'APPROVED' || app.status === 'IN_REVIEW') {
      // 1. Move to BUILDING and trigger Jenkins test build pipeline
      app.status = 'BUILDING';
      await this.miniappRepository.save(app);

      const releaseVersion = (app as any).version ? `v${(app as any).version}` : 'v1.1.0';
      try {
        this.logger.log(`Triggering Jenkins Super App test build for Mini App ${app.name} (${app.id})...`);
        const jenkinsResult = await this.jenkinsService.triggerSuperAppBuild({
          releaseVersion,
          appName: 'superapp',
          buildType: 'debug', // Debug test build, stored in Nexus for manual testing
        });
        if (!jenkinsResult.success) {
          this.logger.warn(`Jenkins test build trigger returned: ${jenkinsResult.message}`);
        }
      } catch (err: any) {
        this.logger.error(`Error triggering Jenkins test build: ${err.message}`);
      }

      await this.logActivity(
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

    // If already in BUILDING and clicked "Advance to Testing":
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
    await this.logActivity(id, actorId, 'STATUS_CHANGE', 'Testing Started', 'Mini App promoted to manual sandbox testing phase', 'START_TESTING', null, app);
    return app;
  }

  async activate(id: string, actorId: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');
    const validStatuses = ['TESTING', 'APPROVED'];
    if (!validStatuses.includes(app.status?.toUpperCase())) {
      throw new BadRequestException('App must be in TESTING or APPROVED status to activate');
    }

    // Trigger Jenkins Production Release Build
    const releaseVersion = (app as any).version ? `v${(app as any).version}` : 'v1.1.0';
    try {
      this.logger.log(`Triggering Jenkins Production Release build for Mini App ${app.name} (${app.id})...`);
      await this.jenkinsService.triggerSuperAppBuild({
        releaseVersion,
        appName: 'superapp',
        buildType: 'release', // Production Release build
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
        app.id,
      );
    }

    await this.logActivity(
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

  async suspend(id: string, actorId: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');
    app.status = 'SUSPENDED';
    await this.miniappRepository.save(app);
    await this.logActivity(id, actorId, 'STATUS_CHANGE', 'Mini App Suspended', 'App suspended', 'SUSPEND_MINI_APP', null, app);
    return app;
  }

  async verifyDomain(id: string, overrideUrl?: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');
    if (app.integrationMethod !== 'WEBVIEW') {
      throw new BadRequestException('Domain verification is only applicable for WebView integrations');
    }

    const prodUrl = overrideUrl?.trim() || app.integrationConfig?.productionUrl;
    if (!prodUrl) {
      throw new BadRequestException('No productionUrl configured for this Mini App');
    }

    // Keep app.integrationConfig in sync with overrideUrl if supplied
    if (overrideUrl && app.integrationConfig) {
      app.integrationConfig = {
        ...app.integrationConfig,
        productionUrl: overrideUrl.trim(),
      };
    }

    if (!app.verificationToken) {
      app.verificationToken = this.domainVerificationService.generateVerificationToken();
      if (!app.integrationConfig) {
        app.integrationConfig = {};
      }
      app.integrationConfig.verificationToken = app.verificationToken;
      await this.miniappRepository.save(app);
    }

    const result = await this.domainVerificationService.verifyDomainOwnership(
      prodUrl,
      app.appId,
      app.verificationToken
    );

    if (result.success) {
      app.isDomainVerified = true;
      app.domainVerifiedAt = result.verifiedAt || new Date();

      // Clear domain verification validation error from entity
      if (app.validationErrors) {
        delete app.validationErrors['integrationConfigWebView.domainVerification'];
      }

      // Automatically resolve any open domain verification issues
      try {
        await this.issueRepository.update(
          {
            miniAppId: app.id,
            type: 'DOMAIN_VERIFICATION',
            status: 'OPEN',
          },
          {
            status: 'RESOLVED',
          }
        );
      } catch (issueErr) {
        this.logger.warn(`Could not update issue status for miniapp ${app.id}: ${issueErr}`);
      }

      if (result.allowedDomains && result.allowedDomains.length > 0) {
        const currentAllowed = Array.isArray(app.integrationConfig?.allowedDomains) ? app.integrationConfig.allowedDomains : [];
        const mergedAllowed = Array.from(new Set([...currentAllowed, ...result.allowedDomains]));
        app.integrationConfig = {
          ...app.integrationConfig,
          allowedDomains: mergedAllowed,
        };
      }
      await this.miniappRepository.save(app);
      await this.logActivity(id, 'system', 'DOMAIN_VERIFICATION', 'Domain Ownership Verified', result.message, 'VERIFY_DOMAIN', null, app);
      return {
        verified: true,
        message: result.message,
        domainVerifiedAt: app.domainVerifiedAt,
        allowedDomains: app.integrationConfig?.allowedDomains || [],
        permissions: result.permissions || [],
        validationErrors: app.validationErrors || {},
      };
    } else {
      app.isDomainVerified = false;
      app.domainVerifiedAt = null as any;
      if (!app.validationErrors) {
        app.validationErrors = {};
      }
      app.validationErrors['integrationConfigWebView.domainVerification'] = result.message;
      await this.miniappRepository.save(app);
      await this.logActivity(id, 'system', 'DOMAIN_VERIFICATION', 'Domain Verification Failed', result.message, 'VERIFY_DOMAIN_FAILED', null, app);
      return {
        verified: false,
        message: result.message,
        validationErrors: app.validationErrors,
      };
    }
  }

  generateVerificationToken(): string {
    return this.domainVerificationService.generateVerificationToken();
  }

  async verifyDomainStandalone(
    prodUrl: string,
    appId: string,
    verificationToken: string
  ) {
    const result = await this.domainVerificationService.verifyDomainOwnership(
      prodUrl,
      appId,
      verificationToken
    );

    if (result.success) {
      return {
        verified: true,
        message: result.message,
        domainVerifiedAt: result.verifiedAt || new Date(),
        allowedDomains: result.allowedDomains || [],
        permissions: result.permissions || [],
      };
    } else {
      return {
        verified: false,
        message: result.message,
        validationErrors: {
          'integrationConfigWebView.domainVerification': result.message,
        },
      };
    }
  }

  async detectPermissions(body: { productionUrl?: string; category?: string; name?: string; appId?: string }) {
    const detected: Array<{ type: string; purpose: string; source: string; confidence: 'HIGH' | 'MEDIUM' }> = [];
    const addedTypes = new Set<string>();
    const appLabel = body.name?.trim() || '$(PRODUCT_NAME)';

    const formatCompliantPurpose = (type: string, rawPurpose: string): string => {
      const trimmed = (rawPurpose || '').trim();
      if (!trimmed) {
        return `${appLabel} requires access to your ${type.toLowerCase()} to provide core mini application features.`;
      }
      if (trimmed.toLowerCase().includes('requires') && (trimmed.toLowerCase().startsWith(appLabel.toLowerCase()) || trimmed.startsWith('$('))) {
        return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
      }
      let cleaned = trimmed;
      if (/^(to|for)\s+/i.test(cleaned)) {
        cleaned = cleaned.replace(/^(to|for)\s+/i, '');
      }
      cleaned = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
      if (cleaned.endsWith('.')) {
        cleaned = cleaned.slice(0, -1);
      }
      return `${appLabel} requires access to your ${type.toLowerCase()} to ${cleaned}.`;
    };

    const addPerm = (type: string, purpose: string, source: string, confidence: 'HIGH' | 'MEDIUM' = 'HIGH') => {
      const normalizedType = type.charAt(0).toUpperCase() + type.slice(1);
      if (!addedTypes.has(normalizedType.toLowerCase())) {
        addedTypes.add(normalizedType.toLowerCase());
        const compliantPurpose = formatCompliantPurpose(normalizedType, purpose);
        detected.push({ type: normalizedType, purpose: compliantPurpose, source, confidence });
      }
    };

    // 1. Check association file if productionUrl is provided
    if (body.productionUrl && body.productionUrl.trim()) {
      try {
        const parsed = new URL(body.productionUrl.trim());
        const assocUrl = `${parsed.origin}/.well-known/superapp-miniapp-association.json`;
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 3500);
        const res = await fetch(assocUrl, { signal: ctrl.signal });
        clearTimeout(tid);
        if (res.ok) {
          const json = await res.json();
          const perms = json.permissions || json.requestedPermissions || json.requiredPermissions;
          if (Array.isArray(perms)) {
            for (const p of perms) {
              const pType = typeof p === 'string' ? p : p.type;
              const pPurpose = typeof p === 'object' && p.purpose ? p.purpose : `Required by Mini App association configuration`;
              if (pType) {
                addPerm(pType, pPurpose, 'Association File (.well-known)', 'HIGH');
              }
            }
          }
        }
      } catch {
        // Association file might not be reachable or not contain perms
      }

      // 2. Scan remote HTML & JS scripts for Super App JS Bridge invocations
      try {
        const parsed = new URL(body.productionUrl.trim());
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(parsed.origin, { signal: ctrl.signal });
        clearTimeout(tid);
        if (res.ok) {
          const html = await res.text();
          let combinedCode = html;

          // Find script tags to scan JavaScript bundles
          const scriptSrcMatches = Array.from(html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi));
          const scriptsToFetch = scriptSrcMatches
            .map(m => m[1])
            .filter(src => src && (!src.startsWith('http') || src.startsWith(parsed.origin)))
            .slice(0, 3);

          for (const scriptSrc of scriptsToFetch) {
            try {
              const fullScriptUrl = scriptSrc.startsWith('http') ? scriptSrc : new URL(scriptSrc, parsed.origin).href;
              const sCtrl = new AbortController();
              const sTid = setTimeout(() => sCtrl.abort(), 2000);
              const sRes = await fetch(fullScriptUrl, { signal: sCtrl.signal });
              clearTimeout(sTid);
              if (sRes.ok) {
                const jsText = await sRes.text();
                combinedCode += ' ' + jsText;
              }
            } catch {
              // Ignore individual bundle failures
            }
          }

          const lower = combinedCode.toLowerCase();

          // A. Scan Super App Native Bridge (DSPNativeBridge)
          const hasBridge = lower.includes('dspnativebridge') || lower.includes('superapp') || lower.includes('nativebridge');

          if (lower.includes('opencamera') || lower.includes('capturephoto') || lower.includes('scanqr') || lower.includes('barcode') || lower.includes('getusermedia')) {
            addPerm(
              'Camera',
              'To scan QR codes and capture verification photos',
              hasBridge && (lower.includes('opencamera') || lower.includes('capturephoto'))
                ? 'JS Bridge: DSPNativeBridge (openCamera)'
                : 'Code Scan (Camera API)',
              'HIGH'
            );
          }

          if (lower.includes('getlocation') || lower.includes('geolocation') || lower.includes('getcurrentposition') || lower.includes('watchposition')) {
            addPerm(
              'Location',
              'To provide location-based services and map features',
              hasBridge && lower.includes('getlocation')
                ? 'JS Bridge: DSPNativeBridge (getLocation)'
                : 'Code Scan (Geolocation API)',
              'HIGH'
            );
          }

          if (lower.includes('authenticate') || lower.includes('publickeycredential') || lower.includes('webauthn') || lower.includes('biometric') || lower.includes('faceid')) {
            addPerm(
              'Biometrics',
              'To authenticate user identity and authorize transactions securely',
              hasBridge && lower.includes('authenticate')
                ? 'JS Bridge: DSPNativeBridge (authenticate)'
                : 'Code Scan (WebAuthn / Biometrics)',
              'HIGH'
            );
          }

          if (lower.includes('openmicrophone') || lower.includes('recordaudio') || lower.includes('speechrecognition') || lower.includes('audiocontext')) {
            addPerm(
              'Microphone',
              'To record voice notes and enable speech input',
              hasBridge && (lower.includes('openmicrophone') || lower.includes('recordaudio'))
                ? 'JS Bridge: DSPNativeBridge (openMicrophone)'
                : 'Code Scan (Audio / Microphone)',
              'HIGH'
            );
          }

          if (lower.includes('nfcscan') || lower.includes('readnfc') || lower.includes('ndeffilter')) {
            addPerm(
              'NFC',
              'To scan contactless NFC tags and identity chips',
              'JS Bridge: DSPNativeBridge (nfcScan)',
              'HIGH'
            );
          }

          if (lower.includes('openbluetooth') || lower.includes('bluetooth')) {
            addPerm(
              'Bluetooth',
              'To communicate with nearby Bluetooth devices',
              hasBridge && lower.includes('openbluetooth')
                ? 'JS Bridge: DSPNativeBridge (openBluetooth)'
                : 'Code Scan (Bluetooth)',
              'MEDIUM'
            );
          }

          if (lower.includes('getcontacts') || lower.includes('navigator.contacts')) {
            addPerm(
              'Contacts',
              'To select recipients and contacts from the address book',
              'JS Bridge: DSPNativeBridge (getContacts)',
              'MEDIUM'
            );
          }
        }
      } catch {
        // Endpoint scan optional
      }
    }

    // 3. Category Intelligence Fallback / Augmentation
    const cat = (body.category || '').toLowerCase();
    if (cat.includes('bank') || cat.includes('finan')) {
      addPerm('Biometrics', 'To authenticate user identity securely and authorize transactions', 'Banking Profile', 'HIGH');
      addPerm('Camera', 'To scan QR codes for quick transfers and payments', 'Banking Profile', 'HIGH');
    } else if (cat.includes('insur')) {
      addPerm('Camera', 'To photograph accident evidence and upload policy claim documents', 'Insurance Profile', 'HIGH');
    } else if (cat.includes('travel') || cat.includes('transport') || cat.includes('ride')) {
      addPerm('Location', 'To locate pickup points and provide live GPS trip tracking', 'Travel Profile', 'HIGH');
    } else if (cat.includes('food') || cat.includes('shop') || cat.includes('e-commerce') || cat.includes('retail')) {
      addPerm('Location', 'To determine delivery address and locate nearby partner stores', 'Shopping Profile', 'MEDIUM');
    } else if (cat.includes('health') || cat.includes('med')) {
      addPerm('Camera', 'To take pictures of prescriptions and conduct video consultations', 'Healthcare Profile', 'HIGH');
      addPerm('Biometrics', 'To secure electronic medical records and patient data', 'Healthcare Profile', 'HIGH');
    } else if (cat.includes('gov') || cat.includes('public')) {
      addPerm('Biometrics', 'To verify citizen identity against national digital ID', 'Government Profile', 'HIGH');
      addPerm('Camera', 'To capture identity card photos for verification', 'Government Profile', 'HIGH');
    }

    return {
      success: true,
      detected,
      count: detected.length,
    };
  }
}
