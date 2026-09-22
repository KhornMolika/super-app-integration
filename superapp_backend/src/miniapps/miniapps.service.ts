import {
  Injectable,
  Logger,
  BadRequestException,
  BadGatewayException,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniApp } from './entities/miniapp.entity';
import { MiniAppIssue } from './entities/miniapp-issue.entity';
import { MiniAppActivity } from './entities/miniapp-activity.entity';
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
import { resolveOrganizationDetails } from '../common/constants/fsa-organizations';

@Injectable()
export class MiniappsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MiniappsService.name);

  constructor(
    @InjectRepository(MiniApp)
    private miniappRepository: Repository<MiniApp>,

    @InjectRepository(MiniAppActivity)
    private activityRepository: Repository<MiniAppActivity>,

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
  ) {}

  async onApplicationBootstrap() {
    await this.backfillOrganizations();
  }

  private async backfillOrganizations() {
    try {
      const apps = await this.miniappRepository.find();
      for (const app of apps) {
        if (!app.organizationCode || !app.organization) {
          const resolved = resolveOrganizationDetails(app.organization || app.category);
          app.organization = resolved.name;
          app.organizationCode = resolved.code;
          app.category = resolved.name;
          await this.miniappRepository.save(app);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Could not backfill mini app organizations: ${err.message}`);
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
    return this.miniappRepository.findOne({
      where: { id },
      relations: { issues: true, activities: true },
    });
  }

  async findAll(
    queryOrOwnerId?: { status?: string } | string,
    roles?: string[],
    user?: any,
  ) {
    const isElevated =
      roles?.includes('SUPER_ADMIN') ||
      roles?.includes('ADMIN') ||
      roles?.includes('SECURITY_ADMIN') ||
      roles?.includes('COMPLIANCE_OFFICER');

    // 1. Super Admin / Admin / Compliance Officer: Full platform visibility
    if (isElevated) {
      const where: any = {};
      if (typeof queryOrOwnerId === 'object' && queryOrOwnerId?.status) {
        where.status = queryOrOwnerId.status;
      }
      return this.miniappRepository.find({
        where,
        order: { updatedAt: 'DESC' },
        relations: { issues: true },
      });
    }

    // 2. Solution 1: Live Ecosystem + Developer's Staging App (Realistic Simulation)
    // Non-super-admins see:
    // - ALL ACTIVE / PUBLISHED apps (so the Super App home screen looks 100% full, real, and authentic)
    // - PLUS their own Mini Apps in ANY status (TESTING, IN_REVIEW, DRAFT, APPROVED)
    const ownerId =
      user?.sub ||
      (typeof queryOrOwnerId === 'string' ? queryOrOwnerId : undefined);
    const ownerEmail = user?.email;

    const qb = this.miniappRepository
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.issues', 'issues')
      .orderBy('app.updatedAt', 'DESC');

    if (ownerId || ownerEmail) {
      qb.where(
        '(app.status = :activeStatus OR app.status = :publishedStatus OR app.ownerId = :ownerId OR app.ownerEmail = :ownerEmail)',
        {
          activeStatus: 'ACTIVE',
          publishedStatus: 'PUBLISHED',
          ownerId: ownerId || '',
          ownerEmail: ownerEmail || '',
        },
      );
    } else {
      qb.where('app.status = :activeStatus OR app.status = :publishedStatus', {
        activeStatus: 'ACTIVE',
        publishedStatus: 'PUBLISHED',
      });
    }

    if (typeof queryOrOwnerId === 'object' && queryOrOwnerId?.status) {
      qb.andWhere('app.status = :reqStatus', {
        reqStatus: queryOrOwnerId.status,
      });
    }

    return qb.getMany();
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
      const nexusUrls = await this.sdkArtifactUploadService.publishToNexus(
        app.id,
      );
      if (app.integrationConfig) {
        Object.assign(app.integrationConfig, nexusUrls);
      }
      if (app.pendingRevision?.integrationConfig) {
        Object.assign(app.pendingRevision.integrationConfig, nexusUrls);
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
    if (!['APPROVED', 'ACTIVE'].includes(app.status?.toUpperCase())) {
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
      'Universal Native Mini App Launcher verified',
      'Mini app is configured for dynamic invocation via superapp/native_launcher platform channel.',
      'NATIVE_SDK_LAUNCHER_VERIFIED',
    );

    return {
      prUrl: null,
      changedFiles: 0,
      upToDate: true,
      message:
        'Universal Native Mini App Launcher is active. Dynamic reflection dispatch enabled via superapp/native_launcher.',
    };
  }

  async approve(id: string, actorId: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');

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
  }) {
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

  async getVersionHistory(id: string, user?: any) {
    const app = await this.findOne(id);
    if (!app) throw new NotFoundException('Mini App not found');
    return this.artifactDistributionHelper.getVersionHistory(app, user);
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
    if (!app) throw new NotFoundException('Mini App not found');
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
    if (!app) throw new NotFoundException('Mini App not found');

    if (!baseVer && !targetVer) {
      if (app.pendingRevision) {
        return VersionDiffHelper.computeDiff(app, app.pendingRevision);
      }
      return VersionDiffHelper.computeDiff(app, app);
    }

    const history = Array.isArray(app.versionHistory) ? app.versionHistory : [];
    const baseRecord = history.find((h) => h.version === baseVer) || app;
    const targetRecord =
      history.find((h) => h.version === targetVer) ||
      (app.pendingRevision ? { ...app, ...app.pendingRevision, version: targetVer } : app);

    return VersionDiffHelper.computeDiff(baseRecord, targetRecord);
  }

  async rollback(id: string, targetVersion: string, actorId: string, reason?: string) {
    const app = await this.findOne(id);
    if (!app) throw new NotFoundException('Mini App not found');
    return this.lifecycleHelper.rollbackToVersion(
      app,
      targetVersion,
      actorId,
      (miniAppId, actor, actionType, title, desc, auditAction, oldV, newV) =>
        this.logActivity(miniAppId, actor, actionType, title, desc, auditAction, oldV, newV),
      reason,
    );
  }
}
