import { Test, TestingModule } from '@nestjs/testing';
import { GateStatus, SecuritySeverity } from './dto/security-gate.dto';
import { SecurityGateService } from './security-gate.service';
import { GitIntegrationService } from '../git/git-integration.service';

describe('SecurityGateService (Gate 1 Pre-Publish)', () => {
  let service: SecurityGateService;
  let mockGitService: Partial<GitIntegrationService>;

  const mockValidPubspec = `
name: sample_trust_miniapp
description: Sample Trust Regulator Mini App
version: 1.0.0
environment:
  sdk: ^3.0.0
dependencies:
  flutter:
    sdk: flutter
  dps_core_package: ^1.0.0
  nfc_manager: ^3.3.0
`;

  const mockPubspecWithSecret = `
name: vulnerable_miniapp
version: 1.0.0
environment:
  sdk: ^3.0.0
dependencies:
  flutter:
    sdk: flutter
# Insecure embedded AWS secret
aws_key: AKIAIOSFODNN7EXAMPLE
`;

  beforeEach(async () => {
    mockGitService = {
      resolveProvider: jest.fn().mockReturnValue({
        parseUrl: jest.fn().mockReturnValue({
          owner: 'testowner',
          repo: 'testrepo',
          fullName: 'testowner/testrepo',
          rawUrl: 'https://github.com/testowner/testrepo.git',
        }),
        getFileContent: jest.fn().mockImplementation((url, path) => {
          if (url.includes('vulnerable')) {
            return Promise.resolve(mockPubspecWithSecret);
          }
          return Promise.resolve(mockValidPubspec);
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityGateService,
        {
          provide: GitIntegrationService,
          useValue: mockGitService,
        },
      ],
    }).compile();

    service = module.get<SecurityGateService>(SecurityGateService);
  });

  it('should pass Gate 1 when permissions are declared and no secrets exist', async () => {
    const report = await service.runGate1Scan({
      url: 'https://github.com/testowner/testrepo',
      declaredPermissions: [{ type: 'NFC', purpose: 'Read contactless passport chips' }],
    });

    expect(report.gate).toBe('GATE_1');
    expect(report.status).toBe(GateStatus.PASSED);
    expect(report.score).toBe(100);
    expect(report.checks.secretScan.passed).toBe(true);
    expect(report.checks.permissionCompliance.passed).toBe(true);
    expect(report.checks.coreSdkCompatibility.passed).toBe(true);
    expect(report.checks.integrityCheck.sha256).toBeDefined();
    expect(report.metrics.critical).toBe(0);
    expect(report.metrics.high).toBe(0);
  });

  it('should fail Gate 1 when a native plugin is used without declared permission', async () => {
    const report = await service.runGate1Scan({
      url: 'https://github.com/testowner/testrepo',
      declaredPermissions: [], // Missing NFC permission
    });

    expect(report.status).toBe(GateStatus.FAILED);
    expect(report.checks.permissionCompliance.passed).toBe(false);
    expect(report.checks.permissionCompliance.undeclaredPlugins).toContain('nfc_manager');

    const permFinding = report.findings.find((f) => f.category === 'PERMISSIONS');
    expect(permFinding).toBeDefined();
    expect(permFinding?.severity).toBe(SecuritySeverity.HIGH);
  });

  it('should detect hardcoded secrets and fail Gate 1', async () => {
    const report = await service.runGate1Scan({
      url: 'https://github.com/testowner/vulnerable-repo',
      declaredPermissions: [],
    });

    expect(report.status).toBe(GateStatus.FAILED);
    expect(report.checks.secretScan.passed).toBe(false);
    expect(report.checks.secretScan.leaksFound).toBeGreaterThan(0);

    const secretFinding = report.findings.find((f) => f.category === 'SECRETS');
    expect(secretFinding).toBeDefined();
    expect(secretFinding?.severity).toBe(SecuritySeverity.CRITICAL);
  });
});
