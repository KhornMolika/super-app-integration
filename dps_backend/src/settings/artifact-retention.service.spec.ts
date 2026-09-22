import { ArtifactRetentionService } from './artifact-retention.service';

describe('ArtifactRetentionService Nexus auth', () => {
  const make = (env: Record<string, string | undefined>) =>
    new ArtifactRetentionService(
      {} as any,
      { get: (k: string, d?: string) => env[k] ?? d } as any,
    );

  it('refuses to call Nexus without NEXUS_ADMIN_PASSWORD (no default password)', () => {
    const svc: any = make({});
    expect(() => svc.getNexusAuthHeader()).toThrow(/NEXUS_ADMIN_PASSWORD/);
  });

  it('builds a Basic header from configured credentials', () => {
    const svc: any = make({ NEXUS_ADMIN_USER: 'u', NEXUS_ADMIN_PASSWORD: 'p' });
    expect(svc.getNexusAuthHeader().Authorization).toBe(
      `Basic ${Buffer.from('u:p').toString('base64')}`,
    );
  });
});
