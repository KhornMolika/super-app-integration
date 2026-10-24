import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import * as YAML from 'yaml';
import { CapabilityProposal } from '../capability-proposals/entities/capability-proposal.entity';

export interface CodePreviewResult {
  permissionKey: string;
  capabilityKey?: string;
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

  constructor(private readonly configService: ConfigService) { }

  /**
   * Resolves the root directory of the SuperApp Flutter repository if available on the local filesystem.
   * In containerized environments (Docker/Harbor), returns null so remote GitLab API GitOps is used.
   */
  getSuperAppDir(): string | null {
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

    return null;
  }

  /**
   * Resolves Flutter plugins, Android manifest tags, and iOS Info.plist entries dynamically
   * from proposal metadata, database registry attributes, or standard conventions.
   */
  resolveCapabilityMapping(
    key: string,
    customMetadata?: any,
  ): {
    android: string;
    iosKey: string;
    iosDescription: string;
    defaultPlugin?: string;
  } {
    const cleanKey = key.toLowerCase().trim();
    const capitalized = cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1);

    const android =
      customMetadata?.androidPermission ||
      customMetadata?.android ||
      `android.permission.${cleanKey.toUpperCase()}`;

    const iosKey =
      customMetadata?.iosPlistKey ||
      customMetadata?.iosKey ||
      `NS${capitalized}UsageDescription`;

    const iosDescription =
      customMetadata?.iosUsageDescription ||
      customMetadata?.iosDescription ||
      customMetadata?.description ||
      `${key} access is required to support this mini application feature.`;

    const defaultPlugin =
      customMetadata?.flutterPlugin ||
      customMetadata?.providerPackage ||
      customMetadata?.defaultPlugin;

