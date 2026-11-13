import {
  MiniAppAccess,
  capabilityTypes,
  resolveMiniAppAccess,
  scopeMiniAppQuery,
} from './miniapp-access.policy';

const ORG_A = 'org-a';
const ORG_B = 'org-b';

const superAdmin = { sub: 'sa', roles: ['SUPER_ADMIN'], organizationId: ORG_A };
const adminA = { sub: 'admin-a', roles: ['ADMIN'], organizationId: ORG_A };
const devA = { sub: 'dev-a', roles: ['MA_DEVELOPER'], organizationId: ORG_A };
const devB = { sub: 'dev-b', roles: ['MA_DEVELOPER'], organizationId: ORG_B };
const staffA = { sub: 'staff-a', roles: ['STAFF'], organizationId: ORG_A };

const ownedByDevA = { ownerId: 'dev-a', organizationId: ORG_A };
const otherInOrgA = { ownerId: 'someone', organizationId: ORG_A };
const inOrgB = { ownerId: 'dev-b', organizationId: ORG_B };

describe('resolveMiniAppAccess', () => {
  describe('SUPER_ADMIN', () => {
    it.each([
      ['own org app', otherInOrgA],
      ['other org app', inOrgB],
      ['app without organization', { ownerId: 'x', organizationId: null }],
    ])('has ADMIN on %s', (_label, app) => {
      expect(resolveMiniAppAccess(superAdmin, app)).toBe(MiniAppAccess.ADMIN);
    });

    it('needs no organization of its own', () => {
      expect(
        resolveMiniAppAccess({ ...superAdmin, organizationId: null }, inOrgB),
      ).toBe(MiniAppAccess.ADMIN);
    });
  });

  describe('ADMIN (organization admin)', () => {
    it('has ADMIN on every app of their organization', () => {
      expect(resolveMiniAppAccess(adminA, otherInOrgA)).toBe(
        MiniAppAccess.ADMIN,
      );
      expect(resolveMiniAppAccess(adminA, ownedByDevA)).toBe(
        MiniAppAccess.ADMIN,
      );
    });

    it('has nothing on another organization (no longer platform-wide)', () => {
      expect(resolveMiniAppAccess(adminA, inOrgB)).toBe(MiniAppAccess.NONE);
    });

    it('has nothing without an organization of their own', () => {
      expect(
        resolveMiniAppAccess({ ...adminA, organizationId: null }, otherInOrgA),
      ).toBe(MiniAppAccess.NONE);
    });
  });

  describe('MA_DEVELOPER', () => {
    it('owns the apps they registered', () => {
      expect(resolveMiniAppAccess(devA, ownedByDevA)).toBe(MiniAppAccess.OWN);
    });

    it('sees nothing of other same-org apps without a collaborator row', () => {
      expect(resolveMiniAppAccess(devA, otherInOrgA)).toBe(MiniAppAccess.NONE);
    });

    it.each([
      ['VIEWER', MiniAppAccess.VIEW],
      ['DEVELOPER', MiniAppAccess.EDIT],
      ['MAINTAINER', MiniAppAccess.MAINTAIN],
      ['ADMIN', MiniAppAccess.MAINTAIN], // legacy rows before the rename
      ['viewer', MiniAppAccess.VIEW],
      ['OWNER', MiniAppAccess.NONE], // unknown role grants nothing
    ])('collaborator role %s gives %s', (role, expected) => {
      expect(resolveMiniAppAccess(devA, otherInOrgA, role)).toBe(expected);
    });

    it('a collaborator row never crosses organizations', () => {
      expect(resolveMiniAppAccess(devA, inOrgB, 'MAINTAINER')).toBe(
        MiniAppAccess.NONE,
      );
      expect(resolveMiniAppAccess(devB, otherInOrgA, 'MAINTAINER')).toBe(
        MiniAppAccess.NONE,
      );
    });

    it('ownership does not survive a move to another organization', () => {
      expect(
        resolveMiniAppAccess(devA, { ownerId: 'dev-a', organizationId: ORG_B }),
      ).toBe(MiniAppAccess.NONE);
    });

    it('owner beats a lower collaborator row on the same app', () => {
      expect(resolveMiniAppAccess(devA, ownedByDevA, 'VIEWER')).toBe(
        MiniAppAccess.OWN,
      );
    });
  });

  describe('deny by default', () => {
    it.each([
      ['no user', undefined, otherInOrgA],
      ['no app', devA, undefined],
      [
        'user without organization',
        { ...devA, organizationId: null },
        ownedByDevA,
      ],
      [
        'app without organization',
        devA,
        { ownerId: 'dev-a', organizationId: null },
      ],
      [
        'user without id',
        { roles: ['MA_DEVELOPER'], organizationId: ORG_A },
        ownedByDevA,
      ],
    ])('%s -> NONE', (_label, user, app) => {
      expect(resolveMiniAppAccess(user as any, app as any)).toBe(
        MiniAppAccess.NONE,
      );
    });

    it('STAFF in the same org sees nothing unless shared', () => {
      expect(resolveMiniAppAccess(staffA, otherInOrgA)).toBe(
        MiniAppAccess.NONE,
      );
      expect(resolveMiniAppAccess(staffA, otherInOrgA, 'VIEWER')).toBe(
        MiniAppAccess.VIEW,
      );
    });
  });

  it('accepts roles as objects with a name (TypeORM role rows)', () => {
    expect(
      resolveMiniAppAccess(
        { sub: 'x', roles: [{ name: 'admin' }], organizationId: ORG_A },
        otherInOrgA,
      ),
    ).toBe(MiniAppAccess.ADMIN);
  });

  it('access levels are ordered so ">= required" checks work', () => {
    expect(MiniAppAccess.NONE).toBeLessThan(MiniAppAccess.VIEW);
    expect(MiniAppAccess.VIEW).toBeLessThan(MiniAppAccess.EDIT);
    expect(MiniAppAccess.EDIT).toBeLessThan(MiniAppAccess.MAINTAIN);
    expect(MiniAppAccess.MAINTAIN).toBeLessThan(MiniAppAccess.OWN);
    expect(MiniAppAccess.OWN).toBeLessThan(MiniAppAccess.ADMIN);
  });
});

