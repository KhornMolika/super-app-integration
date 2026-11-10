import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import {
  MiniApp,
  MiniAppStatus,
  MiniAppLifecycleStatus,
  MiniAppAvailabilityStatus,
  isMiniAppLive,
} from '../entities/miniapp.entity';
import { MiniAppLegal } from '../entities/miniapp-legal.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { StaffProfile } from '../../staff/entities/staff-profile.entity';
import { StorageService } from '../../storage/storage.service';
import { DomainAssociationHelper } from './domain-association.helper';
import { NotificationsService, MailService } from '../../notifications';
import { MiniappValidationHelper } from './miniapp-validation.helper';
import { PermissionDetectorHelper } from './permission-detector.helper';
import { VersionDiffHelper } from './version-diff.helper';
import { inferPackageNameFromGitUrl } from '../../integrations/git/git-integration.service';
import { resolveOrganizationDetails } from '../../organizations/helpers/organization-resolver.helper';
import { OrganizationsService } from '../../organizations/organizations.service';
import { NexusIntegrationService } from '../../integrations/nexus/nexus-integration.service';
import {
  DEFAULT_IOS_VERSION,
  DEFAULT_MAVEN_GROUP_ID,
} from '../../sdk-artifacts/sdk-artifact-upload.service';

/** Where one mini app's published files live in Nexus. */
export function nexusTargetsFor(app: MiniApp): {
  pubPackage?: string;
  maven?: { groupId: string; artifactId: string };
  ios?: { module: string; version: string };
} {
  const cfg = app.integrationConfig || {};
  const method = String(app.integrationMethod || '').toUpperCase();
  if (method === 'FLUTTER_PACKAGE') {
    // Only uploaded archives are published to pub-hosted; Git sources are not
    const source = String(cfg.sourceType || 'ARTIFACT').toUpperCase();
    const fromGit = source.includes('GIT') || source.includes('SOURCE') || Boolean(cfg.repoUrl || cfg.gitUrl);
    return !fromGit && cfg.packageName ? { pubPackage: String(cfg.packageName) } : {};
  }
  if (method === 'NATIVE_SDK') {
    return {
      maven: {
        groupId: cfg.androidMavenGroupId || DEFAULT_MAVEN_GROUP_ID,
        artifactId: cfg.androidMavenArtifactId || app.appId,
      },
      ios: {
        module: cfg.iosModuleName || app.appId,
        version: cfg.iosVersion || DEFAULT_IOS_VERSION,
      },
    };
  }
  return {};
}
import { secureFlutterIntegrationConfig } from './flutter-credential.helper';
import {
  HOME_WIDGET_FIELD,
  normalizeHomeWidget,
  sameHomeWidget,
} from '../home-widget';

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
    @Optional()
    @InjectRepository(Organization)
    private organizationRepository?: Repository<Organization> | any,
    @Optional()
    private organizationsService?: OrganizationsService,
    @Optional()
    private nexusService?: NexusIntegrationService,
  ) {}

  /**
   * Removes this app's files from Nexus, keeping any package or SDK
   * coordinate that another mini app still uses.
   */
  private async cleanUpNexus(app: MiniApp) {
    const result = { removed: [] as string[], failed: [] as string[], kept: [] as string[] };
    const targets = nexusTargetsFor(app);
    if (!this.nexusService || (!targets.pubPackage && !targets.maven && !targets.ios)) {
      return result;
    }

    const others = (await this.miniappRepository.find()).filter((o) => o.id !== app.id);
    const usedBy = (pick: (t: ReturnType<typeof nexusTargetsFor>) => string | undefined, value?: string) =>
      value ? others.find((o) => pick(nexusTargetsFor(o)) === value)?.appId : undefined;

    const pubKey = targets.pubPackage?.trim().replace(/-/g, '_').toLowerCase();
    const mavenKey = targets.maven ? `${targets.maven.groupId}:${targets.maven.artifactId}` : undefined;
    const iosKey = targets.ios ? `${targets.ios.module}@${targets.ios.version}` : undefined;

    const pubOwner = usedBy((t) => t.pubPackage?.trim().replace(/-/g, '_').toLowerCase(), pubKey);
    const mavenOwner = usedBy((t) => (t.maven ? `${t.maven.groupId}:${t.maven.artifactId}` : undefined), mavenKey);
    const iosOwner = usedBy((t) => (t.ios ? `${t.ios.module}@${t.ios.version}` : undefined), iosKey);
    if (pubOwner) { result.kept.push(`${pubKey}: still used by ${pubOwner}`); delete targets.pubPackage; }
    if (mavenOwner) { result.kept.push(`${mavenKey}: still used by ${mavenOwner}`); delete targets.maven; }
    if (iosOwner) { result.kept.push(`${iosKey}: still used by ${iosOwner}`); delete targets.ios; }

    try {
      const res = await this.nexusService.deleteMiniAppArtifacts(targets);
      result.removed.push(...res.removed);
      result.failed.push(...res.failed);
    } catch (err) {
      result.failed.push(`Nexus: ${(err as Error).message}`);
    }
    return result;
  }

  private async resolveOrganization(input?: string): Promise<{ name: string; code: string; id?: string }> {
    const clean = input?.trim();
    if (clean && this.organizationRepository?.findOne) {
      const org = await this.organizationRepository.findOne({
        where: [{ name: clean }, { code: clean }],
      });
      if (org?.code) return { name: org.name, code: org.code, id: org.id };
    }
    if (this.organizationsService?.resolveOrganization) {
      const resolved = await this.organizationsService.resolveOrganization(input);
      if (resolved && resolved.code) {
        return resolved;
      }
    }
    return resolveOrganizationDetails(input, this.organizationRepository);
  }

  private async serviceCategory(category: string | null | undefined): Promise<string | null> {
    const clean = category?.trim();
    if (!clean) return null;
    if (this.organizationRepository?.findOne) {
      const org = await this.organizationRepository.findOne({
        where: [{ name: clean }, { code: clean }],
      });
      if (org) return null;
    }
    const parenMatch = clean.match(/\(([A-Za-z0-9_-]+)\)$/);
    if (parenMatch) return null;
    if (clean.toLowerCase().includes('regulator')) return null;
    return clean;
  }

  private assertWidgetSurvivesMethodSwitch(
    existing: MiniApp,
    data: Partial<MiniApp>,
  ): void {
    const newMethod = data.integrationMethod;
    const previousMethod =
      existing.pendingRevision?.integrationMethod ?? existing.integrationMethod;
    if (
      !newMethod ||
      newMethod === previousMethod ||
      data.homeWidget !== undefined ||
      !Object.hasOwn(HOME_WIDGET_FIELD, newMethod)
    ) {
      return;
    }
    const previousWidget =
      existing.pendingRevision?.homeWidget !== undefined
        ? existing.pendingRevision.homeWidget
        : existing.homeWidget;
    if (!previousWidget) return;
    const field = HOME_WIDGET_FIELD[newMethod as keyof typeof HOME_WIDGET_FIELD];
    if (!previousWidget[field]) {
      throw new BadRequestException(
        `Home widget: re-enter the widget field for ${newMethod}.`,
      );
    }
  }

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
    const homeWidget = normalizeHomeWidget(
      data.homeWidget,
      data.integrationMethod,
      data.integrationConfig,
    );
    if (homeWidget !== undefined) data.homeWidget = homeWidget;

    delete data.status;
    const orgInput = data.organization || data.category || undefined;
    if (data.category !== undefined) {
      data.category = await this.serviceCategory(data.category);
    }
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
    if (
      !data.legal &&
      (data.termsUrl ||
        data.termsDescription ||
        data.privacyPolicyUrl ||
        data.privacyPolicyDescription)
    ) {
      data.legal = {
        termsUrl: data.termsUrl,
        termsDescription: data.termsDescription,
        privacyPolicyUrl: data.privacyPolicyUrl,
        privacyPolicyDescription: data.privacyPolicyDescription,
      };
    }

    // Resolve & normalize organization name and short code (e.g. FTC, IRC, etc.)
    const orgInfo = await this.resolveOrganization(data.organization || data.category);
    data.organization = orgInfo.name;
    data.organizationCode = orgInfo.code;
    data.category = await this.serviceCategory(data.category);
    if (orgInfo.id && !data.organizationId) {
      data.organizationId = orgInfo.id;
    }
    // mini_apps.organizationId is NOT NULL: fall back to the creator's agency
    if (!data.organizationId && actorId && this.organizationRepository?.manager) {
      const profile = await this.organizationRepository.manager.findOne(StaffProfile, {
        where: { identityId: actorId },
      });
      if (profile?.organizationId) data.organizationId = profile.organizationId;
    }
    if (!data.organizationId) {
      throw new BadRequestException(
        'An owning organization is required. Select the regulatory authority that publishes this Mini App.',
      );
    }

    // Ensure slug is populated
    if (!data.slug && data.name) {
      data.slug = data.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
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
          data.logo,
          `miniapps/${targetId}/logos/logo.png`,
        );
      } catch (err: any) {
        this.logger.error(`Failed to store logo in MinIO: ${err.message}`);
      }
    }

    if (!data.capabilities) {
      data.capabilities = data.permissions || [];
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
        if (
          !data.integrationConfig.packageName &&
          data.integrationConfig.gitUrl
        ) {
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
            data.integrationConfig?.packageName || data.appId || data.name,
          type: 'PRODUCTION',
          status: 'IN_REVIEW',
          changelog:
            data.changelog || `Initial submission of version ${packageVer}`,
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

    const app = this.miniappRepository.create(data as Partial<MiniApp>);
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
      const orgName =
        savedApp.organizationRelation?.name ||
        (savedApp as any).organization ||
        'Independent Authority';
      const registrantName =
        savedApp.owner?.name ||
        (savedApp as any).ownerName ||
        'Platform Operator';

      if (isDraft) {
        await this.notificationsService.createNotification(
          targetUserId,
          'MiniApp Saved as Draft',
          `MiniApp "${savedApp.name || savedApp.appId}" has been saved as a draft by ${registrantName}.`,
          'MINIAPP_DRAFT_SAVED',
          savedApp.id,
          {
            integrationMethod: savedApp.integrationMethod,
            organization: orgName,
            registrantName,
            category: orgName,
            teamName: registrantName,
            teamTelegramChatId:
              savedApp.alertTelegramChatId ||
              (savedApp as any).teamTelegramChatId,
          },
        );
      } else {
        await this.notificationsService.createNotification(
          targetUserId,
          'MiniApp Registered',
          `MiniApp "${savedApp.name || savedApp.appId}" has been registered successfully by ${registrantName} and queued for security validation.`,
          'MINIAPP_REGISTERED',
          savedApp.id,
          {
            integrationMethod: savedApp.integrationMethod,
            organization: orgName,
            registrantName,
            category: orgName,
            teamName: registrantName,
            teamTelegramChatId:
              savedApp.alertTelegramChatId ||
              (savedApp as any).teamTelegramChatId,
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

      const ownerEmail =
        savedApp.supportEmail ||
        savedApp.owner?.email ||
        (savedApp as any).ownerEmail;
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
    const effectiveMethod = data.integrationMethod ?? existing.integrationMethod;
    const effectiveConfig =
      data.integrationConfig ??
      existing.pendingRevision?.integrationConfig ??
      existing.integrationConfig;
    const homeWidget = normalizeHomeWidget(
      data.homeWidget,
      effectiveMethod,
      effectiveConfig,
    );
    if (homeWidget !== undefined) data.homeWidget = homeWidget;
    this.assertWidgetSurvivesMethodSwitch(existing, data);

    delete data.status;
    const orgInput = data.organization || data.category || undefined;
    if (data.category !== undefined) {
      data.category = await this.serviceCategory(data.category);
    }

    if (data.shortDescription !== undefined) {
      data.tagline = data.shortDescription;
      existing.tagline = data.shortDescription;
    }
    if (data.fullDescription !== undefined) {
      data.description = data.fullDescription;
      existing.description = data.fullDescription;
    }
    if (
      data.teamTelegramChatId !== undefined &&
      data.alertTelegramChatId === undefined
    ) {
      data.alertTelegramChatId = data.teamTelegramChatId;
      existing.alertTelegramChatId = data.teamTelegramChatId;
    }
    if (data.iconUrl !== undefined && data.logo === undefined) {
      data.logo = data.iconUrl;
      existing.logo = data.iconUrl;
    }
    if (
      data.termsUrl !== undefined ||
      data.termsDescription !== undefined ||
      data.privacyPolicyUrl !== undefined ||
      data.privacyPolicyDescription !== undefined
    ) {
      if (!existing.legal) {
        existing.legal = new MiniAppLegal();
        existing.legal.miniApp = existing;
        existing.legal.miniAppId = existing.id;
      }
      if (data.termsUrl !== undefined) existing.legal.termsUrl = data.termsUrl;
      if (data.termsDescription !== undefined)
        existing.legal.termsDescription = data.termsDescription;
      if (data.privacyPolicyUrl !== undefined)
        existing.legal.privacyPolicyUrl = data.privacyPolicyUrl;
      if (data.privacyPolicyDescription !== undefined)
        existing.legal.privacyPolicyDescription = data.privacyPolicyDescription;
    }

    if (data.permissions && Array.isArray(data.permissions)) {
      // Deduplicate permissions array by type
      data.permissions = Array.from(
        new Map(data.permissions.map((p: any) => [p.type, p])).values(),
      );
    }

    if (existing.lifecycleStatus === 'ARCHIVED') {
      throw new BadRequestException(
        'This mini app is archived. A Super Admin must restore it before it can be edited.',
      );
    }

    // Live, testing or suspended (only those can be suspended): edits become a revision
    const isLive =
      isMiniAppLive(existing) ||
      (existing as any).status === 'ACTIVE' ||
      existing.availabilityStatus === MiniAppAvailabilityStatus.SUSPENDED ||
      existing.lifecycleStatus === 'TESTING' ||
      (existing as any).status === 'TESTING';

    // Unchanged input keeps its backend-set verification: the client never
    // sends `verifiedClass`, so the stored row (or open revision) wins.
    if (data.homeWidget) {
      const stored = [
        isLive ? existing.pendingRevision?.homeWidget : undefined,
        existing.homeWidget,
      ].find((w) => w && sameHomeWidget(data.homeWidget, w));
      if (stored) data.homeWidget = stored;
    }

    // Automatically upload base64 image data to MinIO object storage on submission
    const isBase64Logo =
      data.logo &&
      (data.logo.startsWith('data:') ||
        (data.logo.length > 500 && !data.logo.startsWith('http')));
    if (isBase64Logo) {
      try {
        const targetId = data.appId || existing.appId || existing.id;
        data.logo = await this.storageService.uploadBase64(
          data.logo,
          `miniapps/${targetId}/logos/logo.png`,
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
        const d = data;
        if (d.name !== undefined) existing.name = d.name;
        if (d.slug !== undefined) existing.slug = d.slug;
        if (d.tagline !== undefined || d.shortDescription !== undefined) {
          existing.tagline = d.tagline ?? d.shortDescription;
        }
        if (d.description !== undefined || d.fullDescription !== undefined) {
          existing.description = d.description ?? d.fullDescription;
        }
        if (d.logo !== undefined) existing.logo = d.logo;
        if (
          d.alertTelegramChatId !== undefined ||
          d.teamTelegramChatId !== undefined
        ) {
          existing.alertTelegramChatId =
            d.alertTelegramChatId ?? d.teamTelegramChatId;
        }
        if (d.supportEmail !== undefined)
          existing.supportEmail = d.supportEmail;
        if (d.homeWidget !== undefined) {
          existing.homeWidget = d.homeWidget;
        }

        if (
          d.termsUrl !== undefined ||
          d.termsDescription !== undefined ||
          d.privacyPolicyUrl !== undefined ||
          d.privacyPolicyDescription !== undefined
        ) {
          const legalRepo =
            this.miniappRepository.manager.getRepository(MiniAppLegal);
          let legal =
            existing.legal ||
            (await legalRepo.findOne({ where: { miniAppId: existing.id } }));
          if (!legal) {
            legal = legalRepo.create({ miniAppId: existing.id });
          }
          if (d.termsUrl !== undefined) legal.termsUrl = d.termsUrl;
          if (d.termsDescription !== undefined)
            legal.termsDescription = d.termsDescription;
          if (d.privacyPolicyUrl !== undefined)
            legal.privacyPolicyUrl = d.privacyPolicyUrl;
          if (d.privacyPolicyDescription !== undefined)
            legal.privacyPolicyDescription = d.privacyPolicyDescription;
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
            termsDescription:
              existing.legal?.termsDescription || d.termsDescription,
            privacyPolicyUrl:
              existing.legal?.privacyPolicyUrl || d.privacyPolicyUrl,
            privacyPolicyDescription:
              existing.legal?.privacyPolicyDescription ||
              d.privacyPolicyDescription,
            supportEmail: existing.supportEmail,
            alertTelegramChatId: existing.alertTelegramChatId,
            teamTelegramChatId: existing.alertTelegramChatId,
            ...(data.homeWidget !== undefined
              ? { homeWidget: data.homeWidget }
              : {}),
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
      const d = data;
      if (
        d.alertTelegramChatId !== undefined ||
        d.teamTelegramChatId !== undefined
      ) {
        existing.alertTelegramChatId =
          d.alertTelegramChatId ?? d.teamTelegramChatId;
      }
      const existingRev = existing.pendingRevision || {};
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
        termsUrl:
          d.termsUrl ?? existingRev.termsUrl ?? existing.legal?.termsUrl,
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
          data.ownerName ??
          existingRev.ownerName ??
          (existing as any).ownerName,
        ownerEmail:
          data.ownerEmail ??
          existingRev.ownerEmail ??
          (existing as any).ownerEmail,
        supportEmail:
          data.supportEmail ??
          existingRev.supportEmail ??
          existing.supportEmail,
        teamName:
          data.teamName ?? existingRev.teamName ?? (existing as any).teamName,
        teamTelegramChatId:
          data.teamTelegramChatId ??
          data.alertTelegramChatId ??
          existingRev.teamTelegramChatId ??
          existing.alertTelegramChatId,
        alertTelegramChatId:
          data.alertTelegramChatId ??
          data.teamTelegramChatId ??
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
          data.permissions ??
          data.capabilities ??
          existingRev.permissions ??
          (existing as any).permissions,
        capabilities:
          data.capabilities ??
          data.permissions ??
          existingRev.capabilities ??
          existing.capabilities,
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
        homeWidget:
          data.homeWidget !== undefined
            ? data.homeWidget
            : existingRev.homeWidget !== undefined
              ? existingRev.homeWidget
              : (existing.homeWidget ?? null),
        changelog:
          data.changelog ||
          existingRev.changelog ||
          'Feature updates and improvements',
        justification:
          data.justification ||
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
    if (data.capabilities || data.permissions) {
      merged.capabilities = data.capabilities || data.permissions;
    }
    if (
      data.alertTelegramChatId !== undefined ||
      data.teamTelegramChatId !== undefined
    ) {
      merged.alertTelegramChatId =
        data.alertTelegramChatId || data.teamTelegramChatId;
    }
    if (orgInput) {
      const orgInfo = await this.resolveOrganization(orgInput);
      (merged as any).organization = orgInfo.name;
      (merged as any).organizationCode = orgInfo.code;
      if (orgInfo?.id) merged.organizationId = orgInfo.id;
    }
    if (data.category !== undefined) {
      (merged as any).category = data.category;
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
      data.version ||
      data.currentReleaseVersion;
    if (effectiveVer) {
      merged.currentReleaseVersion = effectiveVer;
    }

    const currentHistory = Array.isArray((merged as any).versionHistory)
      ? [...(merged as any).versionHistory]
      : [];
    const verToAdd = effectiveVer || merged.currentReleaseVersion || '1.0.0';
    const existingVerIdx = currentHistory.findIndex(
      (h: any) => h.version === verToAdd,
    );
    const newRecord = {
      version: verToAdd,
      gitRef:
        merged.integrationConfig?.gitTag ||
        merged.integrationConfig?.ref ||
        merged.integrationConfig?.gitBranch ||
        verToAdd,
      packageName:
        merged.integrationConfig?.packageName || merged.appId || merged.name,
      type: (merged.lifecycleStatus === 'ACTIVE' ? 'PRODUCTION' : 'TEST') as
        'PRODUCTION' | 'TEST' | 'DRAFT',
      status: (merged.lifecycleStatus === 'ACTIVE'
        ? 'ACTIVE'
        : 'IN_REVIEW') as any,
      changelog: data.changelog || `Version update to ${verToAdd}`,
      releasedAt: new Date().toISOString(),
      releasedBy:
        actorId ||
        merged.owner?.name ||
        (merged as any).ownerName ||
        'MiniApp Developer',
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
      merged.lifecycleStatus === 'DRAFT' || (merged as any).status === 'DRAFT';

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
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            miniAppId,
          );
        const app = await this.miniappRepository.findOne(
          isUuid
            ? { where: { id: miniAppId } }
            : { where: { appId: miniAppId } },
        );
        if (app?.integrationConfig?.packageStoragePath) {
          const oldPath = app.integrationConfig.packageStoragePath;
          const cleanOrigName = (file.originalname || 'package.zip').replace(
            /[^a-zA-Z0-9.-]/g,
            '_',
          );
          const expectedNewKey = `pending/${miniAppId}/${version || '1.0.0'}/${cleanOrigName}`;
          if (oldPath !== expectedNewKey) {
            await this.storageService.deleteObject(
              this.storageService.packageSubmissionsBucket,
              oldPath,
            );
          }
        }
      } catch (e: any) {
        this.logger.warn(
          `Could not check/clean prior package artifact: ${e.message}`,
        );
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
    user?: any,
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
    confirm?: string,
  ) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      );
    const existing = await this.miniappRepository.findOne(
      isUuid ? { where: { id } } : { where: { appId: id } },
    );
    if (!existing) {
      return this.miniappRepository.delete(id);
    }

    // 1. Permission check: Only SuperAdmin or the user who registered this specific mini-app can delete it
    if (user || actorId) {
      const roles = Array.isArray(user?.roles)
        ? user.roles
        : (user?.role ? [user.role] : []);
      const isSuperAdmin = roles.includes('SUPER_ADMIN') || roles.includes('ADMIN');
      const isOwner =
        (actorId && (existing.ownerId === actorId || (existing.owner as any)?.id === actorId)) ||
        (user?.sub && (existing.ownerId === user.sub || (existing.owner as any)?.id === user.sub));

      if (!isSuperAdmin && !isOwner) {
        throw new ForbiddenException(
          'You do not have permission to delete this MiniApp. Only SuperAdmin or the user who registered this MiniApp can delete it.',
        );
      }
    }

    // 2. Status guard: DRAFT/REJECTED (owner or admin), or ARCHIVED (Super Admin,
    // typing the App ID to confirm). Anything else must be archived first.
    const status = String(existing.lifecycleStatus || 'DRAFT');
    if (status === MiniAppLifecycleStatus.ARCHIVED) {
      const roles: string[] = Array.isArray(user?.roles) ? user.roles : user?.role ? [user.role] : [];
      if (!roles.includes('SUPER_ADMIN')) {
        throw new ForbiddenException(
          'Only a Super Admin can permanently delete an archived mini app.',
        );
      }
      if (!confirm || confirm.trim() !== existing.appId) {
        throw new BadRequestException(
          `Type the App ID (${existing.appId}) to confirm the permanent delete.`,
        );
      }
    } else if (status !== 'DRAFT' && status !== 'REJECTED') {
      throw new BadRequestException(
        `A mini app in ${status} cannot be deleted. A Super Admin must archive it first, then delete it permanently.`,
      );
    }

    // 3. Delete staged Flutter package archive from MinIO quarantine if present
    if (existing.integrationConfig?.packageStoragePath) {
      await this.storageService.deleteObject(
        this.storageService.packageSubmissionsBucket,
        existing.integrationConfig.packageStoragePath,
      );
    }

    // 4. Delete staged Native SDK archives from MinIO quarantine if present
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

    // 5. Delete logo from MinIO assets if present
    if (existing.logo) {
      await this.storageService.deleteLogo(existing.logo);
    }

    // 6. Remove what it published to Nexus (never the shared Super App APKs)
    const nexus = await this.cleanUpNexus(existing);

    if (logActivityFn) {
      const nexusNote = [
        nexus.removed.length ? `Nexus removed: ${nexus.removed.join(', ')}` : '',
        nexus.kept.length ? `Nexus kept: ${nexus.kept.join(', ')}` : '',
        nexus.failed.length ? `Nexus failed: ${nexus.failed.join(', ')}` : '',
      ].filter(Boolean).join('. ');
      await logActivityFn(
        existing.id,
        actorId || user?.sub || 'system',
        'DELETE',
        `App ${existing.name || existing.appId} Deleted`,
        `App removed and MinIO objects purged${nexusNote ? `. ${nexusNote}` : ''}`,
        'DELETE_MINI_APP',
        existing,
        null,
      );
    }
    await this.miniappRepository.delete(existing.id);
    return { success: true, appId: existing.appId, nexus };
  }
}
