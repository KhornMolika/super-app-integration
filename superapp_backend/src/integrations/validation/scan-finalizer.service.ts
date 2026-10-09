import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniApp } from '../../miniapps/entities/miniapp.entity';
import { MiniAppIssue } from '../../miniapps/entities/miniapp-issue.entity';
import { NotificationsService, MailService, PipelinePacerService } from '../../notifications';
import { AuditService } from '../../audit/audit.service';
import { ValidationFindingDto } from './validation-callback.controller';
import { resolveBackofficeBaseUrl } from '../../common/utils/network.utils';
import { getDefaultChecksForMethod } from './validation-stage.catalog';

@Injectable()
export class ScanFinalizerService {
  private readonly logger = new Logger(ScanFinalizerService.name);

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
    private readonly pipelinePacerService: PipelinePacerService,
  ) {}

  async finalizeScan(
    app: MiniApp,
    method: 'WEBVIEW' | 'FLUTTER_PACKAGE' | 'NATIVE_SDK' | 'DEEP_LINK',
    score: number,
    checks: Record<string, any>,
    findings: ValidationFindingDto[],
    fallbackReason?: string,
    sbom?: Record<string, any>,
  ): Promise<void> {
    await this.issueRepository.delete({
      miniAppId: app.id,
      type: 'SECURITY_CHECK',
    });

    const hasCriticalOrHigh = findings.some(
      (f) => f.severity === 'CRITICAL' || f.severity === 'HIGH',
    );
    const overallStatus: 'PASSED' | 'FAILED' = hasCriticalOrHigh ? 'FAILED' : 'PASSED';

    app.validationReport = {
      score,
      status: overallStatus,
      method,
      checks,
      findings,
      sbom: sbom || checks?.sbom?.manifest || null,
      activeChecks: app.securityChecks || getDefaultChecksForMethod(method),
      reportPath: `local-scan://${app.id}`,
      completedAt: new Date().toISOString(),
      engine: 'DYNAMIC_LOCAL_SECURITY_ENGINE',
      fallbackFromJenkins: Boolean(fallbackReason),
      fallbackReason: fallbackReason || null,
    };

    const hasPendingRevision = Boolean(app.pendingRevision);

    if (hasPendingRevision) {
      app.pendingRevision = {
        ...app.pendingRevision,
        validationReport: app.validationReport,
        validationStages: app.validationStages,
        validationStatus: overallStatus,
        revisionStatus: overallStatus === 'PASSED' ? 'IN_REVIEW' : 'DRAFT',
      };
    }

    if (overallStatus === 'PASSED') {
      await this.pipelinePacerService.paceValidationPass(app.name || app.appId);
      app.validationStatus = 'PASSED';
      const initialStatuses = ['DRAFT', 'SUBMITTED'];
      if (!hasPendingRevision && initialStatuses.includes(app.status)) {
        app.status = 'IN_REVIEW';
      }
      app.validationErrors = null;
      await this.miniappRepository.save(app);

      this.notificationsService.emitStageUpdate({
        miniAppId: app.id,
        stages: app.validationStages,
        validationStatus: 'PASSED',
        validationReport: app.validationReport,
      });

      await this.notificationsService.createNotification(
        app.ownerId || '',
        hasPendingRevision ? 'Revision Validation Passed' : 'Automated Validation Passed',
        hasPendingRevision
          ? `All configured ${method} security checks for pending revision passed (${score}/100). Live version remains active.`
          : initialStatuses.includes(app.status)
          ? `All configured ${method} security checks passed successfully (${score}/100). Status updated to IN_REVIEW.`
          : `All configured ${method} security checks passed (${score}/100). Status remains ${app.status}.`,
        'VALIDATION_SUCCESS',
        app.id,
      );

      const targetPassedEmail = app.ownerEmail || app.owner?.email;
      if (targetPassedEmail) {
        await this.mailService.sendValidationPassedEmail(
          targetPassedEmail,
          app.name || app.appId,
          score,
          `${this.backofficeBaseUrl}/miniapps/${app.id}`,
        );
      }

      await this.auditService.log({
        actorId: 'system:local-scanner',
        action: 'VALIDATION_PASSED',
        resourceType: 'MiniApp',
        resourceId: app.id,
        newValue: {
          status: app.status,
          validationStatus: 'PASSED',
          score,
          issuesCount: 0,
        },
      });
    } else {
      app.validationStatus = 'FAILED';
      const resetToDraftStatuses = ['DRAFT', 'SUBMITTED', 'IN_REVIEW'];
      if (!hasPendingRevision && resetToDraftStatuses.includes(app.status)) {
        app.status = 'DRAFT';
      }

      const issuesToCreate: MiniAppIssue[] = [];
      const actionableFindings = findings.filter(
        (f) => f.severity === 'CRITICAL' || f.severity === 'HIGH' || f.severity === 'MEDIUM',
      );

      for (const finding of actionableFindings) {
        issuesToCreate.push(
          this.issueRepository.create({
            miniAppId: app.id,
            type: 'SECURITY_CHECK',
            severity: finding.severity,
            description: `[${finding.id}] ${finding.title}: ${finding.description}. Remediation: ${finding.recommendation || 'Follow SuperApp security guide.'}`,
            status: 'OPEN',
            metadata: {
              findingId: finding.id,
              category: finding.category,
              engineId: finding.engineId || finding.category,
              filePath: finding.filePath,
              lineNumber: finding.lineNumber,
              cveId: finding.cveId,
              recommendation: finding.recommendation,
            },
          }),
        );
      }

      if (issuesToCreate.length > 0) {
        await this.issueRepository.save(issuesToCreate);
      }

      await this.miniappRepository.save(app);

      this.notificationsService.emitStageUpdate({
        miniAppId: app.id,
        stages: app.validationStages,
        validationStatus: 'FAILED',
        validationReport: app.validationReport,
      });

      await this.notificationsService.createNotification(
        app.ownerId || '',
        'Automated Validation Failed',
        `${app.name || 'MiniApp'} failed automated ${method} security checks with ${actionableFindings.length} issue(s) across security engines. Status reset to DRAFT.`,
        'ISSUE_CREATED',
        app.id,
      );

      const targetFailedEmail = app.ownerEmail || app.owner?.email;
      if (targetFailedEmail) {
        await this.mailService.sendValidationFailedEmail(
          targetFailedEmail,
          app.name || app.appId,
          score,
          actionableFindings.map((f) => ({
            severity: f.severity,
            title: f.title,
            description: f.description,
            recommendation: f.recommendation,
          })),
          `${this.backofficeBaseUrl}/miniapps/${app.id}`,
        );
      }

      await this.auditService.log({
        actorId: 'system:local-scanner',
        action: 'VALIDATION_FAILED',
        resourceType: 'MiniApp',
        resourceId: app.id,
        newValue: {
          status: 'DRAFT',
          validationStatus: 'FAILED',
          issuesCount: actionableFindings.length,
        },
      });
    }
  }
}
