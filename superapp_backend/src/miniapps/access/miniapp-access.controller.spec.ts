import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MiniappsController } from '../miniapps.controller';
import { MiniAppAccessService } from './miniapp-access.service';

/**
 * The access matrix end to end through the controller: every role against an
 * app it owns, one shared with it, an unshared one of its organization and one
 * of another organization. The service is a stub; the access service is real,
 * over in-memory repositories.
 */

const ORG_A = 'org-a';
const ORG_B = 'org-b';

const APP_OWNED = 'a0000000-0000-4000-8000-000000000001'; // owned by dev-a, org A
const APP_SHARED_VIEW = 'a0000000-0000-4000-8000-000000000002'; // dev-a VIEWER, org A
const APP_SHARED_DEV = 'a0000000-0000-4000-8000-000000000003'; // dev-a DEVELOPER, org A
const APP_SHARED_MAINT = 'a0000000-0000-4000-8000-000000000004'; // dev-a MAINTAINER, org A
const APP_SAME_ORG = 'a0000000-0000-4000-8000-000000000005'; // org A, not shared
const APP_OTHER_ORG = 'a0000000-0000-4000-8000-000000000006'; // org B

const apps: Record<string, any> = {
  [APP_OWNED]: {
    id: APP_OWNED,
    ownerId: 'dev-a',
    organizationId: ORG_A,
    capabilities: [{ type: 'camera' }],
  },
  [APP_SHARED_VIEW]: {
    id: APP_SHARED_VIEW,
    ownerId: 'other',
    organizationId: ORG_A,
    capabilities: [],
  },
  [APP_SHARED_DEV]: {
    id: APP_SHARED_DEV,
    ownerId: 'other',
    organizationId: ORG_A,
    capabilities: [{ type: 'camera' }],
  },
  [APP_SHARED_MAINT]: {
    id: APP_SHARED_MAINT,
    ownerId: 'other',
    organizationId: ORG_A,
    capabilities: [],
  },
  [APP_SAME_ORG]: {
    id: APP_SAME_ORG,
    ownerId: 'other',
    organizationId: ORG_A,
    capabilities: [],
  },
  [APP_OTHER_ORG]: {
    id: APP_OTHER_ORG,
    ownerId: 'dev-b',
    organizationId: ORG_B,
    capabilities: [],
  },
};

const collaborators = [
  { miniAppId: APP_SHARED_VIEW, userId: 'dev-a', role: 'VIEWER' },
  { miniAppId: APP_SHARED_DEV, userId: 'dev-a', role: 'DEVELOPER' },
  { miniAppId: APP_SHARED_MAINT, userId: 'dev-a', role: 'MAINTAINER' },
  // A stale cross-org row must grant nothing
  { miniAppId: APP_OTHER_ORG, userId: 'dev-a', role: 'MAINTAINER' },
];

const USERS = {
  superAdmin: { sub: 'sa', roles: ['SUPER_ADMIN'], organizationId: ORG_B },
  adminA: { sub: 'admin-a', roles: ['ADMIN'], organizationId: ORG_A },
  devA: { sub: 'dev-a', roles: ['MA_DEVELOPER'], organizationId: ORG_A },
};

function build() {
  const miniappRepo = {
    findOne: jest.fn(async ({ where }: any) => apps[where.id] ?? null),
    count: jest.fn(async ({ where }: any) => (apps[where.id] ? 1 : 0)),
  };
  const collabRepo = {
    findOne: jest.fn(
      async ({ where }: any) =>
        collaborators.find(
          (c) => c.miniAppId === where.miniAppId && c.userId === where.userId,
        ) ?? null,
    ),
  };
  const access = new MiniAppAccessService(
    miniappRepo as any,
    collabRepo as any,
  );

  // Every service method resolves 'ok' (findOne returns the app); one mock per name
  const mocks: Record<string | symbol, jest.Mock> = {};
  const service: any = new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === 'then') return undefined;
        mocks[prop] ??=
          prop === 'findOne'
            ? jest.fn(async (id: string) => apps[id])
            : jest.fn(async () => 'ok');
        return mocks[prop];
      },
    },
  );
  const controller = new MiniappsController(service, {} as any, access);
  return { controller, service };
}

