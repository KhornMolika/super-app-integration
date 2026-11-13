import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MiniappsService } from '../miniapps.service';
import { MiniApp } from '../entities/miniapp.entity';
import { MiniAppCollaborator } from '../entities/miniapp-collaborator.entity';
import { Identity } from '../../identities/entities/identity.entity';
import { StaffProfile } from '../../staff/entities/staff-profile.entity';

/**
 * MiniappsService.transferOwnership over an in-memory entity manager. Who may
 * call it (owner, org admin, Super Admin) is covered by the controller matrix.
 */

const APP = 'a0000000-0000-4000-8000-000000000001';

function identity(id: string, org: string, role: string, status = 'ACTIVE') {
  return {
    id,
    name: id,
    email: `${id}@x.kh`,
    status,
    staffProfile: { identityId: id, organizationId: org, role: { name: role } },
  };
}

function setup(over: { identities?: any[]; collaborators?: any[] } = {}) {
  const app = {
    id: APP,
    appId: 'shop',
    name: 'Shop',
    ownerId: 'old',
    organizationId: 'org-a',
  };
  const identities: any[] = over.identities ?? [
    identity('old', 'org-a', 'MA_DEVELOPER'),
    identity('new', 'org-a', 'MA_DEVELOPER'),
    identity('admin-a', 'org-a', 'ADMIN'),
    identity('outsider', 'org-b', 'MA_DEVELOPER'),
    identity('staff', 'org-a', 'STAFF'),
    identity('pending', 'org-a', 'MA_DEVELOPER', 'PENDING_APPROVAL'),
  ];
  let collaborators: any[] = over.collaborators ?? [
    { miniAppId: APP, userId: 'new', role: 'DEVELOPER' },
  ];

  const find = (entity: any, where: any) => {
    if (entity === MiniApp) return where.id === APP ? app : null;
    if (entity === Identity)
      return identities.find((i) => i.id === where.id) ?? null;
    if (entity === StaffProfile) {
      return (
        identities.find((i) => i.id === where.identityId)?.staffProfile ?? null
      );
    }
    if (entity === MiniAppCollaborator) {
      return (
        collaborators.find(
          (c) => c.miniAppId === where.miniAppId && c.userId === where.userId,
        ) ?? null
      );
    }
    return null;
  };

  const tx = {
    findOne: jest.fn(async (entity: any, { where }: any) =>
      find(entity, where),
    ),
    update: jest.fn(async (_e: any, _w: any, patch: any) =>
      Object.assign(app, patch),
    ),
    delete: jest.fn(async (_e: any, where: any) => {
      collaborators = collaborators.filter(
        (c) => !(c.miniAppId === where.miniAppId && c.userId === where.userId),
      );
    }),
    save: jest.fn(async (_e: any, row: any) => {
      collaborators = collaborators.filter(
        (c) => !(c.miniAppId === row.miniAppId && c.userId === row.userId),
      );
      collaborators.push(row);
      return row;
    }),
  };
  const manager = { ...tx, transaction: jest.fn(async (fn: any) => fn(tx)) };

  const notifications = { createNotification: jest.fn(async () => undefined) };
  const audit = { log: jest.fn(async () => undefined) };
  const none = {} as any;
  const service = new MiniappsService(
    { findOne: jest.fn(async () => app) } as any, // miniappRepository
    { manager } as any, // collaboratorRepository
    none, // issueRepository
    audit as any,
    none, // permissionDetectorHelper
    none, // validationHelper
    none, // lifecycleHelper
    none, // artifactDistributionHelper
    none, // domainAssociationHelper
    none, // miniappMutationHelper
    none, // nativeSdkCodegenService
    none, // sdkArtifactUploadService
    none, // capabilitiesService
    undefined, // versionRepository
    undefined, // buildRepository
    undefined, // legalRepository
    undefined, // organizationsService
    undefined, // retirementHelper
    undefined, // artifactPublisher
    notifications as any,
  );
  jest.spyOn(service, 'findOne').mockResolvedValue(app as any);
  return { service, app, notifications, collaborators: () => collaborators };
}

const actor = { id: 'admin-a', name: 'Org Admin' };

describe('MiniappsService.transferOwnership', () => {
  it('moves ownership, keeps the previous owner as MAINTAINER, drops the new owner row', async () => {
    const { service, app, collaborators } = setup();
    await service.transferOwnership(APP, 'new', actor);
    expect(app.ownerId).toBe('new');
    expect(collaborators()).toEqual([
      expect.objectContaining({
        miniAppId: APP,
        userId: 'old',
        role: 'MAINTAINER',
      }),
    ]);
  });

  it('can drop the previous owner entirely', async () => {
    const { service, app, collaborators } = setup();
    await service.transferOwnership(APP, 'new', actor, false);
    expect(app.ownerId).toBe('new');
    expect(collaborators()).toEqual([]);
  });

  it('accepts an organization admin as the new owner', async () => {
    const { service, app } = setup();
    await service.transferOwnership(APP, 'admin-a', actor);
    expect(app.ownerId).toBe('admin-a');
  });

  it('never keeps a previous owner who has left the organization', async () => {
    const { service, collaborators } = setup({
      identities: [
        identity('old', 'org-b', 'MA_DEVELOPER'),
        identity('new', 'org-a', 'MA_DEVELOPER'),
      ],
      collaborators: [],
    });
    await service.transferOwnership(APP, 'new', actor);
    expect(collaborators()).toEqual([]);
  });

  it.each([
    ['someone of another organization', 'outsider', /organization/],
    ['a STAFF account', 'staff', /developer or an organization admin/],
    ['an account that is not active', 'pending', /not active/],
    ['an unknown user', 'ghost', /organization/],
    ['the current owner', 'old', /already owns/],
  ])('refuses %s', async (_label, newOwnerId, message) => {
    const { service, app } = setup();
    await expect(
      service.transferOwnership(APP, newOwnerId, actor),
    ).rejects.toThrow(message);
    await expect(
      service.transferOwnership(APP, newOwnerId, actor),
    ).rejects.toThrow(BadRequestException);
    expect(app.ownerId).toBe('old');
  });

  it('404 for an unknown app', async () => {
    const { service } = setup();
    await expect(
      service.transferOwnership(
        'b0000000-0000-4000-8000-000000000009',
        'new',
        actor,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('notifies the new and the previous owner', async () => {
    const { service, notifications } = setup();
    await service.transferOwnership(APP, 'new', actor);
    expect(
      notifications.createNotification.mock.calls.map((c: any[]) => c[0]),
    ).toEqual(['new', 'old']);
  });
});
