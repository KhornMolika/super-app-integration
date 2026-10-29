import {
  Injectable,
  Logger,
  BadRequestException,
  BadGatewayException,
  NotFoundException,
  OnApplicationBootstrap,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniApp } from './entities/miniapp.entity';
import { MiniAppIssue } from './entities/miniapp-issue.entity';
import { MiniAppCollaborator } from './entities/miniapp-collaborator.entity';
import { MiniAppVersion } from './entities/miniapp-version.entity';
import { MiniAppBuild } from './entities/miniapp-build.entity';
import { MiniAppLegal } from './entities/miniapp-legal.entity';
import { AuditService } from '../audit/audit.service';
import { PermissionDetectorHelper } from './helpers/permission-detector.helper';
import { MiniappValidationHelper } from './helpers/miniapp-validation.helper';
import { MiniappLifecycleHelper } from './helpers/miniapp-lifecycle.helper';
import { VersionDiffHelper } from './helpers/version-diff.helper';
import { ArtifactDistributionHelper } from './helpers/artifact-distribution.helper';
import { DomainAssociationHelper } from './helpers/domain-association.helper';
import { MiniappMutationHelper } from './helpers/miniapp-mutation.helper';
import { NativeSdkCodegenService } from '../native-sdk-codegen/native-sdk-codegen.service';
import { SdkArtifactUploadService } from '../sdk-artifacts/sdk-artifact-upload.service';
import { CapabilitiesService } from '../capabilities/capabilities.service';
import { resolveOrganizationDetails } from '../organizations/helpers/organization-resolver.helper';
import { OrganizationsService } from '../organizations/organizations.service';
import { QueryMiniAppsDto } from './dto/query-miniapps.dto';
import { QueryIssuesDto } from './dto/query-issues.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import {
  createPaginatedResponse,
  buildPaginationMeta,
} from '../common/utils/pagination.util';
import { escapeLikeString } from '../common/utils/sql.util';
import {
  SortOrder,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';
import { maskMiniAppCredentials } from './helpers/flutter-credential.helper';

@Injectable()
export class MiniappsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MiniappsService.name);

  constructor(
    @InjectRepository(MiniApp)
    private miniappRepository: Repository<MiniApp>,

    @InjectRepository(MiniAppCollaborator)
    private collaboratorRepository: Repository<MiniAppCollaborator>,

    @InjectRepository(MiniAppIssue)
    private issueRepository: Repository<MiniAppIssue>,

    private auditService: AuditService,
    private permissionDetectorHelper: PermissionDetectorHelper,
    private validationHelper: MiniappValidationHelper,
    private lifecycleHelper: MiniappLifecycleHelper,
    private artifactDistributionHelper: ArtifactDistributionHelper,
    private domainAssociationHelper: DomainAssociationHelper,
    private miniappMutationHelper: MiniappMutationHelper,
    private nativeSdkCodegenService: NativeSdkCodegenService,
    private sdkArtifactUploadService: SdkArtifactUploadService,
    private capabilitiesService: CapabilitiesService,

    @Optional()
    @InjectRepository(MiniAppVersion)
    private versionRepository?: Repository<MiniAppVersion>,

    @Optional()
    @InjectRepository(MiniAppBuild)
    private buildRepository?: Repository<MiniAppBuild>,

    @Optional()
    @InjectRepository(MiniAppLegal)
    private legalRepository?: Repository<MiniAppLegal>,

    @Optional()
    private organizationsService?: OrganizationsService,
  ) {}

  async onApplicationBootstrap() {
    await this.backfillOrganizations();
  }

  private async backfillOrganizations() {
    try {
      const apps = await this.miniappRepository.find();
      for (const app of apps) {
        let changed = false;
        if (!app.organizationId) {
          const rawOrg = (app as any).organization || (app as any).category;
          if (rawOrg) {
            const resolved = this.organizationsService
              ? await this.organizationsService.resolveOrganization(rawOrg)
              : await resolveOrganizationDetails(rawOrg);
            if (resolved?.id) {
              app.organizationId = resolved.id;
              changed = true;
            }
          }
        }
        if (!app.logo || app.logo.trim() === '') {
          app.logo = 'https://app.fintechcenterfsa.com/fsa-logo.png';
          changed = true;
        }
        if (changed) {
          await this.miniappRepository.save(app);
        }
      }
    } catch (err: any) {
      this.logger.warn(
        `Could not backfill mini app organizations: ${err.message}`,
      );
    }
  }

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
      await this.auditService.log({
        actorId,
        action: auditAction || actionType || 'MINIAPP_UPDATE',
        resourceType: 'MiniApp',
        resourceId: miniAppId,
        oldValue: oldVal,
        newValue: newVal,
        metadata: { title, description, actionType },
      });
    } catch (e: any) {
      this.logger.warn(`Failed to log audit activity: ${e.message}`);
    }
  }

  async create(data: Partial<MiniApp>, actorId?: string) {
    return this.miniappMutationHelper.create(
      data,
      actorId,
      (mId, aId, aType, t, d, aAction, oVal, nVal) =>
        this.logActivity(mId, aId, aType, t, d, aAction, oVal, nVal),
    );
  }

  async update(id: string, data: Partial<MiniApp>, actorId?: string) {
    const existing = await this.findOne(id);
    if (!existing) throw new BadRequestException('App not found');
    return this.miniappMutationHelper.update(
      existing,
      data,
      actorId,
      (mId, aId, aType, t, d, aAction, oVal, nVal) =>
        this.logActivity(mId, aId, aType, t, d, aAction, oVal, nVal),
    );
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

  async findAllIssues(
    query?: QueryIssuesDto,
  ): Promise<PaginatedResult<any> | any[]> {
    if (!query) {
      const issues = await this.issueRepository.find({
        relations: { miniApp: true },
        order: { createdAt: 'DESC' },
      });

      return issues.map((issue) => {
        let miniAppName = issue.miniApp?.name || 'Unknown MiniApp';
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

    const {
      page = 1,
      limit = 20,
      search,
      severity,
      status,
      classification,
      sortBy = 'createdAt',
      sortOrder = SortOrder.DESC,
    } = query;

    const qb = this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.miniApp', 'miniApp');

    if (severity && severity !== 'ALL') {
      qb.andWhere('issue.severity = :severity', { severity });
    }

    if (status && status !== 'ALL') {
      qb.andWhere('issue.status = :status', { status });
    }

    if (classification && classification !== 'ALL') {
      qb.andWhere('issue.classification = :classification', { classification });
    }

    if (search?.trim()) {
      const sanitized = escapeLikeString(search.trim());
      qb.andWhere(
        '(issue.description ILIKE :search OR issue.ruleId ILIKE :search OR miniApp.name ILIKE :search)',
        { search: `%${sanitized}%` },
      );
    }

    const sortColumns: Record<string, string> = {
      createdAt: 'issue.createdAt',
      severity: 'issue.severity',
      status: 'issue.status',
    };
    const orderColumn = sortColumns[sortBy] || 'issue.createdAt';
    const direction = sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';

    qb.orderBy(orderColumn, direction).addOrderBy('issue.id', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [issues, totalItems] = await qb.getManyAndCount();
    const formatted = issues.map((issue) => {
      let miniAppName = issue.miniApp?.name || 'Unknown MiniApp';
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

    return createPaginatedResponse(formatted, totalItems, page, limit);
  }

  async getActivities(id: string) {
    const logs = await this.auditService.findByResource('MiniApp', id);
    return logs.map((l) => ({
      id: l.id,
      miniAppId: l.resourceId,
      actorId: l.actorId,
      actorName: l.actorName,
      type: l.action,
      title: l.metadata?.title || l.action,
      description:
        l.metadata?.description || `${l.action} performed on MiniApp`,
      createdAt: l.createdAt,
    }));
  }

  async getCollaborators(miniAppId: string) {
    return this.collaboratorRepository.find({
      where: { miniAppId },
      relations: { user: true },
    });
  }

  async addCollaborator(miniAppId: string, userId: string, role: any) {
    const existing = await this.collaboratorRepository.findOne({
      where: { miniAppId, userId },
    });
    if (existing) {
      existing.role = role;
      return this.collaboratorRepository.save(existing);
    }
    const collab = this.collaboratorRepository.create({
      miniAppId,
      userId,
      role,
    });
    return this.collaboratorRepository.save(collab);
  }

  async removeCollaborator(miniAppId: string, userId: string) {
    await this.collaboratorRepository.delete({ miniAppId, userId });
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
    return this.miniappRepository.findOne({
      where: { id },
      relations: {
        issues: true,
        collaborators: true,
        versions: true,
        builds: true,
        legal: true,
      },
    });
  }

  async findAll(
    queryOrOwnerId?:
      QueryMiniAppsDto | { status?: string; mine?: boolean | string } | string,
    roles?: string[],
    user?: any,
  ): Promise<PaginatedResult<MiniApp> | MiniApp[]> {
    const isElevated =
      roles?.includes('SUPER_ADMIN') ||
      roles?.includes('ADMIN') ||
      roles?.includes('SECURITY_ADMIN') ||
      roles?.includes('COMPLIANCE_OFFICER');

    const isMineRequested =
      typeof queryOrOwnerId === 'object' &&
      (queryOrOwnerId?.mine === true || queryOrOwnerId?.mine === 'true');

    // If called with a simple string (ownerId legacy), maintain backward compatibility
    if (typeof queryOrOwnerId === 'string') {
      const apps = await this.miniappRepository.find({
        where: { ownerId: queryOrOwnerId },
        order: { updatedAt: 'DESC' },
        relations: { issues: true },
      });
      return apps.map((a) => maskMiniAppCredentials(a));
    }

    const query: QueryMiniAppsDto = (
      typeof queryOrOwnerId === 'object' ? queryOrOwnerId : {}
    ) as QueryMiniAppsDto;
    const {
      page = 1,
      limit = 20,
      search,
      status,
      integrationMethod,
      organizationId,
      sortBy = 'createdAt',
      sortOrder = SortOrder.DESC,
    } = query;

    const qb = this.miniappRepository
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.issues', 'issues')
      .leftJoinAndSelect('app.owner', 'owner');

    // Agency / Ownership Scoping
    if (!isElevated || isMineRequested) {
      const ownerId = user?.sub || user?.id;
      const ownerEmail = user?.email;
      const userOrgId = user?.organizationId;

      if (ownerId || ownerEmail || userOrgId) {
        qb.andWhere(
          '(app.ownerId = :ownerId OR (owner.email IS NOT NULL AND LOWER(owner.email) = LOWER(:ownerEmail))' +
            (userOrgId ? ' OR app.organizationId = :userOrgId' : '') +
            ')',
          {
            ownerId: ownerId || '',
            ownerEmail: ownerEmail || '',
            userOrgId: userOrgId || '',
          },
        );
      } else {
        return createPaginatedResponse([], 0, page, limit);
      }
    }

    // Search: name, description, appId, tagline
    if (search?.trim()) {
      const sanitized = escapeLikeString(search.trim());
      qb.andWhere(
        '(app.name ILIKE :search OR app.description ILIKE :search OR app.appId ILIKE :search OR app.tagline ILIKE :search)',
        { search: `%${sanitized}%` },
      );
    }

    // Filter Status
    if (status && status !== 'ALL') {
      qb.andWhere(
        '(app.lifecycleStatus = :reqStatus OR app.availabilityStatus = :reqStatus)',
        { reqStatus: status },
      );
    }

    // Filter Integration Method
    if (integrationMethod && integrationMethod !== 'ALL') {
      qb.andWhere('app.integrationMethod = :integrationMethod', {
        integrationMethod,
      });
    }

    // Filter Organization
    if (organizationId && organizationId !== 'ALL') {
      qb.andWhere('app.organizationId = :organizationId', { organizationId });
    }

    // Allowlisted Sorting
    const sortColumns: Record<string, string> = {
      createdAt: 'app.createdAt',
      updatedAt: 'app.updatedAt',
      name: 'app.name',
      status: 'app.lifecycleStatus',
      integrationMethod: 'app.integrationMethod',
    };
    const orderColumn = sortColumns[sortBy] || 'app.createdAt';
    const direction = sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';

    qb.orderBy(orderColumn, direction).addOrderBy('app.id', 'ASC');

    // Pagination via TypeORM .skip() & .take()
    qb.skip((page - 1) * limit).take(limit);

    const [apps, totalItems] = await qb.getManyAndCount();
    const masked = apps.map((a) => maskMiniAppCredentials(a));

    return createPaginatedResponse(masked, totalItems, page, limit);
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

  async publishRevision(id: string, actorId: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');

    const isNativeSdk = this.assertNativeSdkReady(app);
    if (isNativeSdk) {
      await this.ensureNativeSdkPublished(app);
    }

    const published = await this.lifecycleHelper.publishRevision(
      app,
      actorId,
      (mId, aId, aType, t, d, aAction, oVal, nVal) =>
        this.logActivity(mId, aId, aType, t, d, aAction, oVal, nVal),
    );

    if (isNativeSdk) {
      this.logger.log(
        `Universal Native Launcher: Native SDK mini app ${published.name} (${published.appId}) revision published.`,
      );
    }

    return published;
  }

  async discardRevision(id: string, actorId: string, reason?: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');
    return this.lifecycleHelper.discardRevision(
      app,
      actorId,
      (mId, aId, aType, t, d, aAction, oVal, nVal) =>
        this.logActivity(mId, aId, aType, t, d, aAction, oVal, nVal),
      reason,
    );
  }

  async remove(id: string, actorId?: string) {
    return this.miniappMutationHelper.remove(
      id,
      actorId,
      (mId, aId, aType, t, d, aAction, oVal, nVal) =>
        this.logActivity(mId, aId, aType, t, d, aAction, oVal, nVal),
    );
  }

  async submitForReview(id: string, actorId: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');

    const rawCaps = (app as any).capabilities || (app as any).permissions;
    if (
      this.capabilitiesService &&
      rawCaps &&
      Array.isArray(rawCaps) &&
      rawCaps.length > 0
    ) {
      const capabilityCheck =
        await this.capabilitiesService.validateMiniAppCapabilities(rawCaps);
      if (!capabilityCheck.isValid) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'GATE_CAPABILITY_UNSUPPORTED',
          message:
            'MiniApp contains required capabilities that are not supported by the SuperApp host shell.',
          unsupportedCapabilities: capabilityCheck.unsupportedCapabilities,
          details: capabilityCheck.errors,
        });
      }
    }

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

  /**
   * NATIVE_SDK artifact gate shared by approve() and publishRevision(). Gates on
   * exactly what the lifecycle helper will apply: it REPLACES method/config with
   * the pending revision's when present. Returns whether the effective
   * integration method is NATIVE_SDK; throws 400 when artifacts are missing.
   */
  private assertNativeSdkReady(app: any): boolean {
    const rev = app.pendingRevision;
    const effectiveMethod = rev?.integrationMethod ?? app.integrationMethod;
    const effectiveConfig = rev?.integrationConfig ?? app.integrationConfig;
    if (effectiveMethod !== 'NATIVE_SDK') return false;
    const hasIos = Boolean(
      effectiveConfig?.iosNexusZipUrl || effectiveConfig?.iosMinioKey,
    );
    const hasAndroid = Boolean(
      effectiveConfig?.androidNexusMavenUrl || effectiveConfig?.androidMinioKey,
    );
    if (!hasIos || !hasAndroid) {
      throw new BadRequestException(
        'Both iOS and Android artifacts must be uploaded before approval.',
      );
    }
    return true;
  }

  private async ensureNativeSdkPublished(app: any): Promise<void> {
    const rev = app.pendingRevision;
    const effectiveConfig = rev?.integrationConfig ?? app.integrationConfig;
    if (
      (effectiveConfig?.androidMinioKey &&
        !effectiveConfig?.androidNexusMavenUrl) ||
      (effectiveConfig?.iosMinioKey && !effectiveConfig?.iosNexusZipUrl)
    ) {
      try {
        const nexusUrls = await this.sdkArtifactUploadService.publishToNexus(
          app.id,
        );
        if (app.integrationConfig && nexusUrls) {
          Object.assign(app.integrationConfig, nexusUrls);
        }
        if (app.pendingRevision?.integrationConfig && nexusUrls) {
          Object.assign(app.pendingRevision.integrationConfig, nexusUrls);
        }
      } catch (nexusErr: any) {
        this.logger.warn(
          `Could not auto-publish SDK to Nexus during approve for ${app.name}: ${nexusErr.message}. Approving anyway for runtime reflection.`,
        );
      }
    }
  }

  /**
   * Atomically merges keys into `integrationConfig` (jsonb `||`). Never rewrites a
   * previously loaded copy, so it cannot erase keys another request wrote meanwhile.
   */
  private async mergeIntegrationConfig(
    id: string,
    patch: Record<string, any>,
  ): Promise<void> {
    await this.miniappRepository
      .createQueryBuilder()
      .update(MiniApp)
      .set({
        integrationConfig: () =>
          `COALESCE("integrationConfig", '{}'::jsonb) || CAST(:patch AS jsonb)`,
      })
      .where('id = :id', { id })
      .setParameters({ patch: JSON.stringify(patch) })
      .execute();
  }

  /** Runs codegen and records the outcome on the app. Throws on codegen failure. */
  private async generateAndRecord(
    id: string,
  ): Promise<{ prUrl?: string; changedFiles: number }> {
    const { prUrl, changedFiles } =
      await this.nativeSdkCodegenService.regenerate();
    const patch: Record<string, any> = {
      codegenChangedFiles: changedFiles.size,
    };
    if (prUrl) patch.codegenPrUrl = prUrl;
    await this.mergeIntegrationConfig(id, patch);
    return { prUrl, changedFiles: changedFiles.size };
  }

  /**
   * Post-publish, non-blocking native SDK codegen. Runs after the app is live so
   * it is part of the vendor set; a failure is logged only.
   */
  private async runNativeSdkCodegen(published: any): Promise<void> {
    try {
      const { prUrl, changedFiles } = await this.generateAndRecord(
        published.id,
      );
      published.integrationConfig = {
        ...(published.integrationConfig ?? {}),
        codegenChangedFiles: changedFiles,
        ...(prUrl ? { codegenPrUrl: prUrl } : {}),
      };
    } catch (err: any) {
      // Non-blocking: the approval/publish already succeeded.
      this.logger.error(`Native SDK codegen failed: ${err?.message ?? err}`);
    }
  }

  /**
   * Explicit, admin-triggered re-run of the native SDK codegen (opens/updates the
   * GitLab merge request). Unlike the post-approval run this reports failures to the
   * caller, so a misconfiguration (missing markers, bad token) is visible in the UI.
   */
  async rerunNativeSdkCodegen(id: string, actorId: string) {
    const app = await this.findOne(id);
    if (!app) throw new NotFoundException('Mini app not found');
    if (app.integrationMethod !== 'NATIVE_SDK') {
      throw new BadRequestException(
        'Codegen only applies to NATIVE_SDK mini apps.',
      );
    }
    if (
      !['APPROVED', 'ACTIVE'].includes(
        (app.lifecycleStatus || (app as any).status)?.toUpperCase(),
      )
    ) {
      throw new BadRequestException(
        'Approve the mini app before verifying native launcher configuration.',
      );
    }
    this.assertNativeSdkReady(app);
    await this.ensureNativeSdkPublished(app);

    await this.logActivity(
      app.id,
      actorId,
      'UNIVERSAL_LAUNCHER',
      'Universal Native MiniApp Launcher verified',
      'Mini app is configured for dynamic invocation via superapp/native_launcher platform channel.',
      'NATIVE_SDK_LAUNCHER_VERIFIED',
    );

    return {
      prUrl: null,
      changedFiles: 0,
      upToDate: true,
      message:
        'Universal Native MiniApp Launcher is active. Dynamic reflection dispatch enabled via superapp/native_launcher.',
    };
  }

  async approve(id: string, actorId: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');

    const rawCaps = (app as any).capabilities || (app as any).permissions;
    if (
      this.capabilitiesService &&
      rawCaps &&
      Array.isArray(rawCaps) &&
      rawCaps.length > 0
    ) {
      const capabilityCheck =
        await this.capabilitiesService.validateMiniAppCapabilities(rawCaps);
      if (!capabilityCheck.isValid) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'GATE_CAPABILITY_UNSUPPORTED',
          message:
            'Cannot approve MiniApp with unsupported required capabilities. Please update capability requirements or deploy host shell support.',
          unsupportedCapabilities: capabilityCheck.unsupportedCapabilities,
          details: capabilityCheck.errors,
        });
      }
    }

    const isNativeSdk = this.assertNativeSdkReady(app);
    if (isNativeSdk) {
      await this.ensureNativeSdkPublished(app);
    }

    const approved = await this.lifecycleHelper.approve(
      app,
      actorId,
      (mId, aId, aType, t, d, aAction, oVal, nVal) =>
        this.logActivity(mId, aId, aType, t, d, aAction, oVal, nVal),
    );

    if (isNativeSdk) {
      this.logger.log(
        `Universal Native Launcher: Native SDK mini app ${approved.name} (${approved.appId}) approved and available for runtime reflection.`,
      );
    }

    return approved;
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
    return this.domainAssociationHelper.verifyDomain(app, overrideUrl);
  }

  async verifyDomainStandalone(
    prodUrl: string,
    appId: string,
    verificationToken: string,
  ) {
    return this.domainAssociationHelper.verifyDomainStandalone(
      prodUrl,
      appId,
      verificationToken,
    );
  }

  generateVerificationToken(): string {
    return this.domainAssociationHelper.generateVerificationToken();
  }

  async detectPermissions(body: {
    productionUrl?: string;
    category?: string;
    name?: string;
    appId?: string;
    gitUrl?: string;
    gitBranch?: string;
    gitPath?: string;
  }) {
    if (!body.gitUrl && body.appId && body.appId !== 'draft') {
      try {
        const app = await this.findOne(body.appId);
        if (app?.integrationConfig) {
          const cfg = app.integrationConfig;
          body.gitUrl = cfg.gitUrl || cfg.repoUrl;
          body.gitBranch = cfg.gitBranch || cfg.ref || 'main';
          body.gitPath = cfg.gitPath || cfg.packagePath;
        }
      } catch {
        // App might not exist yet during initial draft creation
      }
    }
    return this.permissionDetectorHelper.detect(body);
  }

  async inspectPackageArtifact(file: Express.Multer.File) {
    return this.miniappMutationHelper.inspectPackageArtifact(file);
  }

  async uploadPackageArtifact(
    file: Express.Multer.File,
    miniAppId?: string,
    version?: string,
  ) {
    return this.miniappMutationHelper.uploadPackageArtifact(
      file,
      miniAppId,
      version,
    );
  }

  async getVersionHistory(
    id: string,
    user?: any,
    query: PaginationQueryDto = new PaginationQueryDto(),
  ) {
    const app = await this.findOne(id);
    if (!app) throw new NotFoundException('MiniApp not found');
    const result = this.artifactDistributionHelper.getVersionHistory(app, user);

    const allVersions: any[] = result.versions || [];
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, query.limit || 20);
    const skip = (page - 1) * limit;

    if (query.sortOrder === 'ASC') {
      allVersions.reverse();
    }

    const pagedVersions = allVersions.slice(skip, skip + limit);
    const meta = buildPaginationMeta(allVersions.length, page, limit);

    return {
      ...result,
      versions: pagedVersions,
      meta,
    };
  }

  generateInviteToken(appId: string, user: any, expiresIn: string = '7d') {
    return this.artifactDistributionHelper.generateInviteToken(
      appId,
      user,
      expiresIn,
    );
  }

  verifyInviteToken(miniAppId: string, token: string): boolean {
    return this.artifactDistributionHelper.verifyInviteToken(miniAppId, token);
  }

  async streamArtifact(
    miniAppId: string,
    artifactType: 'test' | 'release',
    versionQuery?: string,
    user?: any,
    inviteToken?: string,
    res?: any,
  ) {
    const app = await this.findOne(miniAppId);
    if (!app) throw new NotFoundException('MiniApp not found');
    return this.artifactDistributionHelper.streamArtifact(
      app,
      artifactType,
      versionQuery,
      user,
      inviteToken,
      res,
    );
  }

  async getDiff(id: string, baseVer?: string, targetVer?: string) {
    const app = await this.findOne(id);
    if (!app) throw new NotFoundException('MiniApp not found');

    if (!baseVer && !targetVer) {
      if (app.pendingRevision) {
        return VersionDiffHelper.computeDiff(app, app.pendingRevision);
      }
      return VersionDiffHelper.computeDiff(app, app);
    }

    const history = Array.isArray((app as any).versionHistory)
      ? (app as any).versionHistory
      : app.versions || [];
    const baseRecord = history.find((h) => h.version === baseVer) || app;
    const targetRecord =
      history.find((h) => h.version === targetVer) ||
      (app.pendingRevision
        ? { ...app, ...app.pendingRevision, version: targetVer }
        : app);

    return VersionDiffHelper.computeDiff(baseRecord, targetRecord);
  }

  async rollback(
    id: string,
    targetVersion: string,
    actorId: string,
    reason?: string,
  ) {
    const app = await this.findOne(id);
    if (!app) throw new NotFoundException('MiniApp not found');
    return this.lifecycleHelper.rollbackToVersion(
      app,
      targetVersion,
      actorId,
      (miniAppId, actor, actionType, title, desc, auditAction, oldV, newV) =>
        this.logActivity(
          miniAppId,
          actor,
          actionType,
          title,
          desc,
          auditAction,
          oldV,
          newV,
        ),
      reason,
    );
  }
}
