export type GitProviderType = 'github' | 'gitlab';

export interface GitRepositoryInfo {
  id?: string | number;
  name: string;
  fullName: string;
  owner: string;
  description?: string;
  defaultBranch: string;
  isPrivate: boolean;
  htmlUrl: string;
  cloneUrl: string;
  sshUrl?: string;
}

export interface GitCommitInfo {
  sha: string;
  shortSha: string;
  message: string;
  authorName: string;
  authorEmail?: string;
  date: string;
}

export interface ParsedGitUrl {
  provider?: GitProviderType;
  owner: string;
  repo: string;
  host: string;
  fullName: string;
  rawUrl: string;
  extractedRef?: string;
  extractedPath?: string;
}

export interface FlutterPackageValidation {
  isValid: boolean;
  packageName?: string;
  version?: string;
  description?: string;
  isFlutterPackage: boolean;
  dependencies?: Record<string, any>;
  pubspecRaw?: string;
  path?: string;
  error?: string;
}

export interface GitProvider {
  readonly type: GitProviderType;

  matchesUrl(url: string): boolean;
  parseUrl(url: string): ParsedGitUrl;

  getRepository(urlOrSlug: string, token?: string): Promise<GitRepositoryInfo>;
  getBranches(urlOrSlug: string, token?: string): Promise<string[]>;
  getTags(urlOrSlug: string, token?: string): Promise<string[]>;
  getCommits(urlOrSlug: string, ref?: string, limit?: number, token?: string): Promise<GitCommitInfo[]>;
  getFileContent(urlOrSlug: string, filePath: string, ref?: string, token?: string): Promise<string>;
  validateFlutterPackage(urlOrSlug: string, ref?: string, token?: string, path?: string): Promise<FlutterPackageValidation>;
  generateDependencySnippet(options: {
    packageName?: string;
    url: string;
    refType?: 'tag' | 'branch' | 'commit';
    ref?: string;
    path?: string;
  }): string;
}
