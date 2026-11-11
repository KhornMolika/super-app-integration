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

  const originalLocalBuilds = process.env.LOCAL_BUILDS_ENABLED;

  beforeEach(async () => {
    // These tests write to an isolated temp workspace, so local writes are enabled here
    process.env.LOCAL_BUILDS_ENABLED = 'true';
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
    if (originalLocalBuilds === undefined) delete process.env.LOCAL_BUILDS_ENABLED;
    else process.env.LOCAL_BUILDS_ENABLED = originalLocalBuilds;
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
    // The public /pub gateway, never the backend's own Nexus address (localhost / cluster-internal)
    expect(updatedContent).toContain('url: https://app.fintechcenterfsa.com/pub');
    expect(updatedContent).not.toContain('localhost');
  });

  it('pubspec registry URL: SUPER_APP_PUB_URL, and never a Nexus or internal address', () => {
    expect(service.pubspecHostedUrl()).toBe('https://app.fintechcenterfsa.com/pub');
    for (const internal of [
      'http://localhost:8081/repository/pub-group',
      'http://nexus.super-app.svc.cluster.local:8081/repository/pub-group',
      'https://app.fintechcenterfsa.com/nexus/repository/pub-hosted',
    ]) {
      expect(service.pubspecHostedUrl(internal)).toBe('https://app.fintechcenterfsa.com/pub');
    }
    // A real external registry the app asked for is kept
    expect(service.pubspecHostedUrl('https://pub.partner.example/')).toBe('https://pub.partner.example');
    const prev = configService.get.getMockImplementation();
    configService.get.mockImplementation((k: string) =>
      k === 'SUPER_APP_PUB_URL' ? 'https://staging.example/pub/' : prev(k),
    );
    expect(service.pubspecHostedUrl()).toBe('https://staging.example/pub');
    configService.get.mockImplementation(prev);
  });

  describe('with LOCAL_BUILDS_ENABLED off (the default on servers)', () => {
    beforeEach(() => {
      delete process.env.LOCAL_BUILDS_ENABLED;
    });

    it('never touches pubspec.yaml: inject/remove/sync/restore are skipped, not thrown', async () => {
      const before = fs.readFileSync(tempPubspecPath, 'utf-8');

      const inject = await service.injectDependency({ packageName: 'evil_pkg', version: '^1.0.0' });
      const remove = await service.removeDependency('flutter');
      const sync = await service.syncAllApprovedMiniApps();
      const restore = service.restoreBackup();
      await service.regenerateRegistry();

      for (const r of [inject, remove, sync, restore]) expect(r.success).toBe(false);
      expect(inject.message).toMatch(/LOCAL_BUILDS_ENABLED=true/);
      expect(fs.readFileSync(tempPubspecPath, 'utf-8')).toBe(before);
      expect(mockMiniappRepo.find).not.toHaveBeenCalled(); // sync never even read the DB
    });

    it('does not run a real (non dry-run) flutter pub get', async () => {
      const res = await service.validateDependencies({ dryRun: false });
      expect(res.message).toMatch(/LOCAL_BUILDS_ENABLED=true/);
    });
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
  describe('generateDynamicRegistry (Home widget registration)', () => {
    const generatedPath = () =>
      path.join(tempDir, 'lib/core/miniapp/mini_app_registry.generated.dart');

    const writeDeps = (names: string[]) => {
      const deps = names
        .map((n) => (n === 'flutter' ? '  flutter:\n    sdk: flutter' : `  ${n}:\n    path: ../${n}`))
        .join('\n');
      fs.writeFileSync(
        tempPubspecPath,
        `name: dps_mobile_app\nenvironment:\n  sdk: ^3.12.2\n\ndependencies:\n${deps}\n`,
        'utf-8',
      );
      fs.mkdirSync(path.join(tempDir, 'lib/core/miniapp'), { recursive: true });
    };

    const hr: any = {
      id: 'hr-uuid-1234',
      appId: 'miniapp_fsa_hr_abc',
      name: 'FSA HR',
      integrationMethod: 'FLUTTER_PACKAGE',
      integrationConfig: { packageName: 'fsa_hr_miniapp' },
      homeWidget: { widgetClass: 'HrHomeWidget', verifiedClass: 'HrHomeWidget' },
    };
    const kyc: any = {
      id: 'kyc-uuid-1',
      appId: 'ma_flutter_kyc',
      name: 'KYC',
      integrationMethod: 'FLUTTER_PACKAGE',
      integrationConfig: { packageName: 'ma_flutter_kyc' },
    };
    const hrUnverified: any = {
      id: 'hr2-uuid-5678',
      appId: 'miniapp_unverified_x',
      name: 'Unverified HR',
      integrationMethod: 'FLUTTER_PACKAGE',
      integrationConfig: { packageName: 'fsa_hr_miniapp' },
      homeWidget: { widgetClass: 'HrHomeWidget' },
    };

    it('emits widget registration for verified apps and skips non-dependency packages', () => {
      writeDeps(['flutter', 'fsa_hr_miniapp']);
      service.generateDynamicRegistry([hr, kyc, hrUnverified]);

      const content = fs.readFileSync(generatedPath(), 'utf-8');
      expect(content).toContain(
        "import 'package:fsa_hr_miniapp/fsa_hr_miniapp.dart' as fsa_hr_miniapp;",
      );
      expect(content).toContain(
        "(context, arguments) => buildPackageWidget(fsa_hr_miniapp.MiniAppEntry.new, {#onExit: () => safePop(context)}, superAppTokenProvider(context, 'miniapp_fsa_hr_abc'))",
      );
      expect(content).not.toContain('ma_flutter_kyc');

      const widgetBlocks = content.split('registerWidgetAliases(').slice(1);
      expect(widgetBlocks).toHaveLength(1);
      expect(widgetBlocks[0]).toContain("'miniapp_fsa_hr_abc'");
      expect(widgetBlocks[0]).toContain(
        "(context, onOpen) => buildPackageWidget(fsa_hr_miniapp.HrHomeWidget.new, {#onOpen: onOpen}, superAppTokenProvider(context, 'miniapp_fsa_hr_abc'))",
      );
      // unverified app still gets its entry registration
      expect(content).toContain("'miniapp_unverified_x'");
    });

    it('imports every package under its own prefix so two MiniAppEntry exports never clash', () => {
      writeDeps(['flutter', 'fsa_hr_miniapp', 'fsa_payroll_miniapp']);
      const payroll: any = {
        id: 'pay-uuid-9',
        appId: 'miniapp_payroll_1',
        name: 'Payroll',
        integrationMethod: 'FLUTTER_PACKAGE',
        integrationConfig: { packageName: 'fsa_payroll_miniapp' },
        homeWidget: {
          widgetClass: 'PayrollHomeWidget',
          verifiedClass: 'PayrollHomeWidget',
        },
      };
      service.generateDynamicRegistry([hr, payroll]);

      const content = fs.readFileSync(generatedPath(), 'utf-8');
      expect(content).toContain(
        "import 'package:fsa_hr_miniapp/fsa_hr_miniapp.dart' as fsa_hr_miniapp;",
      );
      expect(content).toContain(
        "import 'package:fsa_payroll_miniapp/fsa_payroll_miniapp.dart' as fsa_payroll_miniapp;",
      );
      expect(content).toContain('=> buildPackageWidget(fsa_hr_miniapp.MiniAppEntry.new,');
      expect(content).toContain('=> buildPackageWidget(fsa_payroll_miniapp.MiniAppEntry.new,');
      expect(content).toContain(
        "buildPackageWidget(fsa_payroll_miniapp.PayrollHomeWidget.new, {#onOpen: onOpen}, superAppTokenProvider(context, 'miniapp_payroll_1'))",
      );
      // no unprefixed reference to an app-package class
      expect(content).not.toMatch(/=> MiniAppEntry\(/);
      expect(content).not.toMatch(/=> (HrHomeWidget|PayrollHomeWidget)\(/);
      expect(content).not.toMatch(/=> (HrHomeWidget|PayrollHomeWidget)\.new/);
    });

    it('prefixes a custom entryPoint and the hard-coded package branches', () => {
      writeDeps(['flutter', 'custom_pkg', 'sc_public_miniapp', 'sc_private_miniapp', 'ma_flutter_kyc']);
      const base = { integrationMethod: 'FLUTTER_PACKAGE' };
      service.generateDynamicRegistry([
        {
          ...base,
          id: 'c1',
          appId: 'custom_app',
          name: 'Custom',
          integrationConfig: { packageName: 'custom_pkg', entryPoint: 'CustomEntry' },
        } as any,
        { ...base, id: 'p1', appId: 'pub', name: 'Pub', integrationConfig: { packageName: 'sc_public_miniapp' } } as any,
        { ...base, id: 'p2', appId: 'priv', name: 'Priv', integrationConfig: { packageName: 'sc_private_miniapp' } } as any,
        { ...base, id: 'k1', appId: 'kyc', name: 'Kyc', integrationConfig: { packageName: 'ma_flutter_kyc' } } as any,
      ]);

      const content = fs.readFileSync(generatedPath(), 'utf-8');
      expect(content).toContain(
        "=> buildPackageWidget(custom_pkg.CustomEntry.new, {#onExit: () => safePop(context)}, superAppTokenProvider(context, 'custom_app'))",
      );
      expect(content).toContain('=> sc_public_miniapp.PublicMiniAppEntry(onExit:');
      expect(content).toContain('=> sc_private_miniapp.MiniAppEntry(onExit:');
      expect(content).toContain('=> ma_flutter_kyc.KycVerifierAppEntry(jwtToken:');
      expect(content).toContain(
        "import 'package:sc_public_miniapp/sc_public_miniapp.dart' as sc_public_miniapp;",
      );
      expect(content).toContain(
        "import 'package:ma_flutter_kyc/ma_flutter_kyc.dart' as ma_flutter_kyc;",
      );
    });

    it('references the Home widget through its own package even when the entry uses a hard-coded branch', () => {
      writeDeps(['flutter', 'fsa_public_hr']);
      service.generateDynamicRegistry([
        {
          id: 'f1',
          appId: 'fsa_public_hr_app',
          name: 'Public HR',
          integrationMethod: 'FLUTTER_PACKAGE',
          integrationConfig: { packageName: 'fsa_public_hr' },
          homeWidget: { widgetClass: 'HrHomeWidget', verifiedClass: 'HrHomeWidget' },
        } as any,
      ]);

      const content = fs.readFileSync(generatedPath(), 'utf-8');
      expect(content).toContain(
        "import 'package:fsa_public_hr/fsa_public_hr.dart' as fsa_public_hr;",
      );
      // hard-coded branch keeps its entry expression unchanged
      expect(content).toContain(
        '=> sc_public_miniapp.PublicMiniAppEntry(onExit: () => safePop(context), passengerName:',
      );
      expect(content).not.toContain('PublicMiniAppEntry.new');
      // ...but the widget line always goes through the helper
      expect(content).toContain(
        "(context, onOpen) => buildPackageWidget(fsa_public_hr.HrHomeWidget.new, {#onOpen: onOpen}, superAppTokenProvider(context, 'fsa_public_hr_app'))",
      );
    });

    it('does not emit a widget registration when nothing is verified', () => {
      writeDeps(['flutter', 'fsa_hr_miniapp']);
      service.generateDynamicRegistry([hrUnverified]);
      const content = fs.readFileSync(generatedPath(), 'utf-8');
      expect(content).toContain("'miniapp_unverified_x'");
      expect(content).not.toContain('registerWidgetAliases');
    });

    it('regenerateRegistry loads Flutter apps and writes the registry, never throwing', async () => {
      writeDeps(['flutter', 'fsa_hr_miniapp']);
      mockMiniappRepo.find.mockResolvedValue([
        hr,
        { ...kyc, integrationMethod: 'WEBVIEW' },
      ]);
      await expect(service.regenerateRegistry()).resolves.toBeUndefined();
      const content = fs.readFileSync(generatedPath(), 'utf-8');
      expect(content).toContain('registerWidgetAliases(');

      mockMiniappRepo.find.mockRejectedValue(new Error('db down'));
      await expect(service.regenerateRegistry()).resolves.toBeUndefined();
    });
  });
});
