// Verified against a real Postgres (PGlite) too: backfill only for rows
// without capability rows, both columns dropped, rerun, down refilling both.
import { DropCapabilityJsonColumns1795400000000 } from '../1795400000000-DropCapabilityJsonColumns';

describe('DropCapabilityJsonColumns migration', () => {
  const run = async (direction: 'up' | 'down', present = true) => {
    const sql: string[] = [];
    const runner = {
      query: async (q: string) => {
        sql.push(q);
        if (!q.includes('information_schema')) return [];
        return present
          ? [
              { table_name: 'mini_apps', column_name: 'capabilities' },
              { table_name: 'mini_app_versions', column_name: 'permissions' },
            ]
          : [];
      },
    } as any;
    await new DropCapabilityJsonColumns1795400000000()[direction](runner);
    return sql.join('\n');
  };

  it('backfills missing capability rows before dropping each column', async () => {
    const sql = await run('up');
    const dropApps = sql.indexOf('DROP COLUMN "capabilities"');
    const dropVersions = sql.indexOf('DROP COLUMN "permissions"');
    expect(dropApps).toBeGreaterThan(sql.indexOf('INSERT INTO "mini_app_version_capabilities"'));
    expect(dropVersions).toBeGreaterThan(dropApps);
    expect(sql.match(/INSERT INTO "mini_app_version_capabilities"/g)).toHaveLength(3);
    expect(sql).toContain('NOT EXISTS (SELECT 1 FROM "mini_app_version_capabilities" c');
  });

  it('does nothing when the columns are already gone', async () => {
    expect(await run('up', false)).not.toMatch(/DROP COLUMN|INSERT/);
  });

  it('down refills both columns from the capability rows', async () => {
    const sql = await run('down');
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "permissions"/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "capabilities"/);
  });
});
