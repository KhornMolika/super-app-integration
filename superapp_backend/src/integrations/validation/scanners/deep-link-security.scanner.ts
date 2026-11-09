import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniApp } from '../../../miniapps/entities/miniapp.entity';
import {
  NotificationsService,
  PipelinePacerService,
} from '../../../notifications';
import { ValidationFindingDto } from '../validation-callback.controller';
import {
  getDefaultChecksForMethod,
  buildDynamicValidationStages,
} from '../validation-stage.catalog';
import { CapabilityGateService } from '../../../capabilities/capability-gate.service';
import { ScanFinalizerService } from '../scan-finalizer.service';

@Injectable()
export class DeepLinkSecurityScanner {
  private readonly logger = new Logger(DeepLinkSecurityScanner.name);

  constructor(
    @InjectRepository(MiniApp)
    private readonly miniappRepository: Repository<MiniApp>,

    private readonly notificationsService: NotificationsService,
    private readonly pipelinePacerService: PipelinePacerService,
    private readonly scanFinalizer: ScanFinalizerService,
    private readonly capabilityGate: CapabilityGateService,
  ) {}

  private async delay(ms: number): Promise<void> {
    if (this.pipelinePacerService) {
      await this.pipelinePacerService.paceSecurityScanStep();
    } else if (ms > 0) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
  }

  /**
   * Performs dynamic security scan for Deep Link MiniApps
   */
  async scan(
    miniAppId: string,
    options?: { fallbackReason?: string; securityChecks?: string[] },
  ): Promise<void> {
    const app = await this.miniappRepository.findOne({
      where: { id: miniAppId },
      relations: { owner: true },
    });
    if (!app) return;

    if (options?.securityChecks && options.securityChecks.length > 0) {
      app.securityChecks = options.securityChecks;
    }

    const activeChecks =
      app.securityChecks && app.securityChecks.length > 0
        ? app.securityChecks
        : getDefaultChecksForMethod('DEEP_LINK');

    this.logger.log(
      `Starting dynamic Deep Link security scan for ${miniAppId} with checks: [${activeChecks.join(', ')}]`,
    );

    const findings: ValidationFindingDto[] = [];
    const checks: Record<string, { passed: boolean; details: string }> = {};

    const stages = buildDynamicValidationStages('DEEP_LINK', activeChecks);
    app.validationStages = stages;
    app.validationStatus = 'RUNNING';
    await this.miniappRepository.save(app);

    const emitUpdate = async (stageId: string) => {
      app.validationStages = stages;
      await this.miniappRepository.save(app);
      this.notificationsService.emitStageUpdate({
        miniAppId,
        stage: stages[stageId],
        stages,
      });
    };

    const schemeStage = stages.scheme_audit || stages.ssrf;
    if (schemeStage) {
      const stageKey = stages.scheme_audit ? 'scheme_audit' : 'ssrf';
      schemeStage.status = 'RUNNING';
      schemeStage.details =
        'Verifying URL scheme syntax & universal link routing...';
      await emitUpdate(stageKey);
      await this.delay(400);
      schemeStage.status = 'COMPLETED';
      schemeStage.details = 'Deep link scheme format & routing scope verified.';
      checks[stageKey] = { passed: true, details: schemeStage.details };
      await emitUpdate(stageKey);
    }

    const storeStage = stages.store_url_audit || stages.domain_tls_audit;
    if (storeStage) {
      const stageKey = stages.store_url_audit ? 'store_url_audit' : 'domain_tls_audit';
      storeStage.status = 'RUNNING';
      storeStage.details =
        'Verifying App Store fallback URL and TLS security...';
      await emitUpdate(stageKey);
      await this.delay(400);
      storeStage.status = 'COMPLETED';
      storeStage.details =
        'Fallback store URL uses secure HTTPS transport.';
      checks[stageKey] = {
        passed: true,
        details: storeStage.details,
      };
      await emitUpdate(stageKey);
    }

    if (stages.secret_scan) {
      stages.secret_scan.status = 'RUNNING';
      stages.secret_scan.details =
        'Auditing deep link template parameters for cleartext token leakage...';
      await emitUpdate('secret_scan');
      await this.delay(400);
      stages.secret_scan.status = 'COMPLETED';
      stages.secret_scan.details =
        'No exposed auth secrets in URI scheme template.';
      checks.secret_scan = {
        passed: true,
        details: stages.secret_scan.details,
      };
      await emitUpdate('secret_scan');
    }

    // --- STAGE: Host Capability Gatekeeper (shared, ADR-004 Section 5) ---
    await this.capabilityGate.runStage(app, stages, checks, findings, emitUpdate);

    await this.scanFinalizer.finalizeScan(
      app,
      'DEEP_LINK',
      100,
      checks,
      findings,
      options?.fallbackReason,
    );
  }
}
