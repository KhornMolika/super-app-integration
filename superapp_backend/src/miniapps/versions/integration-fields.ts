/**
 * How a version row stores an app's integration (Phase 3c, step 4b).
 *
 * The domain-verification fields live inside the version's integrationConfig,
 * as the schema spec describes; MiniApp keeps them as separate properties.
 * No imports: the MiniApp entity uses this after load.
 */

export const VERIFICATION_KEYS = ['verificationToken', 'isDomainVerified', 'domainVerifiedAt'] as const;

export interface AppIntegrationFields {
  integrationConfig?: any;
  verificationToken?: string | null;
  isDomainVerified?: boolean | null;
  domainVerifiedAt?: Date | string | null;
}

/**
 * The integrationConfig a version row stores for these app fields, or
 * undefined when the source carries none of them (a partial read).
 */
export function storedIntegrationConfig(src: AppIntegrationFields): Record<string, any> | null | undefined {
  const hasVerification = VERIFICATION_KEYS.some((k) => (src as any)[k] !== undefined);
  if (src.integrationConfig === undefined && !hasVerification) return undefined;
  if (src.integrationConfig === null && !hasVerification) return null;
  const out: Record<string, any> = { ...(src.integrationConfig || {}) };
  if (src.verificationToken !== undefined) out.verificationToken = src.verificationToken ?? null;
  if (src.isDomainVerified !== undefined) out.isDomainVerified = Boolean(src.isDomainVerified);
  if (src.domainVerifiedAt !== undefined) {
    const d = src.domainVerifiedAt ? new Date(src.domainVerifiedAt as any) : null;
    out.domainVerifiedAt = d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
  }
  return out;
}

/** The app fields a stored integrationConfig stands for. */
export function appIntegrationFields(stored: Record<string, any> | null | undefined): Required<AppIntegrationFields> {
  const cfg = stored && typeof stored === 'object' ? stored : null;
  const at = cfg?.domainVerifiedAt ? new Date(cfg.domainVerifiedAt) : null;
  return {
    integrationConfig: cfg,
    verificationToken: cfg?.verificationToken ?? null,
    isDomainVerified: Boolean(cfg?.isDomainVerified),
    domainVerifiedAt: at && !Number.isNaN(at.getTime()) ? at : null,
  };
}

/** The config phones get: without the verification fields (server-side only). */
export function phoneIntegrationConfig(stored: Record<string, any> | null | undefined): Record<string, any> | null {
  if (!stored || typeof stored !== 'object') return stored ?? null;
  const out = { ...stored };
  for (const k of VERIFICATION_KEYS) delete out[k];
  return out;
}

/** JSON with sorted keys: jsonb reorders object keys, so plain JSON.stringify would see changes that are not there. */
export function stableJson(value: unknown): string {
  if (value === undefined) return 'null';
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)
      ? Object.keys(v)
          .sort()
          .reduce((o: Record<string, unknown>, k) => ((o[k] = v[k]), o), {})
      : v,
  );
}
