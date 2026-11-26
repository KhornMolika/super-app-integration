import { MiniAppRunsService } from '../../miniapps/miniapp-runs.service';
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  BadRequestException,
  Optional,
  UseGuards,
} from '@nestjs/common';
import { CallbackTokenGuard } from '../release-assembly/callback-token.guard';
import { normalizeScanReport } from './scan-report.normalizer';
import { CapabilityGateService } from '../../capabilities/capability-gate.service';
import type { RawScanReport } from './scan-report.normalizer';
import { StorageService } from '../../storage/storage.service';
import { ScannedArtifactPublisherService } from './scanned-artifact-publisher.service';
import { PubspecInjectorService } from '../flutter/pubspec-injector.service';
import {
  detectMalwareFindings,
  executeMalwarePurge,
} from './helpers/malware-purge.helper';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isPgUuid } from '../../common/utils/uuid.util';
import { MiniApp } from '../../miniapps/entities/miniapp.entity';
import { MiniAppIssue } from '../../miniapps/entities/miniapp-issue.entity';
import { NotificationsService, MailService } from '../../notifications';
import { AuditService } from '../../audit/audit.service';
import { resolveBackofficeBaseUrl } from '../../common/utils/network.utils';
import { persistAppVersions } from '../../miniapps/versions/miniapp-versions.service';
import { JenkinsService } from '../jenkins/jenkins.service';

export interface ValidationFindingDto {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category?: string;
  title: string;
  description: string;
  engineId?: string;
  filePath?: string;
  lineNumber?: number;
  cveId?: string;
  recommendation?: string;
}

export interface ValidationCallbackDto {
  miniAppId: string;
  method: string;
  /** Older pipelines send the method under this name */
  integrationMethod?: string;
  status: 'PASSED' | 'FAILED';
  score?: number;
  commitSha?: string;
  checks?: Record<string, any>;
  findings?: ValidationFindingDto[];
  sbom?: Record<string, any>;
  reportPath?: string;
  buildNumber?: number | string;
  buildUrl?: string;
  jobName?: string;
}

@Controller(['integrations/validation', 'api/integrations/validation'])
export class ValidationCallbackController {
  private readonly logger = new Logger(ValidationCallbackController.name);
  private get backofficeBaseUrl(): string {
    return resolveBackofficeBaseUrl();
  }

  constructor(
    @InjectRepository(MiniApp)
    private readonly miniappRepository: Repository<MiniApp>,

    @InjectRepository(MiniAppIssue)
    private readonly issueRepository: Repository<MiniAppIssue>,

    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
    private readonly mailService: MailService,
    @Optional()
    private readonly storageService?: StorageService,
    @Optional()
    private readonly scannedArtifactPublisher?: ScannedArtifactPublisherService,
    @Optional()
    private readonly capabilityGate?: CapabilityGateService,
    @Optional()
    private readonly runs?: MiniAppRunsService,
    @Optional()
    private readonly jenkinsService?: JenkinsService,
    @Optional()
    private readonly pubspecService?: PubspecInjectorService,
  ) {}

