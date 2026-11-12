import { nexusApiBaseUrl } from './nexus-url';

describe('nexusApiBaseUrl', () => {
  const env = (vars: Record<string, string | undefined>) => (k: string) => vars[k];
  const saved = { ...process.env };
  beforeEach(() => {
    delete process.env.NEXUS_INTERNAL_URL;
    delete process.env.NEXUS_BASE_URL;
  });
  afterAll(() => {
    process.env = saved;
  });

  it('prefers the in-cluster address, so calls do not go out through the ingress', () => {
    expect(
      nexusApiBaseUrl(env({
        NEXUS_INTERNAL_URL: 'http://super-app-nexus-svc.super-app.svc.cluster.local:8081/nexus/',
        NEXUS_BASE_URL: 'https://app.fintechcenterfsa.com/nexus',
      })),
    ).toBe('http://super-app-nexus-svc.super-app.svc.cluster.local:8081/nexus');
  });

  it('falls back to NEXUS_BASE_URL, then localhost', () => {
    expect(nexusApiBaseUrl(env({ NEXUS_BASE_URL: 'https://app.fintechcenterfsa.com/nexus' }))).toBe(
      'https://app.fintechcenterfsa.com/nexus',
    );
    expect(nexusApiBaseUrl(env({ NEXUS_INTERNAL_URL: '  ' }))).toBe('http://localhost:8081');
  });
});
