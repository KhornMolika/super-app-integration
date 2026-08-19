import { Injectable, Logger, BadRequestException, OnApplicationBootstrap } from '@nestjs/common';
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
import { PermissionDefinition } from '../permissions/entities/permission-definition.entity';




import { User } from '../access-control/entities/user.entity';

@Injectable()
export class MiniappsService {
  private readonly logger = new Logger(MiniappsService.name);

  constructor(
    @InjectRepository(MiniApp)
    private miniappRepository: Repository<MiniApp>,
    
    @InjectRepository(MiniAppIssue)
    private issueRepository: Repository<MiniAppIssue>,
    private permissionsService: PermissionsService,
    private permissionProposalsService: PermissionProposalsService,
    private superAppService: SuperAppService,
    private mailService: MailService,
    private notificationsService: NotificationsService,
  ) {}

    async create(data: Partial<MiniApp> & { permissions?: any[] }) {
    data.status = 'Processing';
    
    // Process permissions into permissionRequests
    if (data.permissions && Array.isArray(data.permissions)) {
      data.permissionRequests = [];
      for (const perm of data.permissions) {
        // Look up the definition
        const def = await this.permissionsService.findByKey(perm.type);
        // Even if definition doesn't exist yet, we save it (it will just not have a permissionId linked)
        // We handle the unknown permission check in the validation phase
        data.permissionRequests.push({
          permissionId: def ? def.id : undefined,
          purpose: perm.purpose,
          termsUrl: perm.termsUrl,
          required: perm.required || false,
          requestedVersion: perm.requestedVersion,
          status: 'PENDING',
          // Temporarily store the original type string in metadata if no def is found so we know what they asked for
          metadata: def ? undefined : { originalType: perm.type }
        } as any);
      }
      delete data.permissions;
    }

    const app = this.miniappRepository.create(data);
    let savedApp;
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
      
      if (app.integrationConfig?.stagingUrl) {
        checks.push(
          urlValidator.validate(app.integrationConfig.stagingUrl, null as any).then(isValid => {
            if (!isValid) errors['integrationConfigWebView.stagingUrl'] = 'stagingUrl must be a reachable and accessible URL.';
          })
        );
      }
    }

