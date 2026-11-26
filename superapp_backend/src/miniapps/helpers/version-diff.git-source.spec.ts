import { VersionDiffHelper } from './version-diff.helper';

describe('VersionDiffHelper — Git-source Flutter Package updates', () => {
  const baseLiveApp = {
    id: 'app-1',
    appId: 'ma_flutter_git_demo',
    name: 'Git Demo',
    status: 'ACTIVE',
    integrationMethod: 'FLUTTER_PACKAGE',
    permissions: [],
    integrationConfig: {
      sourceType: 'GIT',
      packageName: 'ma_flutter_git_demo',
      gitUrl: 'https://git.fintechcenterfsa.com/miniapps/ma_flutter_git_demo.git',
      gitBranch: 'main',
      commitSha: '1111111111111111111111111111111111111111',
      lockedCommitSha: '1111111111111111111111111111111111111111',
    },
  };

  it('flags commitSha / gitRef / gitBranch changes as security changes', () => {
    expect(
      VersionDiffHelper.hasSecurityChanges(baseLiveApp, {
        integrationMethod: 'FLUTTER_PACKAGE',
        integrationConfig: {
          ...baseLiveApp.integrationConfig,
          commitSha: '2222222222222222222222222222222222222222',
        },
      }),
    ).toBe(true);

    expect(
      VersionDiffHelper.hasSecurityChanges(baseLiveApp, {
        integrationMethod: 'FLUTTER_PACKAGE',
        integrationConfig: {
          ...baseLiveApp.integrationConfig,
          gitBranch: 'release/1.2',
        },
      }),
    ).toBe(true);

    expect(
      VersionDiffHelper.hasSecurityChanges(baseLiveApp, {
        integrationMethod: 'FLUTTER_PACKAGE',
        integrationConfig: {
          ...baseLiveApp.integrationConfig,
          gitRef: 'v1.2.0',
        },
      }),
    ).toBe(true);
  });

  it('does not flag metadata-only edits on a Git-source app as security changes', () => {
    expect(
      VersionDiffHelper.hasSecurityChanges(baseLiveApp, {
        name: 'Git Demo Renamed',
        integrationMethod: 'FLUTTER_PACKAGE',
        integrationConfig: { ...baseLiveApp.integrationConfig },
      }),
    ).toBe(false);
  });

  it('surfaces commitSha and gitBranch deltas in computeDiff', () => {
    const diff = VersionDiffHelper.computeDiff(baseLiveApp, {
      integrationMethod: 'FLUTTER_PACKAGE',
      revisionStatus: 'IN_REVIEW',
      integrationConfig: {
        ...baseLiveApp.integrationConfig,
        gitBranch: 'release/1.2',
        commitSha: '2222222222222222222222222222222222222222',
      },
    });

    expect(diff.hasChanges).toBe(true);
    expect(diff.differences.integration.commitSha).toEqual({
      base: '1111111111111111111111111111111111111111',
      target: '2222222222222222222222222222222222222222',
      changed: true,
    });
    expect(diff.differences.integration.gitBranch).toEqual({
      base: 'main',
      target: 'release/1.2',
      changed: true,
    });
  });
});
