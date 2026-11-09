import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CapabilityDefinition } from './entities/capability-definition.entity';
import { SuperAppCapability } from '../super-app/entities/super-app-capability.entity';

/**
 * ADR-004 Section 5 — "disable, don't fail".
 *
 * A Mini App may declare capabilities the Super App host does not support yet.
 * It is never rejected for that:
 *  - optional + unsupported  -> registers, capability disabled (WARNING)
 *  - required + unsupported  -> registers, but the Mini App is not launchable and is
 *                               labelled "Unavailable until Super App vX"
 * Support is computed on read against the live catalog (never stored), so a
 * capability switches on automatically once a Super App release adds it.
 */

export type CapabilityUnsupportedReason =
  | 'NOT_IN_CATALOG'
  | 'RETIRED'
  | 'REQUIRES_NEWER_SUPER_APP';

export interface CapabilityEvaluation {
  key: string;
  required: boolean;
  supported: boolean;
  reason?: CapabilityUnsupportedReason;
  /** Super App version that first supports it, when known (catalog minSuperAppVersion). */
  availableFrom: string | null;
}

export interface CapabilityAvailability {
  capabilities: CapabilityEvaluation[];
  /** false when any required capability is unsupported */
  launchable: boolean;
  /** e.g. "Unavailable until Super App v1.4.0"; null when launchable */
  unavailableReason: string | null;
  hostVersion: string | null;
}

export interface CapabilityGateFinding {
  id: string;
  severity: 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  description: string;
  recommendation: string;
}

interface CatalogSnapshot {
  byKey: Map<string, CapabilityDefinition>;
  hostVersion: string | null;
}

/** Compares "v1.2.0" / "1.2" style versions; missing parts count as 0. */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    v.replace(/^v/i, '').split(/[.+-]/).slice(0, 3).map((n) => parseInt(n, 10) || 0);
  const [pa, pb] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Normalizes a stored capability entry (string key, or { type | key | name, required }). */
export function normalizeDeclared(entry: unknown): { key: string; required: boolean } | null {
  if (typeof entry === 'string') {
    const key = entry.trim();
    return key ? { key, required: false } : null;
  }
  if (entry && typeof entry === 'object') {
    const e = entry as Record<string, unknown>;
    const raw = e.type ?? e.key ?? e.name;
    const key = typeof raw === 'string' ? raw.trim() : '';
    return key ? { key, required: e.required === true } : null;
  }
  return null;
}

export function evaluateAgainstCatalog(
  declared: unknown,
  snapshot: CatalogSnapshot,
): CapabilityAvailability {
  const list = Array.isArray(declared) ? declared : [];
  const seen = new Set<string>();
  const capabilities: CapabilityEvaluation[] = [];

  for (const entry of list) {
    const norm = normalizeDeclared(entry);
    if (!norm || seen.has(norm.key.toLowerCase())) continue;
    seen.add(norm.key.toLowerCase());

    const def = snapshot.byKey.get(norm.key.toLowerCase());
    const host = snapshot.hostVersion;
    let reason: CapabilityUnsupportedReason | undefined;
    let availableFrom: string | null = null;

    if (!def) {
      reason = 'NOT_IN_CATALOG';
    } else if (!def.isActive || def.isDeprecated) {
      reason = 'RETIRED';
    } else if (host && def.minSuperAppVersion && compareVersions(host, def.minSuperAppVersion) < 0) {
      reason = 'REQUIRES_NEWER_SUPER_APP';
      availableFrom = def.minSuperAppVersion;
    } else if (host && def.maxSuperAppVersion && compareVersions(host, def.maxSuperAppVersion) > 0) {
      reason = 'RETIRED';
    }

    capabilities.push({
      key: def?.key ?? norm.key,
      required: norm.required,
      supported: !reason,
      ...(reason ? { reason } : {}),
      availableFrom,
    });
  }

  const blocking = capabilities.filter((c) => c.required && !c.supported);
  let unavailableReason: string | null = null;
  if (blocking.length) {
    const versions = blocking.map((c) => c.availableFrom);
    // Only name a version when every blocking capability has a known one
    const until = versions.every(Boolean)
      ? versions.reduce((max, v) => (compareVersions(v!, max!) > 0 ? v : max))
      : null;
    unavailableReason = until
      ? `Unavailable until Super App ${until.startsWith('v') ? until : `v${until}`}`
      : 'Unavailable until a future Super App release';
  }

  return {
    capabilities,
    launchable: blocking.length === 0,
    unavailableReason,
    hostVersion: snapshot.hostVersion,
  };
}

