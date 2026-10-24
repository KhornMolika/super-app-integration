import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { MiniApp, MiniAppStatus, MiniAppLifecycleStatus, MiniAppAvailabilityStatus } from '../entities/miniapp.entity';
import { MiniAppLegal } from '../entities/miniapp-legal.entity';
import { StorageService } from '../../storage/storage.service';
import { DomainAssociationHelper } from './domain-association.helper';
import { NotificationsService, MailService } from '../../notifications';
import { MiniappValidationHelper } from './miniapp-validation.helper';
import { PermissionDetectorHelper } from './permission-detector.helper';
import { VersionDiffHelper } from './version-diff.helper';
import { inferPackageNameFromGitUrl } from '../../integrations/git/git-integration.service';
import { resolveOrganizationDetails } from '../../common/constants/fsa-organizations';
import { secureFlutterIntegrationConfig } from './flutter-credential.helper';

@Injectable()
export class MiniappMutationHelper {
  private readonly logger = new Logger(MiniappMutationHelper.name);

  constructor(
    @InjectRepository(MiniApp)
    private miniappRepository: Repository<MiniApp>,
    private storageService: StorageService,
    private domainAssociationHelper: DomainAssociationHelper,
    private mailService: MailService,
    private notificationsService: NotificationsService,
    private validationHelper: MiniappValidationHelper,
    private permissionDetectorHelper: PermissionDetectorHelper,
  ) { }

