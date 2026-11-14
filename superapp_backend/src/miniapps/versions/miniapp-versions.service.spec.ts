import { MiniAppVersionsService } from './miniapp-versions.service';
import { parseDeclaredCapabilities, revisionVersionOf } from './version-capabilities';

/** In-memory stand-in for a TypeORM repository (where: plain equality, In, Not). */
function memoryRepo() {
  const rows: any[] = [];
  let seq = 0;
  const test = (row: any, where: Record<string, any>) =>
    Object.entries(where).every(([k, v]) => {
      if (v && typeof v === 'object' && v._type === 'in') return v._value.includes(row[k]);
      if (v && typeof v === 'object' && v._type === 'not') return row[k] !== v._value;
      return row[k] === v;
    });
  const sort = (list: any[], order?: Record<string, string>) => {
    const [[k, dir]] = Object.entries(order || { createdAt: 'ASC' });
    return [...list].sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (dir === 'DESC' ? -1 : 1));
  };
  return {
    rows,
    create: (x: any) => ({ ...x }),
    save: jest.fn(async (x: any) => {
      if (!x.id) {
        x.id = `r${++seq}`;
        x.createdAt = seq;
        rows.push(x);
      }
      return x;
    }),
    find: jest.fn(async ({ where, order }: any = {}) => sort(rows.filter((r) => test(r, where || {})), order)),
    findOne: jest.fn(async ({ where, order }: any) => sort(rows.filter((r) => test(r, where)), order)[0] ?? null),
    update: jest.fn(async (where: any, patch: any) => {
      rows.filter((r) => test(r, where)).forEach((r) => Object.assign(r, patch));
    }),
    delete: jest.fn(async (where: any) => {
      for (let i = rows.length - 1; i >= 0; i--) if (test(rows[i], where)) rows.splice(i, 1);
    }),
  };
}

const setup = () => {
  const versions = memoryRepo();
  const caps = memoryRepo();
  const svc = new MiniAppVersionsService(versions as any, caps as any);
  const capsOf = (versionId: string) =>
    caps.rows.filter((c) => c.versionId === versionId).sort((a, b) => a.position - b.position);
  return { svc, versions: versions.rows, caps: caps.rows, capsOf };
};

const REVIEWER = '11111111-1111-4111-8111-111111111111';

describe('MiniAppVersionsService: an app before its first release', () => {
  it('keeps one working row that follows the lifecycle, with the app capabilities', async () => {
    const { svc, versions, capsOf } = setup();
    const app: any = { id: 'a', lifecycleStatus: 'DRAFT', currentReleaseVersion: '1.0.0', capabilities: ['camera'], pendingRevision: null };
    await svc.syncFromApp(app);
    expect(versions).toHaveLength(1);
    expect(versions[0]).toMatchObject({ version: '1.0.0', status: 'DRAFT' });
    expect(capsOf(versions[0].id)).toMatchObject([{ capabilityKey: 'camera', status: 'REQUESTED' }]);

    app.lifecycleStatus = 'APPROVED';
    await svc.approveWorking(app, REVIEWER);
    expect(versions).toHaveLength(1);
    expect(versions[0].status).toBe('TESTING');
    expect(capsOf(versions[0].id)[0]).toMatchObject({ status: 'APPROVED', approvedById: REVIEWER });

    app.lifecycleStatus = 'ACTIVE';
    await svc.syncFromApp(app);
    expect(versions[0].status).toBe('ACTIVE');
    expect(versions[0].releasedAt).toBeInstanceOf(Date);
  });

  it('a changed capability goes back to REQUESTED; an unchanged one keeps its approval', async () => {
    const { svc, versions, capsOf } = setup();
    const app: any = {
      id: 'a',
      lifecycleStatus: 'TESTING',
      capabilities: [{ type: 'camera', purpose: 'scan' }, 'location'],
      pendingRevision: null,
    };
    await svc.syncFromApp(app);
    await svc.approveVersion(versions[0].id, REVIEWER);
    app.capabilities = [{ type: 'camera', purpose: 'scan IDs' }, 'location', 'nfc'];
    await svc.syncFromApp(app);
    const [camera, location, nfc] = capsOf(versions[0].id);
    expect(camera).toMatchObject({ status: 'REQUESTED', approvedById: null, purpose: 'scan IDs' });
    expect(location).toMatchObject({ status: 'APPROVED', approvedById: REVIEWER });
    expect(nfc).toMatchObject({ capabilityKey: 'nfc', status: 'REQUESTED' });

    app.capabilities = ['location'];
    await svc.syncFromApp(app);
    expect(capsOf(versions[0].id).map((c) => c.capabilityKey)).toEqual(['location']);
  });

  it('a partial read (capabilities or lifecycle missing) changes nothing', async () => {
    const { svc, versions, capsOf } = setup();
    await svc.syncFromApp({ id: 'a', lifecycleStatus: 'TESTING', capabilities: ['camera'], pendingRevision: null });
    await svc.syncFromApp({ id: 'a', currentReleaseVersion: '1.0.0' });
    expect(versions[0].status).toBe('TESTING');
    expect(capsOf(versions[0].id)).toHaveLength(1);
  });
});

