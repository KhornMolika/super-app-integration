import { MiniAppRunsService, applyRunState } from './miniapp-runs.service';

/** In-memory stand-in for a TypeORM repository: rows ordered by creation. */
function memoryRepo() {
  const rows: any[] = [];
  let seq = 0;
  const matches = (row: any, where: Record<string, any>) =>
    Object.entries(where).every(([k, v]) => row[k] === v);
  return {
    rows,
    create: (x: any) => ({ ...x }),
    save: jest.fn(async (x: any) => {
      if (!x.id) {
        x.id = `r${++seq}`;
        x.createdAt = new Date(2026, 0, 1, 0, 0, seq);
        rows.push(x);
      }
      return x;
    }),
    findOne: jest.fn(async ({ where }: any) => {
      const hits = rows.filter((r) => matches(r, where));
      return hits[hits.length - 1] ?? null;
    }),
    findAndCount: jest.fn(async () => [rows, rows.length]),
    update: jest.fn(async ({ id }: any, patch: any) => {
      Object.assign(rows.find((r) => r.id === id) ?? {}, patch);
    }),
  };
}

const setup = () => {
  const scans = memoryRepo();
  const builds = memoryRepo();
  const svc = new MiniAppRunsService(scans as any, builds as any);
  return { svc, scans: scans.rows, builds: builds.rows, scanRepo: scans };
};

const ACTOR = '22222222-2222-4222-8222-222222222222';

describe('MiniAppRunsService: scan runs', () => {
  it('RUNNING starts a run; progress and the result update that same run', async () => {
    const { svc, scans } = setup();
    await svc.recordScan(
      'a',
      'APP',
      { status: 'RUNNING', stages: { sast: 'RUNNING' } },
      ACTOR,
    );
    await svc.recordScan('a', 'APP', {
      status: 'RUNNING',
      stages: { sast: 'PASSED' },
    });
    await svc.recordScan('a', 'APP', { status: 'FAILED', errors: ['secret'] });
    expect(scans).toHaveLength(1);
    expect(scans[0]).toMatchObject({
      status: 'FAILED',
      stages: { sast: 'PASSED' },
      errors: ['secret'],
      actorId: ACTOR,
    });
    expect(scans[0].completedAt).toBeInstanceOf(Date);
  });

  it('keeps history: the next RUNNING is a new run', async () => {
    const { svc, scans } = setup();
    await svc.recordScan('a', 'APP', { status: 'RUNNING' });
    await svc.recordScan('a', 'APP', { status: 'PASSED' });
    await svc.recordScan('a', 'APP', { status: 'RUNNING' });
    expect(scans.map((s) => s.status)).toEqual(['PASSED', 'RUNNING']);
  });

  it('a reset to PENDING cancels a run in progress and never adds a row', async () => {
    const { svc, scans } = setup();
    await svc.recordScan('a', 'APP', { status: 'PENDING' });
    expect(scans).toHaveLength(0);
    await svc.recordScan('a', 'APP', { status: 'RUNNING' });
    await svc.recordScan('a', 'APP', { status: 'PENDING' });
    expect(scans).toHaveLength(1);
    expect(scans[0].status).toBe('CANCELLED');
  });

  it('drops an actor that is not a user id (e.g. "system")', async () => {
    const { svc, scans } = setup();
    await svc.recordScan('a', 'APP', { status: 'RUNNING' }, 'system');
    expect(scans[0].actorId).toBeNull();
  });

  it('syncScan records into the pending revision, never the live app', async () => {
    const { svc, scans } = setup();
    const app: any = {
      id: 'a',
      version: '1.0.0',
      securityChecks: ['sast'],
      pendingRevision: { version: '1.1.0' },
      validationStatus: 'FAILED',
      validationErrors: ['xss'],
    };
    await svc.syncScan(app);
    expect(scans[0]).toMatchObject({
      scope: 'REVISION',
      version: '1.1.0',
      status: 'FAILED',
      checks: ['sast'],
    });

    app.pendingRevision = null;
    app.validationStatus = 'RUNNING';
    await svc.syncScan(app);
    expect(scans[1]).toMatchObject({ scope: 'APP', version: '1.0.0' });
  });

  it('a published revision scan becomes the app scan', async () => {
    const { svc, scans } = setup();
    await svc.recordScan('a', 'REVISION', { status: 'PASSED' });
    await svc.promoteRevisionScan('a');
    expect(scans[0].scope).toBe('APP');
  });
});

describe('MiniAppRunsService: build runs', () => {
  it('QUEUED then BUILDING is one run; IDLE is never a run', async () => {
    const { svc, builds } = setup();
    await svc.recordBuild('a', { status: 'IDLE' });
    await svc.recordBuild('a', { status: 'QUEUED', buildType: 'debug' });
    await svc.recordBuild('a', {
      status: 'BUILDING',
      stages: { compile: 'RUNNING' },
    });
    await svc.recordBuild('a', { status: 'FAILED', error: 'gradle' });
    expect(builds).toHaveLength(1);
    expect(builds[0]).toMatchObject({
      buildStatus: 'FAILED',
      buildType: 'debug',
      buildError: 'gradle',
      buildStages: { compile: 'RUNNING' },
    });
    await svc.recordBuild('a', { status: 'BUILDING' });
    expect(builds).toHaveLength(2);
  });
});

describe('applyRunState (what API responses show)', () => {
  it('shows the app scan on the app and the revision scan on the revision', () => {
    const app: any = {
      id: 'a',
      pendingRevision: { version: '1.1.0', validationStatus: 'STALE' },
    };
    applyRunState(
      app,
      { status: 'PASSED', stages: {}, report: { score: 90 } } as any,
      {
        status: 'FAILED',
        version: '1.1.0',
        stages: {},
        errors: ['xss'],
      } as any,
      { buildStatus: 'COMPLETED', buildStages: { c: 1 } } as any,
    );
    expect(app.validationStatus).toBe('PASSED');
    expect(app.validationReport).toEqual({ score: 90 });
    expect(app.pendingRevision.validationStatus).toBe('FAILED');
    expect(app.pendingRevision.validationErrors).toEqual(['xss']);
    expect(app.buildStatus).toBe('COMPLETED');
  });

  it('ignores an older revision scan and defaults an app with no runs', () => {
    const app: any = {
      id: 'a',
      pendingRevision: { version: '1.2.0', validationStatus: 'STALE' },
    };
    applyRunState(
      app,
      null,
      { status: 'FAILED', version: '1.1.0' } as any,
      null,
    );
    expect(app.validationStatus).toBe('PENDING');
    expect(app.pendingRevision.validationStatus).toBeUndefined();
    expect(app.buildStatus).toBe('IDLE');
  });
});

describe('MiniAppRunsService: history', () => {
  it('pages one app newest first and caps the page size', async () => {
    const scans = memoryRepo();
    const builds = memoryRepo();
    const svc = new MiniAppRunsService(scans as any, builds as any);
    await svc.listScans('app-1', { page: 3, limit: 20 });
    expect(scans.findAndCount).toHaveBeenCalledWith({
      where: { miniAppId: 'app-1' },
      order: { createdAt: 'DESC' },
      skip: 40,
      take: 20,
    });
    await svc.listBuilds('app-1', { limit: 5000 });
    expect((builds.findAndCount.mock.calls as any[])[0][0].take).toBe(100);
  });
});
