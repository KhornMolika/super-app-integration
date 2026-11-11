/**
 * How a Flutter mini app becomes a dependency in the Super App's pubspec.yaml.
 * Shared by the local pubspec injector and the production build list
 * (build-miniapps), so both write the same entry.
 */
import { gitSourceUrlOf, isGitSource, splitGitUrl } from './git-source.util';
import { DART_PACKAGE_NAME } from './miniapp-registry.render';

interface PackageSource {
  appId?: string;
  name?: string;
  integrationConfig?: Record<string, any> | null;
}

export type MiniAppDependency =
  | { git: { url: string; ref: string; path?: string } }
  | { hosted: { name: string; url: string }; version: string };

export const DEFAULT_PUB_GATEWAY = 'https://app.fintechcenterfsa.com/pub';

/** Packages of the Super App itself: never a mini app. */
const RESERVED_PACKAGES = new Set([
  'flutter',
  'flutter_test',
  'flutter_localizations',
  'mobile_super_app',
  'fsa_superapp_miniapp_flutter_sdk',
]);

/** The Dart package name of a mini app. */
export function canonicalPackageNameOf(miniApp: PackageSource): string {
  const cfg = miniApp.integrationConfig || {};
  if (typeof cfg.packageName === 'string' && cfg.packageName.trim() !== '') {
    return cfg.packageName.trim().replace(/-/g, '_').toLowerCase();
  }
  const gitUrl = cfg.gitUrl || cfg.repoUrl || (cfg.repoOwner && cfg.repoName ? cfg.repoName : '');
  if (gitUrl) {
    const match = String(gitUrl).match(/[\/:]([^\/:]+?)(\.git)?$/);
    if (match && match[1]) return match[1].replace(/-/g, '_').toLowerCase();
  }
  return (miniApp.name || miniApp.appId || 'miniapp').toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

/**
 * The registry URL written for hosted packages: the public /pub gateway, which
 * any build machine reaches with a build token. A developer PC's or the
 * cluster-internal Nexus address is never written.
 */
export function pubspecHostedUrlFor(gateway: string | undefined, requested?: string): string {
  const g = (gateway || DEFAULT_PUB_GATEWAY).trim().replace(/\/+$/, '');
  const r = (requested || '').trim();
  const usable =
    /^https:\/\//.test(r) &&
    !/(localhost|127\.0\.0\.1|host\.docker\.internal|\.svc\.cluster\.local|\/repository\/)/i.test(r);
  return usable ? r.replace(/\/+$/, '') : g;
}

/** ^1.0.0 for a bare version; ranges and "any" are kept. */
export function normalizeVersionConstraint(ver?: string): string {
  if (!ver || !String(ver).trim()) return '^1.0.0';
  const trimmed = String(ver).trim();
  if (/^[\^~>=<]/.test(trimmed) || trimmed === 'any') return trimmed;
  return `^${trimmed}`;
}

const SAFE_REF = /^[A-Za-z0-9._\/-]{1,200}$/;
const SAFE_VERSION = /^(any|[\^~]?\d[0-9A-Za-z.+-]*|([<>]=?\s*\d[0-9A-Za-z.+-]*\s*){1,2})$/;
const SAFE_PATH = /^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/;
const SAFE_HOSTED_URL = /^https:\/\/[A-Za-z0-9.-]+(:\d+)?(\/[A-Za-z0-9._~-]+)*$/;

/**
 * The pubspec entry a production build uses for this mini app, or why it has
 * none. Local paths (developer PCs) are never used.
 */
export function miniAppDependencyOf(
  miniApp: PackageSource,
  pubGateway: string | undefined,
): { packageName: string; dependency: MiniAppDependency } | { packageName: string; skip: string } {
  const cfg = miniApp.integrationConfig || {};
  const packageName = canonicalPackageNameOf(miniApp);
  if (!DART_PACKAGE_NAME.test(packageName) || RESERVED_PACKAGES.has(packageName)) {
    return { packageName, skip: `"${packageName}" is not a usable Dart package name` };
  }

  if (isGitSource(cfg)) {
    const url = gitSourceUrlOf(cfg)!;
    // Also refuses credentials written into the URL (user:token@host)
    if (!splitGitUrl(url)) return { packageName, skip: 'repository URL is not a supported Git URL' };
    const ref = String(cfg.gitBranch || cfg.gitTag || cfg.commitSha || cfg.branch || cfg.ref || 'main').trim();
    if (!SAFE_REF.test(ref) || ref.split('/').includes('..')) return { packageName, skip: 'Git branch or tag has unsupported characters' };
    const subPath = String(cfg.gitPath || cfg.packagePath || '').trim().replace(/^\.\/|\/+$/g, '');
    if (subPath && (!SAFE_PATH.test(subPath) || subPath.split('/').includes('..'))) {
      return { packageName, skip: 'package path inside the repository is not valid' };
    }
    return { packageName, dependency: { git: { url, ref, ...(subPath ? { path: subPath } : {}) } } };
  }

  if (cfg.sourceType === 'LOCAL' || (cfg.path && !cfg.packageStoragePath && !cfg.isHosted && cfg.sourceType !== 'ARTIFACT')) {
    return { packageName, skip: 'local path packages exist only on a developer PC' };
  }

  // Published package (ARTIFACT), from the /pub gateway
  const url = pubspecHostedUrlFor(pubGateway, cfg.nexusUrl || cfg.hostedUrl);
  if (!SAFE_HOSTED_URL.test(url)) return { packageName, skip: 'package registry URL is not valid' };
  const version = normalizeVersionConstraint(cfg.versionConstraint || cfg.packageVersion || cfg.version);
  if (!SAFE_VERSION.test(version)) return { packageName, skip: `version "${version}" is not a valid constraint` };
  return { packageName, dependency: { hosted: { name: packageName, url }, version } };
}