describe('scopeMiniAppQuery', () => {
  const fakeQb = () => {
    const wheres: Array<{ sql: string; params: any }> = [];
    const qb: any = {
      andWhere: jest.fn((sql: string, params: any) => {
        wheres.push({ sql, params });
        return qb;
      }),
    };
    return { qb, wheres };
  };

  it('SUPER_ADMIN: no filter', () => {
    const { qb, wheres } = fakeQb();
    expect(scopeMiniAppQuery(qb, 'app', superAdmin)).toBe(true);
    expect(wheres).toHaveLength(0);
  });

  it('ADMIN: their organization only', () => {
    const { qb, wheres } = fakeQb();
    expect(scopeMiniAppQuery(qb, 'app', adminA)).toBe(true);
    expect(wheres).toEqual([
      {
        sql: 'app.organizationId = :accessOrgId',
        params: { accessOrgId: ORG_A },
      },
    ]);
  });

  it('developer: their organization, and owned or collaborated', () => {
    const { qb, wheres } = fakeQb();
    expect(scopeMiniAppQuery(qb, 'miniApp', devA)).toBe(true);
    expect(wheres).toHaveLength(2);
    expect(wheres[0].params).toEqual({ accessOrgId: ORG_A });
    expect(wheres[1].sql).toContain('miniApp.ownerId = :accessUserId');
    expect(wheres[1].sql).toContain('"mini_app_collaborators"');
    expect(wheres[1].sql).toContain('access_c."miniAppId" = miniApp.id');
    expect(wheres[1].params).toEqual({ accessUserId: 'dev-a' });
  });

  it.each([
    ['no user', undefined],
    ['no organization', { ...devA, organizationId: null }],
    ['admin without organization', { ...adminA, organizationId: undefined }],
  ])('%s: sees nothing', (_label, user) => {
    const { qb } = fakeQb();
    expect(scopeMiniAppQuery(qb, 'app', user as any)).toBe(false);
  });

  it('does not match on email any more', () => {
    const { qb, wheres } = fakeQb();
    scopeMiniAppQuery(qb, 'app', { ...devA, email: 'dev@a.test' } as any);
    expect(JSON.stringify(wheres)).not.toMatch(/email/i);
  });
});

describe('capabilityTypes', () => {
  it('compares permission lists by type, ignoring order, duplicates and extra fields', () => {
    const a = capabilityTypes([
      { type: 'camera', purpose: 'x' },
      { type: 'location' },
    ]);
    const b = capabilityTypes([
      'location',
      { type: 'camera' },
      { type: 'camera' },
    ]);
    expect(a).toEqual(b);
    expect(a).toEqual(['camera', 'location']);
  });

  it('treats non-arrays as empty', () => {
    expect(capabilityTypes(undefined)).toEqual([]);
    expect(capabilityTypes({})).toEqual([]);
  });
});
