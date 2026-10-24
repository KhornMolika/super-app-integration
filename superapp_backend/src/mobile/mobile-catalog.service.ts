import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniApp, MiniAppStatus } from '../miniapps/entities/miniapp.entity';
import { buildPaginationMeta } from '../common/utils/pagination.util';
import { PaginationMeta } from '../common/interfaces/paginated-result.interface';
import { CatalogQueryDto } from './dto/catalog-query.dto';

export interface CatalogItem {
  id: string;
  appId: string;
  name: string;
  description: string | null;
  fullDescription?: string | null;
  logo: string | null;
  category: string | null;
  integrationMethod: string;
  integrationConfig?: any;
  permissions?: any[];
  termsAndConditions?: string | null;
  privacyPolicy?: string | null;
  status: string;
  nativeSdk?: { available: true };
}

export interface CatalogPage {
  items: CatalogItem[];
  total: number;
  limit: number;
  offset: number;
  meta?: PaginationMeta & { nextCursor?: string | null };
}

/** Explicit allowlist: nothing sensitive from the row can ever leak. */
export function toCatalogItem(app: MiniApp, clientHost?: string): CatalogItem {
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
    config = JSON.parse(JSON.stringify(config));
    const urlKeys = ['webUrl', 'productionUrl', 'testingUrl', 'url', 'bundleUrl'];
    for (const key of urlKeys) {
      if (typeof config[key] === 'string') {
        if (isProduction) {
          config[key] = config[key]
            .replace(/http:\/\/localhost(?::\d+)?/g, 'https://app.fintechcenterfsa.com')
            .replace(/http:\/\/127\.0\.0\.1(?::\d+)?/g, 'https://app.fintechcenterfsa.com');
        } else {
          config[key] = config[key]
            .replace(/http:\/\/localhost(?::(\d+))?/g, (_: string, port?: string) => `http://${host}${port ? `:${port}` : ''}`)
            .replace(/http:\/\/127\.0\.0\.1(?::(\d+))?/g, (_: string, port?: string) => `http://${host}${port ? `:${port}` : ''}`);
        }
      }
    }
  }

  let logo = app.logo ?? null;
  if (logo) {
    if (logo.startsWith('data:')) {
      // Inline base64 image data: preserve as is
    } else if (
      logo.includes(':9000') ||
      logo.includes('mini-app-assets') ||
      logo.includes('mini-app-logos') ||
      logo.startsWith('/logos/') ||
      logo.startsWith('logos/')
    ) {
      const bucket = 'mini-app-assets';
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
          .replace(/http:\/\/localhost(?::\d+)?/g, 'https://app.fintechcenterfsa.com')
          .replace(/http:\/\/127\.0\.0\.1(?::\d+)?/g, 'https://app.fintechcenterfsa.com');
      } else {
        logo = logo
          .replace(/http:\/\/localhost(?::(\d+))?/g, (_: string, port?: string) => `http://${host}${port ? `:${port}` : ''}`)
          .replace(/http:\/\/127\.0\.0\.1(?::(\d+))?/g, (_: string, port?: string) => `http://${host}${port ? `:${port}` : ''}`);
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
    category: app.organizationRelation?.name ?? raw.category ?? raw.organization ?? null,
    integrationMethod: app.integrationMethod,
    integrationConfig: config ?? null,
    permissions: app.capabilities ?? raw.permissions ?? [],
    termsAndConditions: app.legal?.termsDescription ?? raw.termsDescription ?? null,
    privacyPolicy: app.legal?.privacyPolicyDescription ?? raw.privacyPolicyDescription ?? null,
    status: app.lifecycleStatus ?? raw.status ?? 'ACTIVE',
  };
  if (app.integrationMethod === 'NATIVE_SDK') {
    item.nativeSdk = { available: true };
  }
  return item;
}

@Injectable()
export class MobileCatalogService {
  constructor(
    @InjectRepository(MiniApp) private readonly miniApps: Repository<MiniApp>,
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
      clientHost = typeof limitOrClientHost === 'string' ? limitOrClientHost : undefined;
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
      'm.capabilities',
      'm.lifecycleStatus',
      'm.availabilityStatus',
      'org.name',
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
    );

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

    const effectivePage = page || Math.floor(offset / limit) + 1;
    const baseMeta = buildPaginationMeta(total, effectivePage, limit);
    const nextCursor = baseMeta.hasNextPage
      ? Buffer.from(JSON.stringify({ offset: offset + limit })).toString('base64')
      : null;

    const meta = {
      ...baseMeta,
      nextCursor,
    };

    return {
      items: rows.map((r) => toCatalogItem(r, clientHost)),
      total,
      limit,
      offset,
      meta,
    };
  }
}

