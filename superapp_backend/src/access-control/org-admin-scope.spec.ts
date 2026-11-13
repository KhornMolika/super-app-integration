import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { UsersController } from './users.controller';
import { OrganizationsController } from '../organizations/organizations.controller';
import { AuditService } from '../audit/audit.service';
import { SettingsController } from '../settings/settings.controller';

/**
 * ADMIN is an organization admin: their own organization's users, organization
 * profile and audit trail. SUPER_ADMIN is the platform admin.
 */

const ORG_A = 'org-a';
const ORG_B = 'org-b';

const superAdmin = { sub: 'sa', roles: ['SUPER_ADMIN'], permissions: [] };
const adminA = {
  sub: 'admin-a',
  roles: ['ADMIN'],
  organizationId: ORG_A,
  permissions: [
    'user:read',
    'user:manage',
    'organization:manage',
    'audit_log:read',
  ],
};

const profiles: Record<string, { identityId: string; organizationId: string }> =
  {
    'user-a': { identityId: 'user-a', organizationId: ORG_A },
    'user-b': { identityId: 'user-b', organizationId: ORG_B },
  };

function accessService() {
  const staffRepo = {
    findOne: jest.fn(
      async ({ where }: any) => profiles[where.identityId] ?? null,
    ),
  };
  return new AccessControlService(
    {} as any,
    staffRepo as any,
    {} as any,
    {} as any,
  );
}

