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
