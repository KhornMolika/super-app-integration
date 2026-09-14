import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GithubPrService } from './github-pr.service';
import { MiniApp } from '../miniapps/entities/miniapp.entity';

function configValue(overrides: Record<string, string | undefined> = {}) {
  const defaults: Record<string, string | undefined> = {
    CODEGEN_AUTO_PR: 'true',
    CODEGEN_REPO_SLUG: 'acme/dsp-poc',
    CODEGEN_BASE_BRANCH: 'main',
    GITHUB_BASE_URL: 'https://api.github.com',
    GITHUB_TOKEN: 'test-token',
  };
  const merged = { ...defaults, ...overrides };
  return (key: string) => merged[key];
}

async function buildService(
  configOverrides: Record<string, string | undefined> = {},
  miniappApps: MiniApp[] = [],
) {
  const miniappRepository = {
    find: jest.fn().mockResolvedValue(miniappApps),
    save: jest.fn().mockImplementation((app: MiniApp) => Promise.resolve(app)),
  };
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      GithubPrService,
      { provide: ConfigService, useValue: { get: jest.fn(configValue(configOverrides)) } },
      { provide: getRepositoryToken(MiniApp), useValue: miniappRepository },
    ],
  }).compile();
  return { service: module.get<GithubPrService>(GithubPrService), miniappRepository };
}

function jsonResponse(body: any, ok = true, status = ok ? 200 : 500) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

