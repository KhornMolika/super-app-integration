// Verified against a real Postgres (PGlite) too: the new columns brought in
// line, an unreleased app's version string moved to its working row, the old
// columns dropped (activeTestVersion kept), down fills them back.
import { DropLegacyAppStatus1795800000000 } from '../1795800000000-DropLegacyAppStatus';

describe('DropLegacyAppStatus migration', () => {
  const run = async (direction: 'up' | 'down', present = true) => {
    const sql: string[] = [];
    const runner = {
      query: async (q: string) => {
        sql.push(q);
        if (q.includes('information_schema')) {
          return present
            ? ['lifecycleStatus', 'availabilityStatus', 'currentReleaseVersion'].map((column_name) => ({ column_name }))
            : [];
        }
        return [];
      },
    } as any;
    await new DropLegacyAppStatus1795800000000()[direction](runner);
    return sql.join('\n');
  };

  it('brings the new columns in line, then drops the old ones (not activeTestVersion)', async () => {
    const sql = await run('up');
    const drop = sql.indexOf('DROP COLUMN IF EXISTS "lifecycleStatus"');
    expect(sql.indexOf('SET "status" = CASE')).toBeLessThan(drop);
    expect(sql.indexOf('SET "version" = m."currentReleaseVersion"')).toBeLessThan(drop);
    expect(sql).toContain('DROP COLUMN IF EXISTS "draftVersion"');
    expect(sql).toContain('DROP COLUMN IF EXISTS "reviewStatus"');
    expect(sql).not.toContain('activeTestVersion');
  });

  it('runs again without the old columns (only the drops)', async () => {
    const sql = await run('up', false);
    expect(sql).not.toMatch(/UPDATE/);
  });

  it('down fills the old columns from the new ones', async () => {
    const sql = await run('down');
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "lifecycleStatus"/);
    expect(sql).toMatch(/WHEN 'LIVE' THEN 'PRODUCTION'/);
    expect(sql).toMatch(/SET "reviewStatus" = v\."status"/);
  });
});
