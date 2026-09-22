import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PubspecInjectorService } from './pubspec-injector.service';
import { MiniApp } from '../../miniapps/entities/miniapp.entity';
import * as fs from 'fs';
import * as path from 'path';

describe('PubspecInjectorService', () => {
  let service: PubspecInjectorService;
  let mockMiniappRepo: any;
  let configService: any;
  let tempDir: string;
  let tempPubspecPath: string;

  beforeEach(async () => {
    // Create temporary workspace directory for safe isolated testing
    tempDir = path.join(__dirname, '../../../test-scratch-' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });

    const initialPubspec = `name: dps_mobile_app
description: "A new Flutter project."
publish_to: "none"
version: 1.0.0+1

environment:
  sdk: ^3.12.2

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.8

dev_dependencies:
  flutter_test:
    sdk: flutter
`;

    tempPubspecPath = path.join(tempDir, 'pubspec.yaml');
    fs.writeFileSync(tempPubspecPath, initialPubspec, 'utf-8');

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'MOBILE_APP_DIR') return tempDir;
        if (key === 'NEXUS_BASE_URL') return 'http://localhost:8081';
        return null;
      }),
    };

    mockMiniappRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'ma-1',
          name: 'Public Transit',
          status: 'APPROVED',
          integrationMethod: 'FLUTTER_PACKAGE',
          integrationConfig: {
            packageName: 'sc_public_miniapp',
            repoUrl: 'https://github.com/fintech/sc-public-miniapp.git',
            gitTag: 'v1.0.0',
          },
        },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PubspecInjectorService,
        { provide: ConfigService, useValue: configService },
        { provide: getRepositoryToken(MiniApp), useValue: mockMiniappRepo },
      ],
    }).compile();

    service = module.get<PubspecInjectorService>(PubspecInjectorService);
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (_) {}
  });

  it('should resolve mobile app directory and pubspec path', () => {
    expect(service.getMobileAppDir()).toBe(tempDir);
    expect(service.getPubspecPath()).toBe(tempPubspecPath);
  });

  it('should inject a Git repository dependency into pubspec.yaml AST', async () => {
    const res = await service.injectDependency({
      packageName: 'sc_public_miniapp',
      gitUrl: 'https://github.com/fintech/sc-public-miniapp.git',
      ref: 'v1.0.0',
    });

    expect(res.success).toBe(true);
    expect(res.packageName).toBe('sc_public_miniapp');

    const updatedContent = fs.readFileSync(tempPubspecPath, 'utf-8');
    expect(updatedContent).toContain('sc_public_miniapp:');
    expect(updatedContent).toContain('url: https://github.com/fintech/sc-public-miniapp.git');
    expect(updatedContent).toContain('ref: v1.0.0');
    expect(updatedContent).toContain('cupertino_icons: ^1.0.8'); // Existing deps preserved
  });

  it('should inject a Hosted Nexus dependency', async () => {
    const res = await service.injectDependency({
      packageName: 'dps_core_package',
      isHosted: true,
      version: '^1.2.0',
    });

    expect(res.success).toBe(true);
    const updatedContent = fs.readFileSync(tempPubspecPath, 'utf-8');
    expect(updatedContent).toContain('dps_core_package:');
    expect(updatedContent).toContain('hosted:');
    expect(updatedContent).toContain('http://localhost:8081/repository/pub-group');
  });

  it('should remove a dependency cleanly and create backup', async () => {
    await service.injectDependency({
      packageName: 'temp_package',
      version: '^1.0.0',
    });

    let content = fs.readFileSync(tempPubspecPath, 'utf-8');
    expect(content).toContain('temp_package');

    const removeRes = await service.removeDependency('temp_package');
    expect(removeRes.success).toBe(true);

    content = fs.readFileSync(tempPubspecPath, 'utf-8');
    expect(content).not.toContain('temp_package');
    expect(fs.existsSync(service.getBackupPath())).toBe(true);
  });

  it('should restore from backup file', () => {
    service.createBackup();
    fs.writeFileSync(tempPubspecPath, 'corrupted content', 'utf-8');

    const restoreRes = service.restoreBackup();
    expect(restoreRes.success).toBe(true);

    const content = fs.readFileSync(tempPubspecPath, 'utf-8');
    expect(content).toContain('dps_mobile_app');
  });

  it('should synchronize all approved mini apps into pubspec.yaml', async () => {
    // Mock validateDependencies to avoid calling real flutter in unit tests
    jest.spyOn(service, 'validateDependencies').mockResolvedValue({
      success: true,
      dryRun: true,
      exitCode: 0,
      stdout: 'Dependencies resolved',
      stderr: '',
      message: 'Resolution successful',
      conflicts: [],
    });

    const syncRes = await service.syncAllApprovedMiniApps();
    expect(syncRes.success).toBe(true);
    expect(syncRes.syncedCount).toBe(1);
    expect(syncRes.injectedPackages).toContain('sc_public_miniapp');

    const status = await service.getPubspecStatus();
    expect(status.exists).toBe(true);
    expect(status.miniAppDependencies['sc_public_miniapp']).toBeDefined();
    expect(status.miniAppDependencies['sc_public_miniapp'].git).toBeDefined();
    expect(status.miniAppDependencies['sc_public_miniapp'].git.url).toBe(
      'https://github.com/fintech/sc-public-miniapp.git',
    );
  });

  it('should prioritize Git repository over local workspace path in injectMiniApp', async () => {
    // Spy on discoverWorkspacePackages to simulate a local monorepo directory match
    jest.spyOn(service, 'discoverWorkspacePackages').mockReturnValue(
      new Map([['sc_public_miniapp', '../sc-public-miniapp']]),
    );

    const miniApp: any = {
      id: 'ma-git-priority',
      name: 'Smart Transit',
      integrationMethod: 'FLUTTER_PACKAGE',
      integrationConfig: {
        sourceType: 'GIT',
        packageName: 'sc_public_miniapp',
        gitUrl: 'https://github.com/KhornMolika/sc-public-miniapp.git',
        gitTag: 'v1.0.0',
      },
    };

    const res = await service.injectMiniApp(miniApp);
    expect(res.success).toBe(true);
    expect(res.injectedConfig).toEqual({
      git: {
        url: 'https://github.com/KhornMolika/sc-public-miniapp.git',
        ref: 'v1.0.0',
      },
    });

    const status = await service.getPubspecStatus();
    expect(status.miniAppDependencies['sc_public_miniapp']).toEqual({
      git: {
        url: 'https://github.com/KhornMolika/sc-public-miniapp.git',
        ref: 'v1.0.0',
      },
    });
  });
});
