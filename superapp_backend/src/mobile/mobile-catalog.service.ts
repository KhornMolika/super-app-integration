import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniApp, MiniAppStatus } from '../miniapps/entities/miniapp.entity';

export interface CatalogItem {
  id: string;
  appId: string;
  name: string;
  description: string | null;
  logo: string | null;
  category: string | null;
  integrationMethod: string;
  nativeSdk?: { available: true };
}

export interface CatalogPage {
  items: CatalogItem[];
  total: number;
  limit: number;
  offset: number;
}

/** Explicit allowlist: nothing else from the row can ever leak. */
export function toCatalogItem(app: MiniApp): CatalogItem {
  const item: CatalogItem = {
    id: app.id,
    appId: app.appId,
    name: app.name,
    description: app.shortDescription ?? null,
    logo: app.logo ?? null,
    category: app.category ?? null,
    integrationMethod: app.integrationMethod,
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

  async list(q: string | undefined, limit: number, offset: number): Promise<CatalogPage> {
    const qb = this.miniApps
      .createQueryBuilder('m')
      // Column allowlist also avoids the entity's eager `owner` join.
      .select([
        'm.id',
        'm.appId',
        'm.name',
        'm.shortDescription',
        'm.logo',
        'm.category',
        'm.integrationMethod',
      ])
      .where('m.status = :status', { status: MiniAppStatus.ACTIVE });
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
    return { items: rows.map(toCatalogItem), total, limit, offset };
  }
}
