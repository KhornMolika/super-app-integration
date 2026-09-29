import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniApp, MiniAppStatus } from '../miniapps/entities/miniapp.entity';

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
}

/** Explicit allowlist: nothing sensitive from the row can ever leak. */
export function toCatalogItem(app: MiniApp, clientHost?: string): CatalogItem {
  const host = clientHost || process.env.HOST_IP || '192.168.1.4';

  let config = app.integrationConfig;
  if (config && typeof config === 'object') {
    config = JSON.parse(JSON.stringify(config));
    const urlKeys = ['webUrl', 'productionUrl', 'testingUrl', 'url', 'bundleUrl'];
    for (const key of urlKeys) {
      if (typeof config[key] === 'string') {
        config[key] = config[key]
          .replace(/http:\/\/localhost(?::(\d+))?/g, (_: string, port?: string) => `http://${host}${port ? `:${port}` : ''}`)
          .replace(/http:\/\/127\.0\.0\.1(?::(\d+))?/g, (_: string, port?: string) => `http://${host}${port ? `:${port}` : ''}`);
      }
    }
  }

  let logo = app.logo ?? null;
  if (logo) {
    if (logo.startsWith('/')) {
      logo = `http://${host}:3000${logo}`;
    } else {
      logo = logo
        .replace(/http:\/\/localhost(?::(\d+))?/g, (_: string, port?: string) => `http://${host}${port ? `:${port}` : ''}`)
        .replace(/http:\/\/127\.0\.0\.1(?::(\d+))?/g, (_: string, port?: string) => `http://${host}${port ? `:${port}` : ''}`);
    }
  }

  const item: CatalogItem = {
    id: app.id,
    appId: app.appId,
    name: app.name,
    description: app.shortDescription ?? null,
    fullDescription: app.fullDescription ?? null,
    logo,
    category: app.category ?? null,
    integrationMethod: app.integrationMethod,
    integrationConfig: config ?? null,
    permissions: app.permissions ?? [],
    termsAndConditions: app.termsDescription ?? null,
    privacyPolicy: app.privacyPolicyDescription ?? null,
    status: app.status,
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

  async list(q: string | undefined, limit: number, offset: number, clientHost?: string): Promise<CatalogPage> {
    const qb = this.miniApps
      .createQueryBuilder('m')
      // Column allowlist also avoids the entity's eager `owner` join.
      .select([
        'm.id',
        'm.appId',
        'm.name',
        'm.shortDescription',
        'm.fullDescription',
        'm.logo',
        'm.category',
        'm.integrationMethod',
        'm.integrationConfig',
        'm.permissions',
        'm.termsDescription',
        'm.privacyPolicyDescription',
        'm.status',
      ])
      .where('m.status IN (:...statuses)', {
        statuses: [
          MiniAppStatus.ACTIVE,
          MiniAppStatus.TESTING,
          MiniAppStatus.APPROVED,
        ],
      });
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
    return { items: rows.map((r) => toCatalogItem(r, clientHost)), total, limit, offset };
  }
}