type Outcome = 'ok' | 404 | 403;

async function outcome(p: Promise<unknown>): Promise<Outcome> {
  try {
    await p;
    return 'ok';
  } catch (err) {
    if (err instanceof NotFoundException) return 404;
    if (err instanceof ForbiddenException) return 403;
    throw err;
  }
}

const ACTIONS: Record<
  string,
  (c: MiniappsController, id: string, req: any) => Promise<unknown>
> = {
  view: (c, id, req) => c.findOne(id, req),
  edit: (c, id, req) => c.update(id, { description: 'x' } as any, req),
  submit: (c, id, req) => c.submitForReview(id, req),
  addCollaborator: (c, id, req) =>
    c.addCollaborator(id, { userId: 'u2', role: 'VIEWER' } as any, req),
  delete: (c, id, req) => c.remove(id, undefined, req),
  approve: (c, id, req) => c.approve(id, req),
  // Ownership transfer needs OWN, like delete
  transfer: (c, id, req) =>
    c.transferOwnership(id, { newOwnerId: 'u2' } as any, req),
};

// Expected outcome per [user][app][action]. 404 hides apps the caller cannot see.
const NONE = {
  view: 404,
  edit: 404,
  submit: 404,
  addCollaborator: 404,
  delete: 404,
  approve: 404,
  transfer: 404,
} as const;
const ALL = {
  view: 'ok',
  edit: 'ok',
  submit: 'ok',
  addCollaborator: 'ok',
  delete: 'ok',
  approve: 'ok',
  transfer: 'ok',
} as const;

const MATRIX: Record<string, Record<string, Record<string, Outcome>>> = {
  superAdmin: {
    [APP_OWNED]: ALL,
    [APP_SAME_ORG]: ALL,
    [APP_OTHER_ORG]: ALL,
  },
  adminA: {
    [APP_OWNED]: ALL,
    [APP_SAME_ORG]: ALL,
    [APP_OTHER_ORG]: NONE,
  },
  devA: {
    [APP_OWNED]: {
      view: 'ok',
      edit: 'ok',
      submit: 'ok',
      addCollaborator: 'ok',
      delete: 'ok',
      transfer: 'ok',
      approve: 403,
    },
    [APP_SHARED_MAINT]: {
      view: 'ok',
      edit: 'ok',
      submit: 'ok',
      addCollaborator: 'ok',
      delete: 403,
      transfer: 403,
      approve: 403,
    },
    [APP_SHARED_DEV]: {
      view: 'ok',
      edit: 'ok',
      submit: 403,
      addCollaborator: 403,
      delete: 403,
      transfer: 403,
      approve: 403,
    },
    [APP_SHARED_VIEW]: {
      view: 'ok',
      edit: 403,
      submit: 403,
      addCollaborator: 403,
      delete: 403,
      transfer: 403,
      approve: 403,
    },
    [APP_SAME_ORG]: NONE,
    [APP_OTHER_ORG]: NONE,
  },
};

describe('Mini App access matrix (controller)', () => {
  const cases: Array<[string, string, string, Outcome]> = [];
  for (const [user, byApp] of Object.entries(MATRIX)) {
    for (const [appId, byAction] of Object.entries(byApp)) {
      for (const [action, expected] of Object.entries(byAction)) {
        cases.push([user, appId, action, expected]);
      }
    }
  }

  it.each(cases)(
    '%s on %s: %s -> %s',
    async (user, appId, action, expected) => {
      const { controller } = build();
      const req = { user: (USERS as any)[user] };
      expect(await outcome(ACTIONS[action](controller, appId, req))).toBe(
        expected,
      );
    },
  );
});

