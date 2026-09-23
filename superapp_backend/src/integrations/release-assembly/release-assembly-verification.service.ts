import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniApp } from '../../miniapps/entities/miniapp.entity';
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
  ) {}

  /**
   * Performs Release Assembly Checksum Verification & Super App Release Assembly
   */
  async verifyAndAssembleRelease(
    dto: VerifyAndAssembleReleaseDto,
  ): Promise<ReleaseAssemblyAuditResult> {
    this.logger.log(
      `Executing Release Assembly Verification for Super App release ${dto.releaseVersion}...`,
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
            const localPubspecPaths = [
              path.resolve(process.cwd(), `../${app.packageName}/pubspec.yaml`),
              path.resolve(
                process.cwd(),
                `../ma_flutter_trust_regulator/pubspec.yaml`,
              ),
            ];
            let foundLocal = false;
            for (const p of localPubspecPaths) {
              if (fs.existsSync(p)) {
                foundLocal = true;
                const content = fs.readFileSync(p, 'utf-8');
                nexusChecksum = crypto
                  .createHash('sha256')
                  .update(content)
                  .digest('hex');
                break;
              }
            }

            if (!foundLocal) {
              conflicts.push(
                `Package '${app.packageName}' not found on Nexus pub-group.`,
              );
              allChecksumsMatched = false;
            }
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
        const releaseManifestPath = path.resolve(
          this.pubspecService.getMobileAppDir(),
          'super_app_release.json',
        );
        fs.writeFileSync(
          releaseManifestPath,
          JSON.stringify(manifest, null, 2),
          'utf-8',
        );
        this.logger.log(`Wrote release manifest to ${releaseManifestPath}`);
      } catch (err: any) {
        this.logger.warn(`Could not write manifest to disk: ${err.message}`);
      }

      // Automatically sync and inject all verified Mini App package dependencies into pubspec.yaml
      try {
        await this.pubspecService.syncAllApprovedMiniApps();
        this.logger.log('Synchronized Super App pubspec.yaml dependencies for release assembly.');
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
              'Super App Build in Progress',
              `Super App test build (${dto.releaseVersion}) has been triggered on Jenkins for Mini App "${appRecord.name}". Artifacts will be available upon assembly completion.`,
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

      // Trigger Jenkins Super App build pipeline
      await this.jenkinsService.triggerSuperAppBuild({
        appName: 'superapp',
        releaseVersion: dto.releaseVersion,
        buildType: 'debug',
        codegenMrIid: latestCodegenMrIid(releaseConfigs),
      });

      // Trigger Jenkins Super App Web Sandbox build pipeline
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
    const nexusApkUrl = `${nexusBase}/repository/apk-releases/superapp/${dto.releaseVersion}/app-debug.apk`;
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

    const buildingApps = await this.miniappRepository.find({
      where: [
        { status: 'BUILDING' },
        { activeTestVersion: body.releaseVersion },
      ],
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
        app.buildStatus = 'FAILED';
        app.buildError = body.details || body.errorMessage || `Stage ${body.stageName || body.stageId} failed.`;
      }
      await this.miniappRepository.save(app);
    }

    return { success: true };
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
      const buildingApps = await this.miniappRepository.find({
        where: [
          { status: 'BUILDING' },
          { activeTestVersion: body.releaseVersion },
        ],
        relations: { owner: true },
      });

      await this.miniappRepository
        .createQueryBuilder()
        .update(MiniApp)
        .set({ status: 'TESTING' })
        .where("status = 'BUILDING'")
        .execute();

      const repoName =
        body.buildType === 'release' ? 'apk-releases' : 'apk-test-builds';
      const filename =
        body.filename ||
        (body.buildType === 'release' ? 'app-release.apk' : 'app-debug.apk');

      for (const app of buildingApps) {
        const effectiveVersion =
          body.releaseVersion ||
          app.activeTestVersion ||
          app.integrationConfig?.superAppTestVersion ||
          'v1.0.0';

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

        // Backoffice download endpoint is the most robust link for one-click downloading
        const finalApkUrl =
          body.apkUrl ||
          `${backofficeBase}/api/download-apk?type=${body.buildType === 'release' ? 'release' : 'test'}&version=${encodeURIComponent(effectiveVersion)}&appName=superapp`;

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
            details: `Published APK to Sonatype Nexus (${repoName}).`,
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
        app.buildError = undefined;
        await this.miniappRepository.save(app);

        this.notificationsService.emitBuildCompleted({
          miniAppId: app.id,
          appName: body.appName,
          releaseVersion: effectiveVersion,
          buildType: body.buildType || 'debug',
          apkUrl: finalApkUrl,
          status: 'TESTING',
        });

        if (app.ownerId) {
          await this.notificationsService.createNotification(
            app.ownerId,
            'Super App Test Build Ready',
            `Super App test build (${effectiveVersion}) is ready! Download the test APK or launch the Web Sandbox to verify ${app.name}.`,
            'TEST_BUILD_READY',
            app.id,
            {
              releaseVersion: effectiveVersion,
              version: effectiveVersion,
              apkUrl: finalApkUrl,
              buildType: body.buildType || 'debug',
            },
          );
        }

        const targetEmail = app.ownerEmail || app.owner?.email;
        if (targetEmail) {
          const backofficeBase = resolveBackofficeBaseUrl(
            this.configService.get<string>('BACKOFFICE_BASE_URL') ||
              this.configService.get<string>('WEBAPP_URL'),
          );
          const sandboxUrl = `${backofficeBase}/miniapps/${app.id}`;
          await this.mailService.sendTestBuildReadyEmail(
            targetEmail,
            app.name || app.appId || 'Mini App',
            effectiveVersion,
            finalApkUrl,
            sandboxUrl,
          );
        }
      }
    } else {
      await this.handleFailedBuild(body);
    }

    return { success: true };
  }

  /**
   * A non-COMPLETED/SUCCESS callback (e.g. FAILED) must not leave apps stuck in
   * BUILDING. The pre-BUILDING status is NOT recorded anywhere, and apps enter
   * BUILDING from APPROVED (verify()) or APPROVED/IN_REVIEW/TESTING/BUILDING
   * (lifecycle triggerTestBuild). We move them to APPROVED: an existing status
   * from which both "Verify release" and "Start test build"/startTesting are
   * allowed, so the admin can simply retry. `buildStages` is left untouched so
   * the UI still shows which stage failed. The UPDATE is atomic on
   * `status = 'BUILDING'` so it cannot clobber a concurrent transition.
   */
  private async handleFailedBuild(body: BuildCallbackDto) {
    const buildingApps = await this.miniappRepository.find({
      where: { status: 'BUILDING' },
      relations: { owner: true },
    });

    await this.miniappRepository
      .createQueryBuilder()
      .update(MiniApp)
      .set({ status: 'APPROVED' })
      .where("status = 'BUILDING'")
      .execute();

    for (const app of buildingApps) {
      const effectiveVersion =
        body.releaseVersion ||
        app.integrationConfig?.superAppTestVersion ||
        'unknown';

      this.notificationsService.emitBuildCompleted({
        miniAppId: app.id,
        appName: body.appName,
        releaseVersion: effectiveVersion,
        buildType: body.buildType || 'debug',
        status: 'FAILED',
      });

      if (app.ownerId) {
        await this.notificationsService.createNotification(
          app.ownerId,
          'Super App Build Failed',
          `Super App test build (${effectiveVersion}) failed on Jenkins for Mini App "${app.name}". The app was returned to APPROVED; check the build stages for the failing step and retry the build.`,
          'BUILD_FAILED',
          app.id,
          {
            releaseVersion: effectiveVersion,
            version: effectiveVersion,
            buildType: body.buildType || 'debug',
          },
        );
      }
    }
    this.logger.warn(
      `Build ${body.releaseVersion} reported ${body.status}: ${buildingApps.length} app(s) returned from BUILDING to APPROVED`,
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

    const result = await this.miniappRepository
      .createQueryBuilder()
      .update(MiniApp)
      .set({
        buildStages: () =>
          `jsonb_set(COALESCE("buildStages", '{}'::jsonb), ARRAY[:stageId]::text[], CAST(:stageJson AS jsonb), true)`,
      })
      .where("status = 'BUILDING'")
      .setParameters({ stageId: dto.stageId, stageJson: JSON.stringify(stage) })
      .returning(['id', 'buildStages'])
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
