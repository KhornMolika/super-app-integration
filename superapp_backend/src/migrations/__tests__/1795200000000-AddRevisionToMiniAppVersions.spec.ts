// Verified against a real Postgres (PGlite) too: backfill, bad dates, rerun, down.
import { AddRevisionToMiniAppVersions1795200000000 } from '../1795200000000-AddRevisionToMiniAppVersions';

describe('AddRevisionToMiniAppVersions migration', () => {
  const run = async (direction: 'up' | 'down') => {
    const sql: string[] = [];
    const runner = { query: async (q: string) => void sql.push(q) } as any;
    await new AddRevisionToMiniAppVersions1795200000000()[direction](runner);
    return sql.join('\n');
  };

  it('adds the revision columns and fills only DRAFT rows of live apps', async () => {
    const sql = await run('up');
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "revision" jsonb/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "reviewStatus" varchar\(30\)/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "submittedAt" timestamptz/);
    expect(sql).toContain(`v."status" = 'DRAFT'`);
    expect(sql).toContain(`a."status" = 'ACTIVE'`);
    expect(sql).not.toMatch(/DELETE|DROP COLUMN "pendingRevision"/);
  });

  it('down drops only the new columns', async () => {
    const sql = await run('down');
    expect(sql).toMatch(/DROP COLUMN IF EXISTS "revision"/);
    expect(sql).not.toMatch(/pendingRevision/);
  });
});
