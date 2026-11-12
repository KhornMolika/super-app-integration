import { gitRefOf, scanSourceOf } from './git-source.util';
import { miniAppDependencyOf } from './miniapp-dependency.util';

const SHA = '7f8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b';
const GW = 'https://app.fintechcenterfsa.com/pub';

describe('Flutter source: scan and build use the same source', () => {
  it('locks to the resolved commit, else the branch or tag', () => {
    expect(gitRefOf({ gitBranch: 'main', commitSha: SHA })).toBe(SHA);
    expect(gitRefOf({ gitTag: 'v1.2.0' })).toBe('v1.2.0');
    expect(gitRefOf({ gitBranch: 'develop', commitSha: 'not-a-sha' })).toBe('develop');
    expect(gitRefOf({})).toBe('main');
  });

  it('scans a public Git repository from gitUrl (the field the form saves)', () => {
    expect(scanSourceOf({ sourceType: 'GIT', gitUrl: 'https://github.com/fsa/hr.git', gitBranch: 'main', commitSha: SHA })).toEqual({
      integrationType: 'SOURCE_CODE',
      sourceStoragePath: '',
      repoUrl: 'https://github.com/fsa/hr.git',
      commitSha: SHA,
      gitProvider: 'GITHUB',
    });
  });

  it('scans a private GitLab repository over SSH', () => {
    const s = scanSourceOf({ sourceType: 'GIT', gitUrl: 'git@gitlab.com:fsa/hr.git', isPrivateRepo: true, gitTag: 'v2.0.0' });
    expect(s).toMatchObject({ integrationType: 'SOURCE_CODE', repoUrl: 'git@gitlab.com:fsa/hr.git', commitSha: 'v2.0.0', gitProvider: 'GITLAB' });
  });

  it('a Git source with an archive path left from an earlier upload is still a Git scan', () => {
    const s = scanSourceOf({ sourceType: 'GIT', gitUrl: 'https://github.com/fsa/hr.git', packageStoragePath: 'quarantine/packages/hr/1.0.0/hr.zip' });
    expect(s.integrationType).toBe('SOURCE_CODE');
    expect(s.sourceStoragePath).toBe('');
  });

  it('scans an uploaded archive from MinIO', () => {
    expect(scanSourceOf({ sourceType: 'ARTIFACT', packageStoragePath: 'quarantine/packages/hr/1.2.0/hr.zip' })).toMatchObject({
      integrationType: 'ARTIFACT',
      sourceStoragePath: 'quarantine/packages/hr/1.2.0/hr.zip',
      repoUrl: '',
    });
  });

  it('the build pins the same commit the scan used', () => {
    const cfg = { sourceType: 'GIT', gitUrl: 'https://github.com/fsa/hr.git', gitBranch: 'main', commitSha: SHA, packageName: 'fsa_hr' };
    const dep = miniAppDependencyOf({ appId: 'hr', integrationConfig: cfg }, GW) as any;
    expect(dep.dependency.git.ref).toBe(scanSourceOf(cfg).commitSha);
  });
});
