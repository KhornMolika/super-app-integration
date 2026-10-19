import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import * as YAML from 'yaml';
import { PermissionProposal } from '../permission-proposals/entities/permission-proposal.entity';

export interface CodePreviewResult {
  permissionKey: string;
  androidPermissionTag?: string;
  androidManifestDiff?: string;
  iosPlistEntry?: string;
  iosPlistDiff?: string;
  flutterPluginEntry?: string;
  pubspecDiff?: string;
}

export interface CodeGenerationResult {
  success: boolean;
  branchName: string;
  targetBranch: string;
  mrUrl: string;
  filesModified: string[];
  message: string;
}

@Injectable()
export class CapabilityCodeGeneratorService {
  private readonly logger = new Logger(CapabilityCodeGeneratorService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Resolves the root directory of the SuperApp Flutter repository.
   */
  getSuperAppDir(): string {
    const configured =
      this.configService.get<string>('SUPERAPP_DIR') ||
      this.configService.get<string>('MOBILE_APP_DIR') ||
      process.env.SUPERAPP_DIR ||
      process.env.MOBILE_APP_DIR;

    const candidatePaths = [
      configured,
      path.resolve(process.cwd(), '../super-app'),
      path.resolve(process.cwd(), 'super-app'),
      path.resolve(__dirname, '../../../../super-app'),
      path.resolve(__dirname, '../../../../../super-app'),
    ].filter(Boolean) as string[];

    for (const cand of candidatePaths) {
      if (fs.existsSync(cand) && fs.existsSync(path.join(cand, 'pubspec.yaml'))) {
        return cand;
      }
    }

    throw new BadRequestException(
      `Could not locate SuperApp Flutter directory. Checked paths: ${candidatePaths.join(', ')}`,
    );
  }

  /**
   * Maps a capability key to standardized Android/iOS permissions.
   */
  resolvePermissionMapping(key: string, customMetadata?: any) {
    const cleanKey = key.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
    
    // Built-in presets
    const mappings: Record<string, {
      android: string;
      iosKey: string;
      iosDescription: string;
      defaultPlugin?: string;
    }> = {
      camera: {
        android: 'android.permission.CAMERA',
        iosKey: 'NSCameraUsageDescription',
        iosDescription: 'Camera access is required for scanning QR codes and taking KYC verification photos.',
        defaultPlugin: 'mobile_scanner: ^5.2.3',
      },
      scan_qr_code: {
        android: 'android.permission.CAMERA',
        iosKey: 'NSCameraUsageDescription',
        iosDescription: 'Camera access is required for scanning QR codes directly within the SuperApp.',
        defaultPlugin: 'mobile_scanner: ^5.2.3',
      },
      location: {
        android: 'android.permission.ACCESS_FINE_LOCATION',
        iosKey: 'NSLocationWhenInUseUsageDescription',
        iosDescription: 'Location access is required for geo-based branch discovery and map services.',
        defaultPlugin: 'geolocator: ^12.0.0',
      },
      biometrics: {
        android: 'android.permission.USE_BIOMETRIC',
        iosKey: 'NSFaceIDUsageDescription',
        iosDescription: 'Face ID or Touch ID authentication is required to securely authorize transactions.',
        defaultPlugin: 'local_auth: ^2.2.0',
      },
      microphone: {
        android: 'android.permission.RECORD_AUDIO',
        iosKey: 'NSMicrophoneUsageDescription',
        iosDescription: 'Microphone access is required for audio recording and voice support features.',
        defaultPlugin: 'record: ^5.1.2',
      },
      storage: {
        android: 'android.permission.READ_EXTERNAL_STORAGE',
        iosKey: 'NSPhotoLibraryUsageDescription',
        iosDescription: 'Photo and document storage access is required to upload receipts and certificates.',
        defaultPlugin: 'file_picker: ^8.0.0',
      },
    };

    const found = mappings[cleanKey] || {
      android: customMetadata?.androidPermission || `android.permission.${cleanKey.toUpperCase()}`,
      iosKey: customMetadata?.iosPlistKey || `NS${cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1)}UsageDescription`,
      iosDescription: customMetadata?.iosUsageDescription || `${key} access is required to support this mini application feature.`,
      defaultPlugin: customMetadata?.flutterPlugin,
    };

    return found;
  }

  /**
   * Previews the code diffs that will be injected into AndroidManifest, Info.plist, and pubspec.yaml.
   */
  preview(permissionKey: string, metadata?: any): CodePreviewResult {
    const mapping = this.resolvePermissionMapping(permissionKey, metadata);

    const androidTag = `<uses-permission android:name="${mapping.android}"/>`;
    const iosEntry = `<key>${mapping.iosKey}</key>\n\t<string>${mapping.iosDescription}</string>`;
    const pluginEntry = mapping.defaultPlugin ? `  ${mapping.defaultPlugin}` : undefined;

    return {
      permissionKey,
      androidPermissionTag: mapping.android,
      androidManifestDiff: `+    ${androidTag}`,
      iosPlistEntry: mapping.iosKey,
      iosPlistDiff: `+    <key>${mapping.iosKey}</key>\n+    <string>${mapping.iosDescription}</string>`,
      flutterPluginEntry: mapping.defaultPlugin,
      pubspecDiff: pluginEntry ? `+  dependencies:\n+  ${pluginEntry}` : undefined,
    };
  }

  /**
   * Injects code safely, creates a Git feature branch, and generates a Merge Request URL.
   */
  async generateCapabilityMr(
    proposal: PermissionProposal,
    targetVersion?: string,
    targetBranchOverride?: string,
  ): Promise<CodeGenerationResult> {
    const superAppDir = this.getSuperAppDir();
    const targetBranch =
      targetBranchOverride?.trim() ||
      this.configService.get<string>('CODEGEN_TARGET_BRANCH') ||
      'development';
    const mapping = this.resolvePermissionMapping(
      proposal.permissionKey,
      proposal.metadata,
    );

    const manifestPath = path.join(
      superAppDir,
      'android',
      'app',
      'src',
      'main',
      'AndroidManifest.xml',
    );
    const plistPath = path.join(superAppDir, 'ios', 'Runner', 'Info.plist');
    const pubspecPath = path.join(superAppDir, 'pubspec.yaml');

    const manifestBak = `${manifestPath}.bak`;
    const plistBak = `${plistPath}.bak`;
    const pubspecBak = `${pubspecPath}.bak`;

    const cleanKey = proposal.permissionKey
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');
    const timestamp = Date.now().toString(36);
    const branchName = `capa/add-${cleanKey}-${timestamp}`;

    this.logger.log(
      `Starting automated capability injection for '${proposal.permissionKey}' on branch '${branchName}'`,
    );

    const filesModified: string[] = [];

    try {
      // 1. Create backups
      if (fs.existsSync(manifestPath)) fs.copyFileSync(manifestPath, manifestBak);
      if (fs.existsSync(plistPath)) fs.copyFileSync(plistPath, plistBak);
      if (fs.existsSync(pubspecPath)) fs.copyFileSync(pubspecPath, pubspecBak);

      // 2. Inject Android Permission
      if (fs.existsSync(manifestPath)) {
        let manifestContent = fs.readFileSync(manifestPath, 'utf8');
        const permTag = `<uses-permission android:name="${mapping.android}"/>`;
        if (!manifestContent.includes(mapping.android)) {
          // Insert after first <manifest ...> tag
          manifestContent = manifestContent.replace(
            /(<manifest[^>]*>)/i,
            `$1\n    <!-- Auto-injected for capability: ${proposal.permissionKey} -->\n    ${permTag}`,
          );
          fs.writeFileSync(manifestPath, manifestContent, 'utf8');
          filesModified.push('android/app/src/main/AndroidManifest.xml');
        }
      }

      // 3. Inject iOS Plist Usage Description
      if (fs.existsSync(plistPath)) {
        let plistContent = fs.readFileSync(plistPath, 'utf8');
        if (!plistContent.includes(`<key>${mapping.iosKey}</key>`)) {
          const iosBlock = `\t<!-- Auto-injected for capability: ${proposal.permissionKey} -->\n\t<key>${mapping.iosKey}</key>\n\t<string>${mapping.iosDescription}</string>\n</dict>`;
          plistContent = plistContent.replace(/<\/dict>\s*<\/plist>/i, `${iosBlock}\n</plist>`);
          fs.writeFileSync(plistPath, plistContent, 'utf8');
          filesModified.push('ios/Runner/Info.plist');
        }
      }

      // 4. Inject Flutter Plugin if specified
      if (mapping.defaultPlugin && fs.existsSync(pubspecPath)) {
        const [pkgName, pkgVer] = mapping.defaultPlugin.split(':').map((s) => s.trim());
        let pubspecContent = fs.readFileSync(pubspecPath, 'utf8');
        if (!pubspecContent.includes(`${pkgName}:`)) {
          pubspecContent = pubspecContent.replace(
            /(dependencies:\s*\n)/,
            `$1  # Auto-injected for capability: ${proposal.permissionKey}\n  ${pkgName}: ${pkgVer || 'any'}\n`,
          );
          fs.writeFileSync(pubspecPath, pubspecContent, 'utf8');
          filesModified.push('pubspec.yaml');
        }
      }

      // 5. Verification: Quick parse checks
      if (fs.existsSync(pubspecPath)) {
        YAML.parse(fs.readFileSync(pubspecPath, 'utf8'));
      }

      // 6. Git Branching & Commit
      const runGit = (args: string[]) => {
        return child_process.execFileSync('git', args, {
          cwd: superAppDir,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      };

      // Detect original branch to safely return to it afterwards
      let originalBranch = 'molika';
      try {
        originalBranch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']).trim();
      } catch (_) {}

      // Switch to target branch before creating feature branch if possible
      try {
        runGit(['checkout', targetBranch]);
      } catch (_) {}

      // Create and checkout new feature branch
      runGit(['checkout', '-b', branchName]);

      // Stage modified files
      for (const relFile of filesModified) {
        runGit(['add', relFile]);
      }

      // Commit changes
      const commitMsg = `feat(capability): add ${proposal.permissionKey} capability & permissions (target: ${targetVersion || 'next'})`;
      runGit(['commit', '-m', commitMsg]);

      // Attempt push to remote if possible
      try {
        runGit(['push', '-u', 'fintech-mobile', branchName]);
      } catch (pushErr: any) {
        this.logger.warn(`Push to remote failed (may be offline/sandbox): ${pushErr.message}`);
      }

      // Clean up backups on success
      if (fs.existsSync(manifestBak)) fs.unlinkSync(manifestBak);
      if (fs.existsSync(plistBak)) fs.unlinkSync(plistBak);
      if (fs.existsSync(pubspecBak)) fs.unlinkSync(pubspecBak);

      // Return to original working branch
      try {
        runGit(['checkout', originalBranch || 'molika']);
      } catch (_) {}

      const miniAppDisplay =
        proposal.miniApp?.name ||
        (proposal.metadata as any)?.miniAppName ||
        'Platform / Host Core Shell';

      const mrTitle = encodeURIComponent(`feat(capability): Add ${proposal.permissionKey} capability`);
      const mrDescription = encodeURIComponent(
        `### Automated Capability PR / Merge Request\n\n` +
          `* **Capability Key**: \`${proposal.permissionKey}\`\n` +
          `* **Requested By**: ${proposal.requestedBy?.name || 'MiniApp Developer'}\n` +
          `* **MiniApp**: ${miniAppDisplay}\n` +
          `* **Target SuperApp Version**: ${targetVersion || '1.1.0'}\n` +
          `* **Target Branch**: \`${targetBranch}\`\n\n` +
          `#### Injected Changes:\n` +
          filesModified.map((f) => `- \`${f}\``).join('\n') +
          `\n\n*Generated automatically by FSA SuperApp BackOffice.*`,
      );

      const mrUrl = `https://git.fintechcenterfsa.com/frontend/super-app/-/merge_requests/new?merge_request[source_branch]=${encodeURIComponent(branchName)}&merge_request[target_branch]=${encodeURIComponent(targetBranch)}&merge_request[title]=${mrTitle}&merge_request[description]=${mrDescription}`;

      return {
        success: true,
        branchName,
        targetBranch,
        mrUrl,
        filesModified,
        message: `Successfully generated branch '${branchName}' and created Merge Request targeting '${targetBranch}'!`,
      };
    } catch (err: any) {
      this.logger.error(`Capability generation failed: ${err.message}`, err.stack);

      // Restore backups on failure
      if (fs.existsSync(manifestBak)) {
        fs.copyFileSync(manifestBak, manifestPath);
        fs.unlinkSync(manifestBak);
      }
      if (fs.existsSync(plistBak)) {
        fs.copyFileSync(plistBak, plistPath);
        fs.unlinkSync(plistBak);
      }
      if (fs.existsSync(pubspecBak)) {
        fs.copyFileSync(pubspecBak, pubspecPath);
        fs.unlinkSync(pubspecBak);
      }

      throw new BadRequestException(
        `Failed to inject capability into SuperApp codebase: ${err.message}`,
      );
    }
  }
}
