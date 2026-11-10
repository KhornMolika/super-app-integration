import { Injectable, Logger, Optional } from '@nestjs/common';
import type { MergeRequestState } from '../capability-proposals/helpers/proposal-progress.helper';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import * as YAML from 'yaml';
import { CapabilityProposal } from '../capability-proposals/entities/capability-proposal.entity';
import { GitLabProvider } from '../integrations/git/providers/gitlab.provider';
import { localBuildsEnabled } from '../common/utils/local-workspace.util';
import {
  IosUsageEntry,
  findPlatformCapability,
  remainingWork,
  handlerFor,
  normalizeCapabilityKey,
  BRIDGE_DIR,
  HANDLER_REGISTRY_FILE,
} from './capability-platform-map';

/** What adding a capability means for the Super App's platform files. */
export interface CapabilityMapping {
  /** Full Android permission names */
  android: string[];
  ios: IosUsageEntry[];
  /** pubspec dependency line, e.g. "mobile_scanner: ^6.0.0" */
  plugin?: string;
  /** false: neither the proposal nor the platform map says what is needed */
  known: boolean;
  source: 'metadata' | 'platform_map' | 'none';
  /** Part of the Super App host itself: nothing to do */
  builtIn: boolean;
  /** Setup that cannot be generated (Xcode capabilities, Firebase files) */
  manualSteps: string[];
}

export interface PreviewFile {
  file: string;
  /** Plain-language label, e.g. "Android permission" */
  label: string;
  /** Lines that will be added */
  lines: string[];
}

export interface CodePreviewResult {
  permissionKey: string;
  capabilityKey: string;
  known: boolean;
  files: PreviewFile[];
  /** Work the Super App team does by hand after approval (bridge code, Xcode setup) */
  manualSteps: string[];
  /** Set when nothing will be added automatically */
  note?: string;
}

/**
 * created:    branch + commit + merge request opened (plus a tracking issue when work remains)
 * needs_work: no file changes, but the Super App team has manual work; tracked in an issue
 * not_needed: built into the Super App, or everything is already present and nothing remains
 * failed:     something went wrong; `error` says what (mrUrl is kept if only the issue failed)
 */
export interface CodeGenerationResult {
  status: 'created' | 'needs_work' | 'not_needed' | 'failed';
  /** Kept for older callers: status !== 'failed' */
  success: boolean;
  branchName?: string;
  targetBranch: string;
  mrUrl?: string;
  /** GitLab issue listing the manual work for the Super App team */
  issueUrl?: string;
  /** The manual steps that issue lists */
  remainingSteps?: string[];
  filesModified: string[];
  message: string;
  error?: string;
}

export interface TargetBranchesResult {
  branches: string[];
  defaultBranch: string;
  source: 'gitlab' | 'fallback';
}

const MANIFEST_FILE = 'android/app/src/main/AndroidManifest.xml';
const PLIST_FILE = 'ios/Runner/Info.plist';
const PUBSPEC_FILE = 'pubspec.yaml';
const FALLBACK_BRANCHES = ['development', 'main'];

const FILE_LABELS: Record<string, string> = {
  [MANIFEST_FILE]: 'Android permission',
  [PLIST_FILE]: 'iOS permission message',
  [PUBSPEC_FILE]: 'Flutter package',
  [HANDLER_REGISTRY_FILE]: 'Bridge registration',
};

/** The low-level reason a fetch failed (DNS, refused, timeout), not just "fetch failed". */
function fetchErrorReason(err: unknown): string {
  const e = err as { message?: string; cause?: { code?: string; message?: string } };
  return e?.cause?.code || e?.cause?.message || e?.message || String(err);
}

