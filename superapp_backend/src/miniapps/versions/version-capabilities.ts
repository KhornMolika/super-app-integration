import { normalizeDeclared } from '../../capabilities/capability-gate.service';

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
 * lifecycle. null = leave it as it is (suspended, archived, unknown).
 */
export function workingVersionStatus(lifecycle?: string | null): 'DRAFT' | 'TESTING' | 'ACTIVE' | null {
  switch ((lifecycle || '').toUpperCase()) {
    case 'ACTIVE':
      return 'ACTIVE';
    case 'APPROVED':
    case 'APPROVED_FOR_TESTING':
    case 'BUILDING':
    case 'BUILDING_STAGE_1':
    case 'TESTING':
    case 'TEST_PASSED':
    case 'BUILDING_STAGE_2':
    case 'BUILD_FAILED':
      return 'TESTING';
    case '':
    case 'DRAFT':
    case 'SUBMITTED':
    case 'IN_REVIEW':
    case 'REJECTED':
    case 'CHANGES_REQUESTED':
    case 'QUARANTINE':
      return 'DRAFT';
    default:
      // SUSPENDED, ARCHIVED, anything new: leave the row as it is
      return null;
  }
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

/**
 * The version row that holds an app's pending revision: the DRAFT row of a
 * live app (one with an ACTIVE row), else the working DRAFT/TESTING row.
 * Rows are expected newest first.
 */
export function revisionRowOf<T extends { status?: string | null }>(rows: T[] | null | undefined): T | undefined {
  if (!Array.isArray(rows)) return undefined;
  const live = rows.some((r) => r.status === 'ACTIVE');
  return rows.find((r) => r.status === 'DRAFT' || (!live && r.status === 'TESTING'));
}
