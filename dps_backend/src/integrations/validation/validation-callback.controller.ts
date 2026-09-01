import { Controller, Post, Body, HttpCode, HttpStatus, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniApp } from '../../miniapps/entities/miniapp.entity';
import { MiniAppIssue } from '../../miniapps/entities/miniapp-issue.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { AuditService } from '../../audit/audit.service';

export interface ValidationFindingDto {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category?: string;
  title: string;
  description: string;
  recommendation?: string;
}

export interface ValidationCallbackDto {
  miniAppId: string;
  method: string;
  status: 'PASSED' | 'FAILED';
  score?: number;
  checks?: Record<string, any>;
  findings?: ValidationFindingDto[];
  reportPath?: string;
}

@Controller(['integrations/validation', 'api/integrations/validation'])
export class ValidationCallbackController {
  private readonly logger = new Logger(ValidationCallbackController.name);

  constructor(
    @InjectRepository(MiniApp)
    private readonly miniappRepository: Repository<MiniApp>,

    @InjectRepository(MiniAppIssue)
    private readonly issueRepository: Repository<MiniAppIssue>,

    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async handleValidationCallback(@Body() dto: ValidationCallbackDto) {
    this.logger.log(`Received validation callback for Mini App ${dto.miniAppId}: status = ${dto.status}, score = ${dto.score}`);

    const app = await this.miniappRepository.findOne({ where: { id: dto.miniAppId } });
    if (!app) {
      this.logger.error(`Validation callback failed: Mini App ${dto.miniAppId} not found`);
      throw new NotFoundException(`Mini App ${dto.miniAppId} not found`);
    }

    // Clear old validation issues
    await this.issueRepository.delete({ miniAppId: app.id, type: 'SECURITY_CHECK' });

    if (dto.status === 'PASSED') {
      app.validationStatus = 'PASSED';
      app.status = 'IN_REVIEW';
      app.validationErrors = null;

      await this.miniappRepository.save(app);

      await this.notificationsService.createNotification(
        app.ownerId || '',
        'Automated Validation Passed',
        `${app.name || 'Mini App'} passed automated ${dto.method} security validation (Score: ${dto.score}/100) and is now In Review.`,
        'REVIEW_STARTED',
        app.id
      );

      await this.auditService.log({
        actorId: 'system:jenkins',
        action: 'VALIDATION_PASSED',
        resourceType: 'MiniApp',
        resourceId: app.id,
        newValue: { status: 'IN_REVIEW', validationStatus: 'PASSED', score: dto.score },
      });

      return { success: true, newStatus: 'IN_REVIEW', validationStatus: 'PASSED' };
    } else {
      app.validationStatus = 'FAILED';
      app.status = 'DRAFT'; // Auto-reset to DRAFT for remediation

      // Log findings as MiniAppIssues
      const issuesToCreate: MiniAppIssue[] = [];
      const criticalOrHigh = (dto.findings || []).filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH');

      for (const finding of criticalOrHigh) {
        issuesToCreate.push(
          this.issueRepository.create({
            miniAppId: app.id,
            type: 'SECURITY_CHECK',
            severity: finding.severity,
            description: `[${finding.id}] ${finding.title}: ${finding.description}. Remediation: ${finding.recommendation || 'N/A'}`,
            status: 'OPEN',
            metadata: { findingId: finding.id, category: finding.category },
          })
        );
      }

      if (issuesToCreate.length > 0) {
        await this.issueRepository.save(issuesToCreate);
      }

      await this.miniappRepository.save(app);

      await this.notificationsService.createNotification(
        app.ownerId || '',
        'Automated Validation Failed',
        `${app.name || 'Mini App'} failed automated ${dto.method} security checks with ${criticalOrHigh.length} blocking issue(s). Status reset to DRAFT.`,
        'ISSUE_CREATED',
        app.id
      );

      await this.auditService.log({
        actorId: 'system:jenkins',
        action: 'VALIDATION_FAILED',
        resourceType: 'MiniApp',
        resourceId: app.id,
        newValue: { status: 'DRAFT', validationStatus: 'FAILED', issuesCount: criticalOrHigh.length },
      });

      return { success: true, newStatus: 'DRAFT', validationStatus: 'FAILED', issuesCount: criticalOrHigh.length };
    }
  }
}
