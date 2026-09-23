import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { MiniApp } from '../entities/miniapp.entity';
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
  ) {}

  async create(
    data: Partial<MiniApp>,
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
    data.status = 'PROCESSING';
    data.currentReleaseVersion = undefined;
    data.pendingRevision = null;

    // Resolve & normalize organization name and short code (e.g. FTC, IRC, etc.)
    const orgInfo = resolveOrganizationDetails(data.organization || data.category);
    data.organization = orgInfo.name;
    data.organizationCode = orgInfo.code;
    data.category = orgInfo.name;

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
          releasedBy: actorId || data.ownerName || 'Mini App Developer',
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

    // 1. Dispatch Notification (WebSocket + Telegram to MA Manager, MA Team Group, & SA Admins)
    const targetUserId = savedApp.ownerId || actorId || '';
    if (targetUserId) {
      await this.notificationsService.createNotification(
        targetUserId,
        'Mini App Registered',
        `Mini App "${savedApp.name || savedApp.appId}" has been registered successfully by ${savedApp.ownerName || 'Operator'} and queued for security validation.`,
        'MINIAPP_REGISTERED',
        savedApp.id,
        {
          integrationMethod: savedApp.integrationMethod,
          category: savedApp.category,
          teamName: savedApp.teamName,
          teamTelegramChatId: savedApp.teamTelegramChatId,
        },
      );
    }

    // Kick off async validation
    this.validationHelper
      .validateMiniAppAsync(savedApp, logActivityFn)
      .catch((err) => {
        this.logger.error(
          `Error in async validation for app ${savedApp.id}:`,
          err,
        );
      });

    if (savedApp.ownerEmail) {
      await this.mailService.sendRegistrationSuccessEmail(
        savedApp.ownerEmail,
        savedApp.name || savedApp.appId,
      );
    }

    if (logActivityFn) {
      await logActivityFn(
        savedApp.id,
        actorId || 'system',
        'CREATE',
        `App ${savedApp.name} Created`,
        'Initial draft creation',
        'CREATE_MINI_APP',
        null,
        savedApp,
      );
    }

    return savedApp;
  }

  async update(
    existing: MiniApp,
    data: Partial<MiniApp>,
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

    if (data.permissions && Array.isArray(data.permissions)) {
      // Deduplicate permissions array by type
      data.permissions = Array.from(
        new Map(data.permissions.map((p: any) => [p.type, p])).values(),
      );
    }

    const isLive =
      existing.status === 'ACTIVE' || existing.status === 'TESTING';

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
      const hasSecurityImpact = VersionDiffHelper.hasSecurityChanges(
        existing,
        data,
      );

      if (!hasSecurityImpact) {
        // SMART FAST-TRACK: Only General Metadata / Contact / Legal info modified
        if (data.name !== undefined) existing.name = data.name;
        if (data.shortDescription !== undefined)
          existing.shortDescription = data.shortDescription;
        if (data.fullDescription !== undefined)
          existing.fullDescription = data.fullDescription;
        if (data.logo !== undefined) existing.logo = data.logo;
        if (data.category !== undefined) existing.category = data.category;
        if (data.termsUrl !== undefined) existing.termsUrl = data.termsUrl;
        if (data.termsDescription !== undefined)
          existing.termsDescription = data.termsDescription;
        if (data.privacyPolicyUrl !== undefined)
          existing.privacyPolicyUrl = data.privacyPolicyUrl;
        if (data.privacyPolicyDescription !== undefined)
          existing.privacyPolicyDescription = data.privacyPolicyDescription;
        if (data.ownerName !== undefined) existing.ownerName = data.ownerName;
        if (data.ownerEmail !== undefined)
          existing.ownerEmail = data.ownerEmail;
        if (data.supportEmail !== undefined)
          existing.supportEmail = data.supportEmail;
        if (data.teamName !== undefined) existing.teamName = data.teamName;
        if (data.teamTelegramChatId !== undefined)
          existing.teamTelegramChatId = data.teamTelegramChatId;

        // Keep pendingRevision branding in sync if one already exists
        if (existing.pendingRevision) {
          existing.pendingRevision = {
            ...existing.pendingRevision,
            name: existing.name,
            shortDescription: existing.shortDescription,
            fullDescription: existing.fullDescription,
            logo: existing.logo,
            category: existing.category,
            termsUrl: existing.termsUrl,
            termsDescription: existing.termsDescription,
            privacyPolicyUrl: existing.privacyPolicyUrl,
            privacyPolicyDescription: existing.privacyPolicyDescription,
            supportEmail: existing.supportEmail,
            teamName: existing.teamName,
            teamTelegramChatId: existing.teamTelegramChatId,
          };
        }

        await this.miniappRepository.save(existing);
        const updated = await this.miniappRepository.findOne({
          where: { id: existing.id },
          relations: { issues: true, activities: true },
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
      if (data.teamTelegramChatId !== undefined) {
        existing.teamTelegramChatId = data.teamTelegramChatId;
      }
      const existingRev = existing.pendingRevision || {};
      const revisionData = {
        ...existingRev,
        name: data.name ?? existingRev.name ?? existing.name,
        shortDescription:
          data.shortDescription ??
          existingRev.shortDescription ??
          existing.shortDescription,
        fullDescription:
          data.fullDescription ??
          existingRev.fullDescription ??
          existing.fullDescription,
        logo: data.logo ?? existingRev.logo ?? existing.logo,
        category: data.category ?? existingRev.category ?? existing.category,
        termsUrl: data.termsUrl ?? existingRev.termsUrl ?? existing.termsUrl,
        termsDescription:
          data.termsDescription ??
          existingRev.termsDescription ??
          existing.termsDescription,
        privacyPolicyUrl:
          data.privacyPolicyUrl ??
          existingRev.privacyPolicyUrl ??
          existing.privacyPolicyUrl,
        privacyPolicyDescription:
          data.privacyPolicyDescription ??
          existingRev.privacyPolicyDescription ??
          existing.privacyPolicyDescription,
        ownerName:
          data.ownerName ?? existingRev.ownerName ?? existing.ownerName,
        ownerEmail:
          data.ownerEmail ?? existingRev.ownerEmail ?? existing.ownerEmail,
        supportEmail:
          data.supportEmail ??
          existingRev.supportEmail ??
          existing.supportEmail,
        teamName: data.teamName ?? existingRev.teamName ?? existing.teamName,
        teamTelegramChatId:
          data.teamTelegramChatId ??
          existingRev.teamTelegramChatId ??
          existing.teamTelegramChatId,
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
          data.permissions ?? existingRev.permissions ?? existing.permissions,
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
        relations: { issues: true, activities: true },
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

    data.status = 'PROCESSING';

    const merged = this.miniappRepository.merge(existing, data);
    if (data.permissions) {
      merged.permissions = data.permissions;
    }
    if (data.teamTelegramChatId !== undefined) {
      merged.teamTelegramChatId = data.teamTelegramChatId;
    }
    if (data.organization || data.category) {
      const orgInfo = resolveOrganizationDetails(data.organization || data.category);
      merged.organization = orgInfo.name;
      merged.organizationCode = orgInfo.code;
      merged.category = orgInfo.name;
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
      data.version;
    if (effectiveVer) {
      merged.version = effectiveVer;
      merged.currentReleaseVersion = effectiveVer;
    }

    const currentHistory = Array.isArray(merged.versionHistory)
      ? [...merged.versionHistory]
      : [];
    const verToAdd = effectiveVer || merged.version || '1.0.0';
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
      type: (merged.status === 'ACTIVE' ? 'PRODUCTION' : 'TEST') as 'PRODUCTION' | 'TEST' | 'DRAFT',
      status: (merged.status === 'ACTIVE' ? 'ACTIVE' : 'IN_REVIEW') as any,
      changelog: (data as any).changelog || `Version update to ${verToAdd}`,
      releasedAt: new Date().toISOString(),
      releasedBy: actorId || merged.ownerName || 'Mini App Developer',
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
    merged.versionHistory = currentHistory;

    await this.miniappRepository.save(merged);

    // Kick off async validation
    this.validationHelper
      .validateMiniAppAsync(merged, logActivityFn)
      .catch((err) => {
        this.logger.error(
          `Error in async validation for app ${existing.id}:`,
          err,
        );
      });

    const updated = await this.miniappRepository.findOne({
      where: { id: existing.id },
      relations: { issues: true, activities: true },
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
