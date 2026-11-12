import { MiniappValidationHelper } from './miniapp-validation.helper';

/** Any method resolves to an empty value: the test only cares about the Flutter artifact rule. */
function looseMock(overrides: Record<string, any> = {}): any {
  return new Proxy(overrides, {
    get: (target, prop) => {
      if (prop in target) return target[prop as string];
      if (prop === 'then') return undefined; // not a promise
      return jest.fn().mockResolvedValue([]);
    },
  });
}

async function validate(integrationConfig: Record<string, any>, appOverrides: Record<string, any> = {}) {
  const update = jest.fn().mockResolvedValue({ affected: 1 });
  const repo = looseMock({
    update,
    save: jest.fn(async (x: any) => x),
    findOne: jest.fn().mockResolvedValue(null),
  });
  const issues = looseMock({ create: jest.fn((x: any) => x), save: jest.fn(async (x: any) => x) });
  const nexus = looseMock({ getPackageInfo: jest.fn().mockResolvedValue({ exists: true }) });
  const helper = new (MiniappValidationHelper as any)(
    repo, issues, looseMock(), looseMock(), looseMock(), looseMock(), looseMock(),
    looseMock(), nexus, looseMock(), looseMock(), looseMock(),
  ) as MiniappValidationHelper;
  const app: any = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'HR',
    appId: 'fsa_hr_miniapp',
    lifecycleStatus: 'SUBMITTED',
    integrationMethod: 'FLUTTER_PACKAGE',
    integrationConfig,
    permissions: [],
    ...appOverrides,
  };
  await helper.validateMiniAppAsync(app).catch(() => undefined);
  const saved = update.mock.calls.map((c) => c[1]).find((p) => p?.validationErrors);
  return { errors: (saved?.validationErrors || {}) as Record<string, string>, nexus, saved };
}

describe('Flutter package artifact: the uploaded archive is required', () => {
  it('fails without an archive, even when the package is already in Nexus', async () => {
    const { errors, nexus } = await validate({ sourceType: 'ARTIFACT', packageName: 'fsa_hr_miniapp' });
    expect(errors['integrationConfigFlutter.archiveFile']).toMatch(/Attach the package archive/);
    expect(nexus.getPackageInfo).not.toHaveBeenCalled();
  });

  it('a checksum from inspecting a file is not an uploaded archive', async () => {
    const { errors } = await validate({ sourceType: 'ARTIFACT', packageName: 'fsa_hr_miniapp', archiveChecksum: 'abc' });
    expect(errors['integrationConfigFlutter.archiveFile']).toBeDefined();
  });

  it('treats a config without sourceType and without a Git URL as an artifact', async () => {
    const { errors } = await validate({ packageName: 'fsa_hr_miniapp' });
    expect(errors['integrationConfigFlutter.archiveFile']).toBeDefined();
  });

  it('accepts an archive stored in MinIO', async () => {
    const { errors } = await validate({
      sourceType: 'ARTIFACT',
      packageName: 'fsa_hr_miniapp',
      packageStoragePath: 'pending/x/1.2.0/p.zip',
    });
    expect(errors['integrationConfigFlutter.archiveFile']).toBeUndefined();
  });
});

describe('a failed check on a new app', () => {
  // availabilityStatus defaults to TESTING on every new row: it must not count as live
  it('sends a new app back to DRAFT', async () => {
    const { saved } = await validate(
      { sourceType: 'ARTIFACT', packageName: 'fsa_hr_miniapp' },
      { lifecycleStatus: 'IN_REVIEW', availabilityStatus: 'TESTING', pendingRevision: null },
    );
    expect(saved?.validationStatus).toBe('FAILED');
    expect(saved?.lifecycleStatus).toBe('DRAFT');
  });

  it('leaves an app that is already live where it is', async () => {
    const { saved } = await validate(
      { sourceType: 'ARTIFACT', packageName: 'fsa_hr_miniapp' },
      { lifecycleStatus: 'ACTIVE', availabilityStatus: 'PRODUCTION', pendingRevision: null },
    );
    expect(saved?.validationStatus).toBe('FAILED');
    expect(saved?.lifecycleStatus).toBeUndefined();
  });
});
