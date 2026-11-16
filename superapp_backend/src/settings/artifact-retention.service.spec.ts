import {
  ArtifactRetentionService,
  DEFAULT_RETENTION_POLICY,
} from './artifact-retention.service';

describe('ArtifactRetentionService', () => {
  const make = (env: Record<string, string | undefined> = {}) => {
    const settingsRepo = {
      findOne: jest.fn().mockResolvedValue({
        key: 'artifact_retention_policy',
        value: { ...DEFAULT_RETENTION_POLICY },
      }),
      save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
    };
    const configService = {
      get: (k: string, d?: string) => env[k] ?? d,
    };
    return new ArtifactRetentionService(
      settingsRepo as any,
      configService as any,
    );
  };

  describe('Nexus auth', () => {
    it('refuses to call Nexus without NEXUS_ADMIN_PASSWORD (no default password)', () => {
      const svc = make({});
      expect(() => (svc as any).getNexusAuthHeader()).toThrow(
        /NEXUS_ADMIN_PASSWORD/,
      );
    });

    it('builds a Basic header from configured credentials', () => {
      const svc = make({ NEXUS_ADMIN_USER: 'u', NEXUS_ADMIN_PASSWORD: 'p' });
      expect((svc as any).getNexusAuthHeader().Authorization).toBe(
        `Basic ${Buffer.from('u:p').toString('base64')}`,
      );
    });
  });

  describe('groupAssetsByAppAndVersion', () => {
    it('handles Nexus paths with leading slashes correctly (extracts appName and version)', () => {
      const svc = make();
      const items = [
        { id: '1', path: '/superapp/v0.0.7/superapp-test-v0.0.7.apk', fileSize: 1000 },
        { id: '2', path: '/superapp/v1.1.9/superapp-test-v1.1.9.apk', fileSize: 2000 },
        { id: '3', path: '/superapp/v1.1.9/native_sdks.json', fileSize: 50 },
        { id: '4', path: '/custom-app/v2.0.0/app.apk', fileSize: 3000 },
      ];

      const groups = svc.groupAssetsByAppAndVersion(items);
      expect(Object.keys(groups)).toEqual(['superapp', 'custom-app']);
      expect(Object.keys(groups['superapp'])).toEqual(['v0.0.7', 'v1.1.9']);
      expect(groups['superapp']['v0.0.7'].length).toBe(1);
      expect(groups['superapp']['v1.1.9'].length).toBe(2);
      expect(groups['custom-app']['v2.0.0'].length).toBe(1);
    });

    it('handles paths without leading slashes and flat filenames gracefully', () => {
      const svc = make();
      const items = [
        { id: '1', path: 'superapp/v1.0.0/test.apk' },
        { id: '2', path: '/superapp/standalone.apk' },
        { id: '3', path: 'root.apk' },
      ];

      const groups = svc.groupAssetsByAppAndVersion(items);
      expect(groups['superapp']['v1.0.0']).toBeDefined();
      expect(groups['superapp']['default']).toBeDefined();
    });
  });

  describe('sortVersions', () => {
    it('sorts versions newest-first by timestamp and prioritizes latest', () => {
      const svc = make();
      const versionMap = {
        'v0.0.7': [{ lastModified: '2026-10-09T09:00:00Z' }],
        'v1.1.8': [{ lastModified: '2026-11-16T00:00:00Z' }],
        'v1.1.9': [{ lastModified: '2026-11-16T03:00:00Z' }],
        'latest': [{ lastModified: '2026-10-01T00:00:00Z' }],
      };

      const sorted = svc.sortVersions(versionMap);
      const versionOrder = sorted.map((s) => s.version);
      expect(versionOrder).toEqual(['latest', 'v1.1.9', 'v1.1.8', 'v0.0.7']);
    });
  });

  describe('executePruning and getStorageStats', () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('identifies and deletes older test builds while strictly protecting top N versions', async () => {
      const svc = make({
        NEXUS_BASE_URL: 'http://test-nexus:8081',
        NEXUS_ADMIN_USER: 'admin',
        NEXUS_ADMIN_PASSWORD: 'secretpassword',
      });

      const mockAssets = [
        { id: 'a1', path: '/superapp/v1.1.9/app.apk', fileSize: 75 * 1024 * 1024, lastModified: '2026-11-16T03:00:00Z' },
        { id: 'a2', path: '/superapp/v1.1.8/app.apk', fileSize: 75 * 1024 * 1024, lastModified: '2026-11-16T00:00:00Z' },
        { id: 'a3', path: '/superapp/v1.1.7/app.apk', fileSize: 75 * 1024 * 1024, lastModified: '2026-11-15T12:00:00Z' },
        { id: 'a4', path: '/superapp/v1.1.6/app.apk', fileSize: 75 * 1024 * 1024, lastModified: '2026-11-15T00:00:00Z' },
        { id: 'a5', path: '/superapp/v0.0.7/app.apk', fileSize: 20 * 1024 * 1024, lastModified: '2026-10-09T00:00:00Z' },
      ];

      const deletedAssetIds: string[] = [];

      global.fetch = jest.fn().mockImplementation((url: string, init?: any) => {
        const urlStr = url.toString();
        if (urlStr.includes('/service/rest/v1/status')) {
          return Promise.resolve({ ok: true, status: 200 });
        }
        if (urlStr.includes('/service/rest/v1/assets?repository=apk-test-builds')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ items: mockAssets, continuationToken: null }),
          });
        }
        if (urlStr.includes('/service/rest/v1/assets?repository=apk-releases')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ items: [], continuationToken: null }),
          });
        }
        if (init?.method === 'DELETE') {
          const match = urlStr.match(/\/service\/rest\/v1\/assets\/(.+)$/);
          if (match) {
            deletedAssetIds.push(decodeURIComponent(match[1]));
          }
          return Promise.resolve({ ok: true, status: 204 });
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      }) as any;

      const result = await svc.executePruning('MANUAL');

      expect(result.success).toBe(true);
      // With maxTestBuildsPerApp = 3, top 3 (v1.1.9, v1.1.8, v1.1.7) are protected.
      // v1.1.6 and v0.0.7 are pruned.
      expect(result.prunedCount).toBe(2);
      expect(deletedAssetIds).toEqual(['a4', 'a5']);
      expect(result.protectedReleasesPreserved).toBe(0);

      const retainedDetails = result.details.filter((d) => d.status === 'RETAINED_RECENT_BUILD');
      expect(retainedDetails.length).toBe(3);
      const prunedDetails = result.details.filter((d) => d.status === 'PRUNED_SUCCESS');
      expect(prunedDetails.length).toBe(2);
    });

    it('estimates prunable storage accurately in getStorageStats', async () => {
      const svc = make({
        NEXUS_BASE_URL: 'http://test-nexus:8081',
        NEXUS_ADMIN_USER: 'admin',
        NEXUS_ADMIN_PASSWORD: 'secretpassword',
      });

      const mockAssets = [
        { id: 'a1', path: '/superapp/v1.1.9/app.apk', fileSize: 50 * 1024 * 1024, lastModified: '2026-11-16T03:00:00Z' },
        { id: 'a2', path: '/superapp/v1.1.8/app.apk', fileSize: 50 * 1024 * 1024, lastModified: '2026-11-16T00:00:00Z' },
        { id: 'a3', path: '/superapp/v1.1.7/app.apk', fileSize: 50 * 1024 * 1024, lastModified: '2026-11-15T12:00:00Z' },
        { id: 'a4', path: '/superapp/v1.1.6/app.apk', fileSize: 30 * 1024 * 1024, lastModified: '2026-11-15T00:00:00Z' },
      ];

      global.fetch = jest.fn().mockImplementation((url: string) => {
        const urlStr = url.toString();
        if (urlStr.includes('/service/rest/v1/status')) {
          return Promise.resolve({ ok: true, status: 200 });
        }
        if (urlStr.includes('/service/rest/v1/assets?repository=apk-test-builds')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ items: mockAssets, continuationToken: null }),
          });
        }
        if (urlStr.includes('/service/rest/v1/assets?repository=apk-releases')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ items: [], continuationToken: null }),
          });
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      }) as any;

      const stats = await svc.getStorageStats();
      expect(stats.nexusTestBuildsCount).toBe(4);
      expect(stats.estimatedPrunableCount).toBe(1);
      expect(stats.estimatedPrunableMb).toBe(30);
    });
  });
});
