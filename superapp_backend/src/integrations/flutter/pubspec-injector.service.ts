import { Injectable, Logger, BadRequestException, Optional, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import * as child_process from 'child_process';
import * as YAML from 'yaml';
import { decryptCredential } from '../../common/utils/credential-cipher.util';
import { MiniApp } from '../../miniapps/entities/miniapp.entity';
import {
  InjectDependencyDto,
  ValidateDependencyDto,
} from './dto/pubspec-injector.dto';
import { SandboxBuildManagerService } from './sandbox-build-manager.service';

export interface PubspecDependencyEntry {
  type: 'git' | 'path' | 'hosted' | 'version';
  packageName: string;
  gitUrl?: string;
  ref?: string;
  subPath?: string;
  path?: string;
  version?: string;
  hostedUrl?: string;
  rawYaml?: any;
}

export interface PubspecStatusInfo {
  pubspecPath: string;
  exists: boolean;
  hasBackup: boolean;
  totalDependencies: number;
  miniAppDependencies: Record<string, any>;
  lastModified?: string;
}

@Injectable()
export class PubspecInjectorService {
  private readonly logger = new Logger(PubspecInjectorService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(MiniApp)
    private readonly miniappRepository: Repository<MiniApp>,
    @Optional()
    private readonly sandboxBuildManager?: SandboxBuildManagerService,
  ) {}

  /**
   * Resolves the absolute path to the SuperApp's super-app directory strictly from environment variables.
   */
  getMobileAppDir(): string {
    const configuredPath =
      this.configService.get<string>('MOBILE_APP_DIR') ||
      process.env.MOBILE_APP_DIR ||
      this.configService.get<string>('SUPERAPP_DIR') ||
      process.env.SUPERAPP_DIR;

    if (!configuredPath) {
      throw new BadRequestException(
        'MOBILE_APP_DIR environment variable is not defined. Please configure MOBILE_APP_DIR in your environment configuration.',
      );
    }

    const resolved = path.isAbsolute(configuredPath)
      ? path.normalize(configuredPath)
      : path.resolve(process.cwd(), configuredPath);

    if (!fs.existsSync(resolved) || !fs.existsSync(path.join(resolved, 'pubspec.yaml'))) {
      throw new BadRequestException(
        `Directory configured in MOBILE_APP_DIR ("${configuredPath}" -> "${resolved}") is invalid or does not contain pubspec.yaml.`,
      );
    }

    return resolved;
  }

  /**
   * Resolves the absolute path to super-app/pubspec.yaml.
   */
  getPubspecPath(): string {
    return path.join(this.getMobileAppDir(), 'pubspec.yaml');
  }

  /**
   * Resolves the absolute path to super-app/pubspec.yaml.bak.
   */
  getBackupPath(): string {
    return path.join(this.getMobileAppDir(), 'pubspec.yaml.bak');
  }

  /**
   * Reads and parses pubspec.yaml into a YAML Document AST.
   */
  readPubspecDocument(): {
    filePath: string;
    rawContent: string;
    document: YAML.Document;
    dependenciesNode: YAML.YAMLMap | null;
  } {
    const filePath = this.getPubspecPath();
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException(`pubspec.yaml not found at ${filePath}`);
    }

    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const document = YAML.parseDocument(rawContent);

    let dependenciesNode = document.get('dependencies') as YAML.YAMLMap | null;
    if (!dependenciesNode) {
      document.set('dependencies', new YAML.YAMLMap());
      dependenciesNode = document.get('dependencies') as YAML.YAMLMap;
    }

    return { filePath, rawContent, document, dependenciesNode };
  }

  /**
   * Creates a safety backup of pubspec.yaml before any modification.
   */
  createBackup(): void {
    const src = this.getPubspecPath();
    const dst = this.getBackupPath();
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
      this.logger.debug(`Created pubspec.yaml backup at ${dst}`);
    }
  }

  /**
   * Restores pubspec.yaml from pubspec.yaml.bak if available.
   */
  restoreBackup(): { success: boolean; message: string } {
    const src = this.getBackupPath();
    const dst = this.getPubspecPath();
    if (!fs.existsSync(src)) {
      return { success: false, message: 'No pubspec.yaml.bak backup found.' };
    }

    fs.copyFileSync(src, dst);
    this.logger.log(`Restored pubspec.yaml from backup ${src}`);
    return { success: true, message: 'pubspec.yaml successfully restored from backup.' };
  }

  /**
   * Injects or updates a dependency in super-app/pubspec.yaml.
   */
  async injectDependency(
    dto: InjectDependencyDto,
  ): Promise<{
    success: boolean;
    packageName: string;
    injectedConfig: any;
    message: string;
  }> {
    const { packageName, gitUrl, ref, path: localPath, version, isHosted, hostedUrl } = dto;

    if (!packageName) {
      throw new BadRequestException('Package name is required for dependency injection');
    }

    this.createBackup();
    const { filePath, document, dependenciesNode } = this.readPubspecDocument();

    let dependencyValue: any;

    // Helper to ensure version constraints don't produce duplicate carets (e.g. ^^1.0.0)
    const normalizeVersionConstraint = (ver?: string): string => {
      if (!ver || !ver.trim()) return '^1.0.0';
      const trimmed = ver.trim();
      if (/^[\^~>=<]/.test(trimmed) || trimmed === 'any') {
        return trimmed;
      }
      return `^${trimmed}`;
    };

    if (gitUrl) {
      const gitConfig: Record<string, string> = { url: gitUrl };
      if (ref) gitConfig.ref = ref;
      if (localPath) gitConfig.path = localPath;
      dependencyValue = { git: gitConfig };
    } else if (isHosted) {
      const nexusPubGroup =
        hostedUrl ||
        `${(this.configService.get<string>('NEXUS_BASE_URL') || 'http://localhost:8081').replace(/\/+$/, '')}/repository/pub-group`;
      dependencyValue = {
        hosted: {
          name: packageName,
          url: nexusPubGroup,
        },
        version: normalizeVersionConstraint(version),
      };
    } else if (localPath) {
      dependencyValue = { path: localPath };
    } else if (version) {
      dependencyValue = normalizeVersionConstraint(version);
    } else {
      // Default: Resolve dynamically from private Nexus pub-group registry
      const nexusPubGroup =
        hostedUrl ||
        `${(this.configService.get<string>('NEXUS_BASE_URL') || 'http://localhost:8081').replace(/\/+$/, '')}/repository/pub-group`;
      dependencyValue = {
        hosted: {
          name: packageName,
          url: nexusPubGroup,
        },
        version: normalizeVersionConstraint(version),
      };
    }

    dependenciesNode?.set(packageName, dependencyValue);

    const updatedYaml = document.toString();
    fs.writeFileSync(filePath, updatedYaml, 'utf-8');

    this.logger.log(
      `Successfully injected dependency "${packageName}" into ${filePath}: ${JSON.stringify(dependencyValue)}`,
    );

    return {
      success: true,
      packageName,
      injectedConfig: dependencyValue,
      message: `Dependency "${packageName}" successfully injected into SuperApp pubspec.yaml.`,
    };
  }

  /**
   * Scans sibling directories in the monorepo workspace for Flutter packages
   * and maps their declared pubspec 'name' to the relative directory path.
   */
  discoverWorkspacePackages(): Map<string, string> {
    const mobileDir = this.getMobileAppDir();
    const parentDir = path.resolve(mobileDir, '..');
    const packageMap = new Map<string, string>();

    try {
      if (fs.existsSync(parentDir)) {
        const entries = fs.readdirSync(parentDir, { withFileTypes: true });
        for (const entry of entries) {
          if (
            entry.isDirectory() &&
            entry.name !== 'super-app' &&
            entry.name !== 'node_modules' &&
            entry.name !== '.git'
          ) {
            const candidatePubspec = path.join(parentDir, entry.name, 'pubspec.yaml');
            if (fs.existsSync(candidatePubspec)) {
              try {
                const content = fs.readFileSync(candidatePubspec, 'utf-8');
                const doc = YAML.parse(content);
                if (doc && doc.name) {
                  packageMap.set(doc.name, `../${entry.name}`);
                  packageMap.set(entry.name, `../${entry.name}`);
                  packageMap.set(entry.name.replace(/-/g, '_'), `../${entry.name}`);
                }
              } catch (_) {}
            }
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Could not scan workspace packages: ${err.message}`);
    }

    return packageMap;
  }

  /**
   * Infers the canonical Dart package name from MiniApp entity configuration.
   */
  inferCanonicalPackageName(miniApp: MiniApp): string {
    const cfg = miniApp.integrationConfig || {};
    if (cfg.packageName && typeof cfg.packageName === 'string' && cfg.packageName.trim() !== '') {
      return cfg.packageName.trim().replace(/-/g, '_').toLowerCase();
    }

    const gitUrl = cfg.gitUrl || cfg.repoUrl || (cfg.repoOwner && cfg.repoName ? cfg.repoName : '');
    if (gitUrl) {
      const match = gitUrl.match(/[\/:]([^\/:]+?)(\.git)?$/);
      if (match && match[1]) {
        return match[1].replace(/-/g, '_').toLowerCase();
      }
    }

    return (miniApp.name || miniApp.appId || 'miniapp')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');
  }

  /**
   * Injects a MiniApp entity into pubspec.yaml based on its integrationConfig and repository details.
   */
  async injectMiniApp(
    miniApp: MiniApp,
  ): Promise<{ success: boolean; packageName: string; injectedConfig: any }> {
    const cfg = miniApp.integrationConfig || {};
    const packageName = this.inferCanonicalPackageName(miniApp);
    const repoUrl =
      cfg.gitUrl ||
      cfg.repoUrl ||
      (cfg.repoOwner && cfg.repoName
        ? `https://github.com/${cfg.repoOwner}/${cfg.repoName}.git`
        : undefined);
    const gitRef =
      cfg.gitBranch ||
      cfg.gitTag ||
      cfg.commitSha ||
      cfg.branch ||
      cfg.ref ||
      'main';
    const packageVersion = cfg.packageVersion || cfg.version || '1.0.0';

    // 1. Explicit Git Repository Dependency (Highest Priority when Git source is configured)
    if (repoUrl && (cfg.sourceType === 'GIT' || (!cfg.sourceType && repoUrl))) {
      return this.injectDependency({
        packageName,
        gitUrl: repoUrl,
        ref: gitRef,
        path: cfg.gitPath || cfg.packagePath || undefined,
      });
    }

    // 2. Nexus Hosted Package Artifact
    if (cfg.sourceType === 'ARTIFACT' || cfg.packageStoragePath || cfg.isHosted) {
      return this.injectDependency({
        packageName,
        isHosted: true,
        version: cfg.versionConstraint || `^${packageVersion}`,
        hostedUrl: cfg.nexusUrl || cfg.hostedUrl,
      });
    }

    // 3. Explicit Local Monorepo Path
    const workspaceMap = this.discoverWorkspacePackages();
    if (cfg.sourceType === 'LOCAL' || cfg.path) {
      return this.injectDependency({
        packageName,
        path: cfg.path || workspaceMap.get(packageName) || `../${packageName}`,
      });
    }

    // 4. Workspace Local Path Discovery (Fallback for local dev monorepos)
    if (workspaceMap.has(packageName)) {
      return this.injectDependency({
        packageName,
        path: workspaceMap.get(packageName),
      });
    }

    // 5. Default version constraint
    return this.injectDependency({
      packageName,
      version: cfg.versionConstraint || `^${packageVersion}`,
    });
  }

  /**
   * Removes a dependency from super-app/pubspec.yaml.
   */
  async removeDependency(
    packageName: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!packageName) {
      throw new BadRequestException('Package name is required to remove dependency');
    }

    this.createBackup();
    const { filePath, document, dependenciesNode } = this.readPubspecDocument();

    if (dependenciesNode && dependenciesNode.has(packageName)) {
      dependenciesNode.delete(packageName);
      const updatedYaml = document.toString();
      fs.writeFileSync(filePath, updatedYaml, 'utf-8');
      this.logger.log(`Removed dependency "${packageName}" from ${filePath}`);
      return {
        success: true,
        message: `Dependency "${packageName}" successfully removed from pubspec.yaml.`,
      };
    }

    return {
      success: true,
      message: `Dependency "${packageName}" was not present in pubspec.yaml.`,
    };
  }

  /**
   * Synchronizes all APPROVED, TESTING, and ACTIVE Flutter Package mini apps into pubspec.yaml.
   * Also cleans up any obsolete dummy/unresolvable package entries.
   */
  async syncAllApprovedMiniApps(): Promise<{
    success: boolean;
    syncedCount: number;
    injectedPackages: string[];
    validationResult: any;
  }> {
    this.logger.log('Synchronizing all approved Flutter Package MiniApps into pubspec.yaml...');

    const approvedMiniApps = await this.miniappRepository.find({
      where: {
        status: In(['APPROVED', 'TESTING', 'ACTIVE', 'IN_REVIEW']),
      },
    });

    const flutterMiniApps = approvedMiniApps.filter(
      (app) => (app.integrationMethod || '').toUpperCase() === 'FLUTTER_PACKAGE',
    );

    const baseFrameworkDeps = new Set([
      'flutter',
      'cupertino_icons',
      'get',
      'webview_flutter',
      'http',
      'geolocator',
      'image_picker',
      'local_auth',
      'url_launcher',
      'webview_flutter_web',
    ]);

    // Discover local workspace packages for immediate offline resolution
    const workspaceMap = this.discoverWorkspacePackages();

    // Deduplicate by canonical package name
    const validMiniAppPackageNames = new Set<string>();
    for (const app of flutterMiniApps) {
      validMiniAppPackageNames.add(this.inferCanonicalPackageName(app));
    }
    // Also include any workspace package names
    for (const name of workspaceMap.keys()) {
      validMiniAppPackageNames.add(name);
    }

    // Clean up invalid or obsolete dependencies from pubspec.yaml
    const { filePath, document, dependenciesNode } = this.readPubspecDocument();
    if (dependenciesNode) {
      const currentKeys = Object.keys(dependenciesNode.toJSON() || {});
      for (const k of currentKeys) {
        if (!baseFrameworkDeps.has(k) && !validMiniAppPackageNames.has(k)) {
          this.logger.log(`Pruning stale/invalid dependency "${k}" from pubspec.yaml`);
          dependenciesNode.delete(k);
        }
      }
      fs.writeFileSync(filePath, document.toString(), 'utf-8');
    }

    const injectedPackages: string[] = [];
    const processedPackageNames = new Set<string>();

    for (const app of flutterMiniApps) {
      const canonicalName = this.inferCanonicalPackageName(app);
      if (processedPackageNames.has(canonicalName)) {
        continue;
      }
      processedPackageNames.add(canonicalName);

      try {
        const res = await this.injectMiniApp(app);
        if (res.success) {
          injectedPackages.push(res.packageName);
        }
      } catch (err: any) {
        this.logger.warn(`Failed to auto-inject mini app ${app.name}: ${err.message}`);
      }
    }

    // Automatically generate the dynamic Dart registry linking all approved mini-apps
    this.generateDynamicRegistry(flutterMiniApps);

    // Run dry-run validation to verify consistency
    const validationResult = await this.validateDependencies({ dryRun: true });

    return {
      success: validationResult.success,
      syncedCount: injectedPackages.length,
      injectedPackages,
      validationResult,
    };
  }

  /**
   * Automatically generates the dynamic Dart registry file linking all approved mini-apps to builders.
   */
  generateDynamicRegistry(apps: MiniApp[]): void {
    try {
      const mobileDir = this.getMobileAppDir();
      const generatedPath = path.join(mobileDir, 'lib/core/miniapp/mini_app_registry.generated.dart');

      const imports = new Set<string>([
        "import 'package:flutter/material.dart';",
        "import 'package:go_router/go_router.dart';",
        "import 'mini_app_registry.dart';",
      ]);

      const registrations: string[] = [];

      for (const app of apps) {
        const canonicalName = this.inferCanonicalPackageName(app);
        const nameSlug = (app.name || '').toLowerCase().replace(/\s+/g, '_');
        const appId = app.appId || '';

        let widgetExpr = '';
        if (canonicalName === 'sc_public_miniapp' || canonicalName.includes('transit') || canonicalName.includes('public')) {
          imports.add("import 'package:sc_public_miniapp/sc_public_miniapp.dart';");
          widgetExpr = "PublicMiniAppEntry(onExit: () => safePop(context), passengerName: 'SuperApp Commuter', passTier: '30-Day Unlimited All-Access')";
        } else if (canonicalName === 'sc_private_miniapp' || canonicalName.includes('private') || canonicalName.includes('loyalty') || canonicalName.includes('reward')) {
          imports.add("import 'package:sc_private_miniapp/sc_private_miniapp.dart';");
          widgetExpr = "MiniAppEntry(onExit: () => safePop(context), userName: 'SuperApp VIP Member', userTier: 'Gold Elite')";
        } else if (canonicalName === 'ma_flutter_kyc' || canonicalName.includes('kyc')) {
          imports.add("import 'package:ma_flutter_kyc/ma_flutter_kyc.dart';");
          widgetExpr = "KycVerifierAppEntry(jwtToken: 'tok_live_superapp_session', userId: 'usr_fsa_verified', onExit: () => safePop(context))";
        } else {
          // Dynamic invocation for any newly registered package entry point
          const entryPoint = (app.integrationConfig?.entryPoint || 'MiniAppEntry').trim();
          imports.add(`import 'package:${canonicalName}/${canonicalName}.dart';`);
          widgetExpr = `${entryPoint}(onExit: () => safePop(context))`;
        }

        if (widgetExpr) {
          registrations.push(`  MiniAppRegistry.registerAliases([
    '${canonicalName}',
    '${appId}',
    '${nameSlug}',
    '${app.name || ''}',
    'miniapp_${nameSlug}_${(app.id || '').substring(0, 6)}',
    '${app.id || ''}',
  ].where((s) => s.isNotEmpty).toList(), (context, arguments) => ${widgetExpr});`);
        }
      }

      const content = `// AUTO-GENERATED BY PubspecInjectorService - DO NOT EDIT MANUALLY
${Array.from(imports).join('\n')}

void registerDynamicGeneratedMiniApps() {
  void safePop(BuildContext context) {
    if (GoRouter.maybeOf(context) != null && GoRouter.of(context).canPop()) {
      GoRouter.of(context).pop();
    } else if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
  }

${registrations.join('\n\n')}
}
`;

      fs.writeFileSync(generatedPath, content, 'utf-8');
      this.logger.log(`Generated dynamic MiniApp registry at ${generatedPath}`);
    } catch (err: any) {
      this.logger.warn(`Failed to generate dynamic MiniApp registry: ${err.message}`);
    }
  }

  /**
   * Runs `flutter pub get --dry-run` or `flutter pub get` in super-app to validate dependencies.
   */
  async validateDependencies(
    dto: ValidateDependencyDto = { dryRun: true },
  ): Promise<{
    success: boolean;
    dryRun: boolean;
    exitCode: number;
    stdout: string;
    stderr: string;
    message: string;
    conflicts: string[];
  }> {
    const mobileAppDir = this.getMobileAppDir();
    const isDryRun = dto.dryRun !== false;
    const command = isDryRun ? 'flutter pub get --dry-run' : 'flutter pub get';

    this.logger.log(`Executing "${command}" in ${mobileAppDir}...`);

    let tempKeyFile: string | null = null;
    const processEnv: NodeJS.ProcessEnv = {
      ...process.env,
      PUB_HOSTED_URL:
        this.configService.get<string>('PUB_HOSTED_URL') ||
        `${(this.configService.get<string>('NEXUS_BASE_URL') || 'http://localhost:8081').replace(/\/+$/, '')}/repository/pub-group`,
    };

    if (dto.deployKey) {
      const rawKey = decryptCredential(dto.deployKey);
      if (rawKey && rawKey.trim()) {
        try {
          tempKeyFile = path.join(
            os.tmpdir(),
            `pub_deploy_key_${crypto.randomBytes(6).toString('hex')}`,
          );
          fs.writeFileSync(tempKeyFile, rawKey.trim() + '\n', { mode: 0o600 });
          if (process.platform === 'win32') {
            try {
              const user = process.env.USERNAME || process.env.USER;
              if (user) {
                child_process.execFileSync('icacls', [tempKeyFile, '/inheritance:r', '/grant:r', `${user}:R`], { stdio: 'pipe' });
              }
            } catch {}
          }
          const normalizedKeyPath = tempKeyFile.replace(/\\/g, '/');
          processEnv['GIT_SSH_COMMAND'] = `ssh -i "${normalizedKeyPath}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`;
        } catch (e: any) {
          this.logger.warn(`Failed preparing tempKeyFile for pub get: ${e.message}`);
        }
      }
    }

    const cleanupKey = () => {
      if (tempKeyFile && fs.existsSync(tempKeyFile)) {
        try {
          fs.unlinkSync(tempKeyFile);
        } catch {}
        tempKeyFile = null;
      }
    };

    return new Promise((resolve) => {
      const isWindows = process.platform === 'win32';
      const shell = isWindows ? 'powershell.exe' : '/bin/sh';
      const shellArgs = isWindows ? ['-NoProfile', '-Command', command] : ['-c', command];

      let stdout = '';
      let stderr = '';
      let hasFinished = false;

      const proc = child_process.spawn(shell, shellArgs, {
        cwd: mobileAppDir,
        env: processEnv,
      });

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.on('error', (err: any) => {
        if (hasFinished) return;
        hasFinished = true;
        clearTimeout(timer);
        cleanupKey();
        resolve({
          success: false,
          dryRun: isDryRun,
          exitCode: 1,
          stdout: '',
          stderr: err.message || 'Failed to spawn Flutter process',
          message: 'Flutter SDK not found in environment or failed to execute.',
          conflicts: [`Process execution failed: ${err.message}`],
        });
      });

      const timer = setTimeout(() => {
        if (!hasFinished) {
          hasFinished = true;
          cleanupKey();
          try {
            proc.kill();
          } catch (_) {}
          resolve({
            success: false,
            dryRun: isDryRun,
            exitCode: -1,
            stdout,
            stderr: stderr + '\nExecution timed out after 12 seconds.',
            message: 'Dependency validation timed out.',
            conflicts: ['Dependency resolution timed out while contacting pub repositories.'],
          });
        }
      }, 12000);

      proc.on('close', (code) => {
        if (hasFinished) return;
        hasFinished = true;
        clearTimeout(timer);
        cleanupKey();

        const exitCode = code ?? 0;
        const success = exitCode === 0;
        const conflicts: string[] = [];

        if (!success) {
          const lines = (stderr + '\n' + stdout).split('\n');
          for (const line of lines) {
            if (
              line.toLowerCase().includes('version solving failed') ||
              line.toLowerCase().includes('incompatible') ||
              line.toLowerCase().includes('conflict') ||
              line.toLowerCase().includes('depends on')
            ) {
              conflicts.push(line.trim());
            }
          }
          if (conflicts.length === 0 && stderr) {
            conflicts.push(stderr.trim());
          }
        }

        resolve({
          success,
          dryRun: isDryRun,
          exitCode,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          message: success
            ? `Dependency resolution validation passed (${isDryRun ? 'dry-run' : 'applied'}).`
            : `Dependency resolution failed with exit code ${exitCode}.`,
          conflicts,
        });
      });

      proc.on('error', (err) => {
        if (hasFinished) return;
        hasFinished = true;
        clearTimeout(timer);
        resolve({
          success: false,
          dryRun: isDryRun,
          exitCode: -1,
          stdout,
          stderr: err.message,
          message: `Failed to spawn Flutter process: ${err.message}`,
          conflicts: [err.message],
        });
      });
    });
  }

  /**
   * Retrieves current pubspec.yaml status, dependencies count, and list of registered MiniApp packages.
   */
  async getPubspecStatus(): Promise<PubspecStatusInfo> {
    const pubspecPath = this.getPubspecPath();
    const backupPath = this.getBackupPath();
    const exists = fs.existsSync(pubspecPath);
    const hasBackup = fs.existsSync(backupPath);

    if (!exists) {
      return {
        pubspecPath,
        exists: false,
        hasBackup,
        totalDependencies: 0,
        miniAppDependencies: {},
      };
    }

    const { rawContent, document } = this.readPubspecDocument();
    const stats = fs.statSync(pubspecPath);
    const depsNode = document.get('dependencies') as YAML.YAMLMap | null;
    const depsJson = depsNode ? depsNode.toJSON() : {};

    const baseFrameworkDeps = new Set([
      'flutter',
      'cupertino_icons',
      'get',
      'webview_flutter',
      'http',
      'geolocator',
      'image_picker',
      'local_auth',
      'url_launcher',
      'webview_flutter_web',
    ]);

    const miniAppDependencies: Record<string, any> = {};
    for (const [k, v] of Object.entries(depsJson)) {
      if (!baseFrameworkDeps.has(k)) {
        miniAppDependencies[k] = v;
      }
    }

    return {
      pubspecPath,
      exists: true,
      hasBackup,
      totalDependencies: Object.keys(depsJson).length,
      miniAppDependencies,
      lastModified: stats.mtime.toISOString(),
    };
  }

  /**
   * Triggers the Web Sandbox build script to recompile Flutter Web preview with newly injected packages.
   */
  async triggerSandboxRebuild(triggeredBy: string = 'SuperApp System'): Promise<{ success: boolean; message: string }> {
    if (this.sandboxBuildManager) {
      return this.sandboxBuildManager.triggerBuild(triggeredBy);
    }

    const candidates = [
      path.resolve(process.cwd(), 'scripts/build-sandbox.ps1'),
      path.resolve(process.cwd(), 'superapp_backend/scripts/build-sandbox.ps1'),
      path.resolve(__dirname, '../../../scripts/build-sandbox.ps1'),
      path.resolve(process.cwd(), '../scripts/build-sandbox.ps1'),
    ];
    const scriptPath = candidates.find((p) => fs.existsSync(p));
    if (!scriptPath) {
      this.logger.warn('Sandbox build script not found on host filesystem');
      return { success: false, message: 'build-sandbox.ps1 script not found' };
    }

    this.logger.log(`Triggering background Flutter Web sandbox compilation: ${scriptPath}...`);

    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'powershell.exe' : '/bin/sh';
    const shellArgs = isWindows
      ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath]
      : ['-c', `sh ${scriptPath}`];

    // Spawn non-blocking background build
    const child = child_process.spawn(shell, shellArgs, {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    return {
      success: true,
      message: 'Flutter Web SuperApp Sandbox compilation triggered in background.',
    };
  }
}
