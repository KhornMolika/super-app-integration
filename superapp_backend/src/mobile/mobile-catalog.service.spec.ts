import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { MobileCatalogService, toCatalogItem } from './mobile-catalog.service';

function makeApp(over: Partial<MiniApp> = {}): MiniApp {
  return {
    id: 'id-1',
    appId: 'com.acme.pay',
    name: 'Acme Pay',
    shortDescription: 'Pay things',
    fullDescription: 'long',
    logo: 'https://cdn.example.io/logo.png',
    category: 'FINANCE',
    status: 'ACTIVE',
    integrationMethod: 'WEBVIEW',
    ownerName: 'Secret Owner',
    ownerEmail: 'owner@corp.io',
    owner: { id: 'admin', email: 'owner@corp.io' },
    integrationConfig: {
      webviewUrl: 'https://nexus.corp.io/repository/x',
      nexusUrl: 'https://nexus.corp.io/repository/y',
      token: 'super-secret',
    },
    ...over,
  } as unknown as MiniApp;
}

describe('toCatalogItem', () => {
  it('projects only the safe allowlist (asserted on the serialized output)', () => {
    const json = JSON.stringify(toCatalogItem(makeApp()));
    expect(JSON.parse(json)).toEqual({
      id: 'id-1',
      appId: 'com.acme.pay',
      name: 'Acme Pay',
      description: 'Pay things',
      logo: 'https://cdn.example.io/logo.png',
      category: 'FINANCE',
      integrationMethod: 'WEBVIEW',
    });
    for (const banned of ['integrationConfig', 'nexus', 'webviewUrl', 'super-secret', 'owner', 'corp.io', 'token', 'fullDescription']) {
      expect(json).not.toContain(banned);
    }
  });

  it('adds nativeSdk.available only for NATIVE_SDK apps', () => {
    expect(toCatalogItem(makeApp({ integrationMethod: 'NATIVE_SDK' })).nativeSdk).toEqual({ available: true });
    expect(toCatalogItem(makeApp()).nativeSdk).toBeUndefined();
  });
});

describe('MobileCatalogService.list', () => {
  function qbFor(rows: MiniApp[]) {
    const calls: any = { where: [], and: [] };
    const qb: any = {
      select: jest.fn((cols) => ((calls.select = cols), qb)),
      where: jest.fn((sql, p) => (calls.where.push([sql, p]), qb)),
      andWhere: jest.fn((sql, p) => (calls.and.push([sql, p]), qb)),
      orderBy: jest.fn(() => qb),
      addOrderBy: jest.fn(() => qb),
      take: jest.fn((n) => ((calls.take = n), qb)),
      skip: jest.fn((n) => ((calls.skip = n), qb)),
      getManyAndCount: jest.fn(async () => [rows, 7]),
    };
    return { repo: { createQueryBuilder: () => qb } as any, calls };
  }

  it('restricts to ACTIVE, selects only safe columns, paginates and never leaks fields', async () => {
    const { repo, calls } = qbFor([makeApp(), makeApp({ id: 'id-2', integrationMethod: 'NATIVE_SDK' })]);
    const page = await new MobileCatalogService(repo).list(undefined, 20, 40);
    expect(calls.where[0][1]).toEqual({ status: 'ACTIVE' });
    expect(calls.select).toEqual(['m.id', 'm.appId', 'm.name', 'm.shortDescription', 'm.logo', 'm.category', 'm.integrationMethod']);
    expect(calls.take).toBe(20);
    expect(calls.skip).toBe(40);
    expect(page).toMatchObject({ total: 7, limit: 20, offset: 40 });
    const json = JSON.stringify(page);
    expect(json).not.toMatch(/integrationConfig|nexus|owner|super-secret/);
    expect(calls.and).toHaveLength(0);
  });

  it('escapes LIKE wildcards in the name search', async () => {
    const { repo, calls } = qbFor([]);
    await new MobileCatalogService(repo).list('50%_off\\', 10, 0);
    expect(calls.and[0][1]).toEqual({ q: '%50\\%\\_off\\\\%' });
  });
});