describe('MiniAppVersionsService: a live app with a revision', () => {
  const liveApp = (): any => ({
    id: 'a',
    lifecycleStatus: 'ACTIVE',
    currentReleaseVersion: '1.2.0',
    capabilities: ['camera'],
    pendingRevision: null,
  });

  it('the revision is a DRAFT row with its own capabilities; the live row keeps its own', async () => {
    const { svc, versions, capsOf } = setup();
    const app = liveApp();
    await svc.syncFromApp(app);
    const live = versions[0];
    expect(live.status).toBe('ACTIVE');

    app.pendingRevision = { capabilities: ['camera', 'nfc'], changelog: 'Adds NFC' };
    await svc.persistRevision(app);
    const draft = versions.find((v) => v.status === 'DRAFT');
    expect(draft).toMatchObject({ version: revisionVersionOf(app), changelog: 'Adds NFC' });
    expect(capsOf(draft.id).map((c) => c.capabilityKey)).toEqual(['camera', 'nfc']);
    expect(capsOf(live.id).map((c) => c.capabilityKey)).toEqual(['camera']);
  });

  it('the DRAFT row holds the whole revision and its review state', async () => {
    const { svc, versions } = setup();
    const app = liveApp();
    await svc.syncFromApp(app);
    app.pendingRevision = {
      name: 'HR v2',
      integrationConfig: { url: 'https://hr.example/v2' },
      revisionStatus: 'IN_REVIEW',
      submittedAt: '2026-10-01T08:30:00.000Z',
    };
    await svc.persistRevision(app);
    const draft = versions.find((v) => v.status === 'DRAFT');
    expect(draft.revision).toEqual(app.pendingRevision);
    expect(draft.reviewStatus).toBe('IN_REVIEW');
    expect(draft.submittedAt).toEqual(new Date('2026-10-01T08:30:00.000Z'));

    // Changes requested: the same row follows, an unreadable date becomes null
    app.pendingRevision = { ...app.pendingRevision, revisionStatus: 'DRAFT', submittedAt: 'soon' };
    await svc.persistRevision(app);
    expect(versions.filter((v) => v.status === 'DRAFT')).toHaveLength(1);
    expect(draft).toMatchObject({ reviewStatus: 'DRAFT', submittedAt: null });
  });

  it('publishing makes the DRAFT row live (approved) and the old live row PREVIOUS', async () => {
    const { svc, versions, capsOf } = setup();
    const app = liveApp();
    await svc.syncFromApp(app);
    app.pendingRevision = { capabilities: ['camera', 'nfc'] };
    await svc.persistRevision(app);
    const oldLive = versions.find((v) => v.status === 'ACTIVE');

    // publishRevision copies the revision onto the app before publishDraft
    app.capabilities = ['camera', 'nfc'];
    await svc.publishDraft(app, '1.3.0', REVIEWER, 'Adds NFC');
    expect(capsOf(oldLive.id).map((c) => c.capabilityKey)).toEqual(['camera']);
    expect(oldLive.status).toBe('PREVIOUS');
    const newLive = versions.find((v) => v.status === 'ACTIVE');
    expect(newLive).toMatchObject({ version: '1.3.0', releasedBy: REVIEWER, changelog: 'Adds NFC' });
    expect(capsOf(newLive.id).every((c) => c.status === 'APPROVED' && c.approvedById === REVIEWER)).toBe(true);

    app.pendingRevision = null;
    app.currentReleaseVersion = '1.3.0';
    await svc.syncFromApp(app);
    await svc.persistRevision(app);
    expect(versions.filter((v) => v.status === 'ACTIVE')).toHaveLength(1);
    expect(versions).toHaveLength(2);
  });

  it('an unchanged revision is not written again', async () => {
    const { svc, versions } = setup();
    const app = liveApp();
    await svc.syncFromApp(app);
    app.pendingRevision = { name: 'v2', revisionStatus: 'IN_REVIEW' };
    await svc.persistRevision(app);
    const draft = versions.find((v) => v.status === 'DRAFT');
    const updatedAt = draft.revision;
    app.pendingRevision = { name: 'v2', revisionStatus: 'IN_REVIEW' };
    await svc.persistRevision(app);
    expect(draft.revision).toBe(updatedAt);
    // undefined = not loaded: nothing changes
    app.pendingRevision = undefined;
    await svc.persistRevision(app);
    expect(versions.filter((v) => v.status === 'DRAFT')).toHaveLength(1);
  });

  it('discarding the revision deletes its DRAFT row', async () => {
    const { svc, versions, caps } = setup();
    const app = liveApp();
    await svc.syncFromApp(app);
    app.pendingRevision = { capabilities: ['nfc'] };
    await svc.persistRevision(app);
    app.pendingRevision = null;
    await svc.persistRevision(app);
    expect(versions.map((v) => v.status)).toEqual(['ACTIVE']);
    expect(caps.every((c) => c.versionId === versions[0].id)).toBe(true);
  });

  it('rollback finds a released version with its capabilities and makes it live', async () => {
    const { svc, versions } = setup();
    const app = liveApp();
    await svc.syncFromApp(app);
    app.pendingRevision = { capabilities: ['nfc'] };
    await svc.persistRevision(app);
    app.capabilities = ['nfc'];
    await svc.publishDraft(app, '1.3.0', REVIEWER);

    const found = await svc.findReleased('a', '1.2.0');
    expect(found?.capabilities).toEqual(['camera']);
    await svc.rollbackTo('a', found!.row.id);
    expect(versions.find((v) => v.version === '1.2.0').status).toBe('ACTIVE');
    expect(versions.find((v) => v.version === '1.3.0').status).toBe('PREVIOUS');
    expect(await svc.findReleased('a', '9.9.9')).toBeNull();
  });
});

