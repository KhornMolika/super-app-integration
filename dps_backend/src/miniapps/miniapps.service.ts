import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniApp } from './entities/miniapp.entity';
import { MiniAppIssue } from './entities/miniapp-issue.entity';
import { MiniAppActivity } from './entities/miniapp-activity.entity';
import { AuditService } from '../audit/audit.service';
import { DomainVerificationService } from '../integrations/webview/domain-verification.service';
import { StorageService } from '../storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PermissionDetectorHelper } from './helpers/permission-detector.helper';
import { MiniappValidationHelper } from './helpers/miniapp-validation.helper';
import { MiniappLifecycleHelper } from './helpers/miniapp-lifecycle.helper';

@Injectable()
export class MiniappsService {
  private readonly logger = new Logger(MiniappsService.name);

  constructor(
    @InjectRepository(MiniApp)
    private miniappRepository: Repository<MiniApp>,

    @InjectRepository(MiniAppActivity)
    private activityRepository: Repository<MiniAppActivity>,

    @InjectRepository(MiniAppIssue)
    private issueRepository: Repository<MiniAppIssue>,

    private auditService: AuditService,
    private domainVerificationService: DomainVerificationService,
    private storageService: StorageService,
    private notificationsService: NotificationsService,

    private permissionDetectorHelper: PermissionDetectorHelper,
    private validationHelper: MiniappValidationHelper,
    private lifecycleHelper: MiniappLifecycleHelper,
  ) {}

