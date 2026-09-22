import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { execFileSync } from 'child_process';
import {
  FlutterPackageValidation,
  GitCommitInfo,
  GitProvider,
  GitProviderType,
  GitRepositoryInfo,
  ParsedGitUrl,
} from './git-provider.interface';
import { GitHubProvider } from './providers/github.provider';
import { GitLabProvider } from './providers/gitlab.provider';

export interface GitDeployKeyInfo {
  publicKey: string;
  fingerprint: string;
  type: string;
  title: string;
}

export const DEFAULT_PLATFORM_DEPLOY_KEY =
  'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFm6Vj0b9PqZ3K8W9rV5mQ7l2Y6nJpZ0t8sW5X1yAbCd superapp-deploy-key@superapp-portal.internal';
export const DEFAULT_PLATFORM_DEPLOY_KEY_FINGERPRINT =
  'SHA256:dSp88vXgN1z0kQm5L9p3rTb7V2mKnY8qJpZ0t8sW5X1y';

/**
 * Derives a standardized Dart package name from a Git repository URL or subfolder path.
 * e.g., "git@github.com:KhornMolika/sc-private-miniapp.git" -> "sc_private_miniapp"
 */
export function inferPackageNameFromGitUrl(
  url?: string,
  gitPath?: string,
): string {
  if (gitPath && gitPath.trim()) {
    const segments = gitPath.trim().replace(/\/+$/, '').split('/');
    const lastSeg = segments[segments.length - 1];
    if (lastSeg) {
      return lastSeg.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    }
  }

  if (!url || !url.trim()) return '';
  const cleanUrl = url.trim().replace(/\.git\/?$/, '');

  const sshMatch = cleanUrl.match(
    /^[a-zA-Z0-9._-]+@[^:]+:(?:[^/]+\/)*([^/]+)$/,
  );
  if (sshMatch && sshMatch[1]) {
    return sshMatch[1].toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  const httpMatch = cleanUrl.match(/^https?:\/\/[^/]+(?:\/[^/]+)*\/([^/?#]+)/);
  if (httpMatch && httpMatch[1]) {
    return httpMatch[1].toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  const lastPart = cleanUrl.split(/[/:]/).filter(Boolean).pop() || '';
  return lastPart.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

@Injectable()
export class GitIntegrationService {
  private readonly logger = new Logger(GitIntegrationService.name);
  private readonly providers: Map<GitProviderType, GitProvider> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly githubProvider: GitHubProvider,
    private readonly gitlabProvider: GitLabProvider,
  ) {
    this.providers.set('github', githubProvider);
    this.providers.set('gitlab', gitlabProvider);
  }

  /**
   * Resolves the appropriate Git provider automatically by inspecting the URL
   * or using the explicit provider override.
   */
  resolveProvider(
    url: string,
    explicitProvider?: GitProviderType,
  ): GitProvider {
    if (explicitProvider && this.providers.has(explicitProvider)) {
      return this.providers.get(explicitProvider)!;
    }

    if (!url) {
      const defaultProvider = (this.configService.get<string>('GIT_PROVIDER') ||
        'github') as GitProviderType;
      return this.providers.get(defaultProvider) || this.githubProvider;
    }

    for (const provider of this.providers.values()) {
      if (provider.matchesUrl(url)) {
        return provider;
      }
    }

    // Default fallback based on environment setting or github
    const envProvider = (this.configService.get<string>('GIT_PROVIDER') ||
      'github') as GitProviderType;
    return this.providers.get(envProvider) || this.githubProvider;
  }

  /**
   * Detects provider information and parses repository metadata from a URL.
   */
  detect(
    url: string,
    explicitProvider?: GitProviderType,
  ): { provider: GitProviderType; parsed: ParsedGitUrl } {
    const provider = this.resolveProvider(url, explicitProvider);
    try {
      const parsed = provider.parseUrl(url);
      return {
        provider: provider.type,
        parsed,
      };
    } catch (err: any) {
      throw new BadRequestException(
        err.message || 'Failed to parse Git repository URL.',
      );
    }
  }

  async getRepository(
    url: string,
    explicitProvider?: GitProviderType,
    token?: string,
  ): Promise<{ provider: GitProviderType; repository: GitRepositoryInfo }> {
    const provider = this.resolveProvider(url, explicitProvider);
    const repository = await provider.getRepository(url, token);
    return {
      provider: provider.type,
      repository,
    };
  }

  async getBranches(
    url: string,
    explicitProvider?: GitProviderType,
    token?: string,
    deployKey?: string,
  ): Promise<{ provider: GitProviderType; branches: string[] }> {
    const provider = this.resolveProvider(url, explicitProvider);
    try {
      const branches = await provider.getBranches(url, token);
      if (branches && branches.length > 0) {
        return {
          provider: provider.type,
          branches,
        };
      }
    } catch {
      // REST API failed (e.g. private repo without token), fallback to git ls-remote over SSH
    }

    const ls = await this.lsRemote(url, deployKey);
    return {
      provider: provider.type,
      branches: ls.branches,
    };
  }

  async getTags(
    url: string,
    explicitProvider?: GitProviderType,
    token?: string,
    deployKey?: string,
  ): Promise<{ provider: GitProviderType; tags: string[] }> {
    const provider = this.resolveProvider(url, explicitProvider);
    try {
      const tags = await provider.getTags(url, token);
      if (tags && tags.length > 0) {
        return {
          provider: provider.type,
          tags,
        };
      }
    } catch {
      // REST API failed, fallback to git ls-remote over SSH
    }

    const ls = await this.lsRemote(url, deployKey);
    return {
      provider: provider.type,
      tags: ls.tags,
    };
  }

  async getCommits(
    url: string,
    ref?: string,
    limit?: number,
    explicitProvider?: GitProviderType,
    token?: string,
  ): Promise<{ provider: GitProviderType; commits: GitCommitInfo[] }> {
    const provider = this.resolveProvider(url, explicitProvider);
    const commits = await provider.getCommits(url, ref, limit, token);
    return {
      provider: provider.type,
      commits,
    };
  }

  async validatePackage(
    url: string,
    ref?: string,
    explicitProvider?: GitProviderType,
    token?: string,
    path?: string,
  ): Promise<{
    provider: GitProviderType;
    validation: FlutterPackageValidation;
    snippet?: string;
  }> {
    const provider = this.resolveProvider(url, explicitProvider);
    const validation = await provider.validateFlutterPackage(
      url,
      ref,
      token,
      path,
    );

    if (!validation.packageName) {
      validation.packageName = inferPackageNameFromGitUrl(url, path);
    }

    let snippet: string | undefined;
    if (validation.isValid) {
      snippet = provider.generateDependencySnippet({
        packageName: validation.packageName,
        url,
        ref,
        path: path || validation.path,
      });
    }

    return {
      provider: provider.type,
      validation,
      snippet,
    };
  }

  generateSnippet(options: {
    url: string;
    provider?: GitProviderType;
    packageName?: string;
    refType?: 'tag' | 'branch' | 'commit';
    ref?: string;
    path?: string;
  }): { snippet: string; provider: GitProviderType } {
    const provider = this.resolveProvider(options.url, options.provider);
    const snippet = provider.generateDependencySnippet(options);
    return {
      snippet,
      provider: provider.type,
    };
  }

  async resolveCommitSha(
    url: string,
    ref: string,
    explicitProvider?: GitProviderType,
    token?: string,
    deployKey?: string,
  ): Promise<{ provider: GitProviderType; commitSha: string }> {
    const provider = this.resolveProvider(url, explicitProvider);
    const cleanRef = (ref || '').trim();

    if (/^[0-9a-f]{40}$/i.test(cleanRef)) {
      return {
        provider: provider.type,
        commitSha: cleanRef,
      };
    }

    try {
      const commitSha = await provider.resolveCommitSha(url, cleanRef, token);
      if (commitSha) {
        return {
          provider: provider.type,
          commitSha,
        };
      }
    } catch {
      // REST API failed, fallback to ls-remote
    }

    const ls = await this.lsRemote(url, deployKey);
    return {
      provider: provider.type,
      commitSha: ls.headSha || '',
    };
  }

  /**
   * Executes 'git ls-remote' using the platform (or custom) SSH deploy key.
   * Discovers all branches, tags, and HEAD commit SHAs directly over SSH.
   */
  async lsRemote(
    url: string,
    customDeployKey?: string,
  ): Promise<{ branches: string[]; tags: string[]; headSha?: string }> {
    const rawKey = customDeployKey || this.getDeployPrivateKey();
    let tempKeyFile: string | null = null;

    try {
      let sshCmd =
        'ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null';
      if (rawKey) {
        tempKeyFile = path.join(
          os.tmpdir(),
          `deploy_key_${crypto.randomBytes(6).toString('hex')}`,
        );
        fs.writeFileSync(tempKeyFile, rawKey + '\n', { mode: 0o600 });
        const normalizedKeyPath = tempKeyFile.replace(/\\/g, '/');
        sshCmd = `ssh -i "${normalizedKeyPath}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`;
      }

      // Convert HTTPS to SSH if using SSH deploy key
      let queryUrl = url.trim();
      if (rawKey) {
        if (queryUrl.startsWith('https://github.com/')) {
          queryUrl = queryUrl.replace('https://github.com/', 'git@github.com:');
        } else if (queryUrl.startsWith('https://gitlab.com/')) {
          queryUrl = queryUrl.replace('https://gitlab.com/', 'git@gitlab.com:');
        }
      }

      const stdout = execFileSync('git', ['ls-remote', queryUrl], {
        env: {
          ...process.env,
          GIT_SSH_COMMAND: sshCmd,
        },
        timeout: 10000,
        encoding: 'utf8',
      });

      const branches: string[] = [];
      const tags: string[] = [];
      let headSha: string | undefined;

      const lines = stdout.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 2) continue;
        const [sha, ref] = parts;

        if (ref === 'HEAD') {
          headSha = sha;
        } else if (ref.startsWith('refs/heads/')) {
          const branchName = ref.replace('refs/heads/', '');
          if (!branches.includes(branchName)) {
            branches.push(branchName);
          }
        } else if (ref.startsWith('refs/tags/')) {
          const tagName = ref.replace('refs/tags/', '').replace(/\^{}$/, '');
          if (!tags.includes(tagName)) {
            tags.push(tagName);
          }
        }
      }

      return { branches, tags, headSha };
    } catch (err: any) {
      this.logger.debug(`ls-remote failed for ${url}: ${err.message}`);
      return { branches: [], tags: [] };
    } finally {
      if (tempKeyFile && fs.existsSync(tempKeyFile)) {
        try {
          fs.unlinkSync(tempKeyFile);
        } catch {}
      }
    }
  }

  getDeployKey(): GitDeployKeyInfo {
    const envPublicKey = this.configService.get<string>('GIT_DEPLOY_PUBLIC_KEY');
    const envFingerprint = this.configService.get<string>('GIT_DEPLOY_KEY_FINGERPRINT');

    if (envPublicKey) {
      return {
        publicKey: envPublicKey.trim(),
        fingerprint: envFingerprint || DEFAULT_PLATFORM_DEPLOY_KEY_FINGERPRINT,
        type: 'ed25519',
        title: 'DSP Super App Integration Deploy Key',
      };
    }

    // Attempt reading from secrets directory or generating on the fly
    const secretsDir = path.resolve(process.cwd(), 'secrets');
    const pubPath = path.join(secretsDir, 'deploy_key.pub');
    if (fs.existsSync(pubPath)) {
      try {
        const pubKey = fs.readFileSync(pubPath, 'utf8').trim();
        let fp = DEFAULT_PLATFORM_DEPLOY_KEY_FINGERPRINT;
        try {
          const raw = execFileSync('ssh-keygen', ['-lf', pubPath]).toString().trim();
          const match = raw.match(/SHA256:[a-zA-Z0-9+/=]+/);
          if (match) fp = match[0];
        } catch {
          // fallback to default fingerprint if ssh-keygen unavailable
        }
        return {
          publicKey: pubKey,
          fingerprint: fp,
          type: 'ed25519',
          title: 'DSP Super App Integration Deploy Key',
        };
      } catch (err) {
        this.logger.warn(`Failed reading deploy_key.pub: ${(err as Error).message}`);
      }
    }

    return {
      publicKey: DEFAULT_PLATFORM_DEPLOY_KEY,
      fingerprint: DEFAULT_PLATFORM_DEPLOY_KEY_FINGERPRINT,
      type: 'ed25519',
      title: 'DSP Super App Integration Deploy Key',
    };
  }

  getDeployPrivateKey(): string {
    const envPrivateKey = this.configService.get<string>('GIT_DEPLOY_PRIVATE_KEY');
    if (envPrivateKey) return envPrivateKey.trim();

    const secretsDir = path.resolve(process.cwd(), 'secrets');
    const keyPath = path.join(secretsDir, 'deploy_key');
    if (fs.existsSync(keyPath)) {
      try {
        return fs.readFileSync(keyPath, 'utf8').trim();
      } catch (err) {
        this.logger.warn(`Failed reading deploy_key private key: ${(err as Error).message}`);
      }
    }
    return '';
  }
}
