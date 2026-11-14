import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniApp, MiniAppStatus } from '../miniapps/entities/miniapp.entity';
import { buildPaginationMeta } from '../common/utils/pagination.util';
import { PaginationMeta } from '../common/interfaces/paginated-result.interface';
import { CatalogQueryDto } from './dto/catalog-query.dto';
import {
  CapabilityAvailability,
  CapabilityEvaluation,
  CapabilityGateService,
  evaluateAgainstCatalog,
} from '../capabilities/capability-gate.service';
import { isAssetProxyLink } from '../storage/asset-url-signer';
import { MiniAppVersionsService } from '../miniapps/versions/miniapp-versions.service';

export interface CatalogItem {
  id: string;
  appId: string;
  name: string;
  description: string | null;
  fullDescription?: string | null;
  logo: string | null;
  category: string | null;
  /** Lowercased code of the publishing organization (see GET /mobile/regulators). */
  regulator: string | null;
  integrationMethod: string;
  integrationConfig?: any;
  permissions?: any[];
  termsAndConditions?: string | null;
  privacyPolicy?: string | null;
  status: string;
  nativeSdk?: { available: true };
  /** The app's Home widget (public fields only, never verifiedClass); omitted when it has none. */
  widget?: { widgetClass?: string; viewId?: string; url?: string };
  /**
   * ADR-004 Section 5. false when a required capability is not supported by the
   * host yet: show the app with `unavailableReason`, but do not open it.
   */
  launchable?: boolean;
  unavailableReason?: string | null;
  /** Version (e.g. "1.4.0") from which it becomes launchable; null when unknown. */
  availableFrom?: string | null;
  /** Per-capability support, computed against the live catalog (permissions is unchanged). */
  capabilities?: CapabilityEvaluation[];
}

export interface CatalogPage {
  items: CatalogItem[];
  total: number;
  limit: number;
  offset: number;
  meta?: PaginationMeta & { nextCursor?: string | null };
}

/** Explicit allowlist: nothing sensitive from the row can ever leak. */
/**
 * Settings phones never need: credentials, storage paths, Nexus and pipeline
 * URLs. The app only reads URLs, deep link and package/class names.
 */
const SERVER_ONLY_KEY =
  /^(deployKey|gitAccessToken|gitToken|encryptedToken|verificationToken|packageStoragePath|sourceStoragePath|codegen)|(MinioKey|MinioUrl|NexusUrl|NexusZipUrl|NexusMavenUrl|Fingerprint)$|secret|password|privateKey|^(token|accessToken|apiKey)$/i;

export function stripServerOnlyConfig<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripServerOnlyConfig) as unknown as T;
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SERVER_ONLY_KEY.test(k)) continue;
    out[k] = stripServerOnlyConfig(v);
  }
  return out as T;
}

