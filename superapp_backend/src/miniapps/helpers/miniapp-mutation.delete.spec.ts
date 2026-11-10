import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MiniappMutationHelper, nexusTargetsFor } from './miniapp-mutation.helper';

const superAdmin = { sub: 'sa-1', roles: ['SUPER_ADMIN'] };
const admin = { sub: 'ad-1', roles: ['ADMIN'] };
const owner = { sub: 'dev-1', roles: ['MA_DEVELOPER'] };

function setup(app: any, others: any[] = []) {
  const repo = {
    findOne: jest.fn(async () => app),
    find: jest.fn(async () => [app, ...others]),
    delete: jest.fn(async () => ({ affected: 1 })),
  };
  const storage = {
    deleteObject: jest.fn(async () => undefined),
    deleteLogo: jest.fn(async () => undefined),
    packageSubmissionsBucket: 'pkg',
    sdkSubmissionsBucket: 'sdk',
  };
  const nexus = {
    deleteMiniAppArtifacts: jest.fn(async () => ({ removed: ['x'], failed: [] })),
  };
  const helper = new MiniappMutationHelper(
    repo as any, storage as any, {} as any, {} as any, {} as any, {} as any, {} as any,
    undefined, undefined, nexus as any,
  );
  return { helper, repo, storage, nexus };
}

const archived = (over: Record<string, any> = {}) => ({
  id: 'id-1',
  appId: 'ma_test',
  ownerId: 'dev-1',
  lifecycleStatus: 'ARCHIVED',
  integrationMethod: 'WEBVIEW',
  integrationConfig: {},
  ...over,
});

describe('MiniappMutationHelper.remove', () => {
  it('archived: only a Super Admin', async () => {
    const { helper, repo } = setup(archived());
    await expect(helper.remove('id-1', 'ad-1', admin, undefined, 'ma_test')).rejects.toThrow(ForbiddenException);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('archived: needs the App ID typed exactly', async () => {
    const { helper, repo } = setup(archived());
    await expect(helper.remove('id-1', 'sa-1', superAdmin)).rejects.toThrow(BadRequestException);
    await expect(helper.remove('id-1', 'sa-1', superAdmin, undefined, 'ma_tes')).rejects.toThrow(BadRequestException);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('archived: Super Admin with the App ID deletes it', async () => {
    const { helper, repo } = setup(archived());
    const res = await helper.remove('id-1', 'sa-1', superAdmin, undefined, 'ma_test');
    expect(repo.delete).toHaveBeenCalledWith('id-1');
    expect(res).toMatchObject({ success: true, appId: 'ma_test' });
  });

  it('testing or live: must be archived first, even for a Super Admin', async () => {
    for (const lifecycleStatus of ['TESTING', 'ACTIVE', 'IN_REVIEW']) {
      const { helper, repo } = setup(archived({ lifecycleStatus }));
      await expect(helper.remove('id-1', 'sa-1', superAdmin, undefined, 'ma_test')).rejects.toThrow(/archive it first/);
      expect(repo.delete).not.toHaveBeenCalled();
    }
  });

  it('owner deletes their own draft', async () => {
    const { helper, repo } = setup(archived({ lifecycleStatus: 'DRAFT' }));
    await helper.remove('id-1', 'dev-1', owner);
    expect(repo.delete).toHaveBeenCalledWith('id-1');
  });

  it('removes the Native SDK from Nexus, but keeps coordinates another app uses', async () => {
    const app = archived({
      integrationMethod: 'NATIVE_SDK',
      integrationConfig: { androidMavenGroupId: 'com.v', androidMavenArtifactId: 'spa', iosModuleName: 'Spa' },
    });
    const other = archived({
      id: 'id-2', appId: 'ma_other', lifecycleStatus: 'ACTIVE', integrationMethod: 'NATIVE_SDK',
      integrationConfig: { androidMavenGroupId: 'com.v', androidMavenArtifactId: 'spa', iosModuleName: 'OtherSpa' },
    });
    const { helper, nexus } = setup(app, [other]);
    const res: any = await helper.remove('id-1', 'sa-1', superAdmin, undefined, 'ma_test');
    expect(nexus.deleteMiniAppArtifacts).toHaveBeenCalledWith({ ios: { module: 'Spa', version: '1.0.0' } });
    expect(res.nexus.kept).toEqual(['com.v:spa: still used by ma_other']);
  });

  it('a Nexus failure does not stop the delete', async () => {
    const app = archived({ integrationMethod: 'FLUTTER_PACKAGE', integrationConfig: { packageName: 'ma_test_pkg' } });
    const { helper, repo, nexus } = setup(app);
    nexus.deleteMiniAppArtifacts.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));
    const res: any = await helper.remove('id-1', 'sa-1', superAdmin, undefined, 'ma_test');
    expect(repo.delete).toHaveBeenCalledWith('id-1');
    expect(res.nexus.failed[0]).toContain('ECONNREFUSED');
  });
});

describe('nexusTargetsFor', () => {
  it('uploaded Flutter archives only; Git sources publish nothing', () => {
    expect(nexusTargetsFor({ appId: 'a', integrationMethod: 'FLUTTER_PACKAGE', integrationConfig: { packageName: 'p' } } as any))
      .toEqual({ pubPackage: 'p' });
    expect(nexusTargetsFor({ appId: 'a', integrationMethod: 'FLUTTER_PACKAGE', integrationConfig: { packageName: 'p', sourceType: 'GIT', repoUrl: 'x' } } as any))
      .toEqual({});
    expect(nexusTargetsFor({ appId: 'a', integrationMethod: 'WEBVIEW', integrationConfig: {} } as any)).toEqual({});
  });

  it('Native SDK falls back to the App ID and default group and version', () => {
    expect(nexusTargetsFor({ appId: 'ma_spa', integrationMethod: 'NATIVE_SDK', integrationConfig: {} } as any)).toEqual({
      maven: { groupId: 'com.fsa.sdk', artifactId: 'ma_spa' },
      ios: { module: 'ma_spa', version: '1.0.0' },
    });
  });
});
