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
export class GitHubProvider implements GitProvider {
  readonly type: GitProviderType = 'github';
  private readonly logger = new Logger(GitHubProvider.name);

  constructor(private readonly configService: ConfigService) {}

  private getDefaultToken(): string | undefined {
    return this.configService.get<string>('GITHUB_TOKEN');
  }

  private getBaseApiUrl(): string {
    return this.configService.get<string>('GITHUB_BASE_URL') || 'https://api.github.com';
  }

  matchesUrl(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase().trim();
    return (
      lower.includes('github.com') ||
      lower.startsWith('github:') ||
      (!lower.includes('gitlab') && lower.split('/').length === 2 && !lower.includes('.'))
    );
  }

  parseUrl(url: string): ParsedGitUrl {
    const trimmed = url.trim();
    let owner = '';
    let repo = '';
    let host = 'github.com';

    let extractedRef: string | undefined = undefined;
    let extractedPath: string | undefined = undefined;

    if (trimmed.startsWith('git@')) {
      // git@github.com:owner/repo.git
      const match = trimmed.match(/^git@([^:]+):([^/]+)\/(.+?)(\.git)?$/);
      if (match) {
        host = match[1];
        owner = match[2];
        repo = match[3];
      }
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      // https://github.com/owner/repo.git or https://github.com/owner/repo or https://github.com/owner/repo/tree/main/subpath
      try {
        const parsedUrl = new URL(trimmed);
        host = parsedUrl.host;
        const segments = parsedUrl.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/');
        if (segments.length >= 2) {
          owner = segments[0];
          repo = segments[1];

          // Check for tree / blob deep path: e.g. /owner/repo/tree/main/sub/path
          if (segments.length >= 4 && (segments[2] === 'tree' || segments[2] === 'blob')) {
            extractedRef = segments[3];
            if (segments.length > 4) {
              extractedPath = segments.slice(4).join('/');
            }
          }
        }
      } catch {
        // Fallback simple regex
        const match = trimmed.match(/https?:\/\/[^/]+\/([^/]+)\/([^/]+?)(\.git)?$/);
        if (match) {
          owner = match[1];
          repo = match[2];
        }
      }
    } else if (trimmed.includes('/')) {
      // owner/repo or owner/repo/path
      const cleanParts = trimmed.replace(/^\/+|\/+$/g, '').replace(/\.git$/, '').split('/').filter(Boolean);
      if (cleanParts.length >= 2) {
        owner = cleanParts[0];
        repo = cleanParts[1];
        if (cleanParts.length > 2) {
          extractedPath = cleanParts.slice(2).join('/');
        }
      }
    } else {
      throw new Error(`Invalid GitHub repository identifier: ${url}`);
    }

    if (!owner || !repo) {
      throw new Error(`Could not parse owner and repository from: ${url}`);
    }

    const fullName = `${owner}/${repo}`;
    const rawUrl = `https://${host}/${fullName}.git`;

    return {
      provider: 'github',
      owner,
      repo,
      host,
      fullName,
      rawUrl,
      extractedRef,
      extractedPath,
    };
  }

  private getAuthHeaders(token?: string): Record<string, string> {
    const effectiveToken = token || this.getDefaultToken();
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'DPS-SuperApp-Integration',
    };
    if (effectiveToken) {
      headers.Authorization = `Bearer ${effectiveToken}`;
    }
    return headers;
  }

  async getRepository(urlOrSlug: string, token?: string): Promise<GitRepositoryInfo> {
    const parsed = this.parseUrl(urlOrSlug);
    const apiUrl = `${this.getBaseApiUrl()}/repos/${parsed.fullName}`;

    const res = await fetch(apiUrl, {
      headers: this.getAuthHeaders(token),
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`GitHub repository '${parsed.fullName}' not found or access denied.`);
      }
      throw new Error(`GitHub API error (${res.status}): ${await res.text()}`);
    }

    const data = (await res.json()) as any;
    return {
      id: data.id,
      name: data.name,
      fullName: data.full_name,
      owner: data.owner?.login || parsed.owner,
      description: data.description,
      defaultBranch: data.default_branch || 'main',
      isPrivate: data.private,
      htmlUrl: data.html_url,
      cloneUrl: data.clone_url,
      sshUrl: data.ssh_url,
    };
  }

  async getBranches(urlOrSlug: string, token?: string): Promise<string[]> {
    const parsed = this.parseUrl(urlOrSlug);
    const apiUrl = `${this.getBaseApiUrl()}/repos/${parsed.fullName}/branches?per_page=100`;

    const res = await fetch(apiUrl, {
      headers: this.getAuthHeaders(token),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch branches for '${parsed.fullName}': ${res.statusText}`);
    }

    const data = (await res.json()) as any[];
    return data.map((b: any) => b.name);
  }

  async getTags(urlOrSlug: string, token?: string): Promise<string[]> {
    const parsed = this.parseUrl(urlOrSlug);
    const apiUrl = `${this.getBaseApiUrl()}/repos/${parsed.fullName}/tags?per_page=100`;

    const res = await fetch(apiUrl, {
      headers: this.getAuthHeaders(token),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch tags for '${parsed.fullName}': ${res.statusText}`);
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
    let apiUrl = `${this.getBaseApiUrl()}/repos/${parsed.fullName}/commits?per_page=${limit}`;
    if (ref) {
      apiUrl += `&sha=${encodeURIComponent(ref)}`;
    }

    const res = await fetch(apiUrl, {
      headers: this.getAuthHeaders(token),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch commits for '${parsed.fullName}': ${res.statusText}`);
    }

    const data = (await res.json()) as any[];
    return data.map((c: any) => ({
      sha: c.sha,
      shortSha: c.sha.substring(0, 7),
      message: c.commit?.message?.split('\n')[0] || '',
      authorName: c.commit?.author?.name || c.author?.login || 'Unknown',
      authorEmail: c.commit?.author?.email,
      date: c.commit?.author?.date || new Date().toISOString(),
    }));
  }

  async getFileContent(
    urlOrSlug: string,
    filePath: string,
    ref?: string,
    token?: string,
  ): Promise<string> {
    const parsed = this.parseUrl(urlOrSlug);
    let apiUrl = `${this.getBaseApiUrl()}/repos/${parsed.fullName}/contents/${filePath.replace(/^\//, '')}`;
    if (ref) {
      apiUrl += `?ref=${encodeURIComponent(ref)}`;
    }

    const res = await fetch(apiUrl, {
      headers: this.getAuthHeaders(token),
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`File '${filePath}' not found in repository '${parsed.fullName}' (ref: ${ref || 'default'}).`);
      }
      throw new Error(`GitHub API error while fetching '${filePath}' (${res.status}): ${await res.text()}`);
    }

    const data = (await res.json()) as any;
    if (data.encoding === 'base64' && data.content) {
      return Buffer.from(data.content, 'base64').toString('utf8');
    }

    if (data.download_url) {
      const rawRes = await fetch(data.download_url, {
        headers: this.getAuthHeaders(token),
      });
      if (rawRes.ok) {
        return await rawRes.text();
      }
    }

    throw new Error(`Unable to decode content for file: ${filePath}`);
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