export function toCatalogItem(
  app: MiniApp,
  clientHost?: string,
  availability?: CapabilityAvailability,
): CatalogItem {
  const host = clientHost || process.env.HOST_IP || 'localhost';
  const isProduction =
    host === 'app.fintechcenterfsa.com' ||
    host.endsWith('.fintechcenterfsa.com') ||
    process.env.NODE_ENV === 'production';

  const baseUrl = isProduction
    ? 'https://app.fintechcenterfsa.com'
    : `http://${host}:3000`;

  let config = app.integrationConfig;
  if (config && typeof config === 'object') {
    config = stripServerOnlyConfig(JSON.parse(JSON.stringify(config)));
    const urlKeys = [
      'webUrl',
      'productionUrl',
      'testingUrl',
      'url',
      'bundleUrl',
    ];
    for (const key of urlKeys) {
      if (typeof config[key] === 'string') {
        if (isProduction) {
          config[key] = config[key]
            .replace(
              /http:\/\/localhost(?::\d+)?/g,
              'https://app.fintechcenterfsa.com',
            )
            .replace(
              /http:\/\/127\.0\.0\.1(?::\d+)?/g,
              'https://app.fintechcenterfsa.com',
            );
        } else {
          config[key] = config[key]
            .replace(
              /http:\/\/localhost(?::(\d+))?/g,
              (_: string, port?: string) =>
                `http://${host}${port ? `:${port}` : ''}`,
            )
            .replace(
              /http:\/\/127\.0\.0\.1(?::(\d+))?/g,
              (_: string, port?: string) =>
                `http://${host}${port ? `:${port}` : ''}`,
            );
        }
      }
    }
  }

  let logo = app.logo ?? null;
  if (logo) {
    if (logo.startsWith('data:')) {
      // Inline base64 image data: preserve as is
    } else if (isAssetProxyLink(logo)) {
      // Already a backend asset link (/api/storage/asset?key=...&bucket=...): keep its
      // key. It contains "superapp-storage", so the raw-URL branch below would take the
      // key from its path ("api/storage/asset") and the image would not be found.
      // The response interceptor re-signs it.
      if (logo.startsWith('/')) logo = `${baseUrl}${logo}`;
    } else if (
      logo.includes(':9000') ||
      logo.includes('superapp-storage') || logo.includes('mini-app-assets') ||
      logo.includes('mini-app-logos') ||
      logo.startsWith('/logos/') ||
      logo.startsWith('logos/')
    ) {
      const bucket = 'superapp-storage';
      const cleanKey = logo
        .split('?')[0]
        .replace(/^https?:\/\/[^\/]+\//, '')
        .replace(/^\/+/, '')
        .replace(/^(?:mini-app-assets\/|mini-app-logos\/)/, '')
        .replace(/^\/+/, '');
      logo = `${baseUrl}/api/storage/asset?bucket=${bucket}&key=${encodeURIComponent(cleanKey)}`;
    } else if (logo.startsWith('/')) {
      logo = `${baseUrl}${logo}`;
    } else {
      if (isProduction) {
        logo = logo
          .replace(
            /http:\/\/localhost(?::\d+)?/g,
            'https://app.fintechcenterfsa.com',
          )
          .replace(
            /http:\/\/127\.0\.0\.1(?::\d+)?/g,
            'https://app.fintechcenterfsa.com',
          );
      } else {
        logo = logo
          .replace(
            /http:\/\/localhost(?::(\d+))?/g,
            (_: string, port?: string) =>
              `http://${host}${port ? `:${port}` : ''}`,
          )
          .replace(
            /http:\/\/127\.0\.0\.1(?::(\d+))?/g,
            (_: string, port?: string) =>
              `http://${host}${port ? `:${port}` : ''}`,
          );
      }
    }
  }

  const raw = app as any;
  const item: CatalogItem = {
    id: app.id,
    appId: app.appId,
    name: app.name,
    description: app.tagline ?? raw.shortDescription ?? null,
    fullDescription: app.description ?? raw.fullDescription ?? null,
    logo,
    category:
      app.organizationRelation?.name ??
      raw.category ??
      raw.organization ??
      null,
    regulator: (app.organizationRelation?.code ?? raw.organizationCode)?.toLowerCase() || null,
    integrationMethod: app.integrationMethod,
    integrationConfig: config ?? null,
    permissions: app.capabilities ?? raw.permissions ?? [],
    termsAndConditions:
      app.legal?.termsDescription ?? raw.termsDescription ?? null,
    privacyPolicy:
      app.legal?.privacyPolicyDescription ??
      raw.privacyPolicyDescription ??
      null,
    status: app.lifecycleStatus ?? raw.status ?? 'ACTIVE',
  };
  if (app.integrationMethod === 'NATIVE_SDK') {
    item.nativeSdk = { available: true };
  }
  if (availability) {
    item.launchable = availability.launchable;
    item.unavailableReason = availability.unavailableReason;
    item.availableFrom = availability.availableFrom;
    item.capabilities = availability.capabilities;
  }
  const hw = app.homeWidget;
  if (hw && (hw.widgetClass || hw.viewId || hw.url)) {
    item.widget = {};
    if (hw.widgetClass) item.widget.widgetClass = hw.widgetClass;
    if (hw.viewId) item.widget.viewId = hw.viewId;
    if (hw.url) item.widget.url = hw.url;
  }
  return item;
}

@Injectable()
export class MobileCatalogService {
  constructor(
    @InjectRepository(MiniApp) private readonly miniApps: Repository<MiniApp>,
    @Optional() private readonly capabilityGate?: CapabilityGateService,
    @Optional() private readonly versions?: MiniAppVersionsService,
  ) {}

  async list(
    queryOrQ?: CatalogQueryDto | string,
    limitOrClientHost?: number | string,
    offsetParam?: number,
    clientHostParam?: string,
  ): Promise<CatalogPage> {
    let q: string | undefined;
    let limit = 20;
    let offset = 0;
    let page: number | undefined;
    let clientHost: string | undefined;

    if (queryOrQ && typeof queryOrQ === 'object') {
      q = queryOrQ.search || queryOrQ.q;
      limit = queryOrQ.limit || 20;
      offset = queryOrQ.offset || 0;
      page = queryOrQ.page;
      clientHost =
        typeof limitOrClientHost === 'string' ? limitOrClientHost : undefined;
    } else {
      q = queryOrQ;
      limit = typeof limitOrClientHost === 'number' ? limitOrClientHost : 20;
      offset = typeof offsetParam === 'number' ? offsetParam : 0;
      clientHost = clientHostParam;
    }

    if (page && page > 0) {
      offset = (page - 1) * limit;
    }

    const qb = this.miniApps.createQueryBuilder('m');
    if (typeof qb.leftJoinAndSelect === 'function') {
      qb.leftJoinAndSelect('m.organizationRelation', 'org');
      qb.leftJoinAndSelect('m.legal', 'legal');
    }
    qb.select([
      'm.id',
      'm.appId',
      'm.name',
      'm.tagline',
      'm.description',
      'm.logo',
      'm.integrationMethod',
      'm.integrationConfig',
      'm.lifecycleStatus',
      'm.availabilityStatus',
      'org.name',
      'org.code',
      'm.organizationId',
      'm.homeWidget',
      'legal.termsDescription',
      'legal.privacyPolicyDescription',
    ]).where(
      '(m.lifecycleStatus IN (:...statuses) OR m.availabilityStatus IN (:...statuses))',
      {
        statuses: [
          MiniAppStatus.ACTIVE,
          MiniAppStatus.TESTING,
          MiniAppStatus.APPROVED,
        ],
      },
    )
      // Suspended and archived apps leave the phones at once
      .andWhere(
        `(m.availabilityStatus IS NULL OR m.availabilityStatus <> 'SUSPENDED')`,
      )
      .andWhere(`m.lifecycleStatus <> 'ARCHIVED'`);

    if (q) {
      const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);
      qb.andWhere(`m.name ILIKE :q ESCAPE '\\'`, { q: `%${escaped}%` });
    }

    const [rows, total] = await qb
      .orderBy('m.name', 'ASC')
      .addOrderBy('m.id', 'ASC')
      .take(limit)
      .skip(offset)
      .getManyAndCount();
    // Capabilities and integration come from the version each app serves
    // (the app's own columns until that version holds an integration); the
    // item phones get keeps its shape.
    const served = await this.versions?.servingVersions(rows.map((r) => r.id));
    for (const r of rows) {
      const v = served?.get(r.id);
      r.capabilities = (v?.capabilities ?? r.capabilities ?? []) as any;
      if (v?.integration) {
        r.integrationMethod = v.integration.integrationMethod ?? r.integrationMethod;
        r.integrationConfig = v.integration.integrationConfig;
        r.homeWidget = v.integration.homeWidget;
      }
    }
    // One catalog read for the whole page; launchability is computed, never stored
    const snapshot = this.capabilityGate ? await this.capabilityGate.snapshot() : null;

    const effectivePage = page || Math.floor(offset / limit) + 1;
    const baseMeta = buildPaginationMeta(total, effectivePage, limit);
    const nextCursor = baseMeta.hasNextPage
      ? Buffer.from(JSON.stringify({ offset: offset + limit })).toString(
          'base64',
        )
      : null;

    const meta = {
      ...baseMeta,
      nextCursor,
    };

    return {
      items: rows.map((r) =>
        toCatalogItem(
          r,
          clientHost,
          snapshot ? evaluateAgainstCatalog(r.capabilities, snapshot) : undefined,
        ),
      ),
      total,
      limit,
      offset,
      meta,
    };
  }
}
