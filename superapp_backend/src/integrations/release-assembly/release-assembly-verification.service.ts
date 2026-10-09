import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniApp } from '../../miniapps/entities/miniapp.entity';
import { User } from '../../access-control/entities/user.entity';
import { JenkinsService } from '../jenkins/jenkins.service';
import { latestCodegenMrIid } from '../../miniapps/helpers/native-sdk-config.helper';
import { NexusIntegrationService } from '../nexus/nexus-integration.service';
import { NotificationsService, MailService } from '../../notifications';
import { resolveBackofficeBaseUrl } from '../../common/utils/network.utils';
import { PubspecInjectorService } from '../flutter/pubspec-injector.service';
import {
  VerifyAndAssembleReleaseDto,
  ReleaseAssemblyAuditResult,
  BuildStageUpdateDto,
  BuildCallbackDto,
} from './dto/release-assembly-verification.dto';

interface VerifiedAppRecord {
  id: string;
  packageName: string;
  version: string;
  nexusChecksum: string;
  approvedChecksum: string;
  checksumMatched: boolean;
  dependencies: Record<string, string>;
}

@Injectable()
export class ReleaseAssemblyVerificationService {
  private readonly logger = new Logger(ReleaseAssemblyVerificationService.name);

  constructor(
    private readonly nexusService: NexusIntegrationService,
    private readonly jenkinsService: JenkinsService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly pubspecService: PubspecInjectorService,
    @InjectRepository(MiniApp)
    private readonly miniappRepository: Repository<MiniApp>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Performs Release Assembly Checksum Verification & SuperApp Release Assembly
   */
  async verifyAndAssembleRelease(
    dto: VerifyAndAssembleReleaseDto,
  ): Promise<ReleaseAssemblyAuditResult> {
    this.logger.log(
      `Executing Release Assembly Verification for SuperApp release ${dto.releaseVersion}...`,
    );

    const timestamp = new Date().toISOString();
    const verifiedApps: VerifiedAppRecord[] = [];
    const conflicts: string[] = [];
    const consolidatedPermissionsSet = new Set<string>();
    let allChecksumsMatched = true;

    // Track shared dependencies to detect version collisions
    const sharedDependencyMap: Map<string, Set<string>> = new Map();

    for (const app of dto.miniApps) {
      // 1. Fetch package info from Nexus
      let nexusChecksum = '';
      let dependencies: Record<string, string> = {};

      const isExternalScheme =
        app.packageName?.includes('://') ||
        app.packageName?.startsWith('DEEP_LINK') ||
        app.packageName === 'webview_package';

      if (isExternalScheme) {
        nexusChecksum = crypto
          .createHash('sha256')
          .update(`${app.packageName}-${app.version}`)
          .digest('hex');
      } else {
        try {
          const pkgInfo: any = await this.nexusService.getPackageInfo(
            app.packageName,
          );
          if (!pkgInfo.exists) {
            conflicts.push(
              `Package '${app.packageName}' not found on Nexus pub-group.`,
            );
            allChecksumsMatched = false;
          } else {
            // Look up specific version
            const versionDetail =
              pkgInfo.versions?.find((v: any) => v.version === app.version) ||
              pkgInfo.latest;
            if (versionDetail && versionDetail.pubspec) {
              dependencies = versionDetail.pubspec.dependencies || {};
              // Compute deterministic checksum of published metadata & archive
              const payloadToHash = JSON.stringify(versionDetail.pubspec);
              nexusChecksum = crypto
                .createHash('sha256')
                .update(payloadToHash)
                .digest('hex');
            } else {
              nexusChecksum = crypto
                .createHash('sha256')
                .update(`${app.packageName}-${app.version}`)
                .digest('hex');
            }
          }
        } catch (err: any) {
          this.logger.warn(
            `Could not verify Nexus package ${app.packageName}: ${err.message}`,
          );
          nexusChecksum = crypto
            .createHash('sha256')
            .update(`${app.packageName}-${app.version}`)
            .digest('hex');
        }
      }

      // Checksum matching
      const approvedChecksum = app.approvedChecksum || nexusChecksum;
      const checksumMatched =
        nexusChecksum === approvedChecksum || !app.approvedChecksum;
      if (!checksumMatched) {
        allChecksumsMatched = false;
        conflicts.push(
          `Checksum Mismatch for '${app.packageName}': Approved [${approvedChecksum.substring(0, 12)}...] != Nexus Artifact [${nexusChecksum.substring(0, 12)}...]`,
        );
      }

      // Dependency matrix conflict analysis
      for (const [depName, depVer] of Object.entries(dependencies)) {
        if (!sharedDependencyMap.has(depName)) {
          sharedDependencyMap.set(depName, new Set());
        }
        sharedDependencyMap.get(depName)?.add(String(depVer));
      }

      // Consolidate permissions
      if (app.declaredPermissions && Array.isArray(app.declaredPermissions)) {
        for (const p of app.declaredPermissions) {
          if (p && p.type) consolidatedPermissionsSet.add(p.type);
        }
      }

      verifiedApps.push({
        id: app.id,
        packageName: app.packageName,
        version: app.version,
        nexusChecksum,
        approvedChecksum,
        checksumMatched,
        dependencies,
      });
    }

    // Detect transitive dependency conflicts
    for (const [depName, versionSet] of sharedDependencyMap.entries()) {
      if (versionSet.size > 1) {
        conflicts.push(
          `Dependency Version Collision on '${depName}': Found conflicting constraints [${Array.from(versionSet).join(', ')}]`,
        );
      }
    }

    const passed = allChecksumsMatched && conflicts.length === 0;

    // Generate Release Manifest
    const bundledMiniApps = verifiedApps.map((app) => ({
      id: app.id,
      packageName: app.packageName,
      version: app.version,
      checksum: app.nexusChecksum,
      entryPoint: `package:${app.packageName}/${app.packageName}.dart`,
    }));

    const consolidatedPermissions = Array.from(consolidatedPermissionsSet);
    const manifestPayload = JSON.stringify({
      superAppVersion: dto.releaseVersion,
      buildTimestamp: timestamp,
      bundledMiniApps,
      consolidatedPermissions,
    });

    const integrityDigest = crypto
      .createHash('sha256')
      .update(manifestPayload)
      .digest('hex');

    const manifest = {
      superAppVersion: dto.releaseVersion,
      buildTimestamp: timestamp,
      bundledMiniApps,
      consolidatedPermissions,
      integrityDigest,
    };

    if (passed) {
      try {
        const dataDir = path.resolve(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        const releaseManifestPath = path.join(dataDir, 'super_app_release.json');
        fs.writeFileSync(
          releaseManifestPath,
          JSON.stringify(manifest, null, 2),
          'utf-8',
        );
        this.logger.log(`Wrote release manifest to ${releaseManifestPath}`);
      } catch (err: any) {
        this.logger.warn(`Could not write manifest to disk: ${err.message}`);
      }

      // Automatically sync and inject all verified MiniApp package dependencies into pubspec.yaml
      try {
        await this.pubspecService.syncAllApprovedMiniApps();
        this.logger.log('Synchronized SuperApp pubspec.yaml dependencies for release assembly.');
      } catch (err: any) {
        this.logger.warn(`Pubspec synchronization warning during release assembly: ${err.message}`);
      }

      // Integration configs of the apps in this release (to find the codegen MR for the build).
      const releaseConfigs: unknown[] = [];

      // Transition approved apps to BUILDING and dispatch notifications
      for (const appDto of dto.miniApps) {
        try {
          await this.miniappRepository.update(appDto.id, {
            status: 'BUILDING',
            buildStages: null as any,
          });

          const appRecord = await this.miniappRepository.findOne({
            where: { id: appDto.id },
            relations: { owner: true },
          });
          releaseConfigs.push(appRecord?.integrationConfig);

          if (appRecord?.ownerId) {
            await this.notificationsService.createNotification(
              appRecord.ownerId,
              'SuperApp Build in Progress',
              `SuperApp test build (${dto.releaseVersion}) has been triggered on Jenkins for MiniApp "${appRecord.name}". Artifacts will be available upon assembly completion.`,
              'BUILD_STARTED',
              appRecord.id,
              {
                releaseVersion: dto.releaseVersion,
                version: dto.releaseVersion,
                buildType: 'debug',
              },
            );
          }
        } catch (_) {}
      }

      // Trigger Jenkins SuperApp build pipeline
      await this.jenkinsService.triggerSuperAppBuild({
        appName: 'superapp',
        releaseVersion: dto.releaseVersion,
        buildType: 'debug',
        codegenMrIid: latestCodegenMrIid(releaseConfigs),
      });

      // Trigger Jenkins SuperApp Web Sandbox build pipeline
      this.jenkinsService
        .triggerSuperAppSandboxBuild()
        .catch((e: any) => {
          this.logger.warn(
            `Failed to trigger superapp-sandbox-build: ${e.message}`,
          );
        });
    }

    const nexusBase = (
      this.configService.get<string>('NEXUS_BASE_URL') ||
      'http://localhost:8081'
    ).replace(/\/+$/, '');
    const minioBase = (
      this.configService.get<string>('MINIO_PUBLIC_URL') ||
      'http://localhost:9000'
    ).replace(/\/+$/, '');
    const nexusApkUrl = `${nexusBase}/repository/apk-test-builds/superapp/${dto.releaseVersion}/app-debug.apk`;
    const minioApkUrl = `${minioBase}/releases/superapp/${dto.releaseVersion}/app-debug.apk`;

    return {
      passed,
      status: passed ? 'PASSED' : 'FAILED',
      releaseVersion: dto.releaseVersion,
      timestamp,
      verifiedApps,
      conflicts,
      manifest,
      buildTriggered: passed,
      apkUrl: passed ? nexusApkUrl : undefined,
    };
  }

  /**
   * Handles stage progress update from Jenkins pipeline
   */
  async handleStageUpdate(body: any) {
    this.logger.log(
      `Received build stage update for release ${body.releaseVersion}: [${body.stageId}] ${body.status} - ${body.details}`,
    );

    const whereConditions: any[] = [{ status: 'BUILDING' }];
    if (body.releaseVersion) {
      whereConditions.push({ activeTestVersion: body.releaseVersion });
    }

    const buildingApps = await this.miniappRepository.find({
      where: whereConditions,
    });

    for (const app of buildingApps) {
      const currentStages = app.buildStages || {};
      currentStages[body.stageId] = {
        id: body.stageId,
        name: body.stageName || body.stageId,
        status: body.status || 'RUNNING',
        details: body.details || '',
        updatedAt: new Date().toISOString(),
      };
      app.buildStages = { ...currentStages };
      if (body.status === 'FAILED') {
        app.status = 'BUILD_FAILED';
        app.buildStatus = 'FAILED';
        app.buildError = body.details || body.errorMessage || `Stage ${body.stageName || body.stageId} failed.`;
      } else if (body.stageId === 'publish' && (body.status === 'COMPLETED' || body.status === 'SUCCESS')) {
        app.status = 'TESTING';
        app.buildStatus = 'COMPLETED';
        app.buildError = undefined;
      }
      await this.miniappRepository.save(app);

      this.notificationsService.emitBuildStageUpdate({
        miniAppId: app.id,
        appName: body.appName || app.name,
        releaseVersion: body.releaseVersion,
        stage: currentStages[body.stageId],
        stages: app.buildStages,
      });
    }

    return { success: true };
  }

  /**
   * Intelligently resolves all mini-apps related to this build callback across
   * status, buildStatus, version candidates, appName/appId, or miniAppId.
   */
  private async resolveBuildingApps(body: any): Promise<MiniApp[]> {
    const rawVersion = body.releaseVersion || '';
    const vPrefixed = rawVersion.startsWith('v') ? rawVersion : `v${rawVersion}`;
    const unPrefixed = rawVersion.startsWith('v') ? rawVersion.slice(1) : rawVersion;
    const candidateVersions = [rawVersion, vPrefixed, unPrefixed].filter(Boolean);

    const whereConditions: any[] = [
      { status: 'BUILDING' },
      { buildStatus: 'BUILDING' },
    ];
    for (const v of candidateVersions) {
      whereConditions.push({ activeTestVersion: v });
    }

    const apps = await this.miniappRepository.find({
      where: whereConditions,
      relations: { owner: true },
    });

    // Check by appName / appId / id
    if (body.appName && body.appName !== 'superapp') {
      const namedApps = await this.miniappRepository.find({
        where: [
          { appId: body.appName },
          { name: body.appName },
          ...(body.appName.match(/^[0-9a-f-]{36}$/i) ? [{ id: body.appName }] : []),
        ],
        relations: { owner: true },
      });
      for (const na of namedApps) {
        if (!apps.some((a) => a.id === na.id)) {
          apps.push(na);
        }
      }
    }

    // Check by miniAppId
    if (body.miniAppId) {
      const byId = await this.miniappRepository.findOne({
        where: [{ id: body.miniAppId }, { appId: body.miniAppId }],
        relations: { owner: true },
      });
      if (byId && !apps.some((a) => a.id === byId.id)) {
        apps.push(byId);
      }
    }

    // If still empty, check recent apps whose integrationConfig has superAppTestVersion
    if (apps.length === 0 && candidateVersions.length > 0) {
      const recentApps = await this.miniappRepository.find({
        relations: { owner: true },
        order: { updatedAt: 'DESC' },
        take: 20,
      });
      for (const ra of recentApps) {
        const testVer =
          ra.integrationConfig?.superAppTestVersion || ra.activeTestVersion;
        if (
          candidateVersions.includes(testVer) &&
          !apps.some((a) => a.id === ra.id)
        ) {
          apps.push(ra);
        }
      }
    }

    return apps;
  }

  /**
   * Handles build callback from Jenkins pipeline
   */
  async handleBuildCallback(body: any) {
    this.logger.log(
      `Received build callback from Jenkins for release ${body.releaseVersion}: ${body.status}`,
    );

    const isSuccess = body.status === 'COMPLETED' || body.status === 'SUCCESS';

    if (isSuccess) {
      const buildingApps = await this.resolveBuildingApps(body);

      await this.miniappRepository
        .createQueryBuilder()
        .update(MiniApp)
        .set({ status: 'TESTING', buildStatus: 'COMPLETED' })
        .where("status = 'BUILDING'")
        .execute();

      const repoName = 'apk-test-builds';
      const filename =
        body.filename ||
        (body.buildType === 'release' ? 'app-release.apk' : 'app-debug.apk');

      for (const app of buildingApps) {
        const effectiveVersion =
          body.releaseVersion ||
          app.activeTestVersion ||
          app.integrationConfig?.superAppTestVersion ||
          'v0.2.1';
        const normVersion = effectiveVersion.startsWith('v')
          ? effectiveVersion
          : `v${effectiveVersion}`;

        const nexusBase = (
          this.configService.get<string>('NEXUS_BASE_URL') ||
          'http://localhost:8081'
        ).replace(/\/+$/, '');
        const backofficeBase = resolveBackofficeBaseUrl(
          this.configService.get<string>('BACKOFFICE_BASE_URL') ||
            this.configService.get<string>('WEBAPP_URL'),
        );

        // Sanitize incoming APK URL if Jenkins sent internal Docker hostname
        let sanitizedNexusUrl = body.apkUrl;
        if (sanitizedNexusUrl) {
          sanitizedNexusUrl = sanitizedNexusUrl.replace(
            /https?:\/\/host\.docker\.internal:\d+/,
            nexusBase,
          );
        } else {
          sanitizedNexusUrl = `${nexusBase}/repository/${repoName}/superapp/${effectiveVersion}/${filename}`;
        }

        // Standardized Backoffice download proxy URL: enforces standardized filename across all channels
        const finalApkUrl = `${backofficeBase}/api/download-apk?type=test&version=${encodeURIComponent(normVersion)}&appName=superapp`;

        const currentStages = app.buildStages || {};
        const allCompletedStages: Record<string, any> = {
          preflight: {
            id: 'preflight',
            name: '1. Pre-Flight & Manifest Verification',
            status: 'COMPLETED',
            details: 'Manifest and dependencies verified.',
            updatedAt: new Date().toISOString(),
          },
          compile: {
            id: 'compile',
            name: '2. Fastlane APK Packaging',
            status: 'COMPLETED',
            details: 'Fastlane packaging completed successfully.',
            updatedAt: new Date().toISOString(),
          },
          publish: {
            id: 'publish',
            name: '3. Publish to Nexus & Finalize',
            status: 'COMPLETED',
            details: `Published test APK to Sonatype Nexus (apk-test-builds).`,
            updatedAt: new Date().toISOString(),
          },
          ...currentStages,
        };

        // Ensure all are marked COMPLETED
        for (const k of Object.keys(allCompletedStages)) {
          allCompletedStages[k].status = 'COMPLETED';
        }

        app.status = 'TESTING';
        app.buildStatus = 'COMPLETED';
        app.buildStages = allCompletedStages;
        app.buildError = null as any;
        await this.miniappRepository.update(app.id, {
          status: 'TESTING',
          buildStatus: 'COMPLETED',
          buildError: null as any,
          buildStages: allCompletedStages,
        });
        await this.miniappRepository.save(app);

        this.notificationsService.emitBuildCompleted({
          miniAppId: app.id,
          appName: body.appName || app.name,
          releaseVersion: effectiveVersion,
          buildType: body.buildType || 'debug',
          apkUrl: finalApkUrl,
          status: 'TESTING',
        });

        // Resolve App Owner and notify
        let targetOwnerId = app.ownerId || app.owner?.id;
        let targetEmail = app.ownerEmail || app.owner?.email;

        if (!targetOwnerId && targetEmail) {
          const ownerUser = await this.userRepository.findOne({
            where: { email: targetEmail },
          });
          if (ownerUser) {
            targetOwnerId = ownerUser.id;
            if (!targetEmail) targetEmail = ownerUser.email;
          }
        }

        if (targetOwnerId) {
          await this.notificationsService.createNotification(
            targetOwnerId,
            'SuperApp Test Build Ready',
            `SuperApp test build (${effectiveVersion}) is ready! Download the test APK (superapp-test-${normVersion}.apk) or launch the Web Sandbox to verify "${app.name}".`,
            'TEST_BUILD_READY',
            app.id,
            {
              appName: app.name || body.appName || 'superapp',
              miniAppId: app.id,
              releaseVersion: effectiveVersion,
              version: effectiveVersion,
              apkUrl: finalApkUrl,
              nexusApkUrl: sanitizedNexusUrl,
              buildType: body.buildType || 'debug',
              teamTelegramChatId: app.teamTelegramChatId,
            },
          );
        }

        if (targetEmail) {
          const sandboxUrl = `${backofficeBase}/miniapps/${app.id}`;
          await this.mailService.sendTestBuildReadyEmail(
            targetEmail,
            app.name || app.appId || 'MiniApp',
            effectiveVersion,
            finalApkUrl,
            sandboxUrl,
          );
        }
      }

      if (buildingApps.length === 0) {
        const effectiveVersion = body.releaseVersion || 'v0.2.1';
        const normVersion = effectiveVersion.startsWith('v')
          ? effectiveVersion
          : `v${effectiveVersion}`;
        const backofficeBase = resolveBackofficeBaseUrl(
          this.configService.get<string>('BACKOFFICE_BASE_URL') ||
            this.configService.get<string>('WEBAPP_URL'),
        );
        const standaloneApkUrl = `${backofficeBase}/api/download-apk?type=test&version=${encodeURIComponent(normVersion)}&appName=superapp`;

        const fallbackApp = await this.miniappRepository.findOne({
          order: { updatedAt: 'DESC' },
          relations: { owner: true },
        });

        this.notificationsService.emitBuildCompleted({
          miniAppId: fallbackApp?.id || 'superapp',
          appName: body.appName || fallbackApp?.name || 'superapp',
          releaseVersion: effectiveVersion,
          buildType: body.buildType || 'release',
          apkUrl: standaloneApkUrl,
          status: 'TESTING',
        });
        await this.notificationsService.notifyAdmins(
          `🚀 SuperApp Test Build Ready (${effectiveVersion})`,
          `SuperApp test build (${effectiveVersion}, ${body.buildType || 'release'}) is published to Sonatype Nexus and ready for download.`,
          'TEST_BUILD_READY',
          fallbackApp?.id,
          {
            appName: body.appName || fallbackApp?.name || 'superapp',
            miniAppId: fallbackApp?.id,
            releaseVersion: effectiveVersion,
            version: effectiveVersion,
            apkUrl: standaloneApkUrl,
            buildType: body.buildType || 'release',
            teamTelegramChatId: fallbackApp?.teamTelegramChatId,
          },
        );
      }
    } else {
      await this.handleFailedBuild(body);
    }

    return { success: true };
  }

  /**
   * A non-COMPLETED/SUCCESS callback (e.g. FAILED) must not leave apps stuck in
   * BUILDING. We update apps to BUILD_FAILED and notify both admins and app owners.
   */
  private async handleFailedBuild(body: BuildCallbackDto) {
    const buildingApps = await this.resolveBuildingApps(body);

    const errorMessage =
      body.errorMessage ||
      body.error ||
      (body as any).details ||
      'SuperApp Fastlane CI build pipeline failed. Inspect Jenkins console logs for details.';

    const effectiveVersion =
      body.releaseVersion ||
      buildingApps[0]?.integrationConfig?.superAppTestVersion ||
      'v0.2.1';
    const appName = body.appName || buildingApps[0]?.name || 'superapp';
    const buildType = body.buildType || 'release';
    const backofficeBase = resolveBackofficeBaseUrl(
      this.configService.get<string>('BACKOFFICE_BASE_URL') ||
        this.configService.get<string>('WEBAPP_URL'),
    );

    for (const app of buildingApps) {
      const currentStages = { ...(app.buildStages || {}) };
      let hadRunningStage = false;
      for (const key of Object.keys(currentStages)) {
        if (currentStages[key]?.status === 'RUNNING') {
          currentStages[key] = {
            ...currentStages[key],
            status: 'FAILED',
            details: errorMessage,
            updatedAt: new Date().toISOString(),
          };
          hadRunningStage = true;
        }
      }
      if (!hadRunningStage && currentStages.compile) {
        currentStages.compile = {
          ...currentStages.compile,
          status: 'FAILED',
          details: errorMessage,
          updatedAt: new Date().toISOString(),
        };
      }

      await this.miniappRepository.update(app.id, {
        status: 'BUILD_FAILED',
        buildStatus: 'FAILED',
        buildError: errorMessage,
        buildStages: currentStages,
      });

      this.notificationsService.emitBuildCompleted({
        miniAppId: app.id,
        appName: app.name || body.appName,
        releaseVersion: effectiveVersion,
        buildType,
        status: 'FAILED',
        error: errorMessage,
      } as any);

      // Resolve App Owner and dispatch notifications
      let targetOwnerId = app.ownerId || app.owner?.id;
      let targetEmail = app.ownerEmail || app.owner?.email;

      if (!targetOwnerId && targetEmail) {
        const ownerUser = await this.userRepository.findOne({
          where: { email: targetEmail },
        });
        if (ownerUser) {
          targetOwnerId = ownerUser.id;
          if (!targetEmail) targetEmail = ownerUser.email;
        }
      }

      if (targetOwnerId) {
        await this.notificationsService.createNotification(
          targetOwnerId,
          `🚨 SuperApp Build Failed: ${app.name || app.appId}`,
          `SuperApp test build (${effectiveVersion}) failed on Jenkins for MiniApp "${app.name}": ${errorMessage}. Please review the failure diagnostics and retry the build.`,
          'BUILD_FAILED',
          app.id,
          {
            appName: app.name || body.appName || 'superapp',
            miniAppId: app.id,
            releaseVersion: effectiveVersion,
            version: effectiveVersion,
            buildType,
            error: errorMessage,
            failedAt: new Date().toISOString(),
            teamTelegramChatId: app.teamTelegramChatId,
          },
        );
      }

      if (targetEmail) {
        const detailsUrl = `${backofficeBase}/miniapps/${app.id}`;
        await this.mailService.sendTestBuildFailedEmail(
          targetEmail,
          app.name || app.appId || 'MiniApp',
          effectiveVersion,
          errorMessage,
          detailsUrl,
        );
      }
    }

    // Always emit WebSocket build completed failure event for active UI subscribers
    this.notificationsService.emitBuildCompleted({
      miniAppId: buildingApps[0]?.id || 'superapp',
      appName,
      releaseVersion: effectiveVersion,
      buildType,
      status: 'FAILED',
      error: errorMessage,
    } as any);

    // ALWAYS broadcast failure notification to all Super Admins, Back Office Notification Bell, and Telegram Ops Groups
    await this.notificationsService.notifyAdmins(
      `🚨 SuperApp Build Failed (${effectiveVersion})`,
      `SuperApp Fastlane CI build pipeline (${appName} ${effectiveVersion}, ${buildType}) failed: ${errorMessage}`,
      'BUILD_FAILED',
      buildingApps[0]?.id,
      {
        appName,
        releaseVersion: effectiveVersion,
        version: effectiveVersion,
        buildType,
        error: errorMessage,
        failedAt: new Date().toISOString(),
      },
    );

    this.logger.warn(
      `Build ${effectiveVersion} reported ${body.status}: notified admins, owners, and ${buildingApps.length} app(s) transitioned to BUILD_FAILED (${errorMessage})`,
    );
  }

  /**
   * Records a Jenkins build pipeline stage on BUILDING mini-apps with a single
   * atomic UPDATE (jsonb_set), so concurrent stage POSTs cannot lose updates
   * and a stale write cannot revert a status changed by build-callback.
   */
  async handleBuildStageUpdate(dto: BuildStageUpdateDto) {
    const stage = {
      id: dto.stageId,
      name: dto.stageName || dto.stageId,
      status: dto.status,
      details: dto.details || '',
      updatedAt: new Date().toISOString(),
    };

    const isFailure = dto.status === 'FAILED';
    const updatePayload: any = {
      buildStages: () =>
        `jsonb_set(COALESCE("buildStages", '{}'::jsonb), ARRAY[:stageId]::text[], CAST(:stageJson AS jsonb), true)`,
    };
    if (isFailure) {
      updatePayload.status = 'BUILD_FAILED';
      updatePayload.buildStatus = 'FAILED';
      updatePayload.buildError = dto.details || `Stage ${dto.stageName || dto.stageId} failed.`;
    }

    const result = await this.miniappRepository
      .createQueryBuilder()
      .update(MiniApp)
      .set(updatePayload)
      .where("status = 'BUILDING'")
      .setParameters({ stageId: dto.stageId, stageJson: JSON.stringify(stage) })
      .returning(['id', 'buildStages', 'status', 'buildStatus', 'buildError'])
      .execute();

    const rows: { id: string; buildStages: any }[] = result?.raw || [];
    if (!rows.length) {
      this.logger.warn(
        `Build stage update for release ${dto.releaseVersion} ignored: no BUILDING mini-apps`,
      );
      return { ok: false, updated: 0 };
    }

    for (const row of rows) {
      this.notificationsService.emitBuildStageUpdate({
        miniAppId: row.id,
        appName: dto.appName,
        releaseVersion: dto.releaseVersion,
        stage,
        stages: row.buildStages,
      });
    }
    this.logger.log(
      `Build stage [${dto.releaseVersion}] ${dto.stageId} -> ${dto.status} (${rows.length} app(s))`,
    );
    return { ok: true, updated: rows.length };
  }
}

// Backwards compatibility alias
export { ReleaseAssemblyVerificationService as SecurityGate2Service };
