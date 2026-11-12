import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { MiniApp } from '../../miniapps/entities/miniapp.entity';

/**
 * Which config a security scan reads: the live one, or the new version under
 * review (pendingRevision), which carries its own package or repository.
 */
export type ScanScope = 'live' | 'rev';

export function scanScopeOf(app: Pick<MiniApp, 'pendingRevision'>): ScanScope {
  return (app.pendingRevision as any)?.integrationConfig ? 'rev' : 'live';
}

export function scanConfigOf(app: Pick<MiniApp, 'pendingRevision' | 'integrationConfig'>, scope?: ScanScope): Record<string, any> {
  const s = scope ?? scanScopeOf(app);
  const rev = (app.pendingRevision as any)?.integrationConfig;
  return ((s === 'rev' && rev) || app.integrationConfig || {}) as Record<string, any>;
}

/** Long enough for a queued Jenkins job; short enough that an old link is useless. */
export const SCAN_TICKET_TTL_SECONDS = 4 * 60 * 60;

// Without a configured secret (local dev) tickets are valid for this process only
const PROCESS_SECRET = randomBytes(32).toString('hex');

function secret(): string {
  const configured = (process.env.RELEASE_CALLBACK_TOKEN || process.env.ASSET_URL_SECRET || '').trim();
  return `scan-source:${configured || PROCESS_SECRET}`;
}

function mac(miniAppId: string, scope: ScanScope, exp: number): string {
  return createHmac('sha256', secret()).update(`${miniAppId}\n${scope}\n${exp}`).digest('base64url');
}

/**
 * A ticket that lets the scan pipeline fetch the source of one mini app (its
 * archive, or its Git address and access) for a few hours: "<scope>.<exp>.<mac>".
 * The endpoints also require the Jenkins callback token.
 */
export function signScanTicket(miniAppId: string, scope: ScanScope, now = Date.now(), ttlSeconds = SCAN_TICKET_TTL_SECONDS): string {
  const exp = Math.floor(now / 1000) + ttlSeconds;
  return `${scope}.${exp}.${mac(miniAppId, scope, exp)}`;
}

/** The scope a valid, unexpired ticket grants for this mini app, else null. */
export function verifyScanTicket(miniAppId: string, ticket: string | undefined, now = Date.now()): ScanScope | null {
  const [scope, expRaw, given] = String(ticket || '').split('.');
  if ((scope !== 'live' && scope !== 'rev') || !/^\d{1,12}$/.test(expRaw || '') || !given) return null;
  const exp = Number(expRaw);
  if (exp * 1000 < now) return null;
  const expected = Buffer.from(mac(miniAppId, scope, exp));
  const provided = Buffer.from(given);
  return expected.length === provided.length && timingSafeEqual(expected, provided) ? scope : null;
}
