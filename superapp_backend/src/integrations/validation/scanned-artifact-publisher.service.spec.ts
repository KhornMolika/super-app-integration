import { ScannedArtifactPublisherService, declaredPackageVersion } from './scanned-artifact-publisher.service';
import { SdkArtifactUploadService } from '../../sdk-artifacts/sdk-artifact-upload.service';

function setup(app: Record<string, any> | null, opts: { archive?: Buffer | null; publishError?: Error } = {}) {
  const patches: { set: any; params: any }[] = [];
  const qb: any = {
    update: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    set: jest.fn(function (this: any, s: any) {
      patches.push({ set: s, params: undefined });
      return this;
    }),
    setParameters: jest.fn(function (this: any, p: any) {
      patches[patches.length - 1].params = JSON.parse(p.patch);
      return this;
    }),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const repo: any = {
    findOne: jest.fn().mockResolvedValue(app),
    createQueryBuilder: jest.fn(() => qb),
  };
  const storage: any = {
    packageSubmissionsBucket: 'package-submissions',
    getObjectBuffer: jest.fn().mockResolvedValue(opts.archive === undefined ? Buffer.from('zip') : opts.archive),
  };
  const nexus: any = {
    publishPubArchive: opts.publishError
      ? jest.fn().mockRejectedValue(opts.publishError)
      : jest.fn().mockResolvedValue({ success: true }),
  };
  const sdk = { publishToNexus: jest.fn().mockResolvedValue({ androidNexusMavenUrl: 'm' }) };
  const moduleRef: any = { get: jest.fn((t: any) => (t === SdkArtifactUploadService ? sdk : undefined)) };
  const svc = new ScannedArtifactPublisherService(repo, storage, nexus, moduleRef);
  return { svc, storage, nexus, sdk, patches };
}

const flutterApp = (config: Record<string, any>, over: Record<string, any> = {}) => ({
  id: 'app-1',
  integrationMethod: 'FLUTTER_PACKAGE',
  integrationConfig: { sourceType: 'ARTIFACT', packageName: 'fsa_hr_miniapp', packageStoragePath: 'pending/x/1.2.0/p.zip', ...config },
  ...over,
});

describe('ScannedArtifactPublisherService', () => {
  it('publishes the scanned Flutter package from MinIO to Nexus and records the version', async () => {
    const { svc, storage, nexus, patches } = setup(flutterApp({ versionConstraint: '^1.2.0' }));
    await svc.publishAfterPassedScan('app-1');
    expect(storage.getObjectBuffer).toHaveBeenCalledWith('package-submissions', 'pending/x/1.2.0/p.zip');
    expect(nexus.publishPubArchive).toHaveBeenCalledWith(Buffer.from('zip'), 'fsa_hr_miniapp', '1.2.0');
    expect(patches[0].params).toMatchObject({ nexusPublishedVersion: '1.2.0', nexusPublishError: null });
    expect(Object.keys(patches[0].set)).toEqual(['integrationConfig']);
  });

  it('does not publish the same version twice', async () => {
    const { svc, nexus } = setup(flutterApp({ versionConstraint: '1.2.0', nexusPublishedVersion: '1.2.0' }));
    await svc.publishAfterPassedScan('app-1');
    expect(nexus.publishPubArchive).not.toHaveBeenCalled();
  });

  it('records a failed publish instead of throwing, so approval can retry', async () => {
    const { svc, patches } = setup(flutterApp({ versionConstraint: '1.2.0' }), { publishError: new Error('409 version exists') });
    await expect(svc.publishAfterPassedScan('app-1')).resolves.toBeUndefined();
    expect(patches[0].params).toEqual({ nexusPublishError: '409 version exists' });
  });

  it('records a missing archive as a publish error', async () => {
    const { svc, nexus, patches } = setup(flutterApp({ versionConstraint: '1.2.0' }), { archive: null });
    await svc.publishAfterPassedScan('app-1');
    expect(nexus.publishPubArchive).not.toHaveBeenCalled();
    expect(patches[0].params.nexusPublishError).toMatch(/empty or missing/);
  });

  it('publishes a revision from the revision config and records it there', async () => {
    const app = flutterApp({}, {
      pendingRevision: { integrationConfig: { packageName: 'fsa_hr_miniapp', packageStoragePath: 'rev.zip', versionConstraint: '1.3.0' } },
    });
    const { svc, nexus, patches } = setup(app);
    await svc.publishAfterPassedScan('app-1');
    expect(nexus.publishPubArchive).toHaveBeenCalledWith(expect.any(Buffer), 'fsa_hr_miniapp', '1.3.0');
    expect(Object.keys(patches[0].set)).toEqual(['pendingRevision']);
  });

  it('leaves Git-source packages alone (nothing in MinIO to publish)', async () => {
    const { svc, nexus } = setup(flutterApp({ sourceType: 'GIT', packageStoragePath: undefined }));
    await svc.publishAfterPassedScan('app-1');
    expect(nexus.publishPubArchive).not.toHaveBeenCalled();
  });

  it('publishes a scanned Native SDK through the SDK service', async () => {
    const { svc, sdk } = setup({ id: 'app-2', integrationMethod: 'NATIVE_SDK', integrationConfig: { androidMinioKey: 'a.aar' } });
    await svc.publishAfterPassedScan('app-2');
    expect(sdk.publishToNexus).toHaveBeenCalledWith('app-2');
  });

  it('skips a Native SDK already in Nexus', async () => {
    const { svc, sdk } = setup({
      id: 'app-2',
      integrationMethod: 'NATIVE_SDK',
      integrationConfig: { androidMinioKey: 'a.aar', androidNexusMavenUrl: 'https://nexus/x' },
    });
    await svc.publishAfterPassedScan('app-2');
    expect(sdk.publishToNexus).not.toHaveBeenCalled();
  });
});

describe('declaredPackageVersion (same rule as approval)', () => {
  it('strips constraint operators and falls back like approval does', () => {
    expect(declaredPackageVersion({ versionConstraint: '^1.2.0' })).toBe('1.2.0');
    expect(declaredPackageVersion({}, { currentReleaseVersion: '2.0.1' })).toBe('2.0.1');
    expect(declaredPackageVersion(null)).toBe('1.0.0');
  });
});
