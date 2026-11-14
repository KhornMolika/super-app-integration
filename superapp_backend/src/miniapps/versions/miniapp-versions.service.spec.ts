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
    await svc.syncFromApp(app);
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
    await svc.syncFromApp(app);
    const draft = versions.find((v) => v.status === 'DRAFT');
    expect(draft.revision).toEqual(app.pendingRevision);
    expect(draft.reviewStatus).toBe('IN_REVIEW');
    expect(draft.submittedAt).toEqual(new Date('2026-10-01T08:30:00.000Z'));

    // Changes requested: the same row follows, an unreadable date becomes null
    app.pendingRevision = { ...app.pendingRevision, revisionStatus: 'DRAFT', submittedAt: 'soon' };
    await svc.syncFromApp(app);
    expect(versions.filter((v) => v.status === 'DRAFT')).toHaveLength(1);
    expect(draft).toMatchObject({ reviewStatus: 'DRAFT', submittedAt: null });
  });

  it('publishing makes the DRAFT row live (approved) and the old live row PREVIOUS', async () => {
    const { svc, versions, capsOf } = setup();
    const app = liveApp();
    await svc.syncFromApp(app);
    app.pendingRevision = { capabilities: ['camera', 'nfc'] };
    await svc.syncFromApp(app);
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
    expect(versions.filter((v) => v.status === 'ACTIVE')).toHaveLength(1);
    expect(versions).toHaveLength(2);
  });

  it('discarding the revision deletes its DRAFT row', async () => {
    const { svc, versions, caps } = setup();
    const app = liveApp();
    await svc.syncFromApp(app);
    app.pendingRevision = { capabilities: ['nfc'] };
    await svc.syncFromApp(app);
    app.pendingRevision = null;
    await svc.syncFromApp(app);
    expect(versions.map((v) => v.status)).toEqual(['ACTIVE']);
    expect(caps.every((c) => c.versionId === versions[0].id)).toBe(true);
  });

  it('rollback finds a released version with its capabilities and makes it live', async () => {
    const { svc, versions } = setup();
    const app = liveApp();
    await svc.syncFromApp(app);
    app.pendingRevision = { capabilities: ['nfc'] };
    await svc.syncFromApp(app);
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
