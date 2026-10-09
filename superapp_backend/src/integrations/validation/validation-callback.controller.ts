import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniApp } from '../../miniapps/entities/miniapp.entity';
import { MiniAppIssue } from '../../miniapps/entities/miniapp-issue.entity';
import { NotificationsService, MailService } from '../../notifications';
import { AuditService } from '../../audit/audit.service';
import { resolveBackofficeBaseUrl } from '../../common/utils/network.utils';

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
  status: 'PASSED' | 'FAILED';
  score?: number;
  commitSha?: string;
  checks?: Record<string, any>;
  findings?: ValidationFindingDto[];
  sbom?: Record<string, any>;
  reportPath?: string;
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
  ) {}

  @Post('stage')
  @HttpCode(HttpStatus.OK)
  async handleStageUpdate(
    @Body()
    body: {
      miniAppId: string;
      stageId: string;
      stageName: string;
      status: string;
      details?: string;
    },
  ) {
    const { miniAppId, stageId, stageName, status, details } = body;
    if (!miniAppId || !stageId) return { ok: false };

    const app = await this.miniappRepository.findOne({
      where: { id: miniAppId },
    });
    if (!app) return { ok: false };

    const stages = app.validationStages || {};

    const STAGE_ALIASES: Record<string, string[]> = {
      dependency_scan: ['sca', 'dependency_scan'],
      sca: ['dependency_scan', 'sca'],
      license_audit: ['license_compliance', 'license_audit'],
      license_compliance: ['license_audit', 'license_compliance'],
      capability_gate: ['capability_gate', 'capability_analysis', 'permissions'],
      capability_analysis: ['capability_gate', 'capability_analysis', 'permissions'],
      malware: ['malware', 'malware_scan'],
      malware_scan: ['malware', 'malware_scan'],
    };

    const targetKeys = Array.from(new Set([stageId, ...(STAGE_ALIASES[stageId] || [])]));
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

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async handleValidationCallback(@Body() dto: ValidationCallbackDto) {
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

    // Clear old validation issues
    await this.issueRepository.delete({
      miniAppId: app.id,
      type: 'SECURITY_CHECK',
    });

    if (dto.commitSha) {
      if (!app.integrationConfig) app.integrationConfig = {};
      app.integrationConfig.commitSha = dto.commitSha;
      app.integrationConfig.lockedCommitSha = dto.commitSha;
    }

    app.validationReport = {
      score: dto.score,
      status: dto.status,
      method: dto.method,
      checks: dto.checks,
      findings: dto.findings || [],
      sbom: dto.sbom || dto.checks?.sbom?.manifest || null,
      reportPath: dto.reportPath,
      commitSha: dto.commitSha,
      completedAt: new Date().toISOString(),
    };

    // Finalize any pending or running stages based on checks or overall status
    const currentStages = app.validationStages || {};
    for (const [stageId, stageObj] of Object.entries(currentStages)) {
      const s = stageObj as any;
      if (s && (s.status === 'PENDING' || s.status === 'RUNNING')) {
        const checkResult = dto.checks?.[stageId];
        if (checkResult) {
          s.status = checkResult.passed !== false ? 'COMPLETED' : 'FAILED';
          if (checkResult.details) s.details = checkResult.details;
        } else if (dto.status === 'PASSED') {
          s.status = 'COMPLETED';
          if (!s.details || s.details.startsWith('Awaiting') || s.details.startsWith('Initiating')) {
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
        validationStatus: dto.status === 'PASSED' ? 'PASSED' : 'FAILED',
        revisionStatus: dto.status === 'PASSED' ? 'IN_REVIEW' : 'DRAFT',
      };
    }

    if (dto.status === 'PASSED') {
      app.validationStatus = 'PASSED';
      const initialStatuses = ['DRAFT', 'SUBMITTED'];
      if (!hasPendingRevision && initialStatuses.includes(app.status)) {
        app.status = 'IN_REVIEW';
      }
      app.validationErrors = null;

      await this.miniappRepository.save(app);

      await this.notificationsService.createNotification(
        app.ownerId || '',
        hasPendingRevision ? 'Revision Validation Passed' : 'Automated Validation Passed',
        hasPendingRevision
          ? `${app.name || 'MiniApp'} revision passed automated ${dto.method} validation (Score: ${dto.score}/100). Live version remains active.`
          : initialStatuses.includes(app.status)
          ? `${app.name || 'MiniApp'} passed automated ${dto.method} security validation (Score: ${dto.score}/100) and is now In Review.`
          : `${app.name || 'MiniApp'} security re-scan passed (${dto.score}/100). Status remains ${app.status}.`,
        'REVIEW_STARTED',
        app.id,
      );

      const targetEmail = app.ownerEmail || app.owner?.email;
      if (targetEmail) {
        await this.mailService.sendValidationPassedEmail(
          targetEmail,
          app.name || app.appId || 'MiniApp',
          dto.score ?? 100,
          `${this.backofficeBaseUrl}/miniapps/${app.id}`,
        );
      }

      await this.auditService.log({
        actorId: 'system:jenkins',
        action: 'VALIDATION_PASSED',
        resourceType: 'MiniApp',
        resourceId: app.id,
        newValue: {
          status: app.status,
          validationStatus: 'PASSED',
          score: dto.score,
        },
      });

      return {
        success: true,
        newStatus: app.status,
        validationStatus: 'PASSED',
      };
    } else {
      app.validationStatus = 'FAILED';
      const resetToDraftStatuses = ['DRAFT', 'SUBMITTED', 'IN_REVIEW'];
      if (!hasPendingRevision && resetToDraftStatuses.includes(app.status)) {
        app.status = 'DRAFT'; // Auto-reset to DRAFT for remediation if in pre-approval stage
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
        (f) => f.severity === 'CRITICAL' || f.severity === 'HIGH' || f.severity === 'MEDIUM',
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

      const targetEmail = app.ownerEmail || app.owner?.email;
      if (targetEmail) {
        await this.mailService.sendValidationFailedEmail(
          targetEmail,
          app.name || app.appId || 'MiniApp',
          dto.score ?? 0,
          (dto.findings || []).filter(
            (f) => f.severity === 'CRITICAL' || f.severity === 'HIGH',
          ),
          `${this.backofficeBaseUrl}/miniapps/${app.id}`,
        );
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
