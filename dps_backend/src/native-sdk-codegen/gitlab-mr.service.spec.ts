import { ConfigService } from '@nestjs/config';
import { GitlabMrService } from './gitlab-mr.service';
import { GitLabProvider } from '../integrations/git/providers/gitlab.provider';
import { MiniApp } from '../miniapps/entities/miniapp.entity';

const TOKEN = 'glpat-SUPERSECRET';
const PROJECT = 'https://gitlab.test/api/v4/projects/acme%2Fmobile-super-app';
const MR_URL = 'https://gitlab.test/acme/mobile-super-app/-/merge_requests/7';

type Call = { url: string; init: any };

function json(body: unknown, status = 200) {
  return {
    ok: status < 400,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

describe('GitlabMrService', () => {
  let calls: Call[];
  let responses: ((call: Call) => any)[];
  let find: jest.Mock;
  let save: jest.Mock;
  let logSpy: jest.SpyInstance[];

  function build(config: Record<string, string> = {}) {
    const cfg: Record<string, string> = {
      CODEGEN_REPO_SLUG: 'acme/mobile-super-app',
      CODEGEN_BASE_BRANCH: 'main',
      CODEGEN_AUTO_PR: 'true',
      GITLAB_TOKEN: TOKEN,
      GITLAB_BASE_URL: 'https://gitlab.test',
      ...config,
    };
    const configService = {
      get: jest.fn((k: string) => cfg[k]),
    } as unknown as ConfigService;
    const provider = new GitLabProvider(configService);
    find = jest.fn().mockResolvedValue([]);
    save = jest.fn();
    return new GitlabMrService(configService, provider, {
      find,
      save,
    } as any);
  }

  beforeEach(() => {
    calls = [];
    responses = [];
    (global as any).fetch = jest.fn(async (url: string, init: any) => {
      const call = { url, init };
      calls.push(call);
      const next = responses.shift();
      if (!next) throw new Error(`unexpected fetch ${init?.method} ${url}`);
      return next(call);
    });
    logSpy = ['log', 'error', 'warn'].map((m) =>
      jest
        .spyOn(require('@nestjs/common').Logger.prototype, m)
        .mockImplementation(),
    );
  });

  afterEach(() => {
    logSpy.forEach((s) => s.mockRestore());
  });

  const files = new Map([
    ['ios/Podfile', 'new podfile'],
    ['android/app/build.gradle', 'new gradle'],
  ]);

  function happyResponses(opts: { openMrs?: any[]; withBase?: boolean } = {}) {
    if (opts.withBase) {
      responses.push(() => json({ commit: { id: 'head-sha' } }));
    }
    responses.push(() => json({ name: 'codegen/native-sdk-1' })); // branch
    responses.push(() => json({ id: 'newcommit' })); // commit
    responses.push(() => json({ iid: 7, web_url: MR_URL })); // MR
    responses.push(() => json(opts.openMrs ?? [])); // list open
  }

  it('returns no_changes without any API call', async () => {
    const svc = build();
    await expect(svc.openMrForChanges(new Map())).resolves.toEqual({
      status: 'no_changes',
    });
    expect(calls).toHaveLength(0);
  });

  it('returns skipped (no URL) when neither flag is enabled', async () => {
    const svc = build({ CODEGEN_AUTO_PR: 'false' });
    const res = await svc.openMrForChanges(files, 'sha');
    expect(res).toEqual({ status: 'skipped' });
    expect(res.prUrl).toBeUndefined();
    expect(calls).toHaveLength(0);
  });

  it.each([
    ['CODEGEN_AUTO_PR', 'TRUE'],
    ['CODEGEN_AUTO_PR', ' 1 '],
    ['CODEGEN_AUTO_MR', 'True'],
    ['CODEGEN_AUTO_MR', '1'],
  ])('is enabled by %s=%j (case-insensitive)', (key, value) => {
    const svc = build({ CODEGEN_AUTO_PR: '', [key]: value });
    expect(svc.isEnabled()).toBe(true);
  });

  it('errors clearly when GITLAB_TOKEN is unset, before any call', async () => {
    const svc = build({ GITLAB_TOKEN: '' });
    await expect(svc.openMrForChanges(files, 'sha')).rejects.toThrow(
      /GITLAB_TOKEN must be set/,
    );
    expect(calls).toHaveLength(0);
  });

  it('errors clearly when CODEGEN_REPO_SLUG is unset', async () => {
    const svc = build({ CODEGEN_REPO_SLUG: '' });
    await expect(svc.openMrForChanges(files, 'sha')).rejects.toThrow(
      /CODEGEN_REPO_SLUG must be set/,
    );
  });

  it('creates branch from the pinned SHA, one commit, and the MR', async () => {
    const svc = build();
    happyResponses();
    const res = await svc.openMrForChanges(files, 'pinned-sha');

    expect(res).toEqual({
      status: 'opened',
      prUrl: MR_URL,
      mrIid: 7,
      supersededMrIids: [],
    });
    expect(calls).toHaveLength(4);

    const [branchCall, commitCall, mrCall, listCall] = calls;
    const branch = new URL(branchCall.url).searchParams.get('branch')!;
    expect(branch).toMatch(/^codegen\/native-sdk-\d+$/);
    expect(branchCall.url.startsWith(`${PROJECT}/repository/branches?`)).toBe(
      true,
    );
    expect(new URL(branchCall.url).searchParams.get('ref')).toBe('pinned-sha');
    expect(branchCall.init.method).toBe('POST');

    expect(commitCall.url).toBe(`${PROJECT}/repository/commits`);
    expect(commitCall.init.method).toBe('POST');
    expect(JSON.parse(commitCall.init.body)).toEqual({
      branch,
      commit_message: 'chore(codegen): regenerate native SDK glue',
      actions: [
        { action: 'update', file_path: 'ios/Podfile', content: 'new podfile' },
        {
          action: 'update',
          file_path: 'android/app/build.gradle',
          content: 'new gradle',
        },
      ],
    });

    expect(mrCall.url).toBe(`${PROJECT}/merge_requests`);
    const mrBody = JSON.parse(mrCall.init.body);
    expect(mrBody).toMatchObject({
      source_branch: branch,
      target_branch: 'main',
      title: 'Regenerate native SDK glue',
      labels: 'native-sdk-codegen',
      remove_source_branch: true,
    });
    expect(mrBody.description).toContain('`ios/Podfile`');

    expect(listCall.url).toBe(
      `${PROJECT}/merge_requests?state=opened&labels=native-sdk-codegen&target_branch=main&per_page=100`,
    );
    expect(listCall.init?.method ?? 'GET').toBe('GET');

    // every call authenticates with PRIVATE-TOKEN
    for (const c of calls) {
      expect(c.init.headers['PRIVATE-TOKEN']).toBe(TOKEN);
    }
  });

  it('resolves the base SHA from the branch when none is supplied', async () => {
    const svc = build({ CODEGEN_BASE_BRANCH: 'release/1.0' });
    happyResponses({ withBase: true });
    await svc.openMrForChanges(files);

    expect(calls[0].url).toBe(`${PROJECT}/repository/branches/release%2F1.0`);
    expect(new URL(calls[1].url).searchParams.get('ref')).toBe('head-sha');
    expect(JSON.parse(calls[3].init.body).target_branch).toBe('release/1.0');
  });

  it('closes only superseded codegen MRs and repoints their apps', async () => {
    const svc = build();
    happyResponses({
      openMrs: [
        { iid: 7, source_branch: 'codegen/native-sdk-2' }, // the new one
        { iid: 3, source_branch: 'codegen/native-sdk-1' }, // superseded
        { iid: 4, source_branch: 'feature/other' }, // unrelated, labelled
      ],
    });
    responses.push(() => json({ id: 1 })); // note
    responses.push(() => json({ iid: 3, state: 'closed' })); // close
    const affected = {
      integrationConfig: {
        codegenPrUrl:
          'https://gitlab.test/acme/mobile-super-app/-/merge_requests/3',
        keep: 1,
      },
    } as unknown as MiniApp;
    const other = {
      integrationConfig: {
        codegenPrUrl: 'https://gitlab.test/x/-/merge_requests/30',
      },
    } as unknown as MiniApp;
    const svc2 = svc;
    find.mockResolvedValue([affected, other]);

    const res = await svc2.openMrForChanges(files, 'sha');

    expect(res.supersededMrIids).toEqual([3]);
    expect(calls[4].url).toBe(`${PROJECT}/merge_requests/3/notes`);
    expect(calls[4].init.method).toBe('POST');
    expect(JSON.parse(calls[4].init.body).body).toContain(MR_URL);
    expect(calls[5].url).toBe(`${PROJECT}/merge_requests/3`);
    expect(calls[5].init.method).toBe('PUT');
    expect(JSON.parse(calls[5].init.body)).toEqual({ state_event: 'close' });
    expect(calls).toHaveLength(6);

    expect(save).toHaveBeenCalledTimes(1);
    expect(affected.integrationConfig).toEqual({
      codegenPrUrl: MR_URL,
      keep: 1,
    });
    expect(other.integrationConfig?.codegenPrUrl).toMatch(
      /merge_requests\/30$/,
    );
  });

  it('still returns the opened MR when listing open MRs fails', async () => {
    const svc = build();
    responses.push(() => json({}));
    responses.push(() => json({}));
    responses.push(() => json({ iid: 7, web_url: MR_URL }));
    responses.push(() => json({ message: 'boom' }, 500));
    const res = await svc.openMrForChanges(files, 'sha');
    expect(res).toMatchObject({
      status: 'opened',
      prUrl: MR_URL,
      supersededMrIids: [],
    });
  });

  it('continues when closing one superseded MR fails', async () => {
    const svc = build();
    happyResponses({
      openMrs: [
        { iid: 3, source_branch: 'codegen/native-sdk-1' },
        { iid: 4, source_branch: 'codegen/native-sdk-0' },
      ],
    });
    responses.push(() => json({}, 403)); // note on 3 fails
    responses.push(() => json({ id: 1 })); // note on 4
    responses.push(() => json({ iid: 4 })); // close 4
    const res = await svc.openMrForChanges(files, 'sha');
    expect(res.supersededMrIids).toEqual([4]);
  });

  it('never leaks the token in errors or logs on API failure', async () => {
    const svc = build();
    responses.push(() => json({ message: '401 Unauthorized' }, 401));
    let message = '';
    try {
      await svc.openMrForChanges(files, 'sha');
    } catch (e: any) {
      message = String(e?.message);
    }
    expect(message).toMatch(
      /GitLab API error on \/repository\/branches \(401\)/,
    );
    expect(message).not.toContain(TOKEN);
    const logged = JSON.stringify(logSpy.flatMap((s) => s.mock.calls));
    expect(logged).not.toContain(TOKEN);
  });
});