describe('MiniAppVersionsService: revisions of an unreleased app and loading', () => {
  const APP = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

  it('an unreleased app keeps its revision on the working row; null clears it', async () => {
    const { svc, versions } = setup();
    const app: any = { id: APP, lifecycleStatus: 'DRAFT', capabilities: ['camera'] };
    app.pendingRevision = { name: 'Renamed', revisionStatus: 'IN_REVIEW' };
    await svc.persistRevision(app);
    expect(versions).toHaveLength(1);
    expect(versions[0]).toMatchObject({ status: 'DRAFT', reviewStatus: 'IN_REVIEW' });
    expect(versions[0].revision).toEqual({ name: 'Renamed', revisionStatus: 'IN_REVIEW' });

    app.pendingRevision = null;
    await svc.persistRevision(app);
    expect(versions).toHaveLength(1);
    expect(versions[0]).toMatchObject({ revision: null, reviewStatus: null });
  });

  it('attachRevisions fills apps loaded without their versions, in one query', async () => {
    const { svc } = setup();
    const live: any = { id: APP, lifecycleStatus: 'ACTIVE', currentReleaseVersion: '1.0.0', capabilities: [] };
    await svc.syncFromApp(live);
    live.pendingRevision = { name: 'Next' };
    await svc.persistRevision(live);

    const other = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    const listed: any[] = [{ id: APP }, { id: other }, { id: APP, pendingRevision: { kept: true } }];
    await svc.attachRevisions(listed);
    expect(listed[0].pendingRevision).toEqual({ name: 'Next' });
    expect(listed[1].pendingRevision).toBeNull();
    expect(listed[2].pendingRevision).toEqual({ kept: true });
  });

  it('a loaded MiniApp gets its revision from the eager versions', () => {
    const { MiniApp } = require('../entities/miniapp.entity');
    const load = (versions: any[]) => {
      const app = Object.assign(new MiniApp(), { versions });
      app.loadPendingRevision();
      return app.pendingRevision;
    };
    const at = (d: number) => new Date(2026, 0, d);
    expect(load([
      { status: 'ACTIVE', createdAt: at(1), revision: { stale: true } },
      { status: 'DRAFT', createdAt: at(2), revision: { name: 'Next' } },
    ])).toEqual({ name: 'Next' });
    // Live app: a TESTING row is never its revision
    expect(load([{ status: 'ACTIVE', createdAt: at(1) }, { status: 'TESTING', createdAt: at(2), revision: { x: 1 } }])).toBeNull();
    // Unreleased: the working row
    expect(load([{ status: 'TESTING', createdAt: at(2), revision: { y: 1 } }])).toEqual({ y: 1 });
    // Versions not loaded: left undefined (not "no revision")
    const bare = new MiniApp();
    bare.loadPendingRevision();
    expect(bare.pendingRevision).toBeUndefined();
  });
});

