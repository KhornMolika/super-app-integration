import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as YAML from 'yaml';
import {
  FlutterPackageValidation,
  GitCommitInfo,
  GitProvider,
  GitProviderType,
  GitRepositoryInfo,
  ParsedGitUrl,
} from '../git-provider.interface';

@Injectable()
export class GitLabProvider implements GitProvider {
  readonly type: GitProviderType = 'gitlab';
  private readonly logger = new Logger(GitLabProvider.name);

  constructor(private readonly configService: ConfigService) {}

  private getDefaultToken(): string | undefined {
    return this.configService.get<string>('GITLAB_TOKEN');
  }

  private getConfiguredBaseUrl(): string {
    return this.configService.get<string>('GITLAB_BASE_URL') || 'https://gitlab.com';
  }

  private getApiBaseUrl(host?: string): string {
    if (host && host !== 'gitlab.com') {
      return `https://${host}/api/v4`;
    }
    const configured = this.getConfiguredBaseUrl().replace(/\/+$/, '');
    if (configured.endsWith('/api/v4')) {
      return configured;
    }
    return `${configured}/api/v4`;
  }

  matchesUrl(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase().trim();
    let configuredHost = '';
    try {
      configuredHost = new URL(this.getConfiguredBaseUrl()).host.toLowerCase();
    } catch {
      configuredHost = 'gitlab.com';
    }
    return (
      lower.includes('gitlab') ||
      lower.startsWith('gitlab:') ||
      (Boolean(configuredHost) && lower.includes(configuredHost))
    );
  }

  parseUrl(url: string): ParsedGitUrl {
    const trimmed = url.trim();
    let owner = '';
    let repo = '';
    let host = 'gitlab.com';

    if (trimmed.startsWith('git@')) {
      // git@gitlab.com:owner/group/repo.git
      const match = trimmed.match(/^git@([^:]+):(.+?)\/([^/]+?)(\.git)?$/);
      if (match) {
        host = match[1];
        owner = match[2];
        repo = match[3];
      }
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const parsedUrl = new URL(trimmed);
        host = parsedUrl.host;
        const segments = parsedUrl.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/');
        if (segments.length >= 2) {
          repo = segments[segments.length - 1];
          owner = segments.slice(0, segments.length - 1).join('/');
        }
      } catch {
        const match = trimmed.match(/https?:\/\/[^/]+\/(.+?)\/([^/]+?)(\.git)?$/);
        if (match) {
          owner = match[1];
          repo = match[2];
        }
      }
    } else if (trimmed.includes('/')) {
      const parts = trimmed.replace(/\.git$/, '').split('/');
      repo = parts[parts.length - 1];
      owner = parts.slice(0, parts.length - 1).join('/');
    } else {
      throw new Error(`Invalid GitLab repository identifier: ${url}`);
    }

    if (!owner || !repo) {
      throw new Error(`Could not parse namespace and project from: ${url}`);
    }

    const fullName = `${owner}/${repo}`;
    const rawUrl = `https://${host}/${fullName}.git`;

