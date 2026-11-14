// Verified against a real Postgres (PGlite) too: live, working and revision
// rows filled, older rows kept, liveVersionId set and cleared on delete, down.
import { IntegrationOnVersions1795500000000 } from '../1795500000000-IntegrationOnVersions';

describe('IntegrationOnVersions migration', () => {
  const run = async (direction: 'up' | 'down') => {
    const sql: string[] = [];
    const runner = { query: async (q: string) => void sql.push(q) } as any;
    await new IntegrationOnVersions1795500000000()[direction](runner);
    return sql.join('\n');
  };

  it('adds the version integration columns and the live version pointer', async () => {
    const sql = await run('up');
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "integrationMethod" varchar\(30\)/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "homeWidget" jsonb/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "liveVersionId" uuid/);
    expect(sql).toMatch(/REFERENCES "mini_app_versions"\("id"\) ON DELETE SET NULL/);
    expect(sql).not.toMatch(/DROP COLUMN/);
  });

  it('down drops only what up added', async () => {
    const sql = await run('down');
    expect(sql).toMatch(/DROP COLUMN IF EXISTS "liveVersionId"/);
    expect(sql).not.toMatch(/"integrationConfig"/);
  });
});