describe('GithubPrService', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
  });

  it('returns no_changes without calling fetch when there are no changed files', async () => {
    const { service } = await buildService();
    const result = await service.openPrForChanges(new Map());
    expect(result).toEqual({ status: 'no_changes' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns skipped without calling fetch when CODEGEN_AUTO_PR is not "true"', async () => {
    const { service } = await buildService({ CODEGEN_AUTO_PR: 'false' });
    const result = await service.openPrForChanges(new Map([['a.swift', 'content']]));
    expect(result).toEqual({ status: 'skipped' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('creates blob(s), a tree, a commit, a branch ref, and opens a PR', async () => {
    const { service } = await buildService();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'base-sha' } })) // GET ref/heads/main
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: 'base-tree-sha' } })) // GET commits/base-sha
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob-sha-1' })) // POST blobs
      .mockResolvedValueOnce(jsonResponse({ sha: 'new-tree-sha' })) // POST trees
      .mockResolvedValueOnce(jsonResponse({ sha: 'new-commit-sha' })) // POST commits
      .mockResolvedValueOnce(jsonResponse({})) // POST refs (create branch)
      .mockResolvedValueOnce(jsonResponse({ html_url: 'https://github.com/acme/dsp-poc/pull/42', number: 42 })) // POST pulls
      .mockResolvedValueOnce(jsonResponse([])); // GET pulls?state=open (no superseded PRs)

    const result = await service.openPrForChanges(
      new Map([['dps_mobile_app/ios/Runner/AppDelegate.swift', 'new content']]),
    );

    expect(result).toEqual({
      status: 'opened',
      prUrl: 'https://github.com/acme/dsp-poc/pull/42',
      prNumber: 42,
      supersededPrNumbers: [],
    });

    const [prCall] = fetchMock.mock.calls.filter(([url]: [string]) => url.endsWith('/pulls'));
    expect(prCall[1].method).toBe('POST');
    const prBody = JSON.parse(prCall[1].body);
    expect(prBody.base).toBe('main');
    expect(prBody.head).toMatch(/^codegen\/native-sdk-\d+$/);
  });

  it('closes a superseded open codegen PR with a comment, and reports it', async () => {
    const { service } = await buildService();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'base-sha' } }))
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: 'base-tree-sha' } }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob-sha-1' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'new-tree-sha' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'new-commit-sha' }))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({ html_url: 'https://github.com/acme/dsp-poc/pull/43', number: 43 }))
      .mockResolvedValueOnce(
        jsonResponse([{ number: 41, head: { ref: 'codegen/native-sdk-1700000000000' } }]),
      ) // GET pulls?state=open
      .mockResolvedValueOnce(jsonResponse({})) // POST issues/41/comments
      .mockResolvedValueOnce(jsonResponse({})); // PATCH pulls/41

    const result = await service.openPrForChanges(new Map([['a.swift', 'content']]));

    expect(result.status).toBe('opened');
    expect(result.supersededPrNumbers).toEqual([41]);

    const commentCall = fetchMock.mock.calls.find(([url]: [string]) =>
      url.endsWith('/issues/41/comments'),
    );
    expect(commentCall).toBeDefined();
    expect(JSON.parse(commentCall![1].body).body).toContain('pull/43');

    const closeCall = fetchMock.mock.calls.find(
      ([url, init]: [string, any]) => url.endsWith('/pulls/41') && init.method === 'PATCH',
    );
    expect(closeCall).toBeDefined();
    expect(JSON.parse(closeCall![1].body)).toEqual({ state: 'closed' });
  });

  it('repoints mini apps tracking the superseded PR to the new one', async () => {
    const trackingSupersededApp = {
      appId: 'parking_pass',
      integrationMethod: 'NATIVE_SDK',
      lastCodegenRun: { status: 'opened', prNumber: 41, prUrl: 'https://github.com/acme/dsp-poc/pull/41' },
    } as unknown as MiniApp;
    const trackingSomeOtherPrApp = {
      appId: 'unrelated_vendor',
      integrationMethod: 'NATIVE_SDK',
      lastCodegenRun: { status: 'opened', prNumber: 99, prUrl: 'https://github.com/acme/dsp-poc/pull/99' },
    } as unknown as MiniApp;
    const { service, miniappRepository } = await buildService({}, [
      trackingSupersededApp,
      trackingSomeOtherPrApp,
    ]);
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'base-sha' } }))
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: 'base-tree-sha' } }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob-sha-1' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'new-tree-sha' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'new-commit-sha' }))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({ html_url: 'https://github.com/acme/dsp-poc/pull/43', number: 43 }))
      .mockResolvedValueOnce(
        jsonResponse([{ number: 41, head: { ref: 'codegen/native-sdk-1700000000000' } }]),
      )
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({}));

    await service.openPrForChanges(new Map([['a.swift', 'content']]));

    expect(miniappRepository.save).toHaveBeenCalledTimes(1);
    expect(miniappRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        appId: 'parking_pass',
        lastCodegenRun: expect.objectContaining({
          status: 'opened',
          prNumber: 43,
          prUrl: 'https://github.com/acme/dsp-poc/pull/43',
        }),
      }),
    );
    // The app tracking an unrelated PR (#99) must be left untouched.
    expect(miniappRepository.save).not.toHaveBeenCalledWith(
      expect.objectContaining({ appId: 'unrelated_vendor' }),
    );
  });

  it('does not fail the whole call when closing one superseded PR fails', async () => {
    const { service } = await buildService();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'base-sha' } }))
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: 'base-tree-sha' } }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob-sha-1' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'new-tree-sha' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'new-commit-sha' }))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({ html_url: 'https://github.com/acme/dsp-poc/pull/50', number: 50 }))
      .mockResolvedValueOnce(
        jsonResponse([{ number: 41, head: { ref: 'codegen/native-sdk-1700000000000' } }]),
      )
      .mockResolvedValueOnce(jsonResponse({ message: 'not found' }, false, 404)); // POST comments fails

    const result = await service.openPrForChanges(new Map([['a.swift', 'content']]));

    expect(result.status).toBe('opened');
    expect(result.prUrl).toBe('https://github.com/acme/dsp-poc/pull/50');
    expect(result.supersededPrNumbers).toEqual([]); // failed close is not reported as closed
  });

  it('throws when CODEGEN_REPO_SLUG is not set', async () => {
    const { service } = await buildService({ CODEGEN_REPO_SLUG: undefined });
    await expect(
      service.openPrForChanges(new Map([['a.swift', 'content']])),
    ).rejects.toThrow(/CODEGEN_REPO_SLUG/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
