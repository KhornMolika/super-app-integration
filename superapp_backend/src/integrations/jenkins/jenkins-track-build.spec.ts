import { JenkinsService } from './jenkins.service';

describe('JenkinsService.trackTestBuild', () => {
  const make = () =>
    new JenkinsService({
      get: (k: string, d?: string) => ({ JENKINS_URL: 'http://jenkins.test' } as Record<string, string>)[k] ?? d,
    } as any);

  /** routes: path -> JSON body (or a number for an HTTP error status, or a string for text). */
  function mockJenkins(routes: Record<string, unknown>) {
    const calls: string[] = [];
    jest.spyOn(global, 'fetch' as any).mockImplementation((async (url: any) => {
      const path = String(url).replace('http://jenkins.test', '');
      calls.push(path);
      const r = routes[path];
      if (r === undefined || typeof r === 'number') return new Response('', { status: (r as number) ?? 404 });
      if (typeof r === 'string') return new Response(r, { status: 200 });
      return new Response(JSON.stringify(r), { status: 200 });
    }) as any);
    return calls;
  }
  afterEach(() => jest.restoreAllMocks());

  const LIST = '/job/superapp-test-build/api/json?tree=builds[number,timestamp,actions[parameters[name,value]]]{0,10}';
  const params = (v: string) => [{ parameters: [{ name: 'RELEASE_VERSION', value: v }] }];

  it('stays pending while its run is queued, even when lastBuild is an older aborted run', async () => {
    const calls = mockJenkins({
      '/queue/item/77/api/json': { cancelled: false },
      '/job/superapp-test-build/lastBuild/api/json': { building: false, result: 'ABORTED' },
    });
    const s = await make().trackTestBuild({ queueId: 77, releaseVersion: 'v1.1.1' }).poll();
    expect(s).toEqual({ available: true, state: 'pending' });
    expect(calls.some((c) => c.includes('lastBuild'))).toBe(false);
  });

  it('follows the queued run to its build number and reports its own result', async () => {
    mockJenkins({
      '/queue/item/77/api/json': { executable: { number: 28 } },
      '/job/superapp-test-build/28/api/json?tree=building,result': { building: true, result: null },
    });
    const tracker = make().trackTestBuild({ queueId: 77, releaseVersion: 'v1.1.1' });
    expect(await tracker.poll()).toMatchObject({ state: 'building', buildNumber: 28 });

    jest.restoreAllMocks();
    // Later the queue item has expired; the tracker remembers #28
    const calls = mockJenkins({
      '/job/superapp-test-build/28/api/json?tree=building,result': { building: false, result: 'FAILURE' },
      '/job/superapp-test-build/28/consoleText': 'ERROR: script returned exit code 1',
    });
    expect(await tracker.poll()).toMatchObject({
      state: 'finished',
      result: 'FAILURE',
      buildNumber: 28,
      consoleText: 'ERROR: script returned exit code 1',
    });
    expect(calls.some((c) => c.startsWith('/queue/'))).toBe(false);
  });

  it('reports a run cancelled in the queue as ABORTED', async () => {
    mockJenkins({ '/queue/item/77/api/json': { cancelled: true } });
    const s = await make().trackTestBuild({ queueId: 77, releaseVersion: 'v1.1.1' }).poll();
    expect(s).toMatchObject({ state: 'finished', result: 'ABORTED' });
  });

  it('without a queue id, matches the run by RELEASE_VERSION and start time, never another version', async () => {
    const now = Date.now();
    mockJenkins({
      [LIST]: {
        builds: [
          { number: 27, timestamp: now - 1000, actions: params('v0.0.1') },
          { number: 20, timestamp: now - 3 * 3600_000, actions: params('v1.1.1') },
        ],
      },
    });
    const tracker = make().trackTestBuild({ releaseVersion: 'v1.1.1', triggeredAt: now });
    expect(await tracker.poll()).toEqual({ available: true, state: 'pending' });

    jest.restoreAllMocks();
    mockJenkins({
      [LIST]: { builds: [{ number: 28, timestamp: now + 5000, actions: params('v1.1.1') }] },
      '/job/superapp-test-build/28/api/json?tree=building,result': { building: false, result: 'SUCCESS' },
    });
    expect(await tracker.poll()).toMatchObject({ state: 'finished', result: 'SUCCESS', buildNumber: 28 });
  });

  it('keeps polling (unavailable) when Jenkins cannot be reached', async () => {
    jest.spyOn(global, 'fetch' as any).mockRejectedValue(new Error('fetch failed'));
    const s = await make().trackTestBuild({ queueId: 77, releaseVersion: 'v1.1.1' }).poll();
    expect(s).toMatchObject({ available: false, state: 'pending' });
  });
});