describe('Capabilities loaded from the version rows (no JSON columns)', () => {
  const { MiniApp } = require('../entities/miniapp.entity');
  const { MiniAppVersion } = require('../entities/miniapp-version.entity');
  const cap = (key: string, position: number, declaration: any = key) => ({ capabilityKey: key, position, declaration });
  const version = (status: string, day: number, caps: any[]) => {
    const v = Object.assign(new MiniAppVersion(), { status, createdAt: new Date(2026, 0, day), capabilities: caps });
    v.loadPermissions();
    return v;
  };

  it('a version lists its capability rows in order as permissions', () => {
    const v = version('PREVIOUS', 1, [cap('nfc', 1), cap('camera', 0, { type: 'camera', required: true })]);
    expect(v.permissions).toEqual([{ type: 'camera', required: true }, 'nfc']);
    expect(JSON.parse(JSON.stringify(v))).not.toHaveProperty('capabilities');
  });

  it('an app asks for what its serving version asks for: ACTIVE, else TESTING, else DRAFT', () => {
    const load = (versions: any[]) => {
      const app = Object.assign(new MiniApp(), { versions });
      app.loadPendingRevision();
      return app.capabilities;
    };
    expect(load([version('ACTIVE', 1, [cap('camera', 0)]), version('DRAFT', 2, [cap('nfc', 0)])])).toEqual(['camera']);
    expect(load([version('TESTING', 1, [cap('location', 0)]), version('DRAFT', 2, [cap('nfc', 0)])])).toEqual(['location']);
    expect(load([version('DRAFT', 1, [cap('nfc', 0)])])).toEqual(['nfc']);
    expect(load([])).toEqual([]);
    // Versions not loaded: left undefined so nothing is written over
    const bare = new MiniApp();
    bare.loadPendingRevision();
    expect(bare.capabilities).toBeUndefined();
  });

  it('persistAppVersions writes the capabilities and the revision through the repository manager', async () => {
    const { persistAppVersions } = require('./miniapp-versions.service');
    const versions = memoryRepo();
    const caps = memoryRepo();
    const repoFor: any = (entity: any) => (entity.name === 'MiniAppVersion' ? versions : caps);
    const appRepo: any = { manager: { getRepository: repoFor } };
    const app: any = { id: 'x', lifecycleStatus: 'ACTIVE', currentReleaseVersion: '1.0.0', capabilities: ['camera'], pendingRevision: { capabilities: ['camera', 'nfc'] } };
    await persistAppVersions(appRepo, app);
    const live = versions.rows.find((v: any) => v.status === 'ACTIVE');
    const draft = versions.rows.find((v: any) => v.status === 'DRAFT');
    expect(caps.rows.filter((c: any) => c.versionId === live.id).map((c: any) => c.capabilityKey)).toEqual(['camera']);
    expect(caps.rows.filter((c: any) => c.versionId === draft.id).map((c: any) => c.capabilityKey)).toEqual(['camera', 'nfc']);
    // A stand-in repository without a manager is skipped
    await expect(persistAppVersions({} as any, app)).resolves.toBeUndefined();
  });
});

