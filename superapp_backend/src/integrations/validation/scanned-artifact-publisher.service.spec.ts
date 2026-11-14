import {
  ScannedArtifactPublisherService,
  PackagePublishError,
  declaredPackageVersion,
  readArchivePubspec,
  setPublishVerifyDelayForTests,
} from './scanned-artifact-publisher.service';
import { SdkArtifactUploadService } from '../../sdk-artifacts/sdk-artifact-upload.service';

const AdmZip = require('adm-zip');

/** A .zip package archive whose pubspec.yaml declares this name and version. */
function packageZip(name = 'fsa_hr_miniapp', version = '1.2.0', folder = ''): Buffer {
  const zip = new AdmZip();
  zip.addFile(`${folder}pubspec.yaml`, Buffer.from(`name: ${name}\nversion: ${version}\n`));
  zip.addFile(`${folder}lib/${name}.dart`, Buffer.from('library x;'));
  return zip.toBuffer();
}

interface Opts {
  archive?: Buffer | null;
  publishError?: Error;
  /** versions Nexus lists before anything is published */
  inNexus?: string[];
  nexusDown?: boolean;
  /** Nexus accepts uploads but never lists them */
  neverListed?: boolean;
}

function setup(app: Record<string, any> | null, opts: Opts = {}) {
  const patches: { set: any; params: any; revision?: boolean }[] = [];
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
    getObjectBuffer: jest.fn().mockResolvedValue(opts.archive === undefined ? packageZip() : opts.archive),
  };
  const listed = new Set<string>(opts.inNexus || []);
  const nexus: any = {
    publishPubArchive: opts.publishError
      ? jest.fn().mockRejectedValue(opts.publishError)
      : jest.fn(async (_buf: Buffer, name: string, version: string) => {
          if (!opts.neverListed) listed.add(`${name}@${version}`);
          return { success: true };
        }),
    hasPackageVersion: jest.fn(async (name: string, version: string) =>
      opts.nexusDown
        ? { found: false, reachable: false, versions: [], error: 'Could not reach Nexus: ECONNRESET' }
        : { found: listed.has(`${name}@${version}`) || listed.has(version), reachable: true, versions: [] },
    ),
  };
  const sdk = { publishToNexus: jest.fn().mockResolvedValue({ androidNexusMavenUrl: 'm' }) };
  const moduleRef: any = { get: jest.fn((t: any) => (t === SdkArtifactUploadService ? sdk : undefined)) };
  const versionRows: any = {
    resyncApp: jest.fn().mockResolvedValue(undefined),
    patchServingConfig: jest.fn(async (_id: string, patch: any) => {
      patches.push({ set: { integrationConfig: 'jsonb merge' }, params: patch });
    }),
    patchRevisionConfig: jest.fn(async (_id: string, patch: any) => {
      patches.push({ set: { revision: 'jsonb_set' }, params: patch, revision: true });
    }),
  };
  const svc = new ScannedArtifactPublisherService(repo, storage, nexus, moduleRef, versionRows);
  const lastPatch = () => patches[patches.length - 1]?.params;
  return { svc, storage, nexus, sdk, patches, lastPatch, versionRows };
}

const flutterApp = (config: Record<string, any>, over: Record<string, any> = {}): any => ({
  id: 'app-1',
  appId: 'fsa_hr_miniapp',
  integrationMethod: 'FLUTTER_PACKAGE',
  integrationConfig: {
    sourceType: 'ARTIFACT',
    packageName: 'fsa_hr_miniapp',
    packageStoragePath: 'quarantine/packages/fsa_hr_miniapp/1.0.0/p.zip',
    ...config,
  },
  ...over,
});

beforeAll(() => setPublishVerifyDelayForTests(0));

