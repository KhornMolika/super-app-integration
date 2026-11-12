import { normalizeScanReport, RawScanReport } from './scan-report.normalizer';
import { scanConfigOf, scanScopeOf, signScanTicket, verifyScanTicket } from './scan-source-ticket';

const ID = '7b1f5c2e-3a4d-4e5f-8a9b-0c1d2e3f4a5b';
const ROOT = '/var/jenkins_home/workspace/job/scan/src/fsa_hr';

const clean = (over: Partial<RawScanReport> = {}): RawScanReport => ({
  miniAppId: ID,
  sourceRoot: ROOT,
  ingest: { passed: true, packageName: 'fsa_hr', version: '1.2.0', files: 12, sha256: 'ab'.repeat(32), root: ROOT } as any,
  capability: { allowed: ['camera', 'location'], required: ['camera'] },
  gitleaks: [],
  semgrep: { results: [] },
  trivy: { Results: [{ Target: 'pubspec.lock', Vulnerabilities: [], Licenses: [] }] },
  sbom: { bomFormat: 'CycloneDX', components: [{ name: 'http' }, { name: 'intl' }] },
  ...over,
});

describe('normalizeScanReport', () => {
  it('a clean package passes every check, with real details', () => {
    const r = normalizeScanReport(clean());
    expect(r.status).toBe('PASSED');
    expect(r.score).toBe(100);
    expect(r.method).toBe('FLUTTER_PACKAGE');
    expect(Object.keys(r.checks!)).toEqual([
      'ingest', 'secret_scan', 'sast', 'dependency_scan', 'capability_gate', 'sbom', 'license_compliance',
    ]);
    expect(r.checks!.secret_scan.details).toMatch(/Gitleaks: no hardcoded secrets/);
    expect(r.checks!.sbom.details).toMatch(/2 components/);
  });

  it('a secret fails the scan, with file and line relative to the package', () => {
    const r = normalizeScanReport(
      clean({ gitleaks: [{ RuleID: 'aws-access-token', Description: 'AWS key', File: `${ROOT}/lib/api.dart`, StartLine: 12, Match: 'REDACTED' }] }),
    );
    expect(r.status).toBe('FAILED');
    expect(r.checks!.secret_scan.passed).toBe(false);
    expect(r.findings![0]).toMatchObject({ severity: 'HIGH', category: 'SECRET', filePath: 'lib/api.dart', lineNumber: 12 });
  });

  it('a private key is critical', () => {
    const r = normalizeScanReport(clean({ gitleaks: [{ RuleID: 'private-key', File: `${ROOT}/key.pem` }] }));
    expect(r.findings![0].severity).toBe('CRITICAL');
  });

  it('Semgrep warnings are listed but do not fail; errors do', () => {
    const warn = normalizeScanReport(
      clean({ semgrep: { results: [{ check_id: 'x.cleartext-http-url', path: `${ROOT}/lib/a.dart`, start: { line: 3 }, extra: { severity: 'WARNING', message: 'http' } }] } }),
    );
    expect(warn.status).toBe('PASSED');
    expect(warn.findings).toHaveLength(1);
    expect(warn.findings![0]).toMatchObject({ severity: 'MEDIUM', filePath: 'lib/a.dart' });

    const err = normalizeScanReport(
      clean({ semgrep: { results: [{ check_id: 'x.tls-verification-disabled', path: 'lib/b.dart', start: { line: 9 }, extra: { severity: 'ERROR', message: 'tls' } }] } }),
    );
    expect(err.status).toBe('FAILED');
    expect(err.checks!.sast.passed).toBe(false);
  });

  it('a high CVE fails the dependency check and says how to fix it', () => {
    const r = normalizeScanReport(
      clean({
        trivy: {
          Results: [
            {
              Target: 'pubspec.lock',
              Vulnerabilities: [{ VulnerabilityID: 'CVE-2024-1', PkgName: 'http', InstalledVersion: '0.13.0', FixedVersion: '1.2.0', Severity: 'HIGH', Title: 'bad' }],
            },
          ],
        },
      }),
    );
    expect(r.checks!.dependency_scan.passed).toBe(false);
    expect(r.findings![0]).toMatchObject({ cveId: 'CVE-2024-1', recommendation: 'Upgrade http to 1.2.0.' });
  });

  it('a restricted license fails license compliance; notice licenses are not listed', () => {
    const r = normalizeScanReport(
      clean({
        trivy: {
          Results: [
            {
              Target: 'pubspec.lock',
              Licenses: [
                { Name: 'GPL-3.0', Category: 'restricted', Severity: 'HIGH', PkgName: 'gpl_pkg' },
                { Name: 'MIT', Category: 'notice', Severity: 'LOW', PkgName: 'http' },
              ],
            },
          ],
        },
      }),
    );
    expect(r.checks!.license_compliance.passed).toBe(false);
    expect(r.findings!.map((f) => f.category)).toEqual(['LICENSE']);
  });

  it('unresolved dependencies are a medium finding, not a failure', () => {
    const r = normalizeScanReport(clean({ dependenciesResolved: false, dependencyNote: 'pub get failed', trivy: { Results: [] } }));
    expect(r.status).toBe('PASSED');
    expect(r.findings![0]).toMatchObject({ id: 'SCA_NO_LOCKFILE', severity: 'MEDIUM' });
  });

  it('a check whose tool could not run fails the scan (never a silent pass)', () => {
    const r = normalizeScanReport(clean({ errors: { secret_scan: 'Gitleaks did not run (exit 125).' } }));
    expect(r.status).toBe('FAILED');
    expect(r.checks!.secret_scan).toMatchObject({ passed: false });
    expect(r.checks!.secret_scan.details).toMatch(/Could not run: Gitleaks did not run/);
  });

  it('a selected check with no output fails too', () => {
    const r = normalizeScanReport(clean({ gitleaks: undefined }));
    expect(r.checks!.secret_scan.passed).toBe(false);
    expect(r.checks!.secret_scan.details).toMatch(/sent no output/);
  });

  it('an unreadable package fails, and the other checks say they did not run', () => {
    const r = normalizeScanReport(clean({ ingest: { passed: false, details: 'No pubspec.yaml found' }, gitleaks: undefined }));
    expect(r.status).toBe('FAILED');
    expect(r.findings!.find((f) => f.id === 'INGEST_FAILED')?.severity).toBe('CRITICAL');
    expect(r.checks!.secret_scan.details).toMatch(/Not run: the package source could not be read/);
  });

  it('runs only the selected checks, plus ingest and the capability gate', () => {
    const r = normalizeScanReport(clean({ stages: ['secret_scan'], semgrep: undefined }));
    expect(Object.keys(r.checks!)).toEqual(['ingest', 'capability_gate', 'secret_scan']);
    expect(r.status).toBe('PASSED');
  });

  it('a capability the Super App does not offer fails the gate', () => {
    const r = normalizeScanReport(clean({ capability: { allowed: ['camera'], required: ['camera', 'nfc'] } }));
    expect(r.checks!.capability_gate.passed).toBe(false);
    expect(r.findings![0].id).toBe('UNAUTHORIZED_CAPABILITY_nfc');
  });

  it('keeps at most 100 findings per check, most severe first', () => {
    const many = Array.from({ length: 150 }, (_, i) => ({ RuleID: i === 149 ? 'private-key' : 'generic', File: `${ROOT}/f${i}` }));
    const r = normalizeScanReport(clean({ gitleaks: many }));
    expect(r.findings!.length).toBe(101);
    expect(r.findings![0].severity).toBe('CRITICAL');
    expect(r.findings![100].id).toBe('SECRET_SCAN_TRUNCATED');
    expect(r.checks!.secret_scan.findings).toBe(150);
  });
});

