import type { ValidationCallbackDto, ValidationFindingDto } from './validation-callback.controller';

type Severity = ValidationFindingDto['severity'];

/**
 * What the Flutter package scan pipeline sends: each tool's own JSON output
 * (trimmed), plus what the pipeline itself checked. Turned into the report the
 * Back Office shows by normalizeScanReport, here rather than in the Jenkinsfile
 * so the rules are tested and the same for every pipeline.
 */
export interface RawScanReport {
  miniAppId: string;
  method?: string;
  /** Commit the scan checked out (Git source) */
  commitSha?: string;
  /** Stages that ran, in order (the selected checks) */
  stages?: string[];
  /** Absolute path of the scanned package inside the tool containers, stripped from file paths */
  sourceRoot?: string;
  ingest?: {
    passed?: boolean;
    details?: string;
    sha256?: string;
    packageName?: string;
    version?: string;
    files?: number;
  };
  capability?: { allowed?: string[]; required?: string[] };
  /**
   * Set by the backend (not the pipeline): the shared catalog gate's result
   * (CapabilityGateService). Wins over the pipeline's simple allowlist check.
   */
  capabilityGate?: { check: { passed: boolean; details: string; [k: string]: any }; findings: ValidationFindingDto[] };
  /** Gitleaks JSON report: an array of findings */
  gitleaks?: any[];
  /** Semgrep --json output */
  semgrep?: { results?: any[]; errors?: any[] };
  /** Trivy fs --format json output (vulnerabilities and licenses) */
  trivy?: { Results?: any[] };
  /** pubspec.lock was found or resolved: without it the CVE check sees no dependencies */
  dependenciesResolved?: boolean;
  dependencyNote?: string;
  /** CycloneDX SBOM (Trivy) */
  sbom?: { components?: any[]; [k: string]: any } | null;
  /** stage id -> why its tool could not run. Such a stage fails: a scan that did not run never passes. */
  errors?: Record<string, string>;
}

const MAX_FINDINGS_PER_STAGE = 100;
const RANK: Record<Severity, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

function severityOf(raw: unknown): Severity {
  const s = String(raw || '').toUpperCase();
  if (s === 'CRITICAL') return 'CRITICAL';
  if (s === 'HIGH' || s === 'ERROR') return 'HIGH';
  if (s === 'MEDIUM' || s === 'WARNING' || s === 'MODERATE') return 'MEDIUM';
  return 'LOW';
}

const blocking = (f: ValidationFindingDto) => RANK[f.severity] >= RANK.HIGH;

function relPath(path: unknown, root?: string): string | undefined {
  if (typeof path !== 'string' || !path) return undefined;
  let p = path;
  if (root && p.startsWith(root)) p = p.slice(root.length);
  return p.replace(/^\/+/, '') || undefined;
}

