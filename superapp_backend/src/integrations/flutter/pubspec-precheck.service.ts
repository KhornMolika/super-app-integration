import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import * as YAML from 'yaml';
import { PubspecInjectorService } from './pubspec-injector.service';
import { PrecheckConflictDto } from './dto/pubspec-injector.dto';

export interface PrecheckConflictResult {
  compatible: boolean;
  packageName: string;
  directConflicts: string[];
  transitiveBumps: Array<{ package: string; oldVersion?: string; newVersion: string }>;
  newPackages: Array<{ package: string; version: string }>;
  message: string;
  rawOutput: string;
}

@Injectable()
export class PubspecPrecheckService {
  private readonly logger = new Logger(PubspecPrecheckService.name);
  private simulationLock: Promise<void> = Promise.resolve();

  constructor(
    private readonly configService: ConfigService,
    private readonly pubspecService: PubspecInjectorService,
  ) {}

  /**
   * Returns current root dependencies and version constraints pinned by the Super App container.
   */
  getPackageConstraints(): Record<string, string> {
    const { document } = this.pubspecService.readPubspecDocument();
    const deps = document.get('dependencies') as YAML.YAMLMap | null;
    const constraints: Record<string, string> = {};

    if (deps && deps.items) {
      for (const item of deps.items) {
        const key = String(item.key);
        const val = item.value;
        if (typeof val === 'string') {
          constraints[key] = val;
        } else if (val && typeof val === 'object') {
          try {
            constraints[key] = JSON.stringify(val);
          } catch (_) {
            constraints[key] = 'configured';
          }
        }
      }
    }

    return constraints;
  }

  /**
   * Simulates candidate dependency injection and runs a non-destructive dry-run conflict check.
   */
  async simulateCandidate(dto: PrecheckConflictDto): Promise<PrecheckConflictResult> {
    const { packageName, gitUrl, ref, path: localPath, version, isHosted, hostedUrl } = dto;

    if (!packageName) {
      throw new BadRequestException('Package name is required for pre-check simulation');
    }

    // 1. Direct name collision check with base framework packages
    const CORE_PACKAGES = new Set([
      'flutter',
      'flutter_test',
      'cupertino_icons',
      'get',
      'webview_flutter',
      'http',
      'geolocator',
      'image_picker',
      'local_auth',
      'url_launcher',
      'webview_flutter_web',
      'dps_core_package',
      'superapp_core',
    ]);

    if (CORE_PACKAGES.has(packageName)) {
      return {
        compatible: false,
        packageName,
        directConflicts: [
          `Package name "${packageName}" conflicts directly with a reserved Super App core framework package.`,
        ],
        transitiveBumps: [],
        newPackages: [],
        message: `Package name "${packageName}" conflicts directly with Super App core container.`,
        rawOutput: `Reserved core framework package conflict: ${packageName}`,
      };
    }

    // Acquire simulation lock to avoid concurrent pubspec modifications
    let releaseLock: () => void = () => {};
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    const currentLock = this.simulationLock;
    this.simulationLock = this.simulationLock.then(() => lockPromise);
    await currentLock;

    const pubspecPath = this.pubspecService.getPubspecPath();
    const simBackupPath = `${pubspecPath}.precheck_sim_${Date.now()}`;

    try {
      if (!fs.existsSync(pubspecPath)) {
        throw new BadRequestException(`pubspec.yaml not found at ${pubspecPath}`);
      }

      // 1. Backup original pubspec.yaml
      fs.copyFileSync(pubspecPath, simBackupPath);

      // 2. Compute candidate dependency entry
      let dependencyValue: any;
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
          version: version || '^1.0.0',
        };
      } else if (localPath) {
        dependencyValue = { path: localPath };
      } else {
        const workspaceMap = this.pubspecService.discoverWorkspacePackages();
        if (workspaceMap.has(packageName)) {
          dependencyValue = { path: workspaceMap.get(packageName) };
        } else {
          dependencyValue = version ? `^${version}` : '^1.0.0';
        }
      }

      // 3. Inject candidate into pubspec.yaml AST temporarily
      const rawContent = fs.readFileSync(pubspecPath, 'utf-8');
      const doc = YAML.parseDocument(rawContent);
      let dependenciesNode = doc.get('dependencies') as YAML.YAMLMap | null;
      if (!dependenciesNode) {
        doc.set('dependencies', new YAML.YAMLMap());
        dependenciesNode = doc.get('dependencies') as YAML.YAMLMap;
      }
      dependenciesNode.set(packageName, dependencyValue);
      fs.writeFileSync(pubspecPath, doc.toString(), 'utf-8');

      // 4. Run `flutter pub get --dry-run`
      const validation = await this.pubspecService.validateDependencies({ dryRun: true });

      // 5. Parse output for transitive bumps and new packages
      const transitiveBumps: Array<{ package: string; oldVersion?: string; newVersion: string }> = [];
      const newPackages: Array<{ package: string; version: string }> = [];

      const fullOutput = `${validation.stdout}\n${validation.stderr}`;
      const lines = fullOutput.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        // Match newly added packages: "+ <package> <version>"
        const addMatch = trimmed.match(/^\+\s+([a-zA-Z0-9_-]+)\s+([0-9a-zA-Z.+_-]+)/);
        if (addMatch && addMatch[1] !== packageName) {
          newPackages.push({ package: addMatch[1], version: addMatch[2] });
        }

        // Match version bumps: "~ <package> <oldVersion> (was ...) -> <newVersion>" or similar
        const bumpMatch = trimmed.match(/^~\s+([a-zA-Z0-9_-]+)\s+([0-9a-zA-Z.+_-]+)/);
        if (bumpMatch) {
          transitiveBumps.push({ package: bumpMatch[1], newVersion: bumpMatch[2] });
        }
      }

      const compatible = validation.success;
      return {
        compatible,
        packageName,
        directConflicts: validation.conflicts || [],
        transitiveBumps,
        newPackages,
        message: compatible
          ? `Package "${packageName}" is fully compatible with Super App container (0 version conflicts).`
          : `Dependency conflict detected for "${packageName}".`,
        rawOutput: validation.stderr || validation.stdout,
      };
    } finally {
      // 6. Restore original pubspec.yaml unconditionally
      if (fs.existsSync(simBackupPath)) {
        try {
          fs.copyFileSync(simBackupPath, pubspecPath);
          fs.unlinkSync(simBackupPath);
        } catch (err: any) {
          this.logger.error(`Failed to restore simulated pubspec backup: ${err.message}`);
        }
      }
      releaseLock();
    }
  }
}