  @Post('stage')
  @HttpCode(HttpStatus.OK)
  // Only Jenkins may report results: an open callback let anyone mark a scan PASSED
  @UseGuards(CallbackTokenGuard)
  async handleStageUpdate(
    @Body()
    body: {
      miniAppId: string;
      stageId: string;
      stageName: string;
      status: string;
      details?: string;
      buildNumber?: number | string;
      buildUrl?: string;
      jobName?: string;
    },
  ) {
    const { miniAppId, stageId, stageName, status, details, buildNumber, buildUrl, jobName } = body;
    if (!miniAppId || !stageId) return { ok: false };

    const app = await this.miniappRepository.findOne({
      where: { id: miniAppId },
    });
    if (!app) return { ok: false };
    await this.runs?.loadScanInProgress(app);

    if (buildNumber || buildUrl || jobName) {
      app.validationReport = {
        ...(app.validationReport || {}),
        ...(buildNumber ? { buildNumber } : {}),
        ...(buildUrl ? { buildUrl } : {}),
        ...(jobName ? { jobName } : {}),
      };
    }

    const stages = app.validationStages || {};

    const STAGE_ALIASES: Record<string, string[]> = {
      dependency_scan: ['sca', 'dependency_scan'],
      sca: ['dependency_scan', 'sca'],
      license_audit: ['license_compliance', 'license_audit'],
      license_compliance: ['license_audit', 'license_compliance'],
      capability_gate: [
        'capability_gate',
        'capability_analysis',
        'permissions',
      ],
      capability_analysis: [
        'capability_gate',
        'capability_analysis',
        'permissions',
      ],
      malware: ['malware', 'malware_scan'],
      malware_scan: ['malware', 'malware_scan'],
    };

    const targetKeys = Array.from(
      new Set([stageId, ...(STAGE_ALIASES[stageId] || [])]),
    );
    for (const key of targetKeys) {
      const existing = stages[key] || {};
      stages[key] = {
        id: key,
        order: existing.order !== undefined ? existing.order : undefined,
        name: stageName || existing.name || key,
        status,
        details: details || existing.details || '',
        updatedAt: new Date().toISOString(),
        ...(existing.tool ? { tool: existing.tool } : {}),
        ...(existing.icon ? { icon: existing.icon } : {}),
      };
    }

    app.validationStages = stages;
    await this.miniappRepository.save(app);
    await persistAppVersions(this.miniappRepository, app);
    await this.runs?.syncScan(app);

    this.notificationsService.emitStageUpdate({
      miniAppId,
      stage: stages[stageId],
      stages,
    });

    this.logger.log(
      `Stage update [${miniAppId}] ${stageId} (${stageName}) -> ${status}`,
    );
    return { ok: true };
  }

