import { Test, TestingModule } from '@nestjs/testing';
import { SecurityGate2Service } from './security-gate2.service';
import { NexusIntegrationService } from '../nexus/nexus-integration.service';

describe('SecurityGate2Service', () => {
  let service: SecurityGate2Service;
  let mockNexusService: Partial<NexusIntegrationService>;

  beforeEach(async () => {
    mockNexusService = {
      getPackageInfo: jest.fn().mockImplementation(async (packageName: string) => {
        if (packageName === 'dps_miniapp_mobile_trust_regulator') {
          return {
            exists: true,
            name: 'dps_miniapp_mobile_trust_regulator',
            latest: {
              version: '0.0.2',
              pubspec: {
                name: 'dps_miniapp_mobile_trust_regulator',
                version: '0.0.2',
                dependencies: {
                  flutter: { sdk: 'flutter' },
                  dps_core_package: '^1.0.0',
                },
              },
            },
          };
        }
        return { exists: false };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityGate2Service,
        { provide: NexusIntegrationService, useValue: mockNexusService },
      ],
    }).compile();

    service = module.get<SecurityGate2Service>(SecurityGate2Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should pass Gate 2 and generate manifest when all checksums and dependencies match', async () => {
    const result = await service.verifyAndAssembleRelease({
      releaseVersion: 'v1.1.0',
      miniApps: [
        {
          id: 'app-1',
          name: 'Trust Regulator',
          packageName: 'dps_miniapp_mobile_trust_regulator',
          version: '0.0.2',
          declaredPermissions: [{ type: 'NFC' }],
        },
      ],
    });

    expect(result.status).toBe('PASSED');
    expect(result.passed).toBe(true);
    expect(result.manifest.superAppVersion).toBe('v1.1.0');
    expect(result.manifest.bundledMiniApps).toHaveLength(1);
    expect(result.manifest.consolidatedPermissions).toContain('NFC');
    expect(result.manifest.integrityDigest).toBeDefined();
  });

  it('should fail Gate 2 when a package is not found on Nexus', async () => {
    const result = await service.verifyAndAssembleRelease({
      releaseVersion: 'v1.1.0',
      miniApps: [
        {
          id: 'app-2',
          name: 'Unknown App',
          packageName: 'non_existent_package',
          version: '1.0.0',
        },
      ],
    });

    expect(result.status).toBe('FAILED');
    expect(result.passed).toBe(false);
    expect(result.conflicts.length).toBeGreaterThan(0);
  });
});