function short(text: unknown, max = 300): string {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max)}...` : t;
}

interface StageResult {
  passed: boolean;
  details: string;
  findings: ValidationFindingDto[];
}

function capped(stage: string, findings: ValidationFindingDto[]): ValidationFindingDto[] {
  const sorted = [...findings].sort((a, b) => RANK[b.severity] - RANK[a.severity]);
  if (sorted.length <= MAX_FINDINGS_PER_STAGE) return sorted;
  const kept = sorted.slice(0, MAX_FINDINGS_PER_STAGE);
  kept.push({
    id: `${stage.toUpperCase()}_TRUNCATED`,
    severity: 'LOW',
    category: 'REPORT',
    title: `${sorted.length - MAX_FINDINGS_PER_STAGE} more findings not listed`,
    description: `Only the ${MAX_FINDINGS_PER_STAGE} most severe findings of this check are kept in the report.`,
  });
  return kept;
}

function gitleaksStage(raw: RawScanReport): StageResult {
  const findings = (raw.gitleaks || []).map((g: any, i: number): ValidationFindingDto => {
    const rule = String(g?.RuleID || 'secret');
    return {
      id: `GITLEAKS_${rule}_${i}`,
      severity: /private-key/i.test(rule) ? 'CRITICAL' : 'HIGH',
      category: 'SECRET',
      engineId: 'gitleaks',
      title: short(g?.Description || `Secret detected (${rule})`, 160),
      description: `Gitleaks rule "${rule}" matched${g?.Match ? `: ${short(g.Match, 120)}` : ''}.`,
      filePath: relPath(g?.File, raw.sourceRoot),
      lineNumber: Number(g?.StartLine) || undefined,
      recommendation: 'Remove the secret from the package, rotate it, and load it from the backend or secure storage at runtime.',
    };
  });
  return {
    passed: findings.length === 0,
    details: findings.length ? `Gitleaks found ${findings.length} hardcoded secret(s).` : 'Gitleaks: no hardcoded secrets found.',
    findings,
  };
}

function semgrepStage(raw: RawScanReport): StageResult {
  const findings = (raw.semgrep?.results || []).map((r: any, i: number): ValidationFindingDto => {
    const rule = String(r?.check_id || 'rule').split('.').pop() || 'rule';
    return {
      id: `SEMGREP_${rule}_${i}`,
      severity: severityOf(r?.extra?.severity),
      category: 'SAST',
      engineId: 'semgrep',
      title: short(r?.extra?.metadata?.title || rule, 160),
      description: short(r?.extra?.message || rule),
      filePath: relPath(r?.path, raw.sourceRoot),
      lineNumber: Number(r?.start?.line) || undefined,
      recommendation: r?.extra?.fix ? short(r.extra.fix) : undefined,
    };
  });
  const high = findings.filter(blocking).length;
  return {
    passed: high === 0,
    details: findings.length
      ? `Semgrep: ${findings.length} finding(s), ${high} high or critical.`
      : 'Semgrep: no unsafe code patterns found.',
    findings,
  };
}

function trivyVulnStage(raw: RawScanReport): StageResult {
  const findings: ValidationFindingDto[] = [];
  for (const result of raw.trivy?.Results || []) {
    for (const v of result?.Vulnerabilities || []) {
      findings.push({
        id: `CVE_${v?.VulnerabilityID || 'unknown'}_${v?.PkgName || ''}`,
        severity: severityOf(v?.Severity),
        category: 'DEPENDENCY',
        engineId: 'trivy',
        cveId: v?.VulnerabilityID,
        title: short(`${v?.PkgName || 'package'} ${v?.InstalledVersion || ''}: ${v?.Title || v?.VulnerabilityID || 'vulnerability'}`, 160),
        description: short(v?.Description || v?.Title || ''),
        filePath: relPath(result?.Target, raw.sourceRoot),
        recommendation: v?.FixedVersion ? `Upgrade ${v.PkgName} to ${v.FixedVersion}.` : 'No fixed version yet: replace or remove the package.',
      });
    }
  }
  if (raw.dependenciesResolved === false) {
    findings.push({
      id: 'SCA_NO_LOCKFILE',
      severity: 'MEDIUM',
      category: 'DEPENDENCY',
      engineId: 'trivy',
      title: 'Dependencies could not be resolved',
      description: short(
        raw.dependencyNote ||
          'No pubspec.lock was found and `flutter pub get` failed, so dependencies were not checked for known vulnerabilities.',
      ),
      recommendation: 'Make sure the package resolves with `flutter pub get`, or include pubspec.lock.',
    });
  }
  const high = findings.filter(blocking).length;
  const cves = findings.filter((f) => f.cveId).length;
  return {
    passed: high === 0,
    details: cves
      ? `Trivy: ${cves} known vulnerabilit${cves === 1 ? 'y' : 'ies'} in dependencies, ${high} high or critical.`
      : raw.dependenciesResolved === false
        ? 'Dependencies could not be resolved; no known vulnerabilities in what was checked.'
        : 'Trivy: no known vulnerabilities in dependencies.',
    findings,
  };
}

function trivyLicenseStage(raw: RawScanReport): StageResult {
  const findings: ValidationFindingDto[] = [];
  for (const result of raw.trivy?.Results || []) {
    for (const l of result?.Licenses || []) {
      const severity = severityOf(l?.Severity);
      // notice / permissive licenses are fine: listed only when they matter
      if (RANK[severity] < RANK.MEDIUM) continue;
      findings.push({
        id: `LICENSE_${l?.Name || 'unknown'}_${l?.PkgName || l?.FilePath || ''}`,
        severity,
        category: 'LICENSE',
        engineId: 'trivy',
        title: short(`${l?.PkgName || l?.FilePath || 'package'}: ${l?.Name || 'license'} (${l?.Category || 'unknown'})`, 160),
        description: `The ${l?.Category || ''} license ${l?.Name || ''} restricts closed-source distribution in the Super App.`.replace(/\s+/g, ' '),
        filePath: relPath(l?.FilePath, raw.sourceRoot),
        recommendation: 'Replace the dependency, or get a commercial license, before distribution.',
      });
    }
  }
  const high = findings.filter(blocking).length;
  return {
    passed: high === 0,
    details: high
      ? `${high} dependency license(s) are forbidden or restricted for the Super App.`
      : findings.length
        ? `No forbidden licenses; ${findings.length} reciprocal license(s) to review.`
        : 'No forbidden or restricted licenses found.',
    findings,
  };
}

function capabilityStage(raw: RawScanReport): StageResult {
  if (raw.capabilityGate) {
    // ADR-004: unsupported capabilities are LOW / MEDIUM findings, never a failure
    return { ...raw.capabilityGate.check, findings: raw.capabilityGate.findings };
  }
  const norm = (list?: string[]) => (list || []).map((c) => String(c).trim().toLowerCase()).filter(Boolean);
  const allowed = new Set(norm(raw.capability?.allowed));
  const unauthorized = norm(raw.capability?.required).filter((c) => !allowed.has(c));
  const findings = unauthorized.map(
    (c): ValidationFindingDto => ({
      id: `UNAUTHORIZED_CAPABILITY_${c}`,
      severity: 'HIGH',
      category: 'CAPABILITY_VIOLATION',
      engineId: 'capability_gate',
      title: `Capability not offered by the Super App: ${c}`,
      description: `The mini app requests "${c}", which the Super App does not offer.`,
      recommendation: 'Remove the permission, or propose the capability to the Super App team.',
    }),
  );
  return {
    passed: findings.length === 0,
    details: findings.length
      ? `${findings.length} requested capabilit${findings.length === 1 ? 'y is' : 'ies are'} not offered by the Super App.`
      : 'All requested capabilities are offered by the Super App.',
    findings,
  };
}

function sbomStage(raw: RawScanReport): StageResult {
  const count = Array.isArray(raw.sbom?.components) ? raw.sbom!.components!.length : 0;
  return raw.sbom
    ? { passed: true, details: `CycloneDX SBOM generated (${count} component${count === 1 ? '' : 's'}).`, findings: [] }
    : { passed: false, details: 'No SBOM was produced.', findings: [] };
}

function ingestStage(raw: RawScanReport): StageResult {
  const i = raw.ingest;
  if (i?.passed) {
    const what = [i.packageName, i.version].filter(Boolean).join(' ');
    return {
      passed: true,
      details: short(
        i.details ||
          `Package ${what} read (${i.files ?? '?'} files)${i.sha256 ? `, sha256 ${String(i.sha256).slice(0, 12)}...` : ''}.`,
      ),
      findings: [],
    };
  }
  return {
    passed: false,
    details: short(i?.details || 'The package source could not be read.'),
    findings: [
      {
        id: 'INGEST_FAILED',
        severity: 'CRITICAL',
        category: 'INTEGRITY',
        engineId: 'ingest',
        title: 'Package source could not be read',
        description: short(i?.details || 'The pipeline could not download or unpack the package source.'),
        recommendation: 'Check that the archive contains pubspec.yaml (or the repository and branch are reachable), then submit again.',
      },
    ],
  };
}

/** The tool output each check needs: a selected check without it did not run. */
const STAGE_INPUT: Record<string, (raw: RawScanReport) => unknown> = {
  secret_scan: (r) => r.gitleaks,
  sast: (r) => r.semgrep,
  dependency_scan: (r) => r.trivy,
  license_compliance: (r) => r.trivy,
  sbom: (r) => r.sbom,
};

const STAGE_RUNNERS: Record<string, (raw: RawScanReport) => StageResult> = {
  ingest: ingestStage,
  secret_scan: gitleaksStage,
  sast: semgrepStage,
  dependency_scan: trivyVulnStage,
  capability_gate: capabilityStage,
  sbom: sbomStage,
  license_compliance: trivyLicenseStage,
};

/** The pipeline's raw tool output as the validation callback the Back Office report is built from. */
export function normalizeScanReport(raw: RawScanReport): ValidationCallbackDto {
  const stages = (raw.stages && raw.stages.length ? raw.stages : Object.keys(STAGE_RUNNERS)).filter((s) => STAGE_RUNNERS[s]);
  // These two always run: without the package nothing else means anything
  for (const s of ['capability_gate', 'ingest']) if (!stages.includes(s)) stages.unshift(s);

  const checks: Record<string, { passed: boolean; details: string; findings?: number }> = {};
  const findings: ValidationFindingDto[] = [];
  const ingestOk = ingestStage(raw).passed;

  for (const stage of stages) {
    let result: StageResult;
    const missing = STAGE_INPUT[stage] && STAGE_INPUT[stage](raw) == null;
    const toolError = raw.errors?.[stage] || (missing ? 'the pipeline sent no output for this check' : undefined);
    if (stage !== 'ingest' && stage !== 'capability_gate' && !ingestOk) {
      result = { passed: false, details: 'Not run: the package source could not be read.', findings: [] };
    } else if (toolError) {
      // Fail closed: a check that could not run never counts as passed
      result = {
        passed: false,
        details: short(`Could not run: ${toolError}`),
        findings: [
          {
            id: `SCANNER_ERROR_${stage}`,
            severity: 'HIGH',
            category: 'SCANNER_ERROR',
            engineId: stage,
            title: `The ${stage.replace(/_/g, ' ')} check could not run`,
            description: short(toolError),
            recommendation: 'A platform problem, not the mini app: ask the Super App team to check the Jenkins scan job, then re-scan.',
          },
        ],
      };
    } else {
      result = STAGE_RUNNERS[stage](raw);
    }
    const kept = capped(stage, result.findings);
    const { findings: _f, ...rest } = result as StageResult & Record<string, any>;
    checks[stage] = { ...rest, passed: result.passed, details: result.details, findings: result.findings.length };
    findings.push(...kept);
  }

  const count = (s: Severity) => findings.filter((f) => f.severity === s && f.category !== 'REPORT').length;
  const score = Math.max(0, 100 - 25 * count('CRITICAL') - 10 * count('HIGH') - 3 * count('MEDIUM') - count('LOW'));
  const passed = Object.values(checks).every((c) => c.passed);

  return {
    miniAppId: raw.miniAppId,
    method: raw.method || 'FLUTTER_PACKAGE',
    status: passed ? 'PASSED' : 'FAILED',
    score,
    commitSha: raw.commitSha,
    checks,
    findings,
    sbom: raw.sbom || undefined,
  };
}