@Injectable()
export class CapabilityCodeGeneratorService {
  private readonly logger = new Logger(CapabilityCodeGeneratorService.name);

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly gitlabProvider?: GitLabProvider,
  ) {}

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
      if (
        fs.existsSync(cand) &&
        fs.existsSync(path.join(cand, 'pubspec.yaml'))
      ) {
        return cand;
      }
    }

    return null;
  }

  /**
   * What the Super App needs for a capability: explicit platform fields in the
   * proposal metadata first, then the known platform map. Nothing is invented:
   * an unknown capability gets empty lists and known=false.
   */
  resolveCapabilityMapping(key: string, customMetadata?: any): CapabilityMapping {
    const meta = customMetadata || {};
    const known = findPlatformCapability(key);

    const metaAndroidRaw = meta.androidPermissions ?? meta.androidPermission ?? meta.android;
    const metaAndroid: string[] | undefined = metaAndroidRaw
      ? (Array.isArray(metaAndroidRaw) ? metaAndroidRaw : [metaAndroidRaw])
          .map((p: unknown) => String(p).trim())
          .filter(Boolean)
      : undefined;

    const metaIosKey: string | undefined = meta.iosPlistKey || meta.iosKey;
    const metaIosDescription: string | undefined =
      meta.iosUsageDescription || meta.iosDescription;
    let ios = known?.ios ?? [];
    if (metaIosKey) {
      ios = [
        {
          key: metaIosKey,
          description:
            metaIosDescription ||
            known?.ios.find((e) => e.key === metaIosKey)?.description ||
            `${known?.name || key} is used by a mini app feature.`,
        },
      ];
    } else if (metaIosDescription && ios.length) {
      ios = ios.map((e) => ({ ...e, description: metaIosDescription }));
    }

    const metaPlugin: string | undefined =
      meta.flutterPlugin || meta.providerPackage || meta.defaultPlugin;

    const fromMetadata = Boolean(metaAndroid?.length || metaIosKey || metaPlugin);
    return {
      android: metaAndroid ?? known?.android ?? [],
      ios,
      plugin: metaPlugin ?? known?.plugin,
      known: Boolean(known) || fromMetadata,
      source: fromMetadata ? 'metadata' : known ? 'platform_map' : 'none',
      builtIn: Boolean(known?.builtIn),
      manualSteps: known?.manualSteps ?? [],
    };
  }

  /** Manual work left for the Super App team after approval. */
  remainingSteps(key: string, mapping: CapabilityMapping): string[] {
    return remainingWork(key, mapping);
  }

  /** Backwards-compatible alias for resolveCapabilityMapping. */
  resolvePermissionMapping(key: string, customMetadata?: any) {
    return this.resolveCapabilityMapping(key, customMetadata);
  }

  /** The lines that would be added to each Super App file, in plain terms. */
  preview(capabilityKey: string, metadata?: any): CodePreviewResult {
    const mapping = this.resolveCapabilityMapping(capabilityKey, metadata);
    const files: PreviewFile[] = [];
    if (mapping.android.length) {
      files.push({
        file: MANIFEST_FILE,
        label: FILE_LABELS[MANIFEST_FILE],
        lines: mapping.android.map((p) => `<uses-permission android:name="${p}"/>`),
      });
    }
    if (mapping.ios.length) {
      files.push({
        file: PLIST_FILE,
        label: FILE_LABELS[PLIST_FILE],
        lines: mapping.ios.flatMap((e) => [`<key>${e.key}</key>`, `<string>${e.description}</string>`]),
      });
    }
    if (mapping.plugin) {
      files.push({
        file: PUBSPEC_FILE,
        label: FILE_LABELS[PUBSPEC_FILE],
        lines: [mapping.plugin],
      });
    }
    const handler = mapping.builtIn ? null : handlerFor(capabilityKey);
    if (handler) {
      files.push({
        file: HANDLER_REGISTRY_FILE,
        label: handler.standard
          ? 'Bridge registration (uses the standard handler; skipped if already registered)'
          : 'Bridge registration',
        lines: [`import '${handler.file}';`, `${handler.className}(),`],
      });
      if (!handler.standard) {
        files.push({
          file: `${BRIDGE_DIR}/${handler.file}`,
          label: 'Bridge handler to implement (new skeleton)',
          lines: [
            `class ${handler.className} extends CapabilityHandler {`,
            `  String get key => '${normalizeCapabilityKey(capabilityKey)}';`,
            `  bool get implemented => false; // until a developer implements handle()`,
            `  ...`,
            `}`,
          ],
        });
      }
    }

    const manualSteps = this.remainingSteps(capabilityKey, mapping);
    let note: string | undefined;
    if (mapping.builtIn) {
      note = 'This is built into the Super App, so nothing has to be added or done.';
    } else if (!mapping.known) {
      note =
        'No device permission is known for this capability. A handler skeleton is added for the Super App team ' +
        'to implement, and approving creates a task for it.';
    } else if (handler?.standard && !manualSteps.length) {
      note = 'The Super App already has a standard handler for this capability, so approving makes it fully available.';
    }

    return {
      permissionKey: capabilityKey,
      capabilityKey,
      known: mapping.known,
      files,
      manualSteps,
      note,
    };
  }

  /** GitLab project settings for the Super App repository. */
  private gitlabProject(): { token?: string; projectApiUrl: string; webUrl: string } {
    const token =
      this.configService.get<string>('MOBILE_GIT_TOKEN') ||
      this.configService.get<string>('GITLAB_ACCESS_TOKEN') ||
      undefined;
    const projectSlug =
      this.configService.get<string>('CODEGEN_REPO_SLUG') || 'frontend/super-app';
    const gitlabBaseUrl = (
      this.configService.get<string>('GITLAB_BASE_URL') ||
      'https://git.fintechcenterfsa.com'
    ).replace(/\/+$/, '');
    const projectApiUrl = this.gitlabProvider
      ? this.gitlabProvider.getProjectApiUrl(projectSlug)
      : `${gitlabBaseUrl}/api/v4/projects/${encodeURIComponent(projectSlug)}`;
    return { token, projectApiUrl, webUrl: `${gitlabBaseUrl}/${projectSlug}` };
  }

  private gitlabHeaders(token: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'PRIVATE-TOKEN': token,
      'User-Agent': 'FSA-SuperApp-Platform',
    };
  }

  /** Branches of the Super App repository, for the approve form. */
  async listTargetBranches(): Promise<TargetBranchesResult> {
    const fallback: TargetBranchesResult = {
      branches: FALLBACK_BRANCHES,
      defaultBranch: 'development',
      source: 'fallback',
    };
    const { token, projectApiUrl } = this.gitlabProject();
    if (!token) return fallback;
    try {
      const res = await fetch(`${projectApiUrl}/repository/branches?per_page=100`, {
        headers: this.gitlabHeaders(token),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        this.logger.warn(`Listing Super App branches returned ${res.status}`);
        return fallback;
      }
      const data = (await res.json()) as Array<{ name?: string; default?: boolean }>;
      const branches = data.map((b) => b.name).filter((n): n is string => !!n);
      if (!branches.length) return fallback;
      const defaultBranch =
        data.find((b) => b.default)?.name ||
        (branches.includes('development') ? 'development' : branches[0]);
      // Never offer the generator's own temporary branches
      const visible = branches.filter((b) => !b.startsWith('capa/')).sort();
      return { branches: visible.length ? visible : branches, defaultBranch, source: 'gitlab' };
    } catch (err) {
      this.logger.warn(`Listing Super App branches failed: ${fetchErrorReason(err)}`);
      return fallback;
    }
  }

  /**
   * Live state of a code change created by the generator. Only merge requests
   * of the configured Super App project are looked up; never throws.
   */
  async getMergeRequestState(mrUrl: string | undefined | null): Promise<MergeRequestState> {
    if (!mrUrl) return 'unknown';
    const { token, projectApiUrl, webUrl } = this.gitlabProject();
    const match = /\/-\/merge_requests\/(\d+)\/?$/.exec(mrUrl.trim());
    // Same project path, whatever host name the link uses
    let projectPath = '';
    try {
      projectPath = new URL(webUrl).pathname.replace(/\/+$/, '');
    } catch {
      return 'unknown';
    }
    if (!token || !match || !mrUrl.includes(`${projectPath}/-/merge_requests/`)) {
      return 'unknown';
    }
    try {
      const res = await fetch(`${projectApiUrl}/merge_requests/${match[1]}`, {
        headers: this.gitlabHeaders(token),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        this.logger.warn(`Looking up merge request ${match[1]} returned ${res.status}`);
        return 'unknown';
      }
      const { state } = (await res.json()) as { state?: string };
      if (state === 'merged') return 'merged';
      if (state === 'opened' || state === 'locked') return 'opened';
      if (state === 'closed') return 'closed';
      return 'unknown';
    } catch (err) {
      this.logger.warn(`Looking up merge request failed: ${fetchErrorReason(err)}`);
      return 'unknown';
    }
  }

  // --- File edits (pure, shared by the local and the GitLab path) ---------

  private addAndroidPermissions(content: string, permissions: string[], key: string): string | null {
    const missing = permissions.filter((p) => !content.includes(`android:name="${p}"`));
    if (!missing.length) return content;
    if (!/<manifest[^>]*>/i.test(content)) {
      throw new Error(`Could not find the <manifest> tag in ${MANIFEST_FILE}`);
    }
    const tags = missing.map((p) => `    <uses-permission android:name="${p}"/>`).join('\n');
    return content.replace(
      /(<manifest[^>]*>)/i,
      `$1\n    <!-- Added for capability: ${key} -->\n${tags}`,
    );
  }

  private addIosEntries(content: string, entries: IosUsageEntry[], key: string): string {
    const missing = entries.filter((e) => !content.includes(`<key>${e.key}</key>`));
    if (!missing.length) return content;
    if (!/<\/dict>\s*<\/plist>/i.test(content)) {
      throw new Error(`Could not find the closing </dict></plist> in ${PLIST_FILE}`);
    }
    const block = missing
      .map((e) => `\t<key>${e.key}</key>\n\t<string>${e.description}</string>`)
      .join('\n');
    return content.replace(
      /<\/dict>\s*<\/plist>/i,
      `\t<!-- Added for capability: ${key} -->\n${block}\n</dict>\n</plist>`,
    );
  }

  private addPubspecPlugin(content: string, plugin: string, key: string): string {
    const [pkgName, pkgVer] = plugin.split(':').map((s) => s.trim());
    if (new RegExp(`^\\s+${pkgName}:`, 'm').test(content)) return content;
    if (!/(dependencies:\s*\n)/.test(content)) {
      throw new Error(`Could not find the dependencies section in ${PUBSPEC_FILE}`);
    }
    const updated = content.replace(
      /(dependencies:\s*\n)/,
      `$1  # Added for capability: ${key}\n  ${pkgName}: ${pkgVer || 'any'}\n`,
    );
    YAML.parse(updated); // must stay valid YAML
    return updated;
  }

  /** New contents for every file that actually changes. */
  private computeChanges(
    // null = the file does not exist yet (created when needed)
    files: Record<string, string | null>,
    mapping: CapabilityMapping,
    key: string,
  ): Record<string, string> {
    const changes: Record<string, string> = {};
    const has = (f: string) => typeof files[f] === 'string';
    if (mapping.android.length && has(MANIFEST_FILE)) {
      const next = this.addAndroidPermissions(files[MANIFEST_FILE]!, mapping.android, key);
      if (next !== null && next !== files[MANIFEST_FILE]) changes[MANIFEST_FILE] = next;
    }
    if (mapping.ios.length && has(PLIST_FILE)) {
      const next = this.addIosEntries(files[PLIST_FILE]!, mapping.ios, key);
      if (next !== files[PLIST_FILE]) changes[PLIST_FILE] = next;
    }
    if (mapping.plugin && has(PUBSPEC_FILE)) {
      const next = this.addPubspecPlugin(files[PUBSPEC_FILE]!, mapping.plugin, key);
      if (next !== files[PUBSPEC_FILE]) changes[PUBSPEC_FILE] = next;
    }
    if (!mapping.builtIn && has(HANDLER_REGISTRY_FILE)) {
      const handler = handlerFor(key);
      const next = this.registerHandler(files[HANDLER_REGISTRY_FILE]!, handler.className, handler.file);
      if (next !== files[HANDLER_REGISTRY_FILE]) changes[HANDLER_REGISTRY_FILE] = next;
      const skeletonPath = `${BRIDGE_DIR}/${handler.file}`;
      if (!handler.standard && files[skeletonPath] === null) {
        changes[skeletonPath] = this.handlerSkeleton(key, handler.className);
      }
    }
    return changes;
  }

  /** Files that must exist in the Super App for this capability. */
  private neededFiles(mapping: CapabilityMapping): string[] {
    return [
      ...(mapping.android.length ? [MANIFEST_FILE] : []),
      ...(mapping.ios.length ? [PLIST_FILE] : []),
      ...(mapping.plugin ? [PUBSPEC_FILE] : []),
      ...(mapping.builtIn ? [] : [HANDLER_REGISTRY_FILE]),
    ];
  }

  /** Files that may not exist yet and are created when missing (the handler skeleton). */
  private optionalFiles(mapping: CapabilityMapping, key: string): string[] {
    if (mapping.builtIn) return [];
    const handler = handlerFor(key);
    return handler.standard ? [] : [`${BRIDGE_DIR}/${handler.file}`];
  }

  /**
   * Adds the handler's import and its entry to the generated registry, each
   * just above its END marker. Unchanged if already registered.
   */
  private registerHandler(content: string, className: string, file: string): string {
    const importEnd = '// END GENERATED CAPABILITY HANDLER IMPORTS';
    const listEnd = '// END GENERATED CAPABILITY HANDLERS';
    if (!content.includes(importEnd) || !content.includes(listEnd)) {
      throw new Error(`The handler markers are missing in ${HANDLER_REGISTRY_FILE}`);
    }
    const nl = content.includes('\r\n') ? '\r\n' : '\n';
    const lines = content.split(/\r?\n/);
    const insertBefore = (marker: string, line: string) => {
      const i = lines.findIndex((l) => l.includes(marker));
      const indent = lines[i].match(/^\s*/)?.[0] ?? '';
      lines.splice(i, 0, `${indent}${line}`);
    };
    const importLine = `import '${file}';`;
    if (!lines.some((l) => l.trim() === importLine)) insertBefore(importEnd, importLine);
    if (!lines.some((l) => l.trim() === `${className}(),`)) insertBefore(listEnd, `${className}(),`);
    return lines.join(nl);
  }

  /** A handler for a capability with no standard implementation: a developer fills it in. */
  private handlerSkeleton(key: string, className: string): string {
    const name = findPlatformCapability(key)?.name || key;
    return [
      `import '../capability_bridge.dart';`,
      ``,
      `/// \`${key}\`: ${name}.`,
      `///`,
      `/// Generated by the Backoffice capability generator when "${key}" was approved.`,
      `/// TODO(super-app team): ask for the device permission, call the platform API,`,
      `/// return JSON data (or throw a BridgeException), then set [implemented] to true.`,
      `class ${className} extends CapabilityHandler {`,
      `  @override`,
      `  String get key => '${key}';`,
      ``,
      `  /// Not offered to mini apps until it is implemented.`,
      `  @override`,
      `  bool get implemented => false;`,
      ``,
      `  @override`,
      `  Future<Object?> handle(Map<String, dynamic> params, BridgeContext ctx) async {`,
      `    throw const BridgeException(BridgeErrorCode.unsupported, '"${key}" is not implemented yet.');`,
      `  }`,
      `}`,
      ``,
    ].join('\n');
  }

  /**
   * Adds the capability's platform settings to the Super App on a new branch
   * and opens a merge request for the Super App team. Never throws: the
   * outcome (created / not_needed / failed + error) is in the result.
   */
  async generateCapabilityMr(
    proposal: CapabilityProposal,
    targetVersion?: string,
    targetBranchOverride?: string,
  ): Promise<CodeGenerationResult> {
    const targetBranch =
      targetBranchOverride?.trim() ||
      this.configService.get<string>('CODEGEN_TARGET_BRANCH') ||
      'development';
    const key = proposal.capabilityKey || (proposal as any).permissionKey;
    const mapping = this.resolveCapabilityMapping(key, proposal.metadata);
    const result = (
      status: CodeGenerationResult['status'],
      extra: Partial<CodeGenerationResult> & { message: string },
    ): CodeGenerationResult => ({
      status,
      success: status !== 'failed',
      targetBranch,
      filesModified: [],
      ...extra,
    });

    const needed = this.neededFiles(mapping);
    const steps = this.remainingSteps(key, mapping);
    const branchName = `capa/add-${key.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}`;
    const superAppDir = this.getSuperAppDir();

    // 1. File changes (permissions, packages)
    let outcome: CodeGenerationResult;
    try {
      if (!needed.length) {
        outcome = result('not_needed', {
          message: mapping.builtIn
            ? `'${key}' is built into the Super App; nothing has to change.`
            : `'${key}' needs no device permission or package.`,
        });
      } else if (superAppDir && localBuildsEnabled()) {
        // A local checkout is only touched on a developer workstation that opts in
        outcome = this.generateLocally(superAppDir, proposal, mapping, needed, {
          key,
          branchName,
          targetBranch,
          targetVersion,
          result,
        });
      } else {
        outcome = await this.generateOnGitLab(proposal, mapping, needed, {
          key,
          branchName,
          targetBranch,
          targetVersion,
          result,
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.error(`Capability code change for '${key}' failed: ${error}`);
      return result('failed', {
        error,
        remainingSteps: steps.length ? steps : undefined,
        message: `The code change for '${key}' could not be prepared: ${error}`,
      });
    }

    if (outcome.status === 'failed' || !steps.length) {
      return { ...outcome, remainingSteps: steps.length ? steps : undefined };
    }

    // 2. Manual work remains (bridge method, Xcode setup): track it in a GitLab issue
    const issue = await this.openTrackingIssue(proposal, key, steps, outcome.mrUrl);
    if (issue.url) {
      return {
        ...outcome,
        status: outcome.status === 'created' ? 'created' : 'needs_work',
        success: true,
        issueUrl: issue.url,
        remainingSteps: steps,
        message:
          outcome.status === 'created'
            ? `${outcome.message} The remaining work is tracked in an issue for the Super App team.`
            : `No file change was needed for '${key}'. The Super App team has a task to finish it.`,
      };
    }
    const error =
      outcome.status === 'created'
        ? `The code change is ready, but the task for the Super App team could not be created: ${issue.error}`
        : `The task for the Super App team could not be created: ${issue.error}`;
    this.logger.error(`Tracking issue for '${key}' failed: ${issue.error}`);
    return { ...outcome, status: 'failed', success: false, error, remainingSteps: steps, message: error };
  }

  /**
   * Opens the tracking issue for an approved proposal whose code change is
   * already done (used by Retry when only the issue failed).
   */
  async createTrackingIssue(
    proposal: CapabilityProposal,
    mrUrl?: string,
  ): Promise<{ issueUrl?: string; error?: string; steps: string[] }> {
    const key = proposal.capabilityKey || (proposal as any).permissionKey;
    const steps = this.remainingSteps(key, this.resolveCapabilityMapping(key, proposal.metadata));
    if (!steps.length) return { steps };
    const issue = await this.openTrackingIssue(proposal, key, steps, mrUrl);
    return { issueUrl: issue.url, error: issue.error, steps };
  }

  /** GitLab issue in the Super App repo with a checklist of the manual work. */
  private async openTrackingIssue(
    proposal: CapabilityProposal,
    key: string,
    steps: string[],
    mrUrl?: string,
  ): Promise<{ url?: string; error?: string }> {
    const { token, projectApiUrl } = this.gitlabProject();
    if (!token) {
      return { error: 'Access to the Super App code repository is not configured (MOBILE_GIT_TOKEN is not set).' };
    }
    const name = proposal.capabilityName || findPlatformCapability(key)?.name || key;
    const miniApp = proposal.miniApp?.name || proposal.metadata?.miniAppName || 'Platform / Host Core Shell';
    const description =
      `A capability was approved in the Backoffice and needs work in the Super App.\n\n` +
      `* **Capability**: ${name} (\`${key}\`)\n` +
      `* **Requested by**: ${proposal.requestedBy?.name || 'MiniApp Developer'}\n` +
      `* **Mini app**: ${miniApp}\n` +
      `* **Release**: ${proposal.targetSuperAppVersion || 'next'}\n` +
      (mrUrl ? `* **Generated code change**: ${mrUrl}\n` : '') +
      (proposal.description ? `\n> ${proposal.description.replace(/\n/g, '\n> ')}\n` : '') +
      `\n#### To do\n` +
      steps.map((s) => `- [ ] ${s}`).join('\n') +
      `\n\n*Created automatically by FSA SuperApp BackOffice.*`;
    try {
      const res = await fetch(`${projectApiUrl}/issues`, {
        method: 'POST',
        headers: this.gitlabHeaders(token),
        body: JSON.stringify({ title: `Add capability: ${name} (${key})`, description, labels: 'capability' }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        const body = (await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200);
        return { error: `Creating the issue returned HTTP ${res.status}: ${body}` };
      }
      const issue = (await res.json().catch(() => ({}))) as { web_url?: string };
      return issue.web_url ? { url: issue.web_url } : { error: 'GitLab did not return the issue link.' };
    } catch (err) {
      return { error: `Could not reach the code repository (${fetchErrorReason(err)})` };
    }
  }

  private mergeRequestText(proposal: CapabilityProposal, key: string, targetVersion: string | undefined, targetBranch: string, files: string[]) {
    const miniAppDisplay =
      proposal.miniApp?.name || proposal.metadata?.miniAppName || 'Platform / Host Core Shell';
    const steps = this.remainingSteps(key, this.resolveCapabilityMapping(key, proposal.metadata));
    return {
      title: `feat(capability): Add ${key} capability`,
      description:
        `### Capability added from the Backoffice\n\n` +
        `* **Capability Key**: \`${key}\`\n` +
        `* **Requested By**: ${proposal.requestedBy?.name || 'MiniApp Developer'}\n` +
        `* **MiniApp**: ${miniAppDisplay}\n` +
        `* **Target SuperApp Version**: ${targetVersion || 'next'}\n` +
        `* **Target Branch**: \`${targetBranch}\`\n\n` +
        `#### Changed files:\n` +
        files.map((f) => `- \`${f}\``).join('\n') +
        (steps.length
          ? `\n\n#### Still to do by hand before release:\n` + steps.map((s) => `- [ ] ${s}`).join('\n')
          : '') +
        `\n\n*Generated automatically by FSA SuperApp BackOffice.*`,
    };
  }

  private async generateOnGitLab(
    proposal: CapabilityProposal,
    mapping: CapabilityMapping,
    needed: string[],
    ctx: {
      key: string;
      branchName: string;
      targetBranch: string;
      targetVersion?: string;
      result: (s: CodeGenerationResult['status'], e: Partial<CodeGenerationResult> & { message: string }) => CodeGenerationResult;
    },
  ): Promise<CodeGenerationResult> {
    const { key, branchName, targetBranch, targetVersion, result } = ctx;
    const { token, projectApiUrl } = this.gitlabProject();
    const fail = (error: string, extra: Partial<CodeGenerationResult> = {}) =>
      result('failed', {
        ...extra,
        error,
        message: `The code change for '${key}' could not be prepared: ${error}`,
      });

    if (!token) {
      return fail('Access to the Super App code repository is not configured (MOBILE_GIT_TOKEN is not set).');
    }
    const headers = this.gitlabHeaders(token);
    const call = async (url: string, init?: RequestInit) => {
      try {
        return await fetch(url, { ...init, headers, signal: AbortSignal.timeout(15000) });
      } catch (err) {
        throw new Error(`Could not reach the code repository (${fetchErrorReason(err)})`);
      }
    };
    const bodySnippet = async (res: Response) =>
      (await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200);

    // 1. Read the current files from the target branch (optional ones may be missing)
    const files: Record<string, string | null> = {};
    const optional = new Set(this.optionalFiles(mapping, key));
    for (const file of [...needed, ...optional]) {
      const res = await call(
        `${projectApiUrl}/repository/files/${encodeURIComponent(file)}/raw?ref=${encodeURIComponent(targetBranch)}`,
      );
      if (res.status === 404) {
        if (optional.has(file)) {
          files[file] = null;
          continue;
        }
        return fail(`${file} was not found on branch '${targetBranch}'.`);
      }
      if (!res.ok) {
        return fail(`Reading ${file} from '${targetBranch}' returned HTTP ${res.status}: ${await bodySnippet(res)}`);
      }
      files[file] = await res.text();
    }

    // 2. Work out the edits; nothing to do means no branch and no merge request
    const changes = this.computeChanges(files, mapping, key);
    const changed = Object.keys(changes);
    if (!changed.length) {
      return result('not_needed', {
        message: `The Super App on '${targetBranch}' already has everything '${key}' needs.`,
      });
    }

    // 3. Branch, commit, merge request
    const branchRes = await call(
      `${projectApiUrl}/repository/branches?branch=${encodeURIComponent(branchName)}&ref=${encodeURIComponent(targetBranch)}`,
      { method: 'POST' },
    );
    if (!branchRes.ok) {
      return fail(`Creating branch '${branchName}' returned HTTP ${branchRes.status}: ${await bodySnippet(branchRes)}`);
    }

    const commitRes = await call(`${projectApiUrl}/repository/commits`, {
      method: 'POST',
      body: JSON.stringify({
        branch: branchName,
        commit_message: `feat(capability): add ${key} capability & permissions (target: ${targetVersion || 'next'})`,
        actions: changed.map((file) => ({
          action: files[file] === null ? 'create' : 'update',
          file_path: file,
          content: changes[file],
        })),
      }),
    });
    if (!commitRes.ok) {
      return fail(`Saving the changes returned HTTP ${commitRes.status}: ${await bodySnippet(commitRes)}`, { branchName });
    }

    const text = this.mergeRequestText(proposal, key, targetVersion, targetBranch, changed);
    const mrRes = await call(`${projectApiUrl}/merge_requests`, {
      method: 'POST',
      body: JSON.stringify({
        source_branch: branchName,
        target_branch: targetBranch,
        title: text.title,
        description: text.description,
        remove_source_branch: true,
      }),
    });
    if (!mrRes.ok) {
      return fail(
        `The changes were saved on branch '${branchName}', but opening the review request returned HTTP ${mrRes.status}: ${await bodySnippet(mrRes)}`,
        { branchName, filesModified: changed },
      );
    }
    const mr = (await mrRes.json().catch(() => ({}))) as { web_url?: string; iid?: number };
    this.logger.log(`Opened Super App merge request for '${key}': ${mr.web_url} (IID ${mr.iid})`);
    return result('created', {
      branchName,
      mrUrl: mr.web_url,
      filesModified: changed,
      message: `Code change for '${key}' is ready for review (branch '${branchName}' into '${targetBranch}').`,
    });
  }

  /** Developer workstation only (LOCAL_BUILDS_ENABLED=true): commit in the local checkout. */
  private generateLocally(
    superAppDir: string,
    proposal: CapabilityProposal,
    mapping: CapabilityMapping,
    needed: string[],
    ctx: {
      key: string;
      branchName: string;
      targetBranch: string;
      targetVersion?: string;
      result: (s: CodeGenerationResult['status'], e: Partial<CodeGenerationResult> & { message: string }) => CodeGenerationResult;
    },
  ): CodeGenerationResult {
    const { key, branchName, targetBranch, targetVersion, result } = ctx;
    const abs = (f: string) => path.join(superAppDir, ...f.split('/'));
    const files: Record<string, string | null> = {};
    for (const file of needed) {
      if (!fs.existsSync(abs(file))) {
        throw new Error(`${file} was not found in the local Super App checkout`);
      }
      files[file] = fs.readFileSync(abs(file), 'utf8');
    }
    for (const file of this.optionalFiles(mapping, key)) {
      files[file] = fs.existsSync(abs(file)) ? fs.readFileSync(abs(file), 'utf8') : null;
    }
    const changes = this.computeChanges(files, mapping, key);
    const changed = Object.keys(changes);
    if (!changed.length) {
      return result('not_needed', {
        message: `The local Super App already has everything '${key}' needs.`,
      });
    }

    const runGit = (args: string[]) =>
      child_process.execFileSync('git', args, {
        cwd: superAppDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    let originalBranch = 'main';
    try {
      originalBranch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']).trim();
    } catch {
      /* keep default */
    }

    try {
      try {
        runGit(['checkout', targetBranch]);
      } catch {
        /* stay on the current branch */
      }
      runGit(['checkout', '-b', branchName]);
      for (const file of changed) {
        fs.mkdirSync(path.dirname(abs(file)), { recursive: true });
        fs.writeFileSync(abs(file), changes[file], 'utf8');
      }
      for (const file of changed) runGit(['add', file]);
      runGit(['commit', '-m', `feat(capability): add ${key} capability & permissions (target: ${targetVersion || 'next'})`]);
    } catch (err) {
      // Put the working tree back as it was (remove files this run created)
      for (const file of changed) {
        const original = files[file];
        if (original === null || original === undefined) {
          if (fs.existsSync(abs(file))) fs.unlinkSync(abs(file));
        } else {
          fs.writeFileSync(abs(file), original, 'utf8');
        }
      }
      try {
        runGit(['checkout', originalBranch]);
      } catch {
        /* best effort */
      }
      throw err;
    }

    let pushed = true;
    try {
      runGit(['push', '-u', 'origin', branchName]);
    } catch (pushErr) {
      pushed = false;
      this.logger.warn(`Push to remote failed: ${(pushErr as Error).message}`);
    }
    try {
      runGit(['checkout', originalBranch]);
    } catch {
      /* best effort */
    }

    const { webUrl } = this.gitlabProject();
    const text = this.mergeRequestText(proposal, key, targetVersion, targetBranch, changed);
    const mrUrl = pushed
      ? `${webUrl}/-/merge_requests/new?merge_request[source_branch]=${encodeURIComponent(branchName)}` +
        `&merge_request[target_branch]=${encodeURIComponent(targetBranch)}` +
        `&merge_request[title]=${encodeURIComponent(text.title)}` +
        `&merge_request[description]=${encodeURIComponent(text.description)}`
      : undefined;
    return result('created', {
      branchName,
      mrUrl,
      filesModified: changed,
      message: pushed
        ? `Code change for '${key}' committed on branch '${branchName}'; open the review request from the link.`
        : `Code change for '${key}' committed locally on branch '${branchName}' (push failed).`,
    });
  }
}
