import {
  capabilityFindings,
  compareVersions,
  evaluateAgainstCatalog,
  normalizeDeclared,
} from './capability-gate.service';

const def = (key: string, over: Record<string, unknown> = {}) =>
  ({ key, isActive: true, isDeprecated: false, minSuperAppVersion: null, maxSuperAppVersion: null, ...over }) as any;

const snapshot = (defs: any[], hostVersion: string | null = 'v1.2.0') => ({
  byKey: new Map(defs.map((d) => [d.key.toLowerCase(), d])),
  hostVersion,
});

describe('capability gate (ADR-004 Section 5: disable, don\'t fail)', () => {
  const catalog = snapshot([
    def('camera'),
    def('location'),
    def('biometrics', { minSuperAppVersion: 'v1.4.0' }),
    def('legacy_sms', { isActive: false }),
    def('old_storage', { isDeprecated: true }),
    def('fax', { maxSuperAppVersion: 'v1.0.0' }),
  ]);

  it('all supported: launchable, nothing disabled, no findings', () => {
    const r = evaluateAgainstCatalog(['camera', { type: 'location', required: true }], catalog);
    expect(r.launchable).toBe(true);
    expect(r.unavailableReason).toBeNull();
    expect(r.availableFrom).toBeNull();
    expect(r.capabilities.every((c) => c.supported)).toBe(true);
    expect(capabilityFindings(r)).toEqual([]);
  });

  it('optional unsupported: still launchable, capability disabled, LOW finding', () => {
    const r = evaluateAgainstCatalog([{ type: 'nfc', required: false }, 'camera'], catalog);
    expect(r.launchable).toBe(true);
    expect(r.capabilities.find((c) => c.key === 'nfc')).toMatchObject({ supported: false, reason: 'NOT_IN_CATALOG' });
    const [f] = capabilityFindings(r);
    expect(f).toMatchObject({ id: 'CAP_UNSUPPORTED_NFC', severity: 'LOW' });
  });

  it('required unsupported: registers but NOT launchable, labelled with the host version that adds it', () => {
    const r = evaluateAgainstCatalog([{ type: 'biometrics', required: true }], catalog);
    expect(r.launchable).toBe(false);
    expect(r.capabilities[0]).toMatchObject({ reason: 'REQUIRES_NEWER_SUPER_APP', availableFrom: 'v1.4.0' });
    expect(r.unavailableReason).toBe('Unavailable until Super App v1.4.0');
    expect(r.availableFrom).toBe('1.4.0');
    const [f] = capabilityFindings(r);
    expect(f.severity).toBe('MEDIUM'); // reported, never CRITICAL/HIGH: the scan does not fail
  });

  it('required capability not in the catalog at all: generic future-release label', () => {
    const r = evaluateAgainstCatalog([{ type: 'nfc', required: true }], catalog);
    expect(r.launchable).toBe(false);
    expect(r.unavailableReason).toBe('Unavailable until a future Super App release');
    expect(r.availableFrom).toBeNull();
  });

  it('names the latest version when several required capabilities wait on different releases', () => {
    const multi = snapshot([def('a', { minSuperAppVersion: 'v1.3.0' }), def('b', { minSuperAppVersion: 'v1.10.0' })]);
    const r = evaluateAgainstCatalog([{ type: 'a', required: true }, { type: 'b', required: true }], multi);
    expect(r.unavailableReason).toBe('Unavailable until Super App v1.10.0');
  });

  it('switched-off, deprecated and past-max capabilities count as unsupported (findByKey ignored these)', () => {
    const r = evaluateAgainstCatalog(['legacy_sms', 'old_storage', 'fax'], catalog);
    expect(r.capabilities.map((c) => c.reason)).toEqual(['RETIRED', 'RETIRED', 'RETIRED']);
  });

  it('switches on automatically once the host version reaches minSuperAppVersion', () => {
    const declared = [{ type: 'biometrics', required: true }];
    expect(evaluateAgainstCatalog(declared, catalog).launchable).toBe(false);
    const upgraded = snapshot([def('biometrics', { minSuperAppVersion: 'v1.4.0' })], 'v1.4.0');
    expect(evaluateAgainstCatalog(declared, upgraded).launchable).toBe(true);
  });

  it('matches keys case-insensitively, de-duplicates, and ignores junk entries', () => {
    const r = evaluateAgainstCatalog(['CAMERA', 'camera', '', null, 42, { required: true }], catalog);
    expect(r.capabilities).toHaveLength(1);
    expect(r.capabilities[0]).toMatchObject({ key: 'camera', supported: true });
  });

  it('treats a missing list as no capabilities (launchable)', () => {
    expect(evaluateAgainstCatalog(undefined, catalog)).toMatchObject({ capabilities: [], launchable: true });
  });

  it('skips the version range when no Super App release is recorded yet', () => {
    const r = evaluateAgainstCatalog([{ type: 'biometrics', required: true }], snapshot([def('biometrics', { minSuperAppVersion: 'v9.0.0' })], null));
    expect(r.launchable).toBe(true);
  });
});

describe('helpers', () => {
  it('compareVersions orders semver numerically, with or without the v prefix', () => {
    expect(compareVersions('v1.10.0', 'v1.9.9')).toBeGreaterThan(0);
    expect(compareVersions('1.2', 'v1.2.0')).toBe(0);
    expect(compareVersions('v1.2.0', 'v1.4.0')).toBeLessThan(0);
  });

  it('normalizeDeclared reads type, then key, then name; required defaults to false', () => {
    expect(normalizeDeclared({ type: 'camera' })).toEqual({ key: 'camera', required: false });
    expect(normalizeDeclared({ name: 'nfc', required: true })).toEqual({ key: 'nfc', required: true });
    expect(normalizeDeclared('  gps ')).toEqual({ key: 'gps', required: false });
    expect(normalizeDeclared({})).toBeNull();
  });
});
