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
import { SecurityGateService } from '../integrations/security/security-gate.service';

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
    private securityGateService: SecurityGateService,
  ) {}

  async logActivity(miniAppId: string, actorId: string, actionType: string, title: string, description: string, auditAction: string, oldVal?: any, newVal?: any) {
    try {
      await this.activityRepository.save(this.activityRepository.create({ miniAppId, actorId, type: actionType, title, description }));
    } catch (e) {
      this.logger.warn(`Failed to log activity: ${e.message}`);
    }
    if (auditAction) {
       await this.auditService.log({ actorId, action: auditAction, resourceType: 'MiniApp', resourceId: miniAppId, oldValue: oldVal, newValue: newVal });
    }
  }

  async create(data: Partial<MiniApp>, actorId?: string) {
    delete data.status;
    data.status = 'PROCESSING';
    
    if (!data.permissions) {
      data.permissions = [];
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

    if (app.logo) {
      checks.push(
        urlValidator.validate(app.logo, null as any).then(isValid => {
          if (!isValid) errors.logo = 'logo must be a reachable and accessible URL.';
        })
      );
    }

    if (app.integrationMethod === 'WEBVIEW') {
      if (!app.integrationConfig?.productionUrl) {
        errors['integrationConfigWebView.productionUrl'] = 'productionUrl is required for WebView integration.';
      } else {
        const prodUrl = app.integrationConfig.productionUrl;
        const allowLocal = process.env.ALLOW_LOCAL_PROD_URLS === 'true';
        let isValidProdUrl = true;
        
        if (!allowLocal) {
          if (!prodUrl.startsWith('https://')) {
             errors['integrationConfigWebView.productionUrl'] = 'Production URL must use HTTPS.';
             isValidProdUrl = false;
          } else if (prodUrl.includes('localhost') || prodUrl.includes('127.0.0.1')) {
             errors['integrationConfigWebView.productionUrl'] = 'Production URL cannot be localhost.';
             isValidProdUrl = false;
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
      
    }

    if (app.integrationMethod === 'FLUTTER_PACKAGE') {
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
                  // Run Automated Security Gate 1 Pre-Publish Scan
                  try {
                    const gateReport = await this.securityGateService.runGate1Scan({
                      url: gitUrl,
                      ref: flutterConfig.gitBranch || flutterConfig.ref,
                      path: flutterConfig.gitPath || flutterConfig.path,
                      token: flutterConfig.gitAccessToken || flutterConfig.token,
                      declaredPermissions: app.permissions || [],
                    });

                    if (gateReport.status === 'FAILED') {
                      for (const f of gateReport.findings) {
                        if (f.severity === 'CRITICAL' || f.severity === 'HIGH') {
                          errors[`security.${f.id}`] = `[${f.title}]: ${f.description}`;
                        }
                      }
                    }
                  } catch (secErr: any) {
                    this.logger.warn(`Security Gate 1 scan warning: ${secErr.message}`);
                  }
                }
              })
              .catch(err => {
                errors['integrationConfigFlutter.gitUrl'] =
                  `Could not verify Git repository "${gitUrl}": ${err.message}`;
              })
          );
        }
      }
    }

    if (app.integrationMethod === 'DEEP_LINK') {
      const deepLinkConfig = app.integrationConfig || {};
      if (!deepLinkConfig.urlScheme || deepLinkConfig.urlScheme.trim() === '') {
        errors['integrationConfigDeepLink.urlScheme'] = 'URL Scheme is required for Deep Link integration (e.g. app:// or myapp://open).';
      }
      if (deepLinkConfig.appStoreUrl && deepLinkConfig.appStoreUrl.trim() !== '') {
        checks.push(
          urlValidator.validate(deepLinkConfig.appStoreUrl, null as any).then(isValid => {
            if (!isValid) errors['integrationConfigDeepLink.appStoreUrl'] = 'App Store fallback URL must be a valid, reachable URL.';
          })
        );
      }
    }

    if (app.permissions && Array.isArray(app.permissions)) {
      for (let index = 0; index < app.permissions.length; index++) {
        const perm = app.permissions[index];
        const permKey = perm.type || 'unknown';

        if (!perm.purpose || perm.purpose.trim() === '') {
          errors[`permissions.${index}.purpose`] = `Please describe why your Mini App requires ${permKey} access.`;
        }
        if (!perm.termsUrl || perm.termsUrl.trim() === '') {
          errors[`permissions.${index}.termsUrl`] = `A privacy policy or terms link is required for ${permKey} permission.`;
        } else {
          checks.push(
            urlValidator.validate(perm.termsUrl, null as any).then(isValid => {
              if (!isValid) errors[`permissions.${index}.termsUrl`] = `The URL provided for ${permKey} privacy policy (${perm.termsUrl}) is unreachable. Please verify the link is publicly accessible.`;
            })
          );
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
      await this.miniappRepository.update(id, {
        status: 'PENDING_REVIEW',
        validationErrors: null as any,
      });
      
      await this.notificationsService.createNotification(app.ownerId || '', 'Validation Passed', `${app.name || 'Mini App'} has passed validation and is now ready for review.`, 'REVIEW_STARTED', app.id);
      await this.logActivity(id, 'system', 'VALIDATION', 'Validation Passed', 'No issues found', 'VALIDATE_MINI_APP', app, await this.findOne(id));

      if (app.ownerEmail) {
        await this.mailService.sendRegistrationSuccessEmail(app.ownerEmail, app.name || app.appId || 'Unknown App');
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
    return this.miniappRepository.findOne({ 
      where: { id },
      relations: { issues: true }
    });
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
    const merged = this.miniappRepository.merge(existing, data);
    if (data.permissions) {
      merged.permissions = data.permissions;
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
    app.status = 'PENDING_REVIEW';
    await this.miniappRepository.save(app);
    await this.logActivity(id, actorId, 'STATUS_CHANGE', 'Submitted for Review', 'App submitted for review', 'SUBMIT_MINI_APP', null, app);
    return app;
  }

  async approve(id: string, actorId: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');
    if (app.status?.toUpperCase() !== 'PENDING_REVIEW') {
      throw new BadRequestException('App is not pending review');
    }
    app.status = 'APPROVED';
    await this.miniappRepository.save(app);
    await this.logActivity(id, actorId, 'STATUS_CHANGE', 'Mini App Approved', 'App approved', 'APPROVE_MINI_APP', null, app);
    return app;
  }

  async reject(id: string, reason: string, actorId: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');
    if (app.status?.toUpperCase() !== 'PENDING_REVIEW') {
      throw new BadRequestException('App is not pending review');
    }
    app.status = 'REJECTED';
    await this.miniappRepository.save(app);
    await this.logActivity(id, actorId, 'STATUS_CHANGE', 'Mini App Rejected', reason || 'App rejected', 'REJECT_MINI_APP', null, app);
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
}
