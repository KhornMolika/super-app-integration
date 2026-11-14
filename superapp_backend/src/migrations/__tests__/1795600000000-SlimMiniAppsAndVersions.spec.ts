// Verified against a real Postgres (PGlite) too: a row made for apps without
// one, the served row taking the app integration with verification inside,
// revision rows untouched, leftovers folded, columns dropped, down.
import { SlimMiniAppsAndVersions1795600000000 } from '../1795600000000-SlimMiniAppsAndVersions';

describe('SlimMiniAppsAndVersions migration', () => {
  const run = async (direction: 'up' | 'down', present = true) => {
    const sql: string[] = [];
    const cols = present
      ? ['integrationConfig', 'homeWidget'].map((c) => ({ table_name: 'mini_apps', column_name: c })).concat(
          ['packageName', 'checksum', 'gitRef'].map((c) => ({ table_name: 'mini_app_versions', column_name: c })),
        )
      : [];
    const runner = {
      query: async (q: string) => {
        sql.push(q);
        return q.includes('information_schema') ? cols : [];
      },
    } as any;
    await new SlimMiniAppsAndVersions1795600000000()[direction](runner);
    return sql.join('\n');
  };

  it('copies every integration to a version row before dropping the app columns', async () => {
    const sql = await run('up');
    const drop = sql.indexOf('DROP COLUMN IF EXISTS "integrationConfig"');
    expect(sql.indexOf('INSERT INTO "mini_app_versions"')).toBeLessThan(drop);
    expect(sql.indexOf("'verificationToken', m.\"verificationToken\"")).toBeLessThan(drop);
    expect(sql).toContain('DROP COLUMN IF EXISTS "sharingScope"');
    expect(sql).toContain("'archiveChecksum', v.\"checksum\"");
    expect(sql).not.toMatch(/DELETE/);
  });

  it('runs again without the columns (only the always-safe drops)', async () => {
    const sql = await run('up', false);
    expect(sql).not.toMatch(/INSERT|UPDATE/);
  });

  it('down puts the app columns back from the served rows', async () => {
    const sql = await run('down');
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "integrationConfig" jsonb/);
    expect(sql).toMatch(/SET "integrationConfig" = s\.cfg - 'verificationToken'/);
  });
});
