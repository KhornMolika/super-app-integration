import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readTarGz } from './tar.util';

export interface SuperAppWebInfo {
  build: number;
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
const ARCHIVE_PATH = /^superapp-web\/\d{1,9}\/superapp-web\.tar\.gz$/;
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
  private inflight: Promise<void> | null = null;
  static readonly REFRESH_MS = 60_000;

  constructor(private readonly config: ConfigService) {}

  /** The newest build, or null when none has been published yet (or Nexus is down with nothing cached). */
  async getBuild(): Promise<SuperAppWebBuild | null> {
    if (!this.current || Date.now() - this.checkedAt > SuperAppWebService.REFRESH_MS) {
      this.inflight ??= this.refresh().finally(() => (this.inflight = null));
      try {
        await this.inflight;
      } catch (err: any) {
        // Keep serving the build we have
        this.logger.warn(`Could not check for a newer web build: ${err.message}`);
      }
    }
    return this.current;
  }

  private async refresh(): Promise<void> {
    this.checkedAt = Date.now();
    const res = await fetch(this.url(LATEST), {
      headers: this.auth(),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404) return;
    if (!res.ok) throw new Error(`Nexus ${LATEST}: HTTP ${res.status}`);
    const info = (await res.json()) as SuperAppWebInfo;
    if (!info || typeof info.archive !== 'string' || !ARCHIVE_PATH.test(info.archive)) {
      throw new Error(`Nexus ${LATEST} names no valid archive`);
    }
    if (this.current?.info.archive === info.archive) return;

    const ar = await fetch(this.url(info.archive), {
      headers: this.auth(),
      signal: AbortSignal.timeout(120_000),
    });
    if (!ar.ok) throw new Error(`Nexus ${info.archive}: HTTP ${ar.status}`);
    if (Number(ar.headers.get('content-length') || 0) > MAX_ARCHIVE_BYTES) throw new Error('web build archive too large');
    const buf = Buffer.from(await ar.arrayBuffer());
    if (buf.length > MAX_ARCHIVE_BYTES) throw new Error('web build archive too large');
    const files = readTarGz(buf);
    if (!files.has('index.html')) throw new Error(`${info.archive} has no index.html`);
    this.current = { info, files };
    this.logger.log(`Serving web Super App build ${info.build} (${info.commit || '?'}), ${files.size} files`);
  }

  private url(path: string): string {
    const base = (this.config.get<string>('NEXUS_BASE_URL') || process.env.NEXUS_BASE_URL || 'http://localhost:8081').replace(/\/+$/, '');
    return `${base}/repository/${REPO}/${path}`;
  }

  private auth(): Record<string, string> {
    const user = this.config.get<string>('NEXUS_ADMIN_USER') || 'admin';
    const pass = this.config.get<string>('NEXUS_ADMIN_PASSWORD') || process.env.NEXUS_ADMIN_PASSWORD || '';
    return pass ? { Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}` } : {};
  }
}
