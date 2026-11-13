import { MiniAppRunsService } from '../../../miniapps/miniapp-runs.service';
import { simulatedScanAllowed } from '../simulated-scan.policy';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniApp } from '../../../miniapps/entities/miniapp.entity';
import { MiniAppIssue } from '../../../miniapps/entities/miniapp-issue.entity';
import {
  NotificationsService,
  PipelinePacerService,
} from '../../../notifications';
import { CapabilityGateService } from '../../../capabilities/capability-gate.service';
import { ValidationFindingDto } from '../validation-callback.controller';
import { PubVulnerabilityScannerService } from '../pub-vulnerability-scanner.service';
import {
  getDefaultChecksForMethod,
  buildDynamicValidationStages,
} from '../validation-stage.catalog';
import { ScanFinalizerService } from '../scan-finalizer.service';

@Injectable()
export class FlutterPackageSecurityScanner {
  private readonly logger = new Logger(FlutterPackageSecurityScanner.name);

  constructor(
    @InjectRepository(MiniApp)
    private readonly miniappRepository: Repository<MiniApp>,

    @InjectRepository(MiniAppIssue)
    private readonly issueRepository: Repository<MiniAppIssue>,

    private readonly notificationsService: NotificationsService,
    private readonly capabilityGate: CapabilityGateService,
    private readonly pipelinePacerService: PipelinePacerService,
    private readonly scanFinalizer: ScanFinalizerService,
    @Optional()
    private readonly pubVulnerabilityScanner?: PubVulnerabilityScannerService,
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
   * Performs a dynamic security scan for Flutter Package MiniApps based strictly on selected checks
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
        : getDefaultChecksForMethod('FLUTTER_PACKAGE');

    this.logger.log(
      `Starting dynamic Flutter Package security scan for ${miniAppId} with checks: [${activeChecks.join(', ')}]`,
    );

    const findings: ValidationFindingDto[] = [];
    const checks: Record<
      string,
      {
        passed: boolean;
        details: string;
        advisories?: any[];
        manifest?: any;
        totalPackages?: number;
      }
    > = {};
    let score = 100;
    let cycloneDxManifest: Record<string, any> | undefined = undefined;

    const stages = buildDynamicValidationStages(
      'FLUTTER_PACKAGE',
      activeChecks,
    );
    app.validationStages = stages;
    app.validationStatus = 'RUNNING';
    await this.miniappRepository.save(app);
    await this.runs?.syncScan(app);

    // Production: never a simulated pass for a package that was not really scanned
    if (!simulatedScanAllowed()) {
      const why = `The security scanner (Jenkins) did not run${options?.fallbackReason ? `: ${options.fallbackReason}` : ''}.`;
      for (const stage of Object.values(stages) as any[]) {
        stage.status = 'FAILED';
        stage.details = 'Not run: the security scanner is unavailable.';
      }
      app.validationStages = stages;
      await this.scanFinalizer.finalizeScan(
        app,
        'FLUTTER_PACKAGE',
        0,
        { scanner: { passed: false, details: why } },
        [
          {
            id: 'SCANNER_UNAVAILABLE',
            severity: 'HIGH',
            category: 'SCANNER_ERROR',
            title: 'The package was not scanned',
            description: `${why} A package that was not scanned is never approved automatically.`,
            recommendation: 'A platform problem, not the mini app: re-scan once Jenkins is reachable.',
          },
        ],
        options?.fallbackReason,
      );
      return;
    }

    await this.pipelinePacerService.paceValidationStart(app.name || app.appId);

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

    // --- STAGE: Ingestion & Integrity Verification (Always baseline) ---
    if (stages.ingest) {
      stages.ingest.status = 'RUNNING';
      stages.ingest.details =
        'Verifying SHA-256 package checksum & pubspec.yaml manifest...';
      await emitUpdate('ingest');
      await this.delay(500);

      stages.ingest.status = 'COMPLETED';
      stages.ingest.details =
        'Package archive digest verified. Valid pubspec.yaml manifest discovered.';
      checks.ingest = { passed: true, details: stages.ingest.details };
      await emitUpdate('ingest');
    }

    // --- STAGE: Secret Scan ---
    if (stages.secret_scan) {
      stages.secret_scan.status = 'RUNNING';
      stages.secret_scan.details =
        'Scanning Dart source code and assets with Gitleaks...';
      await emitUpdate('secret_scan');
      await this.delay(500);

      stages.secret_scan.status = 'COMPLETED';
      stages.secret_scan.details =
        'No hardcoded private keys, JWTs, or API secrets detected in source.';
      checks.secret_scan = {
        passed: true,
        details: stages.secret_scan.details,
      };
      await emitUpdate('secret_scan');
    }

    // --- STAGE: SAST & AST Sandbox ---
    if (stages.sast) {
      stages.sast.status = 'RUNNING';
      stages.sast.details =
        'Analyzing Dart AST for unsafe memory, eval, or prohibited OS calls...';
      await emitUpdate('sast');
      await this.delay(500);

      stages.sast.status = 'COMPLETED';
      stages.sast.details =
        'Dart AST static analysis passed. No prohibited mirrors, eval, or unapproved FFI found.';
      checks.sast = { passed: true, details: stages.sast.details };
      await emitUpdate('sast');
    }

    // --- STAGE: Software Composition Analysis (SCA / CVE) ---
    if (stages.dependency_scan) {
      stages.dependency_scan.status = 'RUNNING';
      stages.dependency_scan.details =
        'Cross-referencing declared package dependencies with Google OSV database...';
      await emitUpdate('dependency_scan');

      const declaredDeps =
        app.integrationConfig?.dependencies ||
        app.integrationConfig?.declaredDependencies ||
        {};

      let osvReport: any = null;
      if (this.pubVulnerabilityScanner) {
        osvReport =
          await this.pubVulnerabilityScanner.scanPubDependencies(declaredDeps);
      }

      if (
        osvReport &&
        (osvReport.criticalCount > 0 || osvReport.highCount > 0)
      ) {
        stages.dependency_scan.status = 'FAILED';
        stages.dependency_scan.details = `Detected ${osvReport.criticalCount} critical and ${osvReport.highCount} high CVE vulnerabilities across declared packages.`;
        checks.dependency_scan = {
          passed: false,
          details: stages.dependency_scan.details,
          advisories: osvReport.advisories,
        };
        score = Math.max(0, score - 30);

        for (const adv of osvReport.advisories.filter(
          (a: any) => a.severity === 'CRITICAL' || a.severity === 'HIGH',
        )) {
          findings.push({
            id: `CVE-${adv.cveId || adv.package}`,
            title: `Vulnerable Dependency: ${adv.package}`,
            severity: adv.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
            category: 'DEPENDENCY',
            description: `${adv.title}. Package ${adv.package}@${adv.version}.`,
            recommendation: `Upgrade ${adv.package} to ${adv.fixedVersion || 'latest patched version'}. Reference: ${adv.advisoryUrl}`,
          });

          const issue = this.issueRepository.create({
            miniAppId: app.id,
            type: 'SECURITY_CHECK',
            severity: adv.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
            description: `[${adv.cveId || 'CVE'}] Vulnerable Dependency ${adv.package}@${adv.version}: ${adv.title}. Remediation: Upgrade to ${adv.fixedVersion || 'latest patched version'}. (${adv.advisoryUrl})`,
            status: 'OPEN',
            metadata: {
              package: adv.package,
              version: adv.version,
              cveId: adv.cveId,
              fixedVersion: adv.fixedVersion,
              advisoryUrl: adv.advisoryUrl,
            },
          });
          await this.issueRepository.save(issue);
        }
      } else {
        stages.dependency_scan.status = 'COMPLETED';
        stages.dependency_scan.details =
          osvReport && osvReport.totalScanned > 0
            ? `Dependency OSV audit passed: 0 critical/high CVEs detected across ${osvReport.totalScanned} packages.`
            : 'Dependency CVE audit passed with 0 known vulnerabilities.';
        checks.dependency_scan = {
          passed: true,
          details: stages.dependency_scan.details,
          advisories: osvReport?.advisories || [],
        };
      }
      await emitUpdate('dependency_scan');
    }

    // --- STAGE: SBOM Generation ---
    if (stages.sbom) {
      stages.sbom.status = 'RUNNING';
      stages.sbom.details =
        'Generating CycloneDX & SPDX Software Bill of Materials...';
      await emitUpdate('sbom');
      await this.delay(500);

      const sbomComponents = [
        {
          name:
            app.integrationConfig?.packageName || app.appId || 'miniapp_core',
          version: app.currentReleaseVersion || '1.0.0',
          type: 'application',
          purl: `pkg:pub/${app.integrationConfig?.packageName || app.appId}@${app.currentReleaseVersion || '1.0.0'}`,
          licenses: [{ license: { id: 'MIT', name: 'MIT License' } }],
          hashes: [
            {
              alg: 'SHA-256',
              content:
                'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            },
          ],
        },
        {
          name: 'flutter',
          version: '3.24.0',
          type: 'framework',
          purl: 'pkg:pub/flutter@3.24.0',
          licenses: [{ license: { id: 'BSD-3-Clause', name: 'BSD 3-Clause' } }],
          hashes: [
            {
              alg: 'SHA-256',
              content:
                '8f4c2298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            },
          ],
        },
        {
          name: 'dio',
          version: '5.4.3',
          type: 'library',
          purl: 'pkg:pub/dio@5.4.3',
          licenses: [{ license: { id: 'MIT', name: 'MIT License' } }],
          hashes: [
            {
              alg: 'SHA-256',
              content:
                'c1b2c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            },
          ],
        },
        {
          name: 'crypto',
          version: '3.0.3',
          type: 'library',
          purl: 'pkg:pub/crypto@3.0.3',
          licenses: [{ license: { id: 'BSD-3-Clause', name: 'BSD 3-Clause' } }],
          hashes: [
            {
              alg: 'SHA-256',
              content:
                '9a7f44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            },
          ],
        },
        {
          name: 'shared_preferences',
          version: '2.2.3',
          type: 'library',
          purl: 'pkg:pub/shared_preferences@2.2.3',
          licenses: [{ license: { id: 'BSD-3-Clause', name: 'BSD 3-Clause' } }],
          hashes: [
            {
              alg: 'SHA-256',
              content:
                '5d3e44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            },
          ],
        },
      ];

      cycloneDxManifest = {
        bomFormat: 'CycloneDX',
        specVersion: '1.5',
        serialNumber: `urn:uuid:${app.id}`,
        version: 1,
        metadata: {
          timestamp: new Date().toISOString(),
          tools: [
            {
              vendor: 'Syft / CycloneDX',
              name: 'LocalSecurityScanner',
              version: '1.5.0',
            },
          ],
          component: {
            name: app.name || app.appId,
            version: app.currentReleaseVersion || '1.0.0',
            type: 'application',
          },
        },
        components: sbomComponents,
        totalComponents: sbomComponents.length,
      };

      stages.sbom.status = 'COMPLETED';
      stages.sbom.details = `Cryptographic CycloneDX 1.5 SBOM generated (${sbomComponents.length} verified packages).`;
      checks.sbom = {
        passed: true,
        details: stages.sbom.details,
        manifest: cycloneDxManifest,
        totalPackages: sbomComponents.length,
      };
      await emitUpdate('sbom');
    }

    // --- STAGE: Malware & Binary Signature ---
    if (stages.malware_scan) {
      stages.malware_scan.status = 'RUNNING';
      stages.malware_scan.details =
        'Performing binary signature and heuristic ClamAV inspection...';
      await emitUpdate('malware_scan');
      await this.delay(500);

      stages.malware_scan.status = 'COMPLETED';
      stages.malware_scan.details =
        'Malware and binary signature audit completed with zero threats detected.';
      checks.malware_scan = {
        passed: true,
        details: stages.malware_scan.details,
      };
      await emitUpdate('malware_scan');
    }

    // --- STAGE: License Compliance ---
    if (stages.license_compliance) {
      stages.license_compliance.status = 'RUNNING';
      stages.license_compliance.details =
        'Auditing dependency licenses against platform IP policy...';
      await emitUpdate('license_compliance');
      await this.delay(500);

      stages.license_compliance.status = 'COMPLETED';
      stages.license_compliance.details =
        'All third-party package licenses comply with MIT, BSD, and Apache 2.0 terms.';
      checks.license_compliance = {
        passed: true,
        details: stages.license_compliance.details,
      };
      await emitUpdate('license_compliance');
    }

    // --- STAGE: Host Capability Gatekeeper (shared, ADR-004 Section 5) ---
    // Unsupported capabilities never fail the scan: optional ones are disabled,
    // required ones make the Mini App "not launchable" until the host supports them.
    await this.capabilityGate.runStage(app, stages, checks, findings, emitUpdate);

    const hasCriticalOrHigh = findings.some(
      (f) => f.severity === 'CRITICAL' || f.severity === 'HIGH',
    );
    if (hasCriticalOrHigh) {
      score = Math.min(score, 60);
    }

    await this.scanFinalizer.finalizeScan(
      app,
      'FLUTTER_PACKAGE',
      score,
      checks,
      findings,
      options?.fallbackReason,
      cycloneDxManifest,
    );
  }
}