  async logActivity(
    miniAppId: string,
    actorId: string,
    actionType: string,
    title: string,
    description: string,
    auditAction: string,
    oldVal?: any,
    newVal?: any,
  ) {
    try {
      await this.activityRepository.save(
        this.activityRepository.create({
          miniAppId,
          actorId,
          type: actionType,
          title,
          description,
        }),
      );
    } catch (e: any) {
      this.logger.warn(`Failed to log activity: ${e.message}`);
    }
    if (auditAction) {
      await this.auditService.log({
        actorId,
        action: auditAction,
        resourceType: 'MiniApp',
        resourceId: miniAppId,
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }

  async create(data: Partial<MiniApp>, actorId?: string) {
    delete data.status;
    data.status = 'PROCESSING';

    // Automatically upload base64 image data to MinIO object storage on submission
    const isBase64Logo =
      data.logo &&
      (data.logo.startsWith('data:') ||
        (data.logo.length > 500 && !data.logo.startsWith('http')));
    if (isBase64Logo) {
      try {
        const targetId = data.appId || `miniapp_${Date.now()}`;
        data.logo = await this.storageService.uploadBase64(
          data.logo!,
          `mini-app-assets/${targetId}/logo.png`,
        );
      } catch (err: any) {
        this.logger.error(`Failed to store logo in MinIO: ${err.message}`);
      }
    }

    if (!data.permissions) {
      data.permissions = [];
    }

    if (data.integrationMethod === 'WEBVIEW') {
      if (!data.verificationToken) {
        data.verificationToken =
          data.integrationConfig?.verificationToken ||
          this.domainVerificationService.generateVerificationToken();
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
        throw new BadRequestException(
          'An app with this App ID already exists.',
        );
      }
      throw error;
    }

    // Kick off async validation
    this.validateMiniAppAsync(savedApp.id).catch((err) => {
      this.logger.error(
        `Error in async validation for app ${savedApp.id}:`,
        err,
      );
    });

    await this.logActivity(
      savedApp.id,
      actorId || 'system',
      'CREATE',
      `App ${savedApp.name} Created`,
      'Initial draft creation',
      'CREATE_MINI_APP',
      null,
      savedApp,
    );

    return savedApp;
  }

  async validateMiniAppAsync(id: string, initialData?: any) {
    const app = await this.findOne(id);
    if (!app) return;
    return this.validationHelper.validateMiniAppAsync(
      app,
      (mId, aId, aType, t, d, aAction, oVal, nVal) =>
        this.logActivity(mId, aId, aType, t, d, aAction, oVal, nVal),
    );
  }

  async findAllIssues() {
    const issues = await this.issueRepository.find({
      relations: { miniApp: true },
      order: { createdAt: 'DESC' },
    });

    return issues.map((issue) => {
      let miniAppName = issue.miniApp?.name || 'Unknown Mini App';
      let miniAppId = issue.miniApp?.appId || issue.miniAppId;

      if (!issue.miniApp) {
        if (issue.metadata?.miniAppName)
          miniAppName = issue.metadata.miniAppName;
        if (issue.metadata?.miniAppId) miniAppId = issue.metadata.miniAppId;
      }

      return {
        ...issue,
        miniAppName,
        miniAppId,
      };
    });
  }

  async getActivities(id: string) {
    return this.activityRepository.find({
      where: { miniAppId: id },
      order: { createdAt: 'DESC' },
    });
  }

  async checkExists(appId?: string, name?: string, excludeId?: string) {
    let appIdExists = false;
    let nameExists = false;

    if (appId) {
      const qb = this.miniappRepository
        .createQueryBuilder('app')
        .where('app.appId = :appId', { appId });
      if (excludeId) qb.andWhere('app.id != :excludeId', { excludeId });
      appIdExists = (await qb.getCount()) > 0;
    }

    if (name) {
      const qb = this.miniappRepository
        .createQueryBuilder('app')
        .where('LOWER(app.name) = LOWER(:name)', { name });
      if (excludeId) qb.andWhere('app.id != :excludeId', { excludeId });
      nameExists = (await qb.getCount()) > 0;
    }

    return { appIdExists, nameExists };
  }

  async findOne(id: string) {
    const app = await this.miniappRepository.findOne({
      where: { id },
      relations: { issues: true, activities: true },
    });

    if (app && app.integrationMethod === 'WEBVIEW') {
      if (app.validationStatus === 'RUNNING') {
        // Active scan in progress
      }
    }

    return app;
  }

  async findAll(
    queryOrOwnerId?: { status?: string } | string,
    roles?: string[],
  ) {
    if (typeof queryOrOwnerId === 'object' && queryOrOwnerId !== null) {
      const where: any = {};
      if (queryOrOwnerId.status) {
        where.status = queryOrOwnerId.status;
      }
      return this.miniappRepository.find({
        where,
        order: { updatedAt: 'DESC' },
        relations: { issues: true },
      });
    }

    const ownerId =
      typeof queryOrOwnerId === 'string' ? queryOrOwnerId : undefined;
    const isElevated =
      roles?.includes('SUPER_ADMIN') ||
      roles?.includes('SECURITY_ADMIN') ||
      roles?.includes('DEVELOPER') ||
      roles?.includes('COMPLIANCE_OFFICER');

    if (isElevated || !ownerId) {
      return this.miniappRepository.find({
        order: { updatedAt: 'DESC' },
        relations: { issues: true },
      });
    }

    return this.miniappRepository.find({
      where: { ownerId },
      order: { updatedAt: 'DESC' },
      relations: { issues: true },
    });
  }

  async cancelValidation(id: string, actorId = 'system') {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');
    return this.lifecycleHelper.cancelValidation(
      app,
      actorId,
      (mId, aId, aType, t, d, aAction, oVal, nVal) =>
        this.logActivity(mId, aId, aType, t, d, aAction, oVal, nVal),
    );
  }

  async update(id: string, data: Partial<MiniApp>, actorId?: string) {
    delete data.status;
    const existing = await this.findOne(id);
    if (!existing) throw new BadRequestException('App not found');

    if (data.permissions && Array.isArray(data.permissions)) {
      // Deduplicate permissions array by type
      data.permissions = Array.from(
        new Map(data.permissions.map((p: any) => [p.type, p])).values(),
      );
    }

    const isLive = existing.status === 'ACTIVE' || existing.status === 'TESTING';

    // Automatically upload base64 image data to MinIO object storage on submission
    const isBase64Logo =
      data.logo &&
      (data.logo.startsWith('data:') ||
        (data.logo.length > 500 && !data.logo.startsWith('http')));
    if (isBase64Logo) {
      try {
        const targetId = data.appId || existing.appId || existing.id;
        data.logo = await this.storageService.uploadBase64(
          data.logo!,
          `mini-app-assets/${targetId}/logo.png`,
        );
      } catch (err: any) {
        this.logger.error(`Failed to store logo in MinIO: ${err.message}`);
      }
    }

    if (isLive) {
      // Preserve the active live app status so it remains visible and usable in the Super App
      const existingRev = existing.pendingRevision || {};
      const revisionData = {
        ...existingRev,
        name: data.name ?? existingRev.name ?? existing.name,
        shortDescription: data.shortDescription ?? existingRev.shortDescription ?? existing.shortDescription,
        fullDescription: data.fullDescription ?? existingRev.fullDescription ?? existing.fullDescription,
        logo: data.logo ?? existingRev.logo ?? existing.logo,
        category: data.category ?? existingRev.category ?? existing.category,
        termsUrl: data.termsUrl ?? existingRev.termsUrl ?? existing.termsUrl,
        termsDescription: data.termsDescription ?? existingRev.termsDescription ?? existing.termsDescription,
        privacyPolicyUrl: data.privacyPolicyUrl ?? existingRev.privacyPolicyUrl ?? existing.privacyPolicyUrl,
        privacyPolicyDescription: data.privacyPolicyDescription ?? existingRev.privacyPolicyDescription ?? existing.privacyPolicyDescription,
        ownerName: data.ownerName ?? existingRev.ownerName ?? existing.ownerName,
        ownerEmail: data.ownerEmail ?? existingRev.ownerEmail ?? existing.ownerEmail,
        supportEmail: data.supportEmail ?? existingRev.supportEmail ?? existing.supportEmail,
        teamName: data.teamName ?? existingRev.teamName ?? existing.teamName,
        integrationMethod: data.integrationMethod ?? existingRev.integrationMethod ?? existing.integrationMethod,
        integrationConfig: data.integrationConfig ?? existingRev.integrationConfig ?? existing.integrationConfig,
        permissions: data.permissions ?? existingRev.permissions ?? existing.permissions,
        securityChecks: data.securityChecks ?? existingRev.securityChecks ?? existing.securityChecks,
        isDomainVerified: data.isDomainVerified ?? existingRev.isDomainVerified ?? existing.isDomainVerified,
        domainVerifiedAt: data.domainVerifiedAt ?? existingRev.domainVerifiedAt ?? existing.domainVerifiedAt,
        verificationToken: data.verificationToken ?? existingRev.verificationToken ?? existing.verificationToken,
        revisionStatus: 'IN_REVIEW',
        validationStatus: 'RUNNING',
        submittedAt: existingRev.submittedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      existing.pendingRevision = revisionData;
      await this.miniappRepository.save(existing);

      // Kick off async validation on the staged revision
      this.validateMiniAppAsync(id, revisionData).catch((err) => {
        this.logger.error(`Error in async validation for app revision ${id}:`, err);
      });

      const updated = await this.findOne(id);
      await this.logActivity(
        id,
        actorId || 'system',
        'UPDATE_REVISION',
        `Revision Saved for ${existing.name}`,
        'Draft revision updated while live version remains running in Super App',
        'UPDATE_MINI_APP_REVISION',
        existing,
        updated,
      );
      return updated;
    }

    data.status = 'PROCESSING';

    const merged = this.miniappRepository.merge(existing, data);
    if (data.permissions) {
      merged.permissions = data.permissions;
    }

    // Reset domain verification status if productionUrl changes
    const oldProdUrl = existing.integrationConfig?.productionUrl;
    const newProdUrl = data.integrationConfig?.productionUrl;
    if (newProdUrl && oldProdUrl && newProdUrl.trim() !== oldProdUrl.trim()) {
      merged.isDomainVerified = false;
      merged.domainVerifiedAt = null as any;
    }

    await this.miniappRepository.save(merged);

    // Kick off async validation
    this.validateMiniAppAsync(id, data).catch((err) => {
      this.logger.error(`Error in async validation for app ${id}:`, err);
    });

    const updated = await this.findOne(id);
    await this.logActivity(
      id,
      actorId || 'system',
      'UPDATE',
      `App updated`,
      'Draft changes saved',
      'UPDATE_MINI_APP',
      existing,
      updated,
    );
    return updated;
  }

  async publishRevision(id: string, actorId: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');
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
    app.privacyPolicyDescription = rev.privacyPolicyDescription ?? app.privacyPolicyDescription;
    app.ownerName = rev.ownerName ?? app.ownerName;
    app.ownerEmail = rev.ownerEmail ?? app.ownerEmail;
    app.supportEmail = rev.supportEmail ?? app.supportEmail;
    app.teamName = rev.teamName ?? app.teamName;
    app.integrationMethod = rev.integrationMethod ?? app.integrationMethod;
    app.integrationConfig = rev.integrationConfig ?? app.integrationConfig;
    app.permissions = rev.permissions ?? app.permissions;
    if (rev.isDomainVerified !== undefined) app.isDomainVerified = rev.isDomainVerified;
    if (rev.domainVerifiedAt !== undefined) app.domainVerifiedAt = rev.domainVerifiedAt;
    if (rev.verificationToken !== undefined) app.verificationToken = rev.verificationToken;
    if (rev.validationStages) app.validationStages = rev.validationStages;
    if (rev.validationReport) app.validationReport = rev.validationReport;
    if (rev.validationStatus) app.validationStatus = rev.validationStatus;
    if (rev.validationErrors !== undefined) app.validationErrors = rev.validationErrors;

    app.pendingRevision = null;
    app.status = 'ACTIVE';

    await this.miniappRepository.save(app);

    await this.notificationsService.createNotification(
      app.ownerId || '',
      'Revision Published',
      `Revision for Mini App "${app.name}" has been published live to the Super App catalog.`,
      'REVISION_PUBLISHED',
      app.id,
    );

    await this.logActivity(
      id,
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

  async discardRevision(id: string, actorId: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');
    if (!app.pendingRevision) {
      throw new BadRequestException('No pending revision found to discard');
    }

    const oldRev = app.pendingRevision;
    app.pendingRevision = null;
    await this.miniappRepository.save(app);

    await this.logActivity(
      id,
      actorId || 'system',
      'STATUS_CHANGE',
      `Revision Discarded for ${app.name}`,
      'Pending draft revision was discarded without affecting the live version',
      'DISCARD_REVISION',
      oldRev,
      null,
    );

    return app;
  }

  async remove(id: string, actorId?: string) {
    const existing = await this.findOne(id);
    if (existing) {
      await this.logActivity(
        id,
        actorId || 'system',
        'DELETE',
        `App ${existing.name || existing.appId} Deleted`,
        'App removed',
        'DELETE_MINI_APP',
        existing,
        null,
      );
    }
    return this.miniappRepository.delete(id);
  }

  async submitForReview(id: string, actorId: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');
    return this.lifecycleHelper.submitForReview(
      app,
      actorId,
      (mId, aId, aType, t, d, aAction, oVal, nVal) =>
        this.logActivity(mId, aId, aType, t, d, aAction, oVal, nVal),
    );
  }

  async rescan(id: string, actorId = 'system', customChecks?: string[]) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');
    return this.lifecycleHelper.rescan(
      app,
      actorId,
      (mId, aId, aType, t, d, aAction, oVal, nVal) =>
        this.logActivity(mId, aId, aType, t, d, aAction, oVal, nVal),
      customChecks,
    );
  }

  async approve(id: string, actorId: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');
    return this.lifecycleHelper.approve(
      app,
      actorId,
      (mId, aId, aType, t, d, aAction, oVal, nVal) =>
        this.logActivity(mId, aId, aType, t, d, aAction, oVal, nVal),
    );
  }

  async reject(id: string, reason: string, actorId: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');
    return this.lifecycleHelper.reject(
      app,
      reason,
      actorId,
      (mId, aId, aType, t, d, aAction, oVal, nVal) =>
        this.logActivity(mId, aId, aType, t, d, aAction, oVal, nVal),
    );
  }

  async requestChanges(id: string, reason: string, actorId: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');
    return this.lifecycleHelper.requestChanges(
      app,
      reason,
      actorId,
      (mId, aId, aType, t, d, aAction, oVal, nVal) =>
        this.logActivity(mId, aId, aType, t, d, aAction, oVal, nVal),
    );
  }

  async startTesting(id: string, actorId: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');
    return this.lifecycleHelper.startTesting(
      app,
      actorId,
      (mId, aId, aType, t, d, aAction, oVal, nVal) =>
        this.logActivity(mId, aId, aType, t, d, aAction, oVal, nVal),
    );
  }

  async activate(id: string, actorId: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');
    return this.lifecycleHelper.activate(
      app,
      actorId,
      (mId, aId, aType, t, d, aAction, oVal, nVal) =>
        this.logActivity(mId, aId, aType, t, d, aAction, oVal, nVal),
    );
  }

  async suspend(id: string, actorId: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');
    return this.lifecycleHelper.suspend(
      app,
      actorId,
      (mId, aId, aType, t, d, aAction, oVal, nVal) =>
        this.logActivity(mId, aId, aType, t, d, aAction, oVal, nVal),
    );
  }

  async verifyDomain(id: string, overrideUrl?: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');
    if (app.integrationMethod !== 'WEBVIEW') {
      throw new BadRequestException(
        'Domain verification is only applicable to WebView mini-apps',
      );
    }

    const prodUrl = overrideUrl || app.integrationConfig?.productionUrl;
    if (!prodUrl) {
      throw new BadRequestException(
        'No productionUrl found in integrationConfig',
      );
    }

    if (!app.verificationToken) {
      app.verificationToken =
        this.domainVerificationService.generateVerificationToken();
      await this.miniappRepository.save(app);
    }

    const result = await this.domainVerificationService.verifyDomainOwnership(
      prodUrl,
      app.appId,
      app.verificationToken,
    );

    if (result.success) {
      app.isDomainVerified = true;
      app.domainVerifiedAt = result.verifiedAt || new Date();

      if (result.allowedDomains && result.allowedDomains.length > 0) {
        const currentAllowed = Array.isArray(
          app.integrationConfig?.allowedDomains,
        )
          ? app.integrationConfig.allowedDomains
          : [];
        app.integrationConfig = {
          ...(app.integrationConfig || {}),
          allowedDomains: Array.from(
            new Set([...currentAllowed, ...result.allowedDomains]),
          ),
        };
      }

      if (result.permissions && result.permissions.length > 0) {
        const currentPerms = Array.isArray(app.permissions)
          ? app.permissions
          : [];
        const newPerms = [...currentPerms];
        for (const p of result.permissions) {
          const permType = typeof p === 'string' ? p : (p as any)?.type;
          const permPurpose =
            typeof p === 'string' ? undefined : (p as any)?.purpose;
          if (!permType) continue;
          const exists = newPerms.some(
            (existing) =>
              (existing.type || existing)?.toLowerCase() ===
              permType.toLowerCase(),
          );
          if (!exists) {
            newPerms.push({
              type: permType,
              purpose:
                permPurpose ||
                `Required by ${app.name} as declared in domain association file`,
              termsUrl: app.termsUrl || 'https://privacy.example.com',
            });
          }
        }
        app.permissions = newPerms;
      }

      await this.miniappRepository.save(app);

      return {
        verified: true,
        message: result.message,
        domainVerifiedAt: app.domainVerifiedAt,
        allowedDomains: app.integrationConfig?.allowedDomains,
        permissions: app.permissions,
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

  async verifyDomainStandalone(
    prodUrl: string,
    appId: string,
    verificationToken: string,
  ) {
    const result = await this.domainVerificationService.verifyDomainOwnership(
      prodUrl,
      appId,
      verificationToken,
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

  generateVerificationToken(): string {
    return this.domainVerificationService.generateVerificationToken();
  }

  async getNotifications(userId: string) {
    return this.notificationsService.findByUserId(userId);
  }

  async markNotificationRead(id: string) {
    return this.notificationsService.markAsRead(id);
  }

  async markAllNotificationsRead() {
    return this.notificationsService.markAllAsRead();
  }

  async deleteNotification(id: string) {
    return this.notificationsService.delete(id);
  }

  async detectPermissions(body: {
    productionUrl?: string;
    category?: string;
    name?: string;
    appId?: string;
  }) {
    return this.permissionDetectorHelper.detect(body);
  }

  async uploadPackageArtifact(
    file: Express.Multer.File,
    miniAppId?: string,
    version?: string,
  ) {
    const res = await this.storageService.uploadPackageArchive(
      file,
      miniAppId,
      version,
    );
    const detected =
      this.permissionDetectorHelper.detectFromPubspecDependencies(
        res.pubspec?.dependencies || {},
        res.pubspec?.name,
      );
    return {
      ...res,
      detectedPermissions: detected,
    };
  }
}
