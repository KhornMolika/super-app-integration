import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readTarGz } from './tar.util';
import { nexusApiBaseUrl } from '../integrations/nexus/nexus-url';

export interface SuperAppWebInfo {
  build: number;
  /** Super App version (test builds publish the web app with their APK version) */
  version?: string;
  archive: string;
  commit?: string;
  builtAt?: string;
}

export interface SuperAppWebBuild {
  info: SuperAppWebInfo;
  files: Map<string, Buffer>;
}

const REPO = 'superapp-artifacts';
const LATEST = 'superapp-web/latest.json';
const ARCHIVE_PATH = /^superapp-web\/[A-Za-z0-9._-]{1,80}\/superapp-web\.tar\.gz$/;
const MAX_ARCHIVE_BYTES = 150 * 1024 * 1024;

/**
 * The newest web Super App build, published to Nexus by Jenkins
 * superapp-sandbox-build (superapp-artifacts/superapp-web/latest.json). Kept in
 * memory and checked for a newer build at most once a minute, so the Backoffice
 * preview and /preview/ show a new build about a minute after Jenkins publishes
 * it, with no redeploy.
 */
@Injectable()
export class SuperAppWebService {
  private readonly logger = new Logger(SuperAppWebService.name);
  private current: SuperAppWebBuild | null = null;
  private checkedAt = 0;
  private cooldownUntil = 0;
  private inflight: Promise<void> | null = null;
  static readonly REFRESH_MS = 60_000;
  static readonly ERROR_BACKOFF_MS = 60_000;
  static readonly AUTH_RATE_LIMIT_BACKOFF_MS = 300_000; // 5 minutes on 429/401 to let Nexus lockout clear

  constructor(private readonly config: ConfigService) {}

  /** The newest build, or null when none has been published yet (or Nexus is down with nothing cached). */
  async getBuild(): Promise<SuperAppWebBuild | null> {
    const now = Date.now();
    // Do not attempt to poll if in cooldown after an error or 429/401 rate-limit/lockout
    if (now < this.cooldownUntil) {
      return this.current;
    }

    // Negative caching: check at most once every REFRESH_MS, whether current build is loaded or null
    if (now - this.checkedAt < SuperAppWebService.REFRESH_MS) {
      return this.current;
    }

    this.inflight ??= this.refresh().finally(() => (this.inflight = null));
    try {
      await this.inflight;
    } catch (err: any) {
      // Keep serving the build we have. Node's fetch says only "fetch failed": name the
      // cause (ENOTFOUND = DNS, ECONNREFUSED, ETIMEDOUT...) and where it was going.
      const cause = err?.cause?.code || err?.cause?.message;
      this.logger.warn(
        `Could not check for a newer web build at ${this.url(LATEST)}: ${err.message}${cause ? ` (${cause})` : ''}`,
      );
    }
    return this.current;
  }

  private async refresh(): Promise<void> {
    this.checkedAt = Date.now();
    try {
      const res = await fetch(this.url(LATEST), {
        headers: this.auth(),
        signal: AbortSignal.timeout(10_000),
      });

      if (res.status === 429 || res.status === 401) {
        // Severe rate-limiting or authentication failure: back off for 5 minutes so Nexus lockout window clears
        this.cooldownUntil = Date.now() + SuperAppWebService.AUTH_RATE_LIMIT_BACKOFF_MS;
        throw new Error(`Nexus ${LATEST}: HTTP ${res.status} (backing off for 5 minutes to clear lockout)`);
      }
      if (res.status === 404) {
        // No build published yet: don't re-poll for at least REFRESH_MS
        this.cooldownUntil = Date.now() + SuperAppWebService.REFRESH_MS;
        return;
      }
      if (!res.ok) {
        this.cooldownUntil = Date.now() + SuperAppWebService.ERROR_BACKOFF_MS;
        throw new Error(`Nexus ${LATEST}: HTTP ${res.status}`);
      }

      const info = (await res.json()) as SuperAppWebInfo;
      if (!info || typeof info.archive !== 'string' || !ARCHIVE_PATH.test(info.archive) || info.archive.includes('..')) {
        this.cooldownUntil = Date.now() + SuperAppWebService.ERROR_BACKOFF_MS;
        throw new Error(`Nexus ${LATEST} names no valid archive`);
      }
      if (this.current?.info.archive === info.archive) return;

      const ar = await fetch(this.url(info.archive), {
        headers: this.auth(),
        signal: AbortSignal.timeout(120_000),
      });
      if (!ar.ok) {
        this.cooldownUntil = Date.now() + SuperAppWebService.ERROR_BACKOFF_MS;
        throw new Error(`Nexus ${info.archive}: HTTP ${ar.status}`);
      }
      if (Number(ar.headers.get('content-length') || 0) > MAX_ARCHIVE_BYTES) throw new Error('web build archive too large');
      const buf = Buffer.from(await ar.arrayBuffer());
      if (buf.length > MAX_ARCHIVE_BYTES) throw new Error('web build archive too large');
      const files = readTarGz(buf);
      if (!files.has('index.html')) throw new Error(`${info.archive} has no index.html`);
      this.current = { info, files };
      this.cooldownUntil = 0; // Success: clear cooldown
      this.logger.log(`Serving web Super App ${info.version || 'build'} ${info.build} (${info.commit || '?'}), ${files.size} files`);
    } catch (err: any) {
      if (this.cooldownUntil <= Date.now()) {
        this.cooldownUntil = Date.now() + SuperAppWebService.ERROR_BACKOFF_MS;
      }
      throw err;
    }
  }

  private url(path: string): string {
    // In-cluster Nexus when NEXUS_INTERNAL_URL is set: the public hostname resets these
    const base = nexusApiBaseUrl((k) => this.config.get<string>(k));
    return `${base}/repository/${REPO}/${path}`;
  }

  private auth(): Record<string, string> {
    const user = this.config.get<string>('NEXUS_ADMIN_USER') || 'admin';
    const pass = this.config.get<string>('NEXUS_ADMIN_PASSWORD') || process.env.NEXUS_ADMIN_PASSWORD || '';
    return pass ? { Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}` } : {};
  }
}
