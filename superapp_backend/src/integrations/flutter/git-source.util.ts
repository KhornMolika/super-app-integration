/**
 * Where a Flutter source-code mini app lives in Git. Shared by the pubspec
 * injector (which writes the URL into the Super App pubspec.yaml) and the
 * build credentials list (which tells Jenkins how to fetch that same URL), so
 * the two always agree.
 */
export function gitSourceUrlOf(cfg: Record<string, any> | null | undefined): string | undefined {
  const c = cfg || {};
  const url =
    c.gitUrl ||
    c.repoUrl ||
    (c.repoOwner && c.repoName ? `https://github.com/${c.repoOwner}/${c.repoName}.git` : undefined);
  return typeof url === 'string' && url.trim() ? url.trim() : undefined;
}

/** The app is built from its Git source (not a published package). */
export function isGitSource(cfg: Record<string, any> | null | undefined): boolean {
  const c = cfg || {};
  return Boolean(gitSourceUrlOf(c)) && (c.sourceType === 'GIT' || !c.sourceType);
}

/**
 * The Git ref a Flutter source mini app is scanned and built from: the commit
 * the Back Office resolved when the developer picked the branch or tag (so the
 * build ships exactly the scanned code), else that branch or tag.
 */
export function gitRefOf(cfg: Record<string, any> | null | undefined): string {
  const c = cfg || {};
  const sha = String(c.commitSha || '').trim();
  if (/^[0-9a-f]{40}$/i.test(sha)) return sha;
  return String(c.gitBranch || c.gitTag || sha || c.branch || c.ref || 'main').trim();
}

/**
 * What the security scan pipeline fetches: the uploaded archive in MinIO, or
 * the Git repository at the locked ref. A stale archive path left from an
 * earlier upload never turns a Git source into an archive scan.
 */
export function scanSourceOf(cfg: Record<string, any> | null | undefined): {
  integrationType: 'ARTIFACT' | 'SOURCE_CODE';
  sourceStoragePath: string;
  repoUrl: string;
  commitSha: string;
  gitProvider: string;
} {
  const c = cfg || {};
  const git = isGitSource(c);
  const repoUrl = git ? gitSourceUrlOf(c) || '' : '';
  const host = repoUrl ? splitGitUrl(repoUrl)?.host || '' : '';
  return {
    integrationType: git ? 'SOURCE_CODE' : 'ARTIFACT',
    sourceStoragePath: git ? '' : String(c.packageStoragePath || c.minioKey || ''),
    repoUrl,
    commitSha: git ? gitRefOf(c) : '',
    gitProvider: String(c.gitProvider || c.provider || (host.includes('gitlab') ? 'GITLAB' : 'GITHUB')).toUpperCase(),
  };
}

/**
 * Host and repository path of a Git URL: https://host/owner/repo(.git),
 * git@host:owner/repo(.git) or ssh://git@host[:port]/owner/repo(.git).
 * Null for anything else.
 */
export function splitGitUrl(url: string): { host: string; path: string } | null {
  const u = (url || '').trim();
  const seg = '[A-Za-z0-9._~-]+(?:/[A-Za-z0-9._~-]+)+';
  const host = '[A-Za-z0-9.-]+';
  let m = u.match(new RegExp(`^https://(${host})(?::\\d+)?/(${seg})/?$`));
  if (!m) m = u.match(new RegExp(`^[A-Za-z0-9._-]+@(${host}):(${seg})$`));
  if (!m) m = u.match(new RegExp(`^ssh://[A-Za-z0-9._-]+@(${host})(?::\\d+)?/(${seg})$`));
  if (!m || m[2].split('/').includes('..')) return null;
  return { host: m[1].toLowerCase(), path: m[2] };
}
