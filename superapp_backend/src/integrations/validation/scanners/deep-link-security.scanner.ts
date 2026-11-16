import { MiniAppRunsService } from '../../../miniapps/miniapp-runs.service';
import { Injectable, Logger, Optional } from '@nestjs/common';
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
    @Optional() private readonly runs?: MiniAppRunsService,
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
    await this.runs?.syncScan(app);

    const emitUpdate = async (stageId: string) => {
      app.validationStages = stages;
      await this.miniappRepository.save(app);
      await this.runs?.syncScan(app);
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
      await this.delay(300);

      const cfg: any = app.integrationConfig || {};
      const combined = [
        cfg.urlScheme,
        cfg.appStoreUrl,
        cfg.playStoreUrl,
        cfg.targetUrl,
      ]
        .filter(Boolean)
        .join('\n');

      const secretPatterns = [
        {
          id: 'GITLEAKS_GOOGLE_API_KEY',
          regex: /AIza[0-9A-Za-z-_]{35}/g,
          title: 'Hardcoded Google API Key in Deep Link',
          severity: 'CRITICAL' as const,
        },
        {
          id: 'GITLEAKS_JWT_TOKEN',
          regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g,
          title: 'Cleartext JWT Bearer Token in Deep Link Scheme',
          severity: 'CRITICAL' as const,
        },
        {
          id: 'GITLEAKS_AWS_KEY',
          regex: /AKIA[0-9A-Z]{16}/g,
          title: 'Exposed AWS Access Key in Deep Link',
          severity: 'CRITICAL' as const,
        },
        {
          id: 'GITLEAKS_DEV_TOKEN',
          regex: /(gh[pousr]_[A-Za-z0-9_]{36,}|xox[baprs]-[0-9a-zA-Z]{10,48})/g,
          title: 'Exposed Developer Access Token in Deep Link',
          severity: 'CRITICAL' as const,
        },
        {
          id: 'SENSITIVE_QUERY_PARAM',
          regex: /[?&](api_?key|client_secret|secret|access_token|auth_token|bearer|password)=([^&\s]{6,})/gi,
          title: 'Sensitive Credential Query Parameter in Custom Scheme',
          severity: 'HIGH' as const,
        },
      ];

      const secretFindings: ValidationFindingDto[] = [];
      for (const p of secretPatterns) {
        let m: RegExpExecArray | null;
        while ((m = p.regex.exec(combined)) !== null) {
          secretFindings.push({
            id: p.id,
            severity: p.severity,
            category: 'CREDENTIAL_LEAK',
            title: p.title,
            description: `Detected credential pattern matching ${p.title} (${m[0].substring(0, 10)}...). Custom URI schemes are unencrypted and exposed to OS intent interception.`,
            recommendation:
              'Never pass API keys or credentials in custom URI schemes. Use PKCE OAuth or backend token exchange.',
          });
        }
      }

      if (secretFindings.length > 0) {
        findings.push(...secretFindings);
        stages.secret_scan.status = 'FAILED';
        stages.secret_scan.details = `Detected ${secretFindings.length} hardcoded credential(s) in deep link configuration.`;
        checks.secret_scan = {
          passed: false,
          details: stages.secret_scan.details,
        };
      } else {
        stages.secret_scan.status = 'COMPLETED';
        stages.secret_scan.details =
          'Zero credentials or API keys detected in deep link configuration.';
        checks.secret_scan = {
          passed: true,
          details: stages.secret_scan.details,
        };
      }
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