describe('MiniAppVersionsService: integration on the version (step 4)', () => {
  const APP = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  const withApps = () => {
    const ctx = setup();
    const apps: any[] = [];
    const appRepo: any = { update: jest.fn(async (where: any, patch: any) => apps.push({ where, patch })) };
    const svc = new MiniAppVersionsService((ctx.svc as any).versions, (ctx.svc as any).caps, appRepo);
    return { ...ctx, svc, appUpdates: apps };
  };

  it('the live row holds the app integration and the app points to it', async () => {
    const { svc, versions, appUpdates } = withApps();
    const app: any = {
      id: APP,
      lifecycleStatus: 'ACTIVE',
      currentReleaseVersion: '1.0.0',
      integrationMethod: 'WEBVIEW',
      integrationConfig: { url: 'https://v1' },
      homeWidget: null,
    };
    await svc.syncFromApp(app);
    const live = versions.find((v) => v.status === 'ACTIVE');
    expect(live).toMatchObject({ integrationMethod: 'WEBVIEW', integrationConfig: { url: 'https://v1' } });
    expect(appUpdates).toEqual([{ where: { id: APP }, patch: { liveVersionId: live.id } }]);

    // Already pointing there: no second write
    await svc.syncFromApp(app);
    expect(appUpdates).toHaveLength(1);
  });

  it('the revision DRAFT row holds the revision integration; phones still get the live one', async () => {
    const { svc, versions } = withApps();
    const app: any = { id: APP, lifecycleStatus: 'ACTIVE', currentReleaseVersion: '1.0.0', integrationMethod: 'WEBVIEW', integrationConfig: { url: 'https://v1' } };
    await svc.syncFromApp(app);
    app.pendingRevision = { integrationConfig: { url: 'https://v2' }, revisionStatus: 'IN_REVIEW' };
    await svc.persistRevision(app);
    expect(versions.find((v) => v.status === 'DRAFT').integrationConfig).toEqual({ url: 'https://v2' });

    const served = await svc.servingVersions([APP]);
    expect(served.get(APP)?.integration?.integrationConfig).toEqual({ url: 'https://v1' });
  });

  it('a partial read (no integration fields) leaves the row as it is', async () => {
    const { svc, versions } = withApps();
    await svc.syncFromApp({ id: APP, lifecycleStatus: 'DRAFT', integrationConfig: { url: 'https://draft' } } as any);
    await svc.syncFromApp({ id: APP, lifecycleStatus: 'DRAFT' } as any);
    expect(versions[0].integrationConfig).toEqual({ url: 'https://draft' });
  });
});

describe('MiniAppVersionsService.servingCapabilities', () => {
  const LIVE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const NEW = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const NONE = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  it('serves the live row, never the pending revision; an unreleased app its working row', async () => {
    const { svc } = setup();
    await svc.syncFromApp({
      id: LIVE,
      lifecycleStatus: 'ACTIVE',
      currentReleaseVersion: '1.0.0',
      capabilities: [{ type: 'camera', required: true }],
      pendingRevision: { capabilities: ['camera', 'location'] },
    });
    await svc.syncFromApp({ id: NEW, lifecycleStatus: 'TESTING', capabilities: ['nfc'], pendingRevision: null });

    const served = await svc.servingCapabilities([LIVE, NEW, NONE, 'not-a-uuid']);
    expect(served.get(LIVE)).toEqual([{ type: 'camera', required: true }]);
    expect(served.get(NEW)).toEqual(['nfc']);
    // No version row: left out, so the caller falls back to mini_apps.capabilities
    expect(served.has(NONE)).toBe(false);
    expect(served.size).toBe(2);
  });

  it('an app whose version declares nothing is served an empty list', async () => {
    const { svc } = setup();
    await svc.syncFromApp({ id: NEW, lifecycleStatus: 'DRAFT', capabilities: [], pendingRevision: null });
    expect((await svc.servingCapabilities([NEW])).get(NEW)).toEqual([]);
  });
});

describe('parseDeclaredCapabilities', () => {
  it('reads entries like the capability gate', () => {
    expect(
      parseDeclaredCapabilities([
        'Camera',
        { type: 'Location', required: true, purpose: 'map' },
        'camera',
        ' ',
        { name: 'nfc', purpose: '  ' },
      ]).map((p) => [p.key, p.required, p.purpose, p.position]),
    ).toEqual([
      ['camera', false, null, 0],
      ['location', true, 'map', 1],
      ['nfc', false, null, 2],
    ]);
    expect(parseDeclaredCapabilities(null)).toEqual([]);
  });
});