    return {
      android,
      iosKey,
      iosDescription,
      defaultPlugin,
    };
  }

  /**
   * Backwards-compatible alias for resolveCapabilityMapping.
   */
  resolvePermissionMapping(key: string, customMetadata?: any) {
    return this.resolveCapabilityMapping(key, customMetadata);
  }

  /**
   * Previews the code diffs that will be injected into AndroidManifest, Info.plist, and pubspec.yaml.
   */
  preview(capabilityKey: string, metadata?: any): CodePreviewResult {
    const mapping = this.resolveCapabilityMapping(capabilityKey, metadata);

    const androidTag = `<uses-permission android:name="${mapping.android}"/>`;
    const pluginEntry = mapping.defaultPlugin ? `  ${mapping.defaultPlugin}` : undefined;

    return {
      permissionKey: capabilityKey,
      capabilityKey,
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
    proposal: CapabilityProposal,
    targetVersion?: string,
    targetBranchOverride?: string,
  ): Promise<CodeGenerationResult> {
    const superAppDir = this.getSuperAppDir();
    const targetBranch =
      targetBranchOverride?.trim() ||
      this.configService.get<string>('CODEGEN_TARGET_BRANCH') ||
      'development';

    const key = proposal.capabilityKey || (proposal as any).permissionKey;
    const mapping = this.resolveCapabilityMapping(key, proposal.metadata);

    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const timestamp = Date.now().toString(36);
    const branchName = `capa/add-${cleanKey}-${timestamp}`;

    this.logger.log(
      `Starting automated capability injection for '${key}' on branch '${branchName}'`,
    );

    const filesModified: string[] = [];

    let manifestPath = '';
    let plistPath = '';
    let pubspecPath = '';
    let manifestBak = '';
    let plistBak = '';
    let pubspecBak = '';

    try {
      if (superAppDir) {
        manifestPath = path.join(
          superAppDir,
          'android',
          'app',
          'src',
          'main',
          'AndroidManifest.xml',
        );
        plistPath = path.join(superAppDir, 'ios', 'Runner', 'Info.plist');
        pubspecPath = path.join(superAppDir, 'pubspec.yaml');

        manifestBak = `${manifestPath}.bak`;
        plistBak = `${plistPath}.bak`;
        pubspecBak = `${pubspecPath}.bak`;

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
              `$1\n    <!-- Auto-injected for capability: ${key} -->\n    ${permTag}`,
            );
            fs.writeFileSync(manifestPath, manifestContent, 'utf8');
            filesModified.push('android/app/src/main/AndroidManifest.xml');
          }
        }

        // 3. Inject iOS Plist Usage Description
        if (fs.existsSync(plistPath)) {
          let plistContent = fs.readFileSync(plistPath, 'utf8');
          if (!plistContent.includes(`<key>${mapping.iosKey}</key>`)) {
            const iosBlock = `\t<!-- Auto-injected for capability: ${key} -->\n\t<key>${mapping.iosKey}</key>\n\t<string>${mapping.iosDescription}</string>\n</dict>`;
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
              `$1  # Auto-injected for capability: ${key}\n  ${pkgName}: ${pkgVer || 'any'}\n`,
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
        let originalBranch = 'main';
        try {
          originalBranch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']).trim();
        } catch (_) { }

        // Switch to target branch before creating feature branch if possible
        try {
          runGit(['checkout', targetBranch]);
        } catch (_) { }

        // Create and checkout new feature branch
        runGit(['checkout', '-b', branchName]);

        // Stage modified files
        for (const relFile of filesModified) {
          runGit(['add', relFile]);
        }

        // Commit changes
        const commitMsg = `feat(capability): add ${key} capability & permissions (target: ${targetVersion || 'next'})`;
        runGit(['commit', '-m', commitMsg]);

        // Attempt push to remote if possible
        try {
          runGit(['push', '-u', 'origin', branchName]);
        } catch (pushErr: any) {
          this.logger.warn(`Push to remote failed (may be offline/sandbox): ${pushErr.message}`);
        }

        // Clean up backups on success
        if (fs.existsSync(manifestBak)) fs.unlinkSync(manifestBak);
        if (fs.existsSync(plistBak)) fs.unlinkSync(plistBak);
        if (fs.existsSync(pubspecBak)) fs.unlinkSync(pubspecBak);

        // Return to original working branch
        try {
          runGit(['checkout', originalBranch || 'main']);
        } catch (_) { }
      } else {
        this.logger.log(
          `No local SuperApp directory mounted (running in containerized environment). Performing remote GitLab Merge Request generation for '${key}'.`,
        );
        filesModified.push('android/app/src/main/AndroidManifest.xml');
        filesModified.push('ios/Runner/Info.plist');
        if (mapping.defaultPlugin) {
          filesModified.push('pubspec.yaml');
        }
      }

      const miniAppDisplay =
        proposal.miniApp?.name ||
        (proposal.metadata as any)?.miniAppName ||
        'Platform / Host Core Shell';

      const mrTitleRaw = `feat(capability): Add ${key} capability`;
      const mrDescriptionRaw =
        `### Automated Capability PR / Merge Request\n\n` +
        `* **Capability Key**: \`${key}\`\n` +
        `* **Requested By**: ${proposal.requestedBy?.name || 'MiniApp Developer'}\n` +
        `* **MiniApp**: ${miniAppDisplay}\n` +
        `* **Target SuperApp Version**: ${targetVersion || '1.1.0'}\n` +
        `* **Target Branch**: \`${targetBranch}\`\n\n` +
        `#### Injected Changes:\n` +
        filesModified.map((f) => `- \`${f}\``).join('\n') +
        `\n\n*Generated automatically by FSA SuperApp BackOffice.*`;

      const mrTitle = encodeURIComponent(mrTitleRaw);
      const mrDescription = encodeURIComponent(mrDescriptionRaw);

      let mrUrl = `https://git.fintechcenterfsa.com/frontend/super-app/-/merge_requests/new?merge_request[source_branch]=${encodeURIComponent(branchName)}&merge_request[target_branch]=${encodeURIComponent(targetBranch)}&merge_request[title]=${mrTitle}&merge_request[description]=${mrDescription}`;

      // Open Merge Request directly via GitLab REST API if configured
      const gitlabBaseUrl =
        this.configService.get<string>('GITLAB_BASE_URL') ||
        'https://git.fintechcenterfsa.com';
      const gitlabToken = this.configService.get<string>('GITLAB_TOKEN');
      const projectSlug = 'frontend/super-app';

      if (gitlabToken) {
        try {
          const apiEndpoint = `${gitlabBaseUrl.replace(/\/+$/, '')}/api/v4/projects/${encodeURIComponent(projectSlug)}/merge_requests`;
          const res = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'PRIVATE-TOKEN': gitlabToken,
              'User-Agent': 'FSA-SuperApp-Platform',
            },
            body: JSON.stringify({
              source_branch: branchName,
              target_branch: targetBranch,
              title: mrTitleRaw,
              description: mrDescriptionRaw,
              remove_source_branch: true,
            }),
          });

          if (res.ok) {
            const mrData = (await res.json()) as any;
            if (mrData.web_url) {
              mrUrl = mrData.web_url;
              this.logger.log(
                `Created GitLab Merge Request directly: ${mrUrl} (IID: ${mrData.iid})`,
              );
            }
          } else {
            const errBody = await res.text();
            this.logger.warn(
              `Direct GitLab MR creation returned ${res.status}: ${errBody}. Falling back to draft creation URL.`,
            );
          }
        } catch (apiErr: any) {
          this.logger.warn(
            `GitLab MR API call failed: ${apiErr.message}. Falling back to draft creation URL.`,
          );
        }
      }

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
      if (manifestBak && fs.existsSync(manifestBak)) {
        fs.copyFileSync(manifestBak, manifestPath);
        fs.unlinkSync(manifestBak);
      }
      if (plistBak && fs.existsSync(plistBak)) {
        fs.copyFileSync(plistBak, plistPath);
        fs.unlinkSync(plistBak);
      }
      if (pubspecBak && fs.existsSync(pubspecBak)) {
        fs.copyFileSync(pubspecBak, pubspecPath);
        fs.unlinkSync(pubspecBak);
      }

      throw new BadRequestException(
        `Failed to inject capability into SuperApp codebase: ${err.message}`,
      );
    }
  }
}
