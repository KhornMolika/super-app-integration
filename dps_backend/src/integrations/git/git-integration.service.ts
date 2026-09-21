import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
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
  ): Promise<{ provider: GitProviderType; branches: string[] }> {
    const provider = this.resolveProvider(url, explicitProvider);
    const branches = await provider.getBranches(url, token);
    return {
      provider: provider.type,
      branches,
    };
  }

  async getTags(
    url: string,
    explicitProvider?: GitProviderType,
    token?: string,
  ): Promise<{ provider: GitProviderType; tags: string[] }> {
    const provider = this.resolveProvider(url, explicitProvider);
    const tags = await provider.getTags(url, token);
    return {
      provider: provider.type,
      tags,
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
  ): Promise<{ provider: GitProviderType; commitSha: string }> {
    const provider = this.resolveProvider(url, explicitProvider);
    const commitSha = await provider.resolveCommitSha(url, ref, token);
    return {
      provider: provider.type,
      commitSha,
    };
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
