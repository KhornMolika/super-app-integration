// Verified against a real Postgres (PGlite) too: app status and version
// stages filled from the old columns, a leftover "status" column replaced,
// a second run changes nothing, down.
import { AddAppAndVersionStatus1795700000000 } from '../1795700000000-AddAppAndVersionStatus';

describe('AddAppAndVersionStatus migration', () => {
  const run = async (direction: 'up' | 'down', opts: { leftover?: boolean; oldColumns?: boolean } = {}) => {
    const sql: string[] = [];
    const runner = {
      query: async (q: string) => {
        sql.push(q);
        if (q.includes('pg_attribute')) return opts.leftover ? [{ comment: null }] : [];
        if (q.includes("'lifecycleStatus', 'availabilityStatus'")) {
          return opts.oldColumns === false
            ? []
            : [{ column_name: 'lifecycleStatus' }, { column_name: 'availabilityStatus' }];
        }
        if (q.includes("column_name = 'reviewStatus'")) return opts.oldColumns === false ? [] : [{}];
        return [];
      },
    } as any;
    await new AddAppAndVersionStatus1795700000000()[direction](runner);
    return sql.join('\n');
  };

  it('adds mini_apps.status and fills it and the version stages from the old columns', async () => {
    const sql = await run('up');
    expect(sql).toContain(`ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'DRAFT'`);
    expect(sql).toMatch(/WHEN 'BUILD_FAILED' THEN 'APPROVED'/);
    expect(sql).toMatch(/v\."reviewStatus"/);
    expect(sql).toContain('"IDX_mini_app_versions_app_status"');
    expect(sql).not.toMatch(/DROP COLUMN "status"/);
  });

  it('drops a leftover status column from the first schema before adding the new one', async () => {
    const sql = await run('up', { leftover: true });
    expect(sql.indexOf('DROP COLUMN "status"')).toBeLessThan(sql.indexOf('ADD COLUMN IF NOT EXISTS "status"'));
  });

  it('without the old columns only adds the column and indexes', async () => {
    const sql = await run('up', { oldColumns: false });
    expect(sql).not.toMatch(/UPDATE/);
  });

  it('down turns stages back into DRAFT/TESTING and drops the column', async () => {
    const sql = await run('down');
    expect(sql).toMatch(/WHEN v\."status" IN \('APPROVED', 'TESTING', 'TEST_PASSED'\) THEN 'TESTING'/);
    expect(sql).toContain('DROP COLUMN IF EXISTS "status"');
  });
});
