import { BUILD_CANDIDATE_STATUSES } from './build-inclusion';
import { BuildGitCredentialsService } from './build-git-credentials.service';
import { splitGitUrl } from '../integrations/flutter/git-source.util';

const KEY = '-----BEGIN OPENSSH PRIVATE KEY-----\nabc\n-----END OPENSSH PRIVATE KEY-----';

describe('splitGitUrl', () => {
  it('reads https, scp-style and ssh:// URLs', () => {
    expect(splitGitUrl('https://github.com/Org/repo.git')).toEqual({ host: 'github.com', path: 'Org/repo.git' });
    expect(splitGitUrl('git@git.fintechcenterfsa.com:partner/app.git')).toEqual({
      host: 'git.fintechcenterfsa.com',
      path: 'partner/app.git',
    });
    expect(splitGitUrl('ssh://git@gitlab.com:2222/g/sub/app')).toEqual({ host: 'gitlab.com', path: 'g/sub/app' });
  });

  it('refuses anything else', () => {
    for (const bad of ['http://github.com/a/b', 'https://github.com/a', 'file:///etc', 'https://h/a/../b', 'git@h:a b/c']) {
      expect(splitGitUrl(bad)).toBeNull();
    }
  });
});

describe('BuildGitCredentialsService.list', () => {
  function serviceWith(apps: any[]) {
    const repo = { find: jest.fn(async () => apps) };
    return { svc: new BuildGitCredentialsService(repo as any), repo };
  }
  const app = (appId: string, cfg: Record<string, any>) => ({
    appId,
    lifecycleStatus: 'ACTIVE',
    integrationMethod: 'FLUTTER_PACKAGE',
    integrationConfig: cfg,
  });

  it('lists each private source repository in the build with its own key or token', async () => {
    const { svc, repo } = serviceWith([
      app('ssh_app', { repoUrl: 'https://github.com/P/ssh-app.git', isPrivateRepo: true, deployKey: KEY }),
      app('token_app', { gitUrl: 'https://git.example.com/p/t.git', gitAccessToken: 'glpat-123' }),
      app('public_app', { repoUrl: 'https://github.com/P/public.git' }),
      app('artifact_app', { sourceType: 'ARTIFACT', repoUrl: 'https://github.com/P/x.git', deployKey: KEY }),
    ]);
    const r = await svc.list();
    expect(r.credentials).toEqual([
      { appId: 'ssh_app', repoUrl: 'https://github.com/P/ssh-app.git', host: 'github.com', path: 'P/ssh-app.git', type: 'ssh', privateKey: `${KEY}\n` },
      { appId: 'token_app', repoUrl: 'https://git.example.com/p/t.git', host: 'git.example.com', path: 'p/t.git', type: 'token', token: 'glpat-123' },
    ]);
    expect(r.skipped).toEqual([]);
    // Only apps that will be in the build
    const where = (repo.find.mock.calls[0] as any)[0].where;
    expect(where.integrationMethod).toBe('FLUTTER_PACKAGE');
    expect(where.appStatus._value).toEqual(BUILD_CANDIDATE_STATUSES);
  });

  it('says why a private repository cannot be set up, without secrets', async () => {
    const { svc } = serviceWith([
      app('no_key', { repoUrl: 'https://github.com/P/a.git', isPrivateRepo: true }),
      app('bad_url', { repoUrl: 'ftp://x/y.git', deployKey: KEY }),
    ]);
    const r = await svc.list();
    expect(r.credentials).toEqual([]);
    expect(r.skipped).toEqual([
      { appId: 'no_key', reason: 'private repository without a usable deploy key or access token' },
      { appId: 'bad_url', reason: 'repository URL is not a supported Git URL' },
    ]);
    expect(JSON.stringify(r)).not.toContain('PRIVATE KEY');
  });

  it('lists a repository shared by two apps once', async () => {
    const { svc } = serviceWith([
      app('a', { repoUrl: 'https://github.com/P/mono.git', deployKey: KEY }),
      app('b', { repoUrl: 'https://github.com/P/mono.git', deployKey: KEY }),
    ]);
    expect((await svc.list()).credentials.map((c) => c.appId)).toEqual(['a']);
  });
});

describe('GET /release-assembly/build-git-credentials', () => {
  it('is protected by the Jenkins callback token (it returns secrets)', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { GUARDS_METADATA } = require('@nestjs/common/constants');
    const { NativeSdkManifestController } = require('./native-sdk-manifest.controller');
    const { CallbackTokenGuard } = require('../integrations/release-assembly/callback-token.guard');
    const guards = Reflect.getMetadata(GUARDS_METADATA, NativeSdkManifestController.prototype.buildGitCredentials);
    expect(guards).toContain(CallbackTokenGuard);
  });
});