    return {
      provider: 'gitlab',
      owner,
      repo,
      host,
      fullName,
      rawUrl,
    };
  }

  private getProjectIdentifier(parsed: ParsedGitUrl): string {
    return encodeURIComponent(parsed.fullName);
  }

  private getAuthHeaders(token?: string): Record<string, string> {
    const effectiveToken = token || this.getDefaultToken();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'DPS-SuperApp-Integration',
    };
    if (effectiveToken) {
      headers['PRIVATE-TOKEN'] = effectiveToken;
    }
    return headers;
  }

  async getRepository(urlOrSlug: string, token?: string): Promise<GitRepositoryInfo> {
    const parsed = this.parseUrl(urlOrSlug);
    const projectId = this.getProjectIdentifier(parsed);
    const apiUrl = `${this.getApiBaseUrl(parsed.host)}/projects/${projectId}`;

    const res = await fetch(apiUrl, {
      headers: this.getAuthHeaders(token),
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`GitLab project '${parsed.fullName}' not found or access denied.`);
      }
      throw new Error(`GitLab API error (${res.status}): ${await res.text()}`);
    }

    const data = (await res.json()) as any;
    return {
      id: data.id,
      name: data.name || parsed.repo,
      fullName: data.path_with_namespace || parsed.fullName,
      owner: data.namespace?.full_path || parsed.owner,
      description: data.description,
      defaultBranch: data.default_branch || 'main',
      isPrivate: data.visibility !== 'public',
      htmlUrl: data.web_url,
      cloneUrl: data.http_url_to_repo || parsed.rawUrl,
      sshUrl: data.ssh_url_to_repo,
    };
  }

  async getBranches(urlOrSlug: string, token?: string): Promise<string[]> {
    const parsed = this.parseUrl(urlOrSlug);
    const projectId = this.getProjectIdentifier(parsed);
    const apiUrl = `${this.getApiBaseUrl(parsed.host)}/projects/${projectId}/repository/branches?per_page=100`;

    const res = await fetch(apiUrl, {
      headers: this.getAuthHeaders(token),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch branches for GitLab project '${parsed.fullName}': ${res.statusText}`);
    }

    const data = (await res.json()) as any[];
    return data.map((b: any) => b.name);
  }

  async getTags(urlOrSlug: string, token?: string): Promise<string[]> {
    const parsed = this.parseUrl(urlOrSlug);
    const projectId = this.getProjectIdentifier(parsed);
    const apiUrl = `${this.getApiBaseUrl(parsed.host)}/projects/${projectId}/repository/tags?per_page=100`;

    const res = await fetch(apiUrl, {
      headers: this.getAuthHeaders(token),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch tags for GitLab project '${parsed.fullName}': ${res.statusText}`);
    }

    const data = (await res.json()) as any[];
    return data.map((t: any) => t.name);
  }

  async getCommits(
    urlOrSlug: string,
    ref?: string,
    limit = 20,
    token?: string,
  ): Promise<GitCommitInfo[]> {
    const parsed = this.parseUrl(urlOrSlug);
    const projectId = this.getProjectIdentifier(parsed);
    let apiUrl = `${this.getApiBaseUrl(parsed.host)}/projects/${projectId}/repository/commits?per_page=${limit}`;
    if (ref) {
      apiUrl += `&ref_name=${encodeURIComponent(ref)}`;
    }

    const res = await fetch(apiUrl, {
      headers: this.getAuthHeaders(token),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch commits for GitLab project '${parsed.fullName}': ${res.statusText}`);
    }

    const data = (await res.json()) as any[];
    return data.map((c: any) => ({
      sha: c.id,
      shortSha: c.short_id || c.id.substring(0, 7),
      message: c.title || c.message?.split('\n')[0] || '',
      authorName: c.author_name || 'Unknown',
      authorEmail: c.author_email,
      date: c.committed_date || c.created_at || new Date().toISOString(),
    }));
  }

  async getFileContent(
    urlOrSlug: string,
    filePath: string,
    ref?: string,
    token?: string,
  ): Promise<string> {
    const parsed = this.parseUrl(urlOrSlug);
    const projectId = this.getProjectIdentifier(parsed);
    const encodedFilePath = encodeURIComponent(filePath.replace(/^\//, ''));
    let apiUrl = `${this.getApiBaseUrl(parsed.host)}/projects/${projectId}/repository/files/${encodedFilePath}/raw`;
    if (ref) {
      apiUrl += `?ref=${encodeURIComponent(ref)}`;
    }

    const res = await fetch(apiUrl, {
      headers: this.getAuthHeaders(token),
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`File '${filePath}' not found in GitLab project '${parsed.fullName}' (ref: ${ref || 'default'}).`);
      }
      throw new Error(`GitLab API error fetching '${filePath}' (${res.status}): ${await res.text()}`);
    }

    return await res.text();
  }

  async validateFlutterPackage(
    urlOrSlug: string,
    ref?: string,
    token?: string,
    path?: string,
  ): Promise<FlutterPackageValidation> {
    try {
      const parsed = this.parseUrl(urlOrSlug);
      const effectiveRef = ref || parsed.extractedRef || undefined;
      const rawSubPath = path !== undefined && path !== null && path.trim() !== '' ? path.trim() : (parsed.extractedPath || '');
      const effectivePath = rawSubPath.replace(/^\/+|\/+$/g, '');
      const targetFile = effectivePath ? `${effectivePath}/pubspec.yaml` : 'pubspec.yaml';

      const pubspecRaw = await this.getFileContent(urlOrSlug, targetFile, effectiveRef, token);
      const parsedYaml = YAML.parse(pubspecRaw);

      if (!parsedYaml || typeof parsedYaml !== 'object') {
        return {
          isValid: false,
          isFlutterPackage: false,
          path: effectivePath || undefined,
          error: `pubspec.yaml at '${targetFile}' exists but could not be parsed as valid YAML.`,
        };
      }

      if (!parsedYaml.name) {
        return {
          isValid: false,
          isFlutterPackage: false,
          path: effectivePath || undefined,
          error: `pubspec.yaml at '${targetFile}' is missing the required 'name' field.`,
        };
      }

      const hasFlutterSdk =
        parsedYaml.dependencies?.flutter !== undefined ||
        parsedYaml.flutter !== undefined ||
        parsedYaml.environment?.flutter !== undefined;

      return {
        isValid: true,
        packageName: parsedYaml.name,
        version: parsedYaml.version || '0.0.1',
        description: parsedYaml.description,
        isFlutterPackage: hasFlutterSdk,
        dependencies: parsedYaml.dependencies || {},
        pubspecRaw,
        path: effectivePath || undefined,
      };
    } catch (err: any) {
      return {
        isValid: false,
        isFlutterPackage: false,
        error: err.message || 'Failed to validate Flutter package.',
      };
    }
  }

  generateDependencySnippet(options: {
    packageName?: string;
    url: string;
    refType?: 'tag' | 'branch' | 'commit';
    ref?: string;
    path?: string;
  }): string {
    const parsed = this.parseUrl(options.url);
    const pkgName = options.packageName || parsed.repo.replace(/[-_]miniapp$/, '').replace(/[-_]package$/, '');
    const cleanUrl = parsed.rawUrl;
    const effectiveRef = options.ref || parsed.extractedRef;
    const effectivePath = options.path || parsed.extractedPath;

    let snippet = `dependencies:\n  ${pkgName}:\n    git:\n      url: ${cleanUrl}`;
    if (effectiveRef) {
      snippet += `\n      ref: ${effectiveRef}`;
    }
    if (effectivePath) {
      snippet += `\n      path: ${effectivePath}`;
    }
    return snippet;
  }
}