describe('Mini App access details', () => {
  const devReq = { user: USERS.devA };

  it('GET :id reports the caller access level', async () => {
    const { controller } = build();
    const res: any = await controller.findOne(APP_SHARED_DEV, devReq);
    expect(res.myAccess).toBe('EDIT');
  });

  it('a DEVELOPER collaborator may re-send the same permissions but not change them', async () => {
    const { controller } = build();
    await expect(
      controller.update(
        APP_SHARED_DEV,
        { permissions: [{ type: 'camera' }] } as any,
        devReq,
      ),
    ).resolves.toBeDefined();
    await expect(
      controller.update(
        APP_SHARED_DEV,
        { permissions: [{ type: 'camera' }, { type: 'location' }] } as any,
        devReq,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('a MAINTAINER may change permissions', async () => {
    const { controller } = build();
    await expect(
      controller.update(
        APP_SHARED_MAINT,
        { permissions: [{ type: 'location' }] } as any,
        devReq,
      ),
    ).resolves.toBeDefined();
  });

  it('locks organization and owner on update for everyone but SUPER_ADMIN', async () => {
    const { controller, service } = build();
    await controller.update(APP_OWNED, { description: 'x' } as any, devReq);
    expect(service.update.mock.calls[0][3]).toEqual({ lockOwnership: true });

    const sa = build();
    await sa.controller.update(APP_OWNED, { description: 'x' } as any, {
      user: USERS.superAdmin,
    });
    expect(sa.service.update.mock.calls[0][3]).toEqual({
      lockOwnership: false,
    });
  });

  it('a collaborator may leave an app; removing someone else needs MAINTAIN', async () => {
    const { controller } = build();
    await expect(
      controller.removeCollaborator(APP_SHARED_VIEW, 'dev-a', devReq),
    ).resolves.toEqual({ success: true });
    await expect(
      controller.removeCollaborator(APP_SHARED_VIEW, 'someone-else', devReq),
    ).rejects.toThrow(ForbiddenException);
  });

  it('invite links and rollback need MAINTAIN', async () => {
    const { controller } = build();
    await expect(
      controller.createInviteToken(APP_SHARED_DEV, '7d', devReq),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      controller.rollback(APP_SHARED_DEV, '1.0.0', 'r', devReq),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      controller.createInviteToken(APP_SHARED_MAINT, '7d', devReq),
    ).resolves.toBe('ok');
  });

  it('artifact download: VIEW lets the caller through, otherwise only an invite token', async () => {
    const { controller, service } = build();
    await controller.downloadTestApk(
      APP_SHARED_VIEW,
      '1.0.0',
      undefined as any,
      devReq,
      {},
    );
    expect(service.streamArtifact.mock.calls[0][3]).toBe(true);

    await controller.downloadTestApk(APP_OTHER_ORG, '1.0.0', 'tok', devReq, {});
    expect(service.streamArtifact.mock.calls[1][3]).toBe(false);
    expect(service.streamArtifact.mock.calls[1][4]).toBe('tok');
  });

  it('list endpoints pass the caller to the service for scoping', async () => {
    const { controller, service } = build();
    await controller.getAllIssues({} as any, devReq);
    expect(service.findAllIssues).toHaveBeenCalledWith({}, USERS.devA);
  });
});

describe('package archive upload', () => {
  const file = { originalname: 'p.zip' } as any;

  it('lets a developer upload while registering an app that does not exist yet', async () => {
    const { controller } = build();
    expect(
      await outcome(
        controller.uploadArtifact(
          file,
          { user: USERS.devA },
          'fsa_hr_miniapp',
          '1.0.0',
        ),
      ),
    ).toBe('ok');
  });

  it('still needs EDIT to upload into an existing app', async () => {
    const { controller } = build();
    const req = { user: USERS.devA };
    expect(
      await outcome(controller.uploadArtifact(file, req, APP_SHARED_DEV)),
    ).toBe('ok');
    expect(
      await outcome(controller.uploadArtifact(file, req, APP_SHARED_VIEW)),
    ).toBe(403);
    expect(
      await outcome(controller.uploadArtifact(file, req, APP_OTHER_ORG)),
    ).toBe(404);
  });
});