  async create(
    data: any,
    actorId?: string,
    logActivityFn?: (
      miniAppId: string,
      actorId: string,
      actionType: string,
      title: string,
      description: string,
      auditAction: string,
      oldVal?: any,
      newVal?: any,
    ) => Promise<void>,
  ): Promise<MiniApp> {
    delete data.status;
    data.lifecycleStatus = data.lifecycleStatus || MiniAppLifecycleStatus.DRAFT;
    data.currentReleaseVersion = undefined;
    data.pendingRevision = null;

    if (data.shortDescription !== undefined && !data.tagline) {
      data.tagline = data.shortDescription;
    }
    if (data.fullDescription !== undefined && !data.description) {
      data.description = data.fullDescription;
    }
    if (!data.alertTelegramChatId && data.teamTelegramChatId) {
      data.alertTelegramChatId = data.teamTelegramChatId;
    }
    if (!data.logo && data.iconUrl) {
      data.logo = data.iconUrl;
    }
    if (!data.legal && (data.termsUrl || data.termsDescription || data.privacyPolicyUrl || data.privacyPolicyDescription)) {
      data.legal = {
        termsUrl: data.termsUrl,
        termsDescription: data.termsDescription,
        privacyPolicyUrl: data.privacyPolicyUrl,
        privacyPolicyDescription: data.privacyPolicyDescription,
      };
    }

    // Resolve & normalize organization name and short code (e.g. FTC, IRC, etc.)
    const orgInfo = await resolveOrganizationDetails(data.organization || (data as any).category);
    data.organization = orgInfo.name;
    data.organizationCode = orgInfo.code;
    if (orgInfo.id && !data.organizationId) {
      data.organizationId = orgInfo.id;
    }

    // Ensure slug is populated
    if (!data.slug && data.name) {
      data.slug = data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }

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
          `logos/${targetId}/logo.png`,
        );
      } catch (err: any) {
        this.logger.error(`Failed to store logo in MinIO: ${err.message}`);
      }
    }

    if (!data.capabilities) {
      data.capabilities = (data as any).permissions || [];
    }

    if (data.integrationMethod === 'WEBVIEW') {
      if (!data.verificationToken) {
        data.verificationToken =
          data.integrationConfig?.verificationToken ||
          this.domainAssociationHelper.generateVerificationToken();
      }
      if (data.integrationConfig) {
        data.integrationConfig.verificationToken = data.verificationToken;
      }
    } else if (data.integrationMethod === 'FLUTTER_PACKAGE') {
      if (data.integrationConfig) {
        data.integrationConfig = secureFlutterIntegrationConfig(
          data.integrationConfig,
        );
        if (!data.integrationConfig.packageName && data.integrationConfig.gitUrl) {
          data.integrationConfig.packageName = inferPackageNameFromGitUrl(
            data.integrationConfig.gitUrl,
            data.integrationConfig.gitPath || data.integrationConfig.path,
          );
        }
      }
    }

    const packageVer =
      data.integrationConfig?.gitTag ||
      data.integrationConfig?.ref ||
      data.integrationConfig?.versionConstraint?.replace(/^[\^~>=<]+/, '') ||
      data.version ||
      '1.0.0';
    data.version = packageVer;
    data.currentReleaseVersion = packageVer;

    if (!data.versionHistory || data.versionHistory.length === 0) {
      data.versionHistory = [
        {
          version: packageVer,
          gitRef:
            data.integrationConfig?.gitTag ||
            data.integrationConfig?.ref ||
            data.integrationConfig?.gitBranch ||
            packageVer,
          packageName:
            data.integrationConfig?.packageName ||
            data.appId ||
            data.name,
          type: 'PRODUCTION',
          status: 'IN_REVIEW',
          changelog: (data as any).changelog || `Initial submission of version ${packageVer}`,
          releasedAt: new Date().toISOString(),
          releasedBy: actorId || data.ownerName || 'MiniApp Developer',
          checksum:
            data.integrationConfig?.archiveChecksum ||
            'sha256:' +
            crypto
              .createHash('sha256')
              .update((data.appId || 'miniapp') + packageVer)
              .digest('hex')
              .substring(0, 16),
        },
      ];
    }

    const app = this.miniappRepository.create(data as Partial<MiniApp>) as MiniApp;
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

    // 1. Dispatch Notification (WebSocket + Telegram to MA Manager, MA Team Group, & SA Admins)
    const isDraft =
      savedApp.lifecycleStatus === 'DRAFT' ||
      savedApp.lifecycleStatus === MiniAppLifecycleStatus.DRAFT ||
      (savedApp as any).status === 'DRAFT';

    const targetUserId = savedApp.ownerId || actorId || '';
    if (targetUserId) {
      if (isDraft) {
        await this.notificationsService.createNotification(
          targetUserId,
          'MiniApp Saved as Draft',
          `MiniApp "${savedApp.name || savedApp.appId}" has been saved as a draft by ${savedApp.owner?.name || (savedApp as any).ownerName || 'Operator'}.`,
          'MINIAPP_DRAFT_SAVED',
          savedApp.id,
          {
            integrationMethod: savedApp.integrationMethod,
            category: savedApp.organizationRelation?.name || (savedApp as any).category,
            teamName: savedApp.organizationRelation?.name || savedApp.owner?.name || (savedApp as any).teamName,
            teamTelegramChatId: savedApp.alertTelegramChatId || (savedApp as any).teamTelegramChatId,
          },
        );
      } else {
        await this.notificationsService.createNotification(
          targetUserId,
          'MiniApp Registered',
          `MiniApp "${savedApp.name || savedApp.appId}" has been registered successfully by ${savedApp.owner?.name || (savedApp as any).ownerName || 'Operator'} and queued for security validation.`,
          'MINIAPP_REGISTERED',
          savedApp.id,
          {
            integrationMethod: savedApp.integrationMethod,
            category: savedApp.organizationRelation?.name || (savedApp as any).category,
            teamName: savedApp.organizationRelation?.name || savedApp.owner?.name || (savedApp as any).teamName,
            teamTelegramChatId: savedApp.alertTelegramChatId || (savedApp as any).teamTelegramChatId,
          },
        );
      }
    }

    // Kick off async validation only when NOT in draft mode
    if (!isDraft) {
      this.validationHelper
        .validateMiniAppAsync(savedApp, logActivityFn)
        .catch((err) => {
          this.logger.error(
            `Error in async validation for app ${savedApp.id}:`,
            err,
          );
        });

      const ownerEmail = savedApp.supportEmail || savedApp.owner?.email || (savedApp as any).ownerEmail;
      if (ownerEmail) {
        await this.mailService.sendRegistrationSuccessEmail(
          ownerEmail,
          savedApp.name || savedApp.appId,
        );
      }
    }

    if (logActivityFn) {
      await logActivityFn(
        savedApp.id,
        actorId || 'system',
        'CREATE',
        `App ${savedApp.name} Created`,
        isDraft ? 'Initial draft saved' : 'Initial draft creation',
        'CREATE_MINI_APP',
        null,
        savedApp,
      );
    }

    return savedApp;
  }

  async update(
    existing: MiniApp,
    data: any,
    actorId?: string,
    logActivityFn?: (
      miniAppId: string,
      actorId: string,
      actionType: string,
      title: string,
      description: string,
      auditAction: string,
      oldVal?: any,
      newVal?: any,
    ) => Promise<void>,
  ): Promise<MiniApp> {
    delete data.status;

    if (data.shortDescription !== undefined) {
      data.tagline = data.shortDescription;
      existing.tagline = data.shortDescription;
    }
    if (data.fullDescription !== undefined) {
      data.description = data.fullDescription;
      existing.description = data.fullDescription;
    }
    if (data.teamTelegramChatId !== undefined && data.alertTelegramChatId === undefined) {
      data.alertTelegramChatId = data.teamTelegramChatId;
      existing.alertTelegramChatId = data.teamTelegramChatId;
    }
    if (data.iconUrl !== undefined && data.logo === undefined) {
      data.logo = data.iconUrl;
      existing.logo = data.iconUrl;
    }
    if (data.termsUrl !== undefined || data.termsDescription !== undefined || data.privacyPolicyUrl !== undefined || data.privacyPolicyDescription !== undefined) {
      if (!existing.legal) {
        existing.legal = new MiniAppLegal();
        existing.legal.miniApp = existing;
        existing.legal.miniAppId = existing.id;
      }
      if (data.termsUrl !== undefined) existing.legal.termsUrl = data.termsUrl;
      if (data.termsDescription !== undefined) existing.legal.termsDescription = data.termsDescription;
      if (data.privacyPolicyUrl !== undefined) existing.legal.privacyPolicyUrl = data.privacyPolicyUrl;
      if (data.privacyPolicyDescription !== undefined) existing.legal.privacyPolicyDescription = data.privacyPolicyDescription;
    }

    if (data.permissions && Array.isArray(data.permissions)) {
      // Deduplicate permissions array by type
      data.permissions = Array.from(
        new Map(data.permissions.map((p: any) => [p.type, p])).values(),
      );
    }

    const isLive =
      existing.lifecycleStatus === 'ACTIVE' ||
      (existing as any).status === 'ACTIVE' ||
      (existing as any).status === 'TESTING';

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
          `logos/${targetId}/logo.png`,
        );
      } catch (err: any) {
        this.logger.error(`Failed to store logo in MinIO: ${err.message}`);
      }
    }

    if (isLive) {
      const hasSecurityImpact = VersionDiffHelper.hasSecurityChanges(
        existing,
        data,
      );

      if (!hasSecurityImpact) {
        // SMART FAST-TRACK: Only General Metadata / Contact / Legal info modified
        const d = data as any;
        if (d.name !== undefined) existing.name = d.name;
        if (d.slug !== undefined) existing.slug = d.slug;
        if (d.tagline !== undefined || d.shortDescription !== undefined) {
          existing.tagline = d.tagline ?? d.shortDescription;
        }
        if (d.description !== undefined || d.fullDescription !== undefined) {
          existing.description = d.description ?? d.fullDescription;
        }
        if (d.logo !== undefined) existing.logo = d.logo;
        if (d.alertTelegramChatId !== undefined || d.teamTelegramChatId !== undefined) {
          existing.alertTelegramChatId = d.alertTelegramChatId ?? d.teamTelegramChatId;
        }
        if (d.supportEmail !== undefined) existing.supportEmail = d.supportEmail;

        if (
          d.termsUrl !== undefined ||
          d.termsDescription !== undefined ||
          d.privacyPolicyUrl !== undefined ||
          d.privacyPolicyDescription !== undefined
        ) {
          const legalRepo = this.miniappRepository.manager.getRepository(MiniAppLegal);
          let legal = existing.legal || (await legalRepo.findOne({ where: { miniAppId: existing.id } }));
          if (!legal) {
            legal = legalRepo.create({ miniAppId: existing.id });
          }
          if (d.termsUrl !== undefined) legal.termsUrl = d.termsUrl;
          if (d.termsDescription !== undefined) legal.termsDescription = d.termsDescription;
          if (d.privacyPolicyUrl !== undefined) legal.privacyPolicyUrl = d.privacyPolicyUrl;
          if (d.privacyPolicyDescription !== undefined) legal.privacyPolicyDescription = d.privacyPolicyDescription;
          existing.legal = await legalRepo.save(legal);
        }

        // Keep pendingRevision branding in sync if one already exists
        if (existing.pendingRevision) {
          existing.pendingRevision = {
            ...existing.pendingRevision,
            name: existing.name,
            tagline: existing.tagline,
            shortDescription: existing.tagline,
            description: existing.description,
            fullDescription: existing.description,
            logo: existing.logo,
            termsUrl: existing.legal?.termsUrl || d.termsUrl,
            termsDescription: existing.legal?.termsDescription || d.termsDescription,
            privacyPolicyUrl: existing.legal?.privacyPolicyUrl || d.privacyPolicyUrl,
            privacyPolicyDescription: existing.legal?.privacyPolicyDescription || d.privacyPolicyDescription,
            supportEmail: existing.supportEmail,
            alertTelegramChatId: existing.alertTelegramChatId,
            teamTelegramChatId: existing.alertTelegramChatId,
          };
        }

        await this.miniappRepository.save(existing);
        const updated = await this.miniappRepository.findOne({
          where: { id: existing.id },
          relations: { issues: true, collaborators: true, legal: true },
        });
        if (logActivityFn) {
          await logActivityFn(
            existing.id,
            actorId || 'system',
            'UPDATE',
            `General Information Updated for ${existing.name}`,
            'Metadata updated directly (fast-tracked without SA review or security scan)',
            'UPDATE_MINI_APP_METADATA',
            existing,
            updated,
          );
        }
        return updated || existing;
      }

      // SECURITY GATEWAY: Changes include Permissions, URLs, Allowed Domains, or Packages
      const d = data as any;
      if (d.alertTelegramChatId !== undefined || d.teamTelegramChatId !== undefined) {
        existing.alertTelegramChatId = d.alertTelegramChatId ?? d.teamTelegramChatId;
      }
      const existingRev = (existing.pendingRevision || {}) as any;
      const revisionData = {
        ...existingRev,
        name: d.name ?? existingRev.name ?? existing.name,
        tagline:
          d.tagline ??
          d.shortDescription ??
          existingRev.tagline ??
          existingRev.shortDescription ??
          existing.tagline,
        shortDescription:
          d.shortDescription ??
          d.tagline ??
          existingRev.shortDescription ??
          existingRev.tagline ??
          existing.tagline,
        description:
          d.description ??
          d.fullDescription ??
          existingRev.description ??
          existingRev.fullDescription ??
          existing.description,
        fullDescription:
          d.fullDescription ??
          d.description ??
          existingRev.fullDescription ??
          existingRev.description ??
          existing.description,
        logo: d.logo ?? existingRev.logo ?? existing.logo,
        termsUrl: d.termsUrl ?? existingRev.termsUrl ?? existing.legal?.termsUrl,
        termsDescription:
          d.termsDescription ??
          existingRev.termsDescription ??
          existing.legal?.termsDescription,
        privacyPolicyUrl:
          d.privacyPolicyUrl ??
          existingRev.privacyPolicyUrl ??
          existing.legal?.privacyPolicyUrl,
        privacyPolicyDescription:
          d.privacyPolicyDescription ??
          existingRev.privacyPolicyDescription ??
          existing.legal?.privacyPolicyDescription,
        ownerName:
          (data as any).ownerName ?? existingRev.ownerName ?? (existing as any).ownerName,
        ownerEmail:
          (data as any).ownerEmail ?? existingRev.ownerEmail ?? (existing as any).ownerEmail,
        supportEmail:
          data.supportEmail ??
          existingRev.supportEmail ??
          existing.supportEmail,
        teamName: (data as any).teamName ?? existingRev.teamName ?? (existing as any).teamName,
        teamTelegramChatId:
          (data as any).teamTelegramChatId ??
          data.alertTelegramChatId ??
          existingRev.teamTelegramChatId ??
          existing.alertTelegramChatId,
        alertTelegramChatId:
          data.alertTelegramChatId ??
          (data as any).teamTelegramChatId ??
          existingRev.alertTelegramChatId ??
          existing.alertTelegramChatId,
        integrationMethod:
          data.integrationMethod ??
          existingRev.integrationMethod ??
          existing.integrationMethod,
        integrationConfig:
          data.integrationMethod === 'FLUTTER_PACKAGE' ||
            existing.integrationMethod === 'FLUTTER_PACKAGE'
            ? secureFlutterIntegrationConfig(
              data.integrationConfig,
              existingRev.integrationConfig ?? existing.integrationConfig,
            )
            : (data.integrationConfig ??
              existingRev.integrationConfig ??
              existing.integrationConfig),
        permissions:
          (data as any).permissions ?? data.capabilities ?? existingRev.permissions ?? (existing as any).permissions,
        capabilities:
          data.capabilities ?? (data as any).permissions ?? existingRev.capabilities ?? existing.capabilities,
        securityChecks:
          data.securityChecks ??
          existingRev.securityChecks ??
          existing.securityChecks,
        isDomainVerified:
          data.isDomainVerified ??
          existingRev.isDomainVerified ??
          existing.isDomainVerified,
        domainVerifiedAt:
          data.domainVerifiedAt ??
          existingRev.domainVerifiedAt ??
          existing.domainVerifiedAt,
        verificationToken:
          data.verificationToken ??
          existingRev.verificationToken ??
          existing.verificationToken,
        changelog:
          (data as any).changelog ||
          existingRev.changelog ||
          'Feature updates and improvements',
        justification:
          (data as any).justification ||
          existingRev.justification ||
          'Platform capability request',
        revisionStatus: 'IN_REVIEW',
        validationStatus: 'RUNNING',
        submittedAt: existingRev.submittedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      existing.pendingRevision = revisionData;
      await this.miniappRepository.save(existing);

      // Kick off async validation on the staged revision
      this.validationHelper
        .validateMiniAppAsync(existing, logActivityFn)
        .catch((err) => {
          this.logger.error(
            `Error in async validation for app revision ${existing.id}:`,
            err,
          );
        });

      const updated = await this.miniappRepository.findOne({
        where: { id: existing.id },
        relations: { issues: true, collaborators: true },
      });

      if (logActivityFn) {
        await logActivityFn(
          existing.id,
          actorId || 'system',
          'UPDATE_REVISION',
          `Revision Staged for ${existing.name}`,
          'Draft revision updated with security/build changes and submitted for Super Admin review',
          'UPDATE_MINI_APP_REVISION',
          existing,
          updated,
        );
      }

      await this.notificationsService.createNotification(
        existing.ownerId || '',
        'Revision Submitted for Review',
        `Staged revision for "${existing.name}" has been submitted for automated security scanning and Super Admin approval.`,
        'REVISION_SUBMITTED',
        existing.id,
        {
          id: existing.id,
          name: existing.name,
          appId: existing.appId,
          changelog: revisionData.changelog,
          justification: revisionData.justification,
        },
      );

      return updated || existing;
    }

    data.lifecycleStatus = 'SUBMITTED';

    const merged = this.miniappRepository.merge(existing, data);
    if ((data as any).capabilities || (data as any).permissions) {
      merged.capabilities = (data as any).capabilities || (data as any).permissions;
    }
    if (data.alertTelegramChatId !== undefined || (data as any).teamTelegramChatId !== undefined) {
      merged.alertTelegramChatId = data.alertTelegramChatId || (data as any).teamTelegramChatId;
    }
    if ((data as any).organization || (data as any).category) {
      const orgInfo = await resolveOrganizationDetails((data as any).organization || (data as any).category);
      if (orgInfo?.id) merged.organizationId = orgInfo.id;
    }

    // Reset domain verification status if productionUrl changes
    const oldProdUrl = existing.integrationConfig?.productionUrl;
    const newProdUrl = data.integrationConfig?.productionUrl;
    if (newProdUrl && oldProdUrl && newProdUrl.trim() !== oldProdUrl.trim()) {
      merged.isDomainVerified = false;
      merged.domainVerifiedAt = null as any;
    }

    if (
      merged.integrationMethod === 'FLUTTER_PACKAGE' &&
      merged.integrationConfig
    ) {
      merged.integrationConfig = secureFlutterIntegrationConfig(
        merged.integrationConfig,
        existing.integrationConfig,
      );
      if (
        !merged.integrationConfig.packageName &&
        merged.integrationConfig.gitUrl
      ) {
        merged.integrationConfig.packageName = inferPackageNameFromGitUrl(
          merged.integrationConfig.gitUrl,
          merged.integrationConfig.gitPath || merged.integrationConfig.path,
        );
      }
    }

    const effectiveVer =
      data.integrationConfig?.gitTag ||
      data.integrationConfig?.ref ||
      data.integrationConfig?.versionConstraint?.replace(/^[\^~>=<]+/, '') ||
      (data as any).version ||
      data.currentReleaseVersion;
    if (effectiveVer) {
      merged.currentReleaseVersion = effectiveVer;
    }

    const currentHistory = Array.isArray((merged as any).versionHistory)
      ? [...(merged as any).versionHistory]
      : [];
    const verToAdd = effectiveVer || merged.currentReleaseVersion || '1.0.0';
    const existingVerIdx = currentHistory.findIndex((h: any) => h.version === verToAdd);
    const newRecord = {
      version: verToAdd,
      gitRef:
        merged.integrationConfig?.gitTag ||
        merged.integrationConfig?.ref ||
        merged.integrationConfig?.gitBranch ||
        verToAdd,
      packageName:
        merged.integrationConfig?.packageName ||
        merged.appId ||
        merged.name,
      type: (merged.lifecycleStatus === 'ACTIVE' ? 'PRODUCTION' : 'TEST') as 'PRODUCTION' | 'TEST' | 'DRAFT',
      status: (merged.lifecycleStatus === 'ACTIVE' ? 'ACTIVE' : 'IN_REVIEW') as any,
      changelog: (data as any).changelog || `Version update to ${verToAdd}`,
      releasedAt: new Date().toISOString(),
      releasedBy: actorId || merged.owner?.name || (merged as any).ownerName || 'MiniApp Developer',
      checksum:
        merged.integrationConfig?.archiveChecksum ||
        'sha256:' +
        crypto
          .createHash('sha256')
          .update(merged.id + verToAdd + Date.now())
          .digest('hex')
          .substring(0, 16),
    };

    if (existingVerIdx >= 0) {
      currentHistory[existingVerIdx] = {
        ...currentHistory[existingVerIdx],
        ...newRecord,
      };
    } else {
      currentHistory.unshift(newRecord);
    }
    (merged as any).versionHistory = currentHistory;

    await this.miniappRepository.save(merged);

    // Kick off async validation only when NOT in draft mode
    const isDraft =
      merged.lifecycleStatus === 'DRAFT' ||
      (merged as any).status === 'DRAFT';

    if (!isDraft) {
      this.validationHelper
        .validateMiniAppAsync(merged, logActivityFn)
        .catch((err) => {
          this.logger.error(
            `Error in async validation for app ${existing.id}:`,
            err,
          );
        });
    }

    const updated = await this.miniappRepository.findOne({
      where: { id: existing.id },
      relations: { issues: true, collaborators: true },
    });

    if (logActivityFn) {
      await logActivityFn(
        existing.id,
        actorId || 'system',
        'UPDATE',
        `App updated`,
        'Draft changes saved',
        'UPDATE_MINI_APP',
        existing,
        updated,
      );
    }

    return updated || merged;
  }

  async inspectPackageArtifact(file: Express.Multer.File) {
    const res = this.storageService.inspectPackageArchive(file);
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

  async uploadPackageArtifact(
    file: Express.Multer.File,
    miniAppId?: string,
    version?: string,
  ) {
    if (miniAppId && miniAppId !== 'draft') {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(miniAppId);
        const app = await this.miniappRepository.findOne(isUuid ? { where: { id: miniAppId } } : { where: { appId: miniAppId } });
        if (app?.integrationConfig?.packageStoragePath) {
          const oldPath = app.integrationConfig.packageStoragePath;
          const cleanOrigName = (file.originalname || 'package.zip').replace(/[^a-zA-Z0-9.-]/g, '_');
          const expectedNewKey = `pending/${miniAppId}/${version || '1.0.0'}/${cleanOrigName}`;
          if (oldPath !== expectedNewKey) {
            await this.storageService.deleteObject(this.storageService.packageSubmissionsBucket, oldPath);
          }
        }
      } catch (e: any) {
        this.logger.warn(`Could not check/clean prior package artifact: ${e.message}`);
      }
    }

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

  async remove(
    id: string,
    actorId?: string,
    logActivityFn?: (
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
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const existing = await this.miniappRepository.findOne(
      isUuid ? { where: { id } } : { where: { appId: id } },
    );
    if (existing) {
      // 1. Delete staged Flutter package archive from MinIO quarantine if present
      if (existing.integrationConfig?.packageStoragePath) {
        await this.storageService.deleteObject(
          this.storageService.packageSubmissionsBucket,
          existing.integrationConfig.packageStoragePath,
        );
      }

      // 2. Delete staged Native SDK archives from MinIO quarantine if present
      if (existing.integrationConfig?.iosMinioKey) {
        await this.storageService.deleteObject(
          this.storageService.sdkSubmissionsBucket,
          existing.integrationConfig.iosMinioKey,
        );
      }
      if (existing.integrationConfig?.androidMinioKey) {
        await this.storageService.deleteObject(
          this.storageService.sdkSubmissionsBucket,
          existing.integrationConfig.androidMinioKey,
        );
      }

      // 3. Delete logo from MinIO assets if present
      if (existing.logo) {
        await this.storageService.deleteLogo(existing.logo);
      }

      if (logActivityFn) {
        await logActivityFn(
          existing.id,
          actorId || 'system',
          'DELETE',
          `App ${existing.name || existing.appId} Deleted`,
          'App removed and MinIO objects purged',
          'DELETE_MINI_APP',
          existing,
          null,
        );
      }
      return this.miniappRepository.delete(existing.id);
    }
    return this.miniappRepository.delete(id);
  }
}
