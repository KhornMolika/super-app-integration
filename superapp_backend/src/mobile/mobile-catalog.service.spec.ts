import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { MobileCatalogService, toCatalogItem } from './mobile-catalog.service';

function makeApp(over: any = {}): MiniApp {
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
  it('projects safe catalog item with integrationConfig', () => {
    const json = JSON.stringify(toCatalogItem(makeApp()));
    expect(JSON.parse(json)).toEqual({
      id: 'id-1',
      appId: 'com.acme.pay',
      name: 'Acme Pay',
      description: 'Pay things',
      fullDescription: 'long',
      logo: 'https://cdn.example.io/logo.png',
      category: 'FINANCE',
      regulator: null,
      status: 'ACTIVE',
      integrationMethod: 'WEBVIEW',
      // nexusUrl and token are server-only and never reach phones
      integrationConfig: {
        webviewUrl: 'https://nexus.corp.io/repository/x',
      },
      permissions: [],
      termsAndConditions: null,
      privacyPolicy: null,
    });
  });

  it('returns the organization code, lowercased, as regulator', () => {
    expect(toCatalogItem(makeApp({ organizationCode: 'IRC' })).regulator).toBe('irc');
    expect(toCatalogItem(makeApp({ organizationCode: '' })).regulator).toBeNull();
  });

  it('adds nativeSdk.available only for NATIVE_SDK apps', () => {
    expect(toCatalogItem(makeApp({ integrationMethod: 'NATIVE_SDK' })).nativeSdk).toEqual({ available: true });
    expect(toCatalogItem(makeApp()).nativeSdk).toBeUndefined();
  });

  it('adds widget with public fields only (never verifiedClass)', () => {
    expect(
      toCatalogItem(
        makeApp({
          homeWidget: {
            widgetClass: 'HrHomeWidget',
            verifiedClass: 'HrHomeWidget',
          },
        }),
      ).widget,
    ).toEqual({ widgetClass: 'HrHomeWidget' });
    expect(
      toCatalogItem(
        makeApp({ homeWidget: { url: 'https://hr.example.com/widget' } }),
      ).widget,
    ).toEqual({ url: 'https://hr.example.com/widget' });
    expect(
      toCatalogItem(makeApp({ homeWidget: null })).widget,
    ).toBeUndefined();
    expect('widget' in toCatalogItem(makeApp({ homeWidget: null }))).toBe(false);
    expect('widget' in toCatalogItem(makeApp())).toBe(false);
  });
});

describe('MobileCatalogService.list', () => {
  function qbFor(rows: MiniApp[]) {
    const calls: any = { where: [], and: [] };
    const qb: any = {
      select: jest.fn((cols) => ((calls.select = cols), qb)),
      leftJoinAndSelect: jest.fn(() => qb),
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

  it('restricts to ACTIVE, TESTING, and APPROVED statuses and returns catalog items', async () => {
    const { repo, calls } = qbFor([makeApp(), makeApp({ id: 'id-2', integrationMethod: 'NATIVE_SDK' })]);
    const page = await new MobileCatalogService(repo).list(undefined, 20, 40);
    expect(calls.where[0][1]).toEqual({ statuses: ['ACTIVE', 'TESTING', 'APPROVED'] });
    expect(calls.take).toBe(20);
    expect(calls.skip).toBe(40);
    expect(page).toMatchObject({ total: 7, limit: 20, offset: 40 });
    // Only the suspended / archived exclusions, no name search
    expect(calls.and.map((c: any[]) => c[0])).toEqual([
      expect.stringContaining("<> 'SUSPENDED'"),
      expect.stringContaining("<> 'ARCHIVED'"),
    ]);
  });

  it('escapes LIKE wildcards in the name search', async () => {
    const { repo, calls } = qbFor([]);
    await new MobileCatalogService(repo).list('50%_off\\', 10, 0);
    expect(calls.and[2][1]).toEqual({ q: '%50\\%\\_off\\\\%' });
  });

  it('selects homeWidget and returns it as widget', async () => {
    const { repo, calls } = qbFor([
      makeApp({
        homeWidget: { widgetClass: 'HrHomeWidget', verifiedClass: 'HrHomeWidget' },
      }),
    ]);
    const page = await new MobileCatalogService(repo).list(undefined, 20, 0);
    expect(calls.select).toContain('m.homeWidget');
    expect(calls.select).toContain('m.organizationId');
    expect(page.items[0].widget).toEqual({ widgetClass: 'HrHomeWidget' });
  });
});

import { stripServerOnlyConfig } from './mobile-catalog.service';

describe('stripServerOnlyConfig', () => {
  it('keeps what phones read and drops server-only settings, also nested', () => {
    const out = stripServerOnlyConfig({
      productionUrl: 'https://x', urlScheme: 'tax://', packageName: 'p', bundleUrl: 'https://b',
      androidPackageName: 'com.v', androidObjectName: 'Sdk', iosTypeName: 'T', iosModuleName: 'M',
      androidMavenArtifactId: 'a', androidMavenVersion: '1.0.0',
      deployKey: { encrypted: 'x' }, deployKeyFingerprint: 'f', gitAccessToken: 'g', encryptedToken: 'e',
      verificationToken: 'v', packageStoragePath: 'p/x.zip', androidMinioKey: 'k', iosMinioUrl: 'u',
      androidNexusMavenUrl: 'n', iosNexusZipUrl: 'z', codegenPrUrl: 'c', token: 't',
      nested: { clientSecret: 's', keep: 1 },
    });
    expect(out).toEqual({
      productionUrl: 'https://x', urlScheme: 'tax://', packageName: 'p', bundleUrl: 'https://b',
      androidPackageName: 'com.v', androidObjectName: 'Sdk', iosTypeName: 'T', iosModuleName: 'M',
      androidMavenArtifactId: 'a', androidMavenVersion: '1.0.0',
      nested: { keep: 1 },
    });
  });
});