    if (app.permissionRequests && Array.isArray(app.permissionRequests)) {
      for (let index = 0; index < app.permissionRequests.length; index++) {
        const perm = app.permissionRequests[index];
        const permKey = perm.permission?.key || perm.metadata?.originalType || 'unknown';

        if (!perm.purpose || perm.purpose.trim() === '') {
          errors[`permissionRequests.${index}.purpose`] = `Purpose is required for ${permKey} permission.`;
        }
        if (!perm.termsUrl || perm.termsUrl.trim() === '') {
          errors[`permissionRequests.${index}.termsUrl`] = `Terms/Policy URL is required for ${permKey} permission.`;
        } else {
          checks.push(
            urlValidator.validate(perm.termsUrl, null as any).then(isValid => {
              if (!isValid) errors[`permissionRequests.${index}.termsUrl`] = `Terms/Policy URL for ${permKey} must be reachable.`;
            })
          );
        }

        // Permission Compatibility Check
        let permissionDef: PermissionDefinition | null = perm.permission;
        if (!permissionDef && perm.metadata?.originalType) {
           permissionDef = await this.permissionsService.findByKey(perm.metadata.originalType);
        }

        if (!permissionDef) {
           // UNKNOWN PERMISSION -> create proposal
           await this.createPermissionProposal(app, permKey, perm.metadata?.originalType);
           // Not returning a 500 error, just logging the issue.
           // If it's required, we block approval
           if (perm.required) {
              errors[`permissionRequests.${index}.unsupported`] = `The requested permission "${permKey}" is unknown and required. A proposal has been created.`;
           }
        } else {
           // Known permission, check Super App Compatibility
           // For simplicity in this architecture, we get the latest Super App capability (or an active one)
           const latestCapability = await this.superAppService.findLatestCapability();
           
           if (!latestCapability || !latestCapability.capabilities.includes(permissionDef.key)) {
              // UNSUPPORTED BY RUNTIME -> create proposal
              await this.createPermissionProposal(app, permissionDef.key, permissionDef.name);
              
              if (perm.required) {
                 errors[`permissionRequests.${index}.unsupported`] = `The requested permission "${permissionDef.key}" is not supported by the current Super App runtime. A proposal has been created.`;
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
        status: 'Issues',
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
      await this.notificationsService.createNotification(app.ownerId || '', 'Validation Failed', `${app.name || 'Mini App'} has ${issues.length} validation issue(s).`, 'ISSUE_CREATED');

      if (app.ownerEmail) {
        await this.mailService.sendRegistrationFailureEmail(app.ownerEmail, app.name || app.appId || 'Unknown App', errors);
      }
    } else {
      await this.miniappRepository.update(id, {
        status: 'Draft',
        validationErrors: null as any,
      });
      
      // Also notify on success
      await this.notificationsService.createNotification(app.ownerId || '', 'Validation Passed', `${app.name || 'Mini App'} has passed validation and is now under review.`, 'REVIEW_STARTED');

      if (app.ownerEmail) {
        await this.mailService.sendRegistrationSuccessEmail(app.ownerEmail, app.name || app.appId || 'Unknown App');
      }
    }
  }

  private async createPermissionProposal(app: MiniApp, permissionKey: string, permissionName?: string) {
    // Check if an open proposal already exists
    const [existing] = await this.permissionProposalsService.findPendingByKey(permissionKey);

    if (existing) {
      // Just link or log? In MVP, we might just use the existing one
      return existing;
    }

    const proposal = this.permissionProposalsService.create({
      permissionKey,
      permissionName: permissionName || permissionKey,
      description: `Automatically created from MiniApp ${app.name} requesting unsupported permission ${permissionKey}`,
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
      await this.notificationsService.createNotification(admin.id, 'New Permission Proposal', `Mini App "${app.name}" requested unsupported permission "${permissionKey}".`, 'PROPOSAL_CREATED');
    }

    return proposal;
  }

  findAll(query: any = {}) {
    return this.miniappRepository.find({ 
      where: query, 
      order: { createdAt: 'DESC' },
      relations: { permissionRequests: { permission: true }, issues: true }
    });
  }

  // Fetch all notifications (apps with issues)
  getNotifications(userId: string) {
    return this.notificationsService.findByUserId(userId);
  }

  async markNotificationRead(id: string) {
    await this.notificationsService.markAsRead(id);
    return { success: true };
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
      relations: { permissionRequests: { permission: true }, issues: true }
    });
  }

  async update(id: string, data: Partial<MiniApp> & { permissions?: any[] }) {
    const existing = await this.findOne(id);
    if (!existing) throw new BadRequestException('App not found');

    if (data.permissions && Array.isArray(data.permissions)) {
      data.permissionRequests = [];
      for (const perm of data.permissions) {
        const def = await this.permissionsService.findByKey(perm.type);
        data.permissionRequests.push({
          permissionId: def ? def.id : undefined,
          purpose: perm.purpose,
          termsUrl: perm.termsUrl,
          required: perm.required || false,
          requestedVersion: perm.requestedVersion,
          status: 'PENDING',
          metadata: def ? undefined : { originalType: perm.type }
        } as any);
      }
      delete data.permissions;
    }

    // If an explicit status like 'Published' or 'Rejected' is provided, we skip validation
    if (data.status === 'Published' || data.status === 'Rejected') {
      if (data.status === 'Published' && existing.permissionRequests) {
        existing.permissionRequests.forEach(p => p.status = 'PUBLISHED');
      }
      
      const merged = this.miniappRepository.merge(existing, data);
      await this.miniappRepository.save(merged);
      return this.findOne(id);
    }

    data.status = 'Processing';
    const merged = this.miniappRepository.merge(existing, data);
    
    await this.miniappRepository.save(merged);
    
    // Kick off async validation
    this.validateMiniAppAsync(id, data).catch(err => {
      this.logger.error(`Error in async validation for app ${id}:`, err);
    });

    return this.findOne(id);
  }

  remove(id: string) {
    return this.miniappRepository.delete(id);
  }

  

  

  
}