/** Validation-report findings for the unsupported capabilities in an evaluation. */
export function capabilityFindings(availability: CapabilityAvailability): CapabilityGateFinding[] {
  const describe = (c: CapabilityEvaluation) =>
    c.reason === 'REQUIRES_NEWER_SUPER_APP'
      ? `needs Super App ${c.availableFrom} or newer (host is ${availability.hostVersion})`
      : c.reason === 'RETIRED'
        ? 'has been retired from the Super App host'
        : 'is not provided by the Super App host yet';

  return availability.capabilities
    .filter((c) => !c.supported)
    .map((c) =>
      c.required
        ? {
            id: `CAP_UNSUPPORTED_${c.key.toUpperCase()}`,
            severity: 'MEDIUM' as const,
            category: 'Capability Compliance',
            title: `Required capability "${c.key}" is unavailable: Mini App will not be launchable`,
            description: `The Mini App marks "${c.key}" as required, and it ${describe(c)}. Registration continues, but the Mini App stays hidden from launch (${availability.unavailableReason}) until the host supports it.`,
            recommendation:
              'Submit a capability proposal, or mark the capability optional and implement a fallback flow.',
          }
        : {
            id: `CAP_UNSUPPORTED_${c.key.toUpperCase()}`,
            severity: 'LOW' as const,
            category: 'Capability Compliance',
            title: `Optional capability "${c.key}" will be disabled`,
            description: `"${c.key}" ${describe(c)}. It stays disabled: canIUse('${c.key}') returns false and calls return CAPABILITY_UNSUPPORTED. It enables automatically once the host supports it.`,
            recommendation: 'Make sure the Mini App handles CAPABILITY_UNSUPPORTED with a fallback flow.',
          },
    );
}

@Injectable()
export class CapabilityGateService {
  constructor(
    @InjectRepository(CapabilityDefinition)
    private readonly definitions: Repository<CapabilityDefinition>,
    @InjectRepository(SuperAppCapability)
    private readonly releases: Repository<SuperAppCapability>,
  ) {}

  /** One catalog read, reusable across many apps (e.g. a catalog page). */
  async snapshot(): Promise<CatalogSnapshot> {
    const [defs, latest] = await Promise.all([
      this.definitions.find(),
      this.releases.find({ order: { createdAt: 'DESC' }, take: 1 }),
    ]);
    return {
      byKey: new Map(defs.map((d) => [d.key.toLowerCase(), d])),
      hostVersion: latest[0]?.superAppVersion ?? null,
    };
  }

  async evaluate(declared: unknown): Promise<CapabilityAvailability> {
    return evaluateAgainstCatalog(declared, await this.snapshot());
  }

  /**
   * Runs the shared capability_gate stage for any integration method. Under the
   * ADR-004 policy the stage always passes: unsupported capabilities produce
   * LOW (optional) or MEDIUM (required, not launchable) findings, never a failure.
   */
  async runStage(
    app: { capabilities?: unknown; permissions?: unknown },
    stages: Record<string, any>,
    checks: Record<string, any>,
    findings: any[],
    emitUpdate: (stageId: string) => Promise<void>,
  ): Promise<CapabilityAvailability | null> {
    if (!stages.capability_gate) return null;

    stages.capability_gate.status = 'RUNNING';
    stages.capability_gate.details =
      'Checking declared capabilities against the Super App capability catalog...';
    await emitUpdate('capability_gate');

    const declared = Array.isArray(app.capabilities) ? app.capabilities : app.permissions;
    const availability = await this.evaluate(declared);
    findings.push(...capabilityFindings(availability));

    const total = availability.capabilities.length;
    const unsupported = availability.capabilities.filter((c) => !c.supported);
    stages.capability_gate.status = 'COMPLETED';
    stages.capability_gate.details = !total
      ? 'No host capabilities declared.'
      : !unsupported.length
        ? `All ${total} declared capabilities are supported by the Super App host.`
        : !availability.launchable
          ? `${unsupported.length} of ${total} capabilities unsupported. ${availability.unavailableReason}.`
          : `${unsupported.length} of ${total} optional capabilities unsupported; they stay disabled until the host supports them.`;
    checks.capability_gate = {
      passed: true,
      details: stages.capability_gate.details,
      launchable: availability.launchable,
      unavailableReason: availability.unavailableReason,
      capabilities: availability.capabilities,
    };
    await emitUpdate('capability_gate');
    return availability;
  }
}