describe('AccessControlService.assertUserInScope', () => {
  it('SUPER_ADMIN reaches any user', async () => {
    await expect(
      accessService().assertUserInScope('user-b', superAdmin),
    ).resolves.toBeUndefined();
  });

  it('ADMIN reaches users of their own organization only (404 otherwise)', async () => {
    const service = accessService();
    await expect(
      service.assertUserInScope('user-a', adminA),
    ).resolves.toBeUndefined();
    await expect(service.assertUserInScope('user-b', adminA)).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.assertUserInScope('nobody', adminA)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('ADMIN without an organization reaches nobody', async () => {
    await expect(
      accessService().assertUserInScope('user-a', {
        ...adminA,
        organizationId: undefined,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('internal calls (no requester) are not scoped', async () => {
    await expect(
      accessService().assertUserInScope('user-b'),
    ).resolves.toBeUndefined();
  });
});

describe('UsersController scoping', () => {
  function controller() {
    const service = {
      findAllUsers: jest.fn(async (q: any) => q),
      findUserById: jest.fn(async (id: string) => ({
        id,
        email: `${id}@x.kh`,
      })),
      assertUserInScope: jest.fn(async (id: string, requester: any) => {
        if (requester?.roles?.includes('SUPER_ADMIN')) return;
        if (profiles[id]?.organizationId !== requester?.organizationId) {
          throw new NotFoundException();
        }
      }),
      updateUser: jest.fn(async () => 'updated'),
    };
    return { ctrl: new UsersController(service as any), service };
  }

  it('an ADMIN lists their own organization whatever the query asks for', async () => {
    const { ctrl } = controller();
    const q: any = await ctrl.findAll({ organizationId: ORG_B } as any, {
      user: adminA,
    });
    expect(q.organizationId).toBe(ORG_A);
  });

  it('a SUPER_ADMIN may list any organization', async () => {
    const { ctrl } = controller();
    const q: any = await ctrl.findAll({ organizationId: ORG_B } as any, {
      user: superAdmin,
    });
    expect(q.organizationId).toBe(ORG_B);
  });

  it('an ADMIN cannot read or update a user of another organization', async () => {
    const { ctrl, service } = controller();
    await expect(ctrl.findOne('user-b', { user: adminA })).rejects.toThrow(
      NotFoundException,
    );
    await expect(
      ctrl.update('user-b', {} as any, { user: adminA }),
    ).rejects.toThrow(NotFoundException);
    expect(service.updateUser).not.toHaveBeenCalled();
    await expect(
      ctrl.update('user-a', {} as any, { user: adminA }),
    ).resolves.toBe('updated');
  });
});

describe('OrganizationsController: organization admins edit their own profile only', () => {
  const service = {
    update: jest.fn(async () => 'updated'),
    create: jest.fn(async () => 'created'),
    remove: jest.fn(async () => true),
    uploadLogo: jest.fn(async () => 'logo'),
  };
  const ctrl = new OrganizationsController(service as any);
  const image: any = { mimetype: 'image/png' };

  it('ADMIN may edit name and description of their own organization', async () => {
    await expect(
      ctrl.update(ORG_A, { name: 'New name', description: 'd' } as any, {
        user: adminA,
      }),
    ).resolves.toBe('updated');
    await expect(ctrl.uploadLogo(ORG_A, { user: adminA }, image)).resolves.toBe(
      'logo',
    );
  });

  it('ADMIN may not edit another organization', async () => {
    await expect(
      ctrl.update(ORG_B, { name: 'x' } as any, { user: adminA }),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      ctrl.uploadLogo(ORG_B, { user: adminA }, image),
    ).rejects.toThrow(ForbiddenException);
  });

  it.each(['code', 'parentId', 'parentAuthority', 'status'])(
    'ADMIN may not change the structural field %s',
    async (field) => {
      await expect(
        ctrl.update(ORG_A, { [field]: 'x' } as any, { user: adminA }),
      ).rejects.toThrow(ForbiddenException);
    },
  );

  it('creating and deleting organizations is SUPER_ADMIN only', async () => {
    await expect(
      ctrl.create({ name: 'x' } as any, { user: adminA }),
    ).rejects.toThrow(ForbiddenException);
    await expect(ctrl.remove(ORG_A, { user: adminA })).rejects.toThrow(
      ForbiddenException,
    );
    await expect(
      ctrl.create({ name: 'x' } as any, { user: superAdmin }),
    ).resolves.toBe('created');
    await expect(
      ctrl.update(ORG_B, { parentId: 'p' } as any, { user: superAdmin }),
    ).resolves.toBe('updated');
  });
});

describe('AuditService scoping', () => {
  function capture() {
    const wheres: Array<{ sql: string; params?: any }> = [];
    const qb: any = {
      where: (sql: string, params?: any) => (wheres.push({ sql, params }), qb),
      andWhere: (sql: string, params?: any) => (
        wheres.push({ sql, params }),
        qb
      ),
      orderBy: () => qb,
      addOrderBy: () => qb,
      skip: () => qb,
      take: () => qb,
      getManyAndCount: async () => [[], 0],
      getOne: async () => null,
    };
    const service = new AuditService(
      { createQueryBuilder: () => qb } as any,
      { find: async () => [] } as any,
    );
    return { service, wheres };
  }

  it('ADMIN sees entries by their members or about their mini apps', async () => {
    const { service, wheres } = capture();
    await service.findAll({ page: 1, limit: 20 } as any, adminA);
    const scope = wheres.find((w) => w.params?.scopeOrgId);
    expect(scope?.params.scopeOrgId).toBe(ORG_A);
    expect(scope?.sql).toContain('"staff_profiles"');
    expect(scope?.sql).toContain('"mini_apps"');
  });

  it('SUPER_ADMIN sees the whole trail', async () => {
    const { service, wheres } = capture();
    await service.findAll({ page: 1, limit: 20 } as any, superAdmin);
    expect(wheres.some((w) => w.params?.scopeOrgId)).toBe(false);
  });

  it('ADMIN without an organization sees nothing', async () => {
    const { service, wheres } = capture();
    await service.findAll({ page: 1, limit: 20 } as any, {
      ...adminA,
      organizationId: undefined,
    });
    expect(wheres.map((w) => w.sql)).toContain('1 = 0');
  });

  it('findOne applies the same scope (404 outside it)', async () => {
    const { service, wheres } = capture();
    expect(await service.findOne('log-1', adminA)).toBeNull();
    expect(wheres.some((w) => w.params?.scopeOrgId === ORG_A)).toBe(true);
  });
});

describe('Platform settings are SUPER_ADMIN only', () => {
  it('ADMIN cannot read artifact retention (platform storage)', async () => {
    const ctrl = new SettingsController({} as any, {} as any);
    await expect(ctrl.getArtifactRetention({ user: adminA })).rejects.toThrow(
      ForbiddenException,
    );
  });
});