  /**
   * The Flutter package scan pipeline posts each tool's raw output here; the
   * findings and the verdict are worked out by normalizeScanReport.
   */
  @Post('scan-report')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CallbackTokenGuard)
  async handleScanReport(@Body() raw: RawScanReport) {
    if (!raw || !isPgUuid(raw.miniAppId)) {
      throw new BadRequestException('miniAppId must be a valid MiniApp UUID');
    }
    const input: RawScanReport = { ...raw, capabilityGate: undefined };
    // The capability check is the shared catalog gate (versions, required vs optional)
    if (this.capabilityGate) {
      const app = await this.miniappRepository.findOne({ where: { id: raw.miniAppId } });
      if (app) {
        const checks: Record<string, any> = {};
        const findings: any[] = [];
        await this.capabilityGate.runStage(app, { capability_gate: {} }, checks, findings, async () => {});
        if (checks.capability_gate) input.capabilityGate = { check: checks.capability_gate, findings };
      }
    }
    const dto = normalizeScanReport(input);
    dto.reportPath = await this.archiveScanReport(raw, dto);
    return this.handleValidationCallback(dto);
  }

  /**
   * Keeps the full scan (raw tool output + the verdict) in MinIO:
   * reports/security/{miniAppId}/{version}/{time}-scan.json, plus the SBOM.
   * Returns its key, or undefined when MinIO is unavailable (the result still counts).
   */
  private async archiveScanReport(raw: RawScanReport, result: ValidationCallbackDto): Promise<string | undefined> {
    if (!this.storageService) return undefined;
    const rawVersion = String(raw.ingest?.version || '').trim();
    const version = /^[0-9A-Za-z.+_-]{1,64}$/.test(rawVersion) ? rawVersion : 'unknown';
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const folder = `reports/security/${raw.miniAppId}/${version}`;
    const key = `${folder}/${stamp}-scan.json`;
    try {
      const bucket = this.storageService.packageSubmissionsBucket;
      const { sbom, ...rest } = raw;
      await this.storageService.putPrivateObject(
        bucket,
        key,
        Buffer.from(JSON.stringify({ storedAt: new Date().toISOString(), result: { ...result, sbom: undefined }, raw: rest }, null, 2)),
        'application/json',
      );
      if (sbom) {
        await this.storageService.putPrivateObject(bucket, `${folder}/${stamp}-sbom.cdx.json`, Buffer.from(JSON.stringify(sbom)), 'application/vnd.cyclonedx+json');
      }
      return key;
    } catch (err: any) {
      this.logger.warn(`Could not store the scan report of ${raw.miniAppId} in MinIO (${key}): ${err?.message || err}`);
      return undefined;
    }
  }

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  // Only Jenkins may report results: an open callback let anyone mark a scan PASSED
  @UseGuards(CallbackTokenGuard)
  async handleValidationCallback(@Body() dto: ValidationCallbackDto) {
    // Checked here rather than with a class DTO: the global ValidationPipe uses
    // whitelist, which would strip the free-form report fields Jenkins sends.
    if (!dto || !isPgUuid(dto.miniAppId)) {
      throw new BadRequestException('miniAppId must be a valid MiniApp UUID');
    }
    if (dto.status !== 'PASSED' && dto.status !== 'FAILED') {
      throw new BadRequestException("status must be 'PASSED' or 'FAILED'");
    }
    if (!dto.method && dto.integrationMethod) dto.method = dto.integrationMethod;
    this.logger.log(
      `Received validation callback for MiniApp ${dto.miniAppId}: status = ${dto.status}, score = ${dto.score}`,
    );

    const app = await this.miniappRepository.findOne({
      where: { id: dto.miniAppId },
      relations: { owner: true },
    });
    if (!app) {
      this.logger.error(
        `Validation callback failed: MiniApp ${dto.miniAppId} not found`,
      );
      throw new NotFoundException(`MiniApp ${dto.miniAppId} not found`);
    }
    await this.runs?.loadScanInProgress(app);

    // Clear old validation issues
    await this.issueRepository.delete({
      miniAppId: app.id,
      type: 'SECURITY_CHECK',
    });

    if (dto.checks?.capability_gate?.passed === true) {
      await this.issueRepository
        .createQueryBuilder()
        .delete()
        .from(MiniAppIssue)
        .where('"miniAppId" = :appId', { appId: app.id })
        .andWhere(
          '(LOWER(description) LIKE :capNotRec OR LOWER(description) LIKE :capNotSup)',
          {
            capNotRec: '%capability%not recognized%',
            capNotSup: '%capability%not supported%',
          },
        )
        .execute();
    }

    // The commit the scan checked out: the build uses the same one (gitRefOf).
    // Only a full SHA, on the config that was scanned (the new version's, if any).
    if (dto.commitSha && /^[0-9a-f]{40}$/i.test(dto.commitSha)) {
      const rev = app.pendingRevision as any;
      if (rev?.integrationConfig) {
        app.pendingRevision = {
          ...rev,
          integrationConfig: { ...rev.integrationConfig, commitSha: dto.commitSha, lockedCommitSha: dto.commitSha },
        };
      } else {
        if (!app.integrationConfig) app.integrationConfig = {};
        app.integrationConfig.commitSha = dto.commitSha;
        app.integrationConfig.lockedCommitSha = dto.commitSha;
      }
    }

    const prevReport = (app.validationReport as any) || {};
    const isSubsetScan =
      dto.checks &&
      Object.keys(dto.checks).length > 0 &&
      prevReport.checks &&
      Object.keys(prevReport.checks).length > Object.keys(dto.checks).length;

    let finalChecks = dto.checks;
    let finalFindings = dto.findings || [];
    let finalScore = dto.score;
    let finalStatus = dto.status;
    let finalSbom =
      dto.sbom || dto.checks?.sbom?.manifest || prevReport.sbom || null;

    if (isSubsetScan) {
      finalChecks = { ...(prevReport.checks || {}), ...(dto.checks || {}) };
      const scannedEngines = Object.keys(dto.checks || {});
      const retainedFindings = (prevReport.findings || []).filter(
        (f: any) =>
          !scannedEngines.includes(f.engineId) &&
          !scannedEngines.includes(f.category?.toLowerCase()),
      );
      finalFindings = [...retainedFindings, ...(dto.findings || [])];

      // Recompute score
      const count = (s: string) =>
        finalFindings.filter(
          (f: any) => f.severity === s && f.category !== 'REPORT',
        ).length;
      finalScore = Math.max(
        0,
        100 -
          25 * count('CRITICAL') -
          10 * count('HIGH') -
          3 * count('MEDIUM') -
          count('LOW'),
      );
      finalStatus = (Object.values(finalChecks || {}).every((c: any) => c.passed) && count('CRITICAL') === 0 && count('HIGH') === 0)
        ? 'PASSED'
        : 'FAILED';
    }

    const hasBlockingFindings = finalFindings.some(
      (f: any) =>
        (f.severity || '').toUpperCase() === 'CRITICAL' ||
        (f.severity || '').toUpperCase() === 'HIGH',
    );
    const hasFailedCheck = Object.values(finalChecks || {}).some(
      (c: any) => c.passed === false,
    );
    const hasBlockingIssues = (app.issues || []).some(
      (iss: any) =>
        (iss.severity || '').toUpperCase() === 'CRITICAL' ||
        ((iss.severity || '').toUpperCase() === 'HIGH' && iss.type === 'VALIDATION_ERROR'),
    );

    if (hasBlockingFindings || hasFailedCheck || hasBlockingIssues) {
      finalStatus = 'FAILED';
      finalScore = Math.min(finalScore ?? 45, 45);
    }

    app.validationReport = {
      score: finalScore,
      status: finalStatus,
      method: dto.method,
      checks: finalChecks,
      findings: finalFindings,
      sbom: finalSbom,
      reportPath: dto.reportPath || prevReport.reportPath,
      commitSha: dto.commitSha || prevReport.commitSha,
      buildNumber: dto.buildNumber || prevReport.buildNumber,
      buildUrl: dto.buildUrl || prevReport.buildUrl,
      jobName: dto.jobName || prevReport.jobName,
      completedAt: new Date().toISOString(),
    };

    // Finalize any pending or running stages based on checks or overall status
    const currentStages = app.validationStages || {};
    for (const [stageId, stageObj] of Object.entries(currentStages)) {
      const s = stageObj as any;
      const checkResult = finalChecks?.[stageId];
      if (s && checkResult) {
        // The final report decides, also for a stage the pipeline already marked done
        s.status = checkResult.passed !== false ? 'COMPLETED' : 'FAILED';
        if (checkResult.details) s.details = checkResult.details;
        s.updatedAt = new Date().toISOString();
      } else if (s && (s.status === 'PENDING' || s.status === 'RUNNING')) {
        if (finalStatus === 'PASSED') {
          s.status = 'COMPLETED';
          if (
            !s.details ||
            s.details.startsWith('Awaiting') ||
            s.details.startsWith('Initiating')
          ) {
            s.details = 'Verification completed.';
          }
        }
        s.updatedAt = new Date().toISOString();
      }
    }
    app.validationStages = currentStages;

    const hasPendingRevision = Boolean(app.pendingRevision);

    if (hasPendingRevision) {
      app.pendingRevision = {
        ...app.pendingRevision,
        validationReport: app.validationReport,
        validationStages: app.validationStages,
        validationStatus: finalStatus === 'PASSED' ? 'PASSED' : 'FAILED',
        revisionStatus: finalStatus === 'PASSED' ? 'IN_REVIEW' : 'DRAFT',
      };
    }

    if (finalStatus === 'PASSED') {
      app.validationStatus = 'PASSED';
      const initialStatuses = ['DRAFT', 'SUBMITTED'];
      if (
        (!hasPendingRevision || app.appStatus !== 'LIVE') &&
        initialStatuses.includes(app.lifecycleStatus)
      ) {
        app.lifecycleStatus = 'IN_REVIEW';
      }
      app.validationErrors = null;

      await this.miniappRepository.save(app);
      await persistAppVersions(this.miniappRepository, app);
      await this.runs?.syncScan(app);

      await this.notificationsService.createNotification(
        app.ownerId || '',
        hasPendingRevision
          ? 'Revision Validation Passed'
          : 'Automated Validation Passed',
        hasPendingRevision
          ? `${app.name || 'MiniApp'} revision passed automated ${dto.method} validation (Score: ${dto.score}/100). Live version remains active.`
          : initialStatuses.includes(app.lifecycleStatus)
            ? `${app.name || 'MiniApp'} passed automated ${dto.method} security validation (Score: ${dto.score}/100) and is now In Review.`
            : `${app.name || 'MiniApp'} security re-scan passed (${dto.score}/100). Status remains ${app.lifecycleStatus}.`,
        'REVIEW_STARTED',
        app.id,
      );

      const targetEmail =
        app.supportEmail || app.owner?.email || (app as any).ownerEmail;
      if (targetEmail) {
        try {
          await this.mailService.sendValidationPassedEmail(
            targetEmail,
            app.name || app.appId || 'MiniApp',
            dto.score ?? 100,
            `${this.backofficeBaseUrl}/miniapps/${app.id}`,
          );
        } catch (mailErr: any) {
          this.logger.warn(`Failed to deliver validation passed email to ${targetEmail}: ${mailErr?.message || mailErr}`);
        }
      }

      await this.auditService.log({
        actorId: 'system:jenkins',
        action: 'VALIDATION_PASSED',
        resourceType: 'MiniApp',
        resourceId: app.id,
        newValue: {
          status: app.lifecycleStatus,
          validationStatus: 'PASSED',
          score: dto.score,
        },
      });

      // Scan passed: the uploaded package / SDK goes from MinIO quarantine to Nexus.
      // Last, after every save of `app` here (a later save would drop what it records),
      // and not awaited, so Jenkins gets its answer without waiting for Nexus.
      void this.scannedArtifactPublisher?.publishAfterPassedScan(app.id).then(async () => {
        // MILESTONE 1: Auto-inject and rebuild Web Sandbox Preview so Admins & Devs can test live in IN_REVIEW
        if ((app.integrationMethod || '').toUpperCase() === 'FLUTTER_PACKAGE' && this.pubspecService) {
          try {
            await this.pubspecService.injectMiniApp(app);
            await this.pubspecService.regenerateRegistry();
            void this.pubspecService.triggerSandboxRebuild(`Jenkins scan passed for ${app.name}`);
            this.logger.log(`Triggered Web Sandbox Preview auto-build on Jenkins scan pass for ${app.appId}`);
          } catch (err: any) {
            this.logger.warn(`Sandbox auto-build on Jenkins scan pass warning for ${app.appId}: ${err?.message || err}`);
          }
        }
      }).catch(() => {});

      return {
        success: true,
        newStatus: app.lifecycleStatus,
        validationStatus: 'PASSED',
      };
    } else {
      app.validationStatus = 'FAILED';

      // ZERO-TRUST MALWARE AUTO-PURGE & FORENSIC INCIDENT LOGGING
      const malwareFindings = detectMalwareFindings(dto.findings || []);
      if (malwareFindings.length > 0) {
        const purgeResult = await executeMalwarePurge(
          app,
          malwareFindings,
          this.storageService,
          this.logger,
        );
        if (purgeResult.report) {
          (app.validationReport ||= {}).malwareIncident = purgeResult.report;

          await this.auditService.log({
            actorId: 'system:jenkins',
            action: 'MALWARE_DETECTED_AND_PURGED',
            resourceType: 'MiniApp',
            resourceId: app.id,
            newValue: {
              status: app.lifecycleStatus,
              validationStatus: 'FAILED',
              malwareIncident: purgeResult.report,
            },
          });

          // Urgent in-app notification to developer (also dispatches to Telegram if configured)
          await this.notificationsService.createNotification(
            app.ownerId || '',
            'CRITICAL: Package Quarantined & Purged',
            `The package submitted for ${app.name || app.appId} was permanently purged due to detected malware/security violations (${malwareFindings.length} threat signature(s)).`,
            'HIGH',
            app.id,
          );

          // Dedicated high-priority security incident email to developer
          const targetEmail =
            app.supportEmail || app.owner?.email || (app as any).ownerEmail;
          if (targetEmail) {
            try {
              await this.mailService.sendMalwareIncidentEmail(
                targetEmail,
                app.name || app.appId || 'MiniApp',
                purgeResult.report.threatSignatures,
                purgeResult.report.purgedFiles,
                purgeResult.report.detectedAt,
                `${this.backofficeBaseUrl}/miniapps/${app.id}`,
              );
            } catch (mailErr: any) {
              this.logger.warn(
                `Failed to deliver malware incident email to ${targetEmail}: ${mailErr?.message || mailErr}`,
              );
            }
          }
        }
      }

      // Check if the failure is SOLELY due to platform / scanner infrastructure errors
      const isPlatformFailureOnly =
        (dto.findings || []).length > 0 &&
        (dto.findings || []).every(
          (f) =>
            f.category === 'SCANNER_ERROR' ||
            f.category === 'PLATFORM_ERROR' ||
            f.category === 'REPORT' ||
            f.id.startsWith('SCANNER_ERROR_'),
        );

      const existingRetries = Number(
        (app.validationReport as any)?.autoRetryAttempt || 0,
      );

      // Attempt 1 automatic retry if this was purely a platform failure
      if (isPlatformFailureOnly && existingRetries < 1 && this.jenkinsService) {
        this.logger.warn(
          `Platform scanner error encountered for MiniApp ${app.id}. Initiating automatic retry (Attempt 1/1)...`,
        );

        app.validationStatus = 'RUNNING';
        app.validationReport = {
          ...app.validationReport,
          autoRetryAttempt: existingRetries + 1,
          failureType: 'INFRASTRUCTURE_RETRYING',
        };

        const stages = app.validationStages || {};
        for (const st of Object.values(stages) as any[]) {
          if (st.status === 'FAILED') {
            st.status = 'RUNNING';
            st.details =
              'Platform glitch detected. Automatically retrying scan (Attempt 1/1)...';
          }
        }
        app.validationStages = stages;
        await this.miniappRepository.save(app);
        await persistAppVersions(this.miniappRepository, app);
        await this.runs?.syncScan(app);

        // Re-trigger Jenkins scan
        const cfg = app.integrationConfig || {};
        void this.jenkinsService.triggerMiniAppValidation({
          miniAppId: app.id,
          integrationMethod: (dto.method || app.integrationMethod) as any,
          packageName: cfg.packageName || cfg.name || app.name,
          version: cfg.packageVersion || cfg.version || '1.0.0',
          integrationType: cfg.packageStoragePath ? 'ARTIFACT' : 'SOURCE_CODE',
          sourceStoragePath: cfg.packageStoragePath || undefined,
          repoUrl: cfg.repoUrl || undefined,
          commitSha: dto.commitSha || cfg.commitSha || undefined,
        });

        return {
          success: true,
          status: 'RETRYING',
          message: 'Automatic retry initiated for platform scanner error',
        };
      }

      if (isPlatformFailureOnly) {
        (app.validationReport ||= {}).failureType = 'INFRASTRUCTURE';
        // DO NOT reset app.lifecycleStatus to DRAFT on platform infrastructure failures!
      } else {
        (app.validationReport ||= {}).failureType = 'SECURITY_VIOLATION';
        const resetToDraftStatuses = ['DRAFT', 'SUBMITTED', 'IN_REVIEW'];
        if (
          !hasPendingRevision &&
          resetToDraftStatuses.includes(app.lifecycleStatus)
        ) {
          app.lifecycleStatus = 'DRAFT'; // Auto-reset to DRAFT for remediation if in pre-approval stage
        }
      }

      // Mark running/pending stages as FAILED
      const stages = app.validationStages || {};
      let updatedAny = false;
      Object.keys(stages).forEach((key) => {
        if (stages[key].status === 'RUNNING') {
          stages[key].status = 'FAILED';
          stages[key].details =
            dto.checks?.pipeline?.details ||
            stages[key].details ||
            'Stage failed or scanner error encountered.';
          updatedAny = true;
        }
      });
      if (!updatedAny && Object.keys(stages).length > 0) {
        const firstIncomplete = Object.keys(stages).find(
          (k) => stages[k].status !== 'COMPLETED',
        );
        if (firstIncomplete) {
          stages[firstIncomplete].status = 'FAILED';
          stages[firstIncomplete].details =
            dto.checks?.pipeline?.details || 'Stage failed.';
        }
      }
      app.validationStages = stages;

      // Log findings as MiniAppIssues (handling N multiple issues from Jenkins)
      const issuesToCreate: MiniAppIssue[] = [];
      const actionableFindings = (dto.findings || []).filter(
        (f) =>
          f.severity === 'CRITICAL' ||
          f.severity === 'HIGH' ||
          f.severity === 'MEDIUM',
      );

      for (const finding of actionableFindings) {
        issuesToCreate.push(
          this.issueRepository.create({
            miniAppId: app.id,
            type: 'SECURITY_CHECK',
            severity: finding.severity,
            description: `[${finding.id}] ${finding.title}: ${finding.description}. Remediation: ${finding.recommendation || 'Follow SuperApp security guidelines.'}`,
            status: 'OPEN',
            metadata: {
              findingId: finding.id,
              category: finding.category,
              engineId: (finding as any).engineId || finding.category,
              filePath: (finding as any).filePath,
              lineNumber: (finding as any).lineNumber,
              cveId: (finding as any).cveId,
              recommendation: finding.recommendation,
            },
          }),
        );
      }

      if (issuesToCreate.length > 0) {
        await this.issueRepository.save(issuesToCreate);
      }

      if (dto.sbom) {
        if (!app.validationReport) app.validationReport = {};
        app.validationReport.sbom = dto.sbom;
      }

      await this.miniappRepository.save(app);
      await persistAppVersions(this.miniappRepository, app);
      await this.runs?.syncScan(app);

      // Real-time stage update to immediately stop frontend spinners
      this.notificationsService.emitStageUpdate({
        miniAppId: app.id,
        stages: app.validationStages,
        validationStatus: 'FAILED',
        validationReport: app.validationReport,
      });

      await this.notificationsService.createNotification(
        app.ownerId || '',
        'Automated Validation Failed',
        `${app.name || 'MiniApp'} failed automated ${dto.method} security checks with ${actionableFindings.length} issue(s) across engines. Status reset to DRAFT.`,
        'ISSUE_CREATED',
        app.id,
      );

      const targetEmail =
        app.supportEmail || app.owner?.email || (app as any).ownerEmail;
      if (targetEmail) {
        try {
          await this.mailService.sendValidationFailedEmail(
            targetEmail,
            app.name || app.appId || 'MiniApp',
            dto.score ?? 0,
            (dto.findings || []).filter(
              (f) => f.severity === 'CRITICAL' || f.severity === 'HIGH',
            ),
            `${this.backofficeBaseUrl}/miniapps/${app.id}`,
          );
        } catch (mailErr: any) {
          this.logger.warn(`Failed to deliver validation failed email to ${targetEmail}: ${mailErr?.message || mailErr}`);
        }
      }

      await this.auditService.log({
        actorId: 'system:jenkins',
        action: 'VALIDATION_FAILED',
        resourceType: 'MiniApp',
        resourceId: app.id,
        newValue: {
          status: 'DRAFT',
          validationStatus: 'FAILED',
          issuesCount: actionableFindings.length,
        },
      });

      return {
        success: true,
        newStatus: 'DRAFT',
        validationStatus: 'FAILED',
        issuesCount: actionableFindings.length,
      };
    }
  }
}
