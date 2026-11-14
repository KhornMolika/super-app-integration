import { normalizeDeclared } from '../../capabilities/capability-gate.service';
import { stageOfLifecycle } from '../status/app-status';

/** A declared capability entry, parsed for storage. */
export interface ParsedCapability {
  /** Lowercased key, matched case-insensitively against the catalog. */
  key: string;
  required: boolean;
  purpose: string | null;
  /** The entry exactly as declared. */
  declaration: unknown;
  position: number;
}

/**
 * Parses a declared capability list (key strings or { type | key | name,
 * required, purpose, ... }) the way the capability gate reads it. Blank
 * entries are dropped; a repeated key keeps its first entry.
 */
export function parseDeclaredCapabilities(list: unknown): ParsedCapability[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: ParsedCapability[] = [];
  for (const entry of list) {
    const norm = normalizeDeclared(entry);
    if (!norm) continue;
    const key = norm.key.toLowerCase().slice(0, 100);
    if (seen.has(key)) continue;
    seen.add(key);
    const rawPurpose =
      entry && typeof entry === 'object' ? (entry as Record<string, unknown>).purpose : undefined;
    out.push({
      key,
      required: norm.required,
      purpose: typeof rawPurpose === 'string' && rawPurpose.trim() ? rawPurpose : null,
      declaration: entry,
      position: out.length,
    });
  }
  return out;
}

/** True when a stored row no longer matches its declaration (review it again). */
export function capabilityChanged(
  row: { required: boolean; purpose?: string | null },
  next: ParsedCapability,
): boolean {
  return row.required !== next.required || (row.purpose ?? null) !== next.purpose;
}

/**
 * Status of the version row an unreleased app works on, from the app's
 * lifecycle: its stage (DRAFT ... TEST_PASSED) or ACTIVE once released.
 * null = leave it as it is (suspended, archived, unknown).
 */
export function workingVersionStatus(lifecycle?: string | null): string | null {
  return stageOfLifecycle(lifecycle);
}

/** The stage of a live app's revision row, from the revision's revisionStatus. */
export function revisionStage(revisionStatus: unknown): string {
  const stage = stageOfLifecycle(revisionStatus);
  return stage && stage !== 'ACTIVE' ? stage : 'DRAFT';
}

/** The version string an app is on (live, or being prepared). */
export function workingVersionOf(app: { currentReleaseVersion?: string | null; version?: string | null }): string {
  return app.currentReleaseVersion || (app as any).version || '1.0.0';
}

/**
 * The version a pending revision will be published as: its own version, else
 * the next minor after the live one. publishRevision uses the same rule.
 */
export function revisionVersionOf(app: {
  currentReleaseVersion?: string | null;
  pendingRevision?: any;
}): string {
  const rev = app.pendingRevision || {};
  if (rev.version || rev.packageVersion) return String(rev.version || rev.packageVersion);
  if (!app.currentReleaseVersion) return '1.1.0';
  const minor = parseInt(app.currentReleaseVersion.split('.')[1] || '0', 10);
  return `1.${minor + 1}.0`;
}

// The row being worked on, and the row an app serves (kept import-free in status/)
export { revisionRowOf, servingRowOf } from '../status/app-status';