describe('ScannedArtifactPublisherService: after a passed scan', () => {
  it('publishes the scanned package from MinIO to Nexus and records the version', async () => {
    const { svc, storage, nexus, lastPatch, patches } = setup(flutterApp({}));
    await svc.publishAfterPassedScan('app-1');
    expect(storage.getObjectBuffer).toHaveBeenCalledWith('package-submissions', 'quarantine/packages/fsa_hr_miniapp/1.0.0/p.zip');
    expect(nexus.publishPubArchive).toHaveBeenCalledWith(expect.any(Buffer), 'fsa_hr_miniapp', '1.2.0');
    expect(lastPatch()).toMatchObject({ nexusPublishedVersion: '1.2.0', nexusPublishedPackage: 'fsa_hr_miniapp', nexusPublishError: null });
    expect(Object.keys(patches[0].set)).toEqual(['integrationConfig']);
  });

  it('does not publish again when Nexus already lists the version', async () => {
    const { svc, nexus, lastPatch } = setup(flutterApp({}), { inNexus: ['fsa_hr_miniapp@1.2.0'] });
    await svc.publishAfterPassedScan('app-1');
    expect(nexus.publishPubArchive).not.toHaveBeenCalled();
    expect(lastPatch()).toMatchObject({ nexusPublishedVersion: '1.2.0', nexusPublishError: null });
  });

  it('records a refused publish instead of throwing, so approval can retry', async () => {
    const { svc, lastPatch } = setup(flutterApp({}), { publishError: new Error('HTTP 400 bad archive') });
    await expect(svc.publishAfterPassedScan('app-1')).resolves.toBeUndefined();
    expect(lastPatch().nexusPublishError).toMatch(/Nexus refused fsa_hr_miniapp 1\.2\.0: HTTP 400 bad archive/);
  });

  it('records a missing archive as a publish error', async () => {
    const { svc, nexus, lastPatch } = setup(flutterApp({}), { archive: null });
    await svc.publishAfterPassedScan('app-1');
    expect(nexus.publishPubArchive).not.toHaveBeenCalled();
    expect(lastPatch().nexusPublishError).toMatch(/missing or empty in MinIO/);
  });

  it('publishes a revision from the revision config and records it there', async () => {
    const app = flutterApp({}, {
      pendingRevision: {
        integrationConfig: { sourceType: 'ARTIFACT', packageName: 'fsa_hr_miniapp', packageStoragePath: 'rev.zip' },
      },
    });
    const { svc, nexus, patches, versionRows } = setup(app, { archive: packageZip('fsa_hr_miniapp', '1.3.0') });
    await svc.publishAfterPassedScan('app-1');
    expect(nexus.publishPubArchive).toHaveBeenCalledWith(expect.any(Buffer), 'fsa_hr_miniapp', '1.3.0');
    // Recorded on the revision's version row (atomic jsonb_set there), never on the app
    expect(patches.length).toBeGreaterThan(0);
    expect(patches.every((p) => p.revision)).toBe(true);
    expect(versionRows.patchRevisionConfig).toHaveBeenCalledWith('app-1', expect.objectContaining({ nexusPublishedVersion: '1.3.0' }));
  });

  it('leaves Git-source packages alone (nothing in MinIO to publish)', async () => {
    const { svc, nexus } = setup(flutterApp({ sourceType: 'GIT', gitUrl: 'https://git/x.git', packageStoragePath: undefined }));
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

describe('ensureFlutterPackagePublished (approval and test builds)', () => {
  it('uses the version in the archive pubspec.yaml, not the form, and confirms Nexus lists it', async () => {
    const app = flutterApp({ versionConstraint: '' }, { currentReleaseVersion: '1.0.0' });
    const { svc, nexus } = setup(app);
    await expect(svc.ensureFlutterPackagePublished(app)).resolves.toEqual({
      packageName: 'fsa_hr_miniapp',
      version: '1.2.0',
      publishedNow: true,
    });
    expect(nexus.hasPackageVersion).toHaveBeenLastCalledWith('fsa_hr_miniapp', '1.2.0');
    expect(app.integrationConfig.nexusPublishedVersion).toBe('1.2.0'); // kept when approval saves the app
  });

  it('throws when the archive names a different package than the registered one', async () => {
    const app = flutterApp({ packageName: 'fsa_hr_miniapp_1_2_0' });
    const { svc, nexus, lastPatch } = setup(app);
    await expect(svc.ensureFlutterPackagePublished(app)).rejects.toThrow(PackagePublishError);
    expect(nexus.publishPubArchive).not.toHaveBeenCalled();
    expect(lastPatch().nexusPublishError).toMatch(/names the package "fsa_hr_miniapp".*registered as "fsa_hr_miniapp_1_2_0"/);
  });

  it('throws when nothing is stored and Nexus does not have the package', async () => {
    const app = flutterApp({ packageStoragePath: undefined, versionConstraint: '1.2.0' });
    const { svc } = setup(app);
    await expect(svc.ensureFlutterPackagePublished(app)).rejects.toThrow(/not in Nexus and no package archive is stored/);
  });

  it('accepts a package already in Nexus without a stored archive', async () => {
    const app = flutterApp({ packageStoragePath: undefined, versionConstraint: '1.2.0' });
    const { svc, nexus } = setup(app, { inNexus: ['fsa_hr_miniapp@1.2.0'] });
    await expect(svc.ensureFlutterPackagePublished(app)).resolves.toMatchObject({ publishedNow: false });
    expect(nexus.publishPubArchive).not.toHaveBeenCalled();
  });

  it('throws when Nexus cannot be reached (not the same as "absent")', async () => {
    const app = flutterApp({});
    const { svc, nexus } = setup(app, { nexusDown: true });
    await expect(svc.ensureFlutterPackagePublished(app)).rejects.toThrow(/ECONNRESET/);
    expect(nexus.publishPubArchive).not.toHaveBeenCalled();
  });

  it('throws when Nexus accepts the upload but never lists the version', async () => {
    const app = flutterApp({});
    const { svc } = setup(app, { neverListed: true });
    await expect(svc.ensureFlutterPackagePublished(app)).rejects.toThrow(/does not list fsa_hr_miniapp 1\.2\.0/);
  });

  it('returns null for a Git-source package', async () => {
    const app = flutterApp({ sourceType: 'GIT', gitUrl: 'https://git/x.git' });
    const { svc } = setup(app);
    await expect(svc.ensureFlutterPackagePublished(app)).resolves.toBeNull();
  });
});

describe('readArchivePubspec', () => {
  it('reads the top-most pubspec.yaml, also inside a wrapper folder', () => {
    expect(readArchivePubspec(packageZip('fsa_hr_miniapp', '1.2.0'))).toEqual({ name: 'fsa_hr_miniapp', version: '1.2.0' });
    expect(readArchivePubspec(packageZip('fsa_hr_miniapp', '1.2.0+3', 'fsa_hr_miniapp-1.2.0/'))).toEqual({
      name: 'fsa_hr_miniapp',
      version: '1.2.0+3',
    });
  });

  it('returns null for something that is not a zip', () => {
    expect(readArchivePubspec(Buffer.from('not a zip'))).toBeNull();
  });
});

describe('declaredPackageVersion (fallback when the archive has no version)', () => {
  it('strips constraint operators', () => {
    expect(declaredPackageVersion({ versionConstraint: '^1.2.0' })).toBe('1.2.0');
    expect(declaredPackageVersion({}, { currentReleaseVersion: '2.0.1' })).toBe('2.0.1');
    expect(declaredPackageVersion(null)).toBe('1.0.0');
  });
});