describe('scan source ticket', () => {
  it('is valid for its mini app and scope until it expires', () => {
    const now = Date.now();
    const t = signScanTicket(ID, 'rev', now, 60);
    expect(verifyScanTicket(ID, t, now)).toBe('rev');
    expect(verifyScanTicket(ID, t, now + 61_000)).toBeNull();
    expect(verifyScanTicket('00000000-0000-4000-8000-000000000000', t, now)).toBeNull();
    expect(verifyScanTicket(ID, t.replace(/^rev/, 'live'), now)).toBeNull();
    expect(verifyScanTicket(ID, undefined, now)).toBeNull();
    expect(verifyScanTicket(ID, 'live.1.x', now)).toBeNull();
  });

  it('scans the new version under review, else the live config', () => {
    const live = { integrationConfig: { gitUrl: 'live' }, pendingRevision: null } as any;
    const rev = { integrationConfig: { gitUrl: 'live' }, pendingRevision: { integrationConfig: { gitUrl: 'new' } } } as any;
    expect(scanScopeOf(live)).toBe('live');
    expect(scanScopeOf(rev)).toBe('rev');
    expect(scanConfigOf(rev).gitUrl).toBe('new');
    expect(scanConfigOf(rev, 'live').gitUrl).toBe('live');
  });
});

describe('normalizeScanReport: capability gate from the backend catalog', () => {
  it('uses the catalog gate result (ADR-004: unsupported capabilities never fail)', () => {
    const r = normalizeScanReport({
      miniAppId: ID,
      ingest: { passed: true },
      stages: ['capability_gate'],
      capability: { allowed: [], required: ['nfc'] }, // the pipeline's allowlist would fail this
      capabilityGate: {
        check: { passed: true, details: '1 of 1 optional capabilities unsupported.', launchable: true },
        findings: [{ id: 'CAP_UNSUPPORTED_NFC', severity: 'LOW', title: 'Optional capability "nfc" will be disabled', description: '' }],
      },
    });
    expect(r.status).toBe('PASSED');
    expect(r.checks!.capability_gate).toMatchObject({ passed: true, launchable: true, findings: 1 });
    expect(r.findings!.map((f) => f.id)).toEqual(['CAP_UNSUPPORTED_NFC']);
  });
});
