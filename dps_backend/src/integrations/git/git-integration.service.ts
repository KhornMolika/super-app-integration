import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  resolveProvider(url: string, explicitProvider?: GitProviderType): GitProvider {
    if (explicitProvider && this.providers.has(explicitProvider)) {
      return this.providers.get(explicitProvider)!;
    }

    if (!url) {
      const defaultProvider = (this.configService.get<string>('GIT_PROVIDER') || 'github') as GitProviderType;
      return this.providers.get(defaultProvider) || this.githubProvider;
    }

    for (const provider of this.providers.values()) {
      if (provider.matchesUrl(url)) {
        return provider;
      }
    }

    // Default fallback based on environment setting or github
    const envProvider = (this.configService.get<string>('GIT_PROVIDER') || 'github') as GitProviderType;
    return this.providers.get(envProvider) || this.githubProvider;
  }

  /**
   * Detects provider information and parses repository metadata from a URL.
   */
  detect(url: string, explicitProvider?: GitProviderType): { provider: GitProviderType; parsed: ParsedGitUrl } {
    const provider = this.resolveProvider(url, explicitProvider);
    try {
      const parsed = provider.parseUrl(url);
      return {
        provider: provider.type,
        parsed,
      };
    } catch (err: any) {
      throw new BadRequestException(err.message || 'Failed to parse Git repository URL.');
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
    const validation = await provider.validateFlutterPackage(url, ref, token, path);

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
}
