import {
  appIntegrationFields,
  phoneIntegrationConfig,
  stableJson,
  storedIntegrationConfig,
} from './integration-fields';

describe('integration fields on the version row', () => {
  it('stores the domain verification inside integrationConfig', () => {
    const stored = storedIntegrationConfig({
      integrationConfig: { url: 'https://hr.example' },
      verificationToken: 'tok',
      isDomainVerified: true,
      domainVerifiedAt: new Date('2026-10-01T08:30:00Z'),
    });
    expect(stored).toEqual({
      url: 'https://hr.example',
      verificationToken: 'tok',
      isDomainVerified: true,
      domainVerifiedAt: '2026-10-01T08:30:00.000Z',
    });
  });

  it('a partial read (none of the fields) means no change', () => {
    expect(storedIntegrationConfig({})).toBeUndefined();
    expect(storedIntegrationConfig({ integrationConfig: null })).toBeNull();
  });

  it('reads the app fields back, with defaults', () => {
    expect(appIntegrationFields({ url: 'u', isDomainVerified: true, domainVerifiedAt: '2026-10-01T08:30:00.000Z' })).toEqual({
      integrationConfig: { url: 'u', isDomainVerified: true, domainVerifiedAt: '2026-10-01T08:30:00.000Z' },
      verificationToken: null,
      isDomainVerified: true,
      domainVerifiedAt: new Date('2026-10-01T08:30:00.000Z'),
    });
    expect(appIntegrationFields(null)).toMatchObject({ integrationConfig: null, isDomainVerified: false, domainVerifiedAt: null });
  });

  it('phones never get the verification fields', () => {
    expect(phoneIntegrationConfig({ url: 'u', verificationToken: 't', isDomainVerified: true, domainVerifiedAt: 'x' })).toEqual({ url: 'u' });
    expect(phoneIntegrationConfig(null)).toBeNull();
  });

  it('compares configs whatever the key order (jsonb reorders keys)', () => {
    expect(stableJson({ b: 1, a: { d: 2, c: 3 } })).toBe(stableJson({ a: { c: 3, d: 2 }, b: 1 }));
    expect(stableJson({ a: [2, 1] })).not.toBe(stableJson({ a: [1, 2] }));
  });
});
