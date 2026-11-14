// Verified against a real Postgres (PGlite) too: copy to DRAFT/working rows,
// a DRAFT row made when missing, rerun, and down restoring every revision.
import { DropPendingRevisionFromMiniApps1795300000000 } from '../1795300000000-DropPendingRevisionFromMiniApps';

describe('DropPendingRevisionFromMiniApps migration', () => {
  const run = async (direction: 'up' | 'down', hasColumn = true) => {
    const sql: string[] = [];
    const runner = {
      query: async (q: string) => {
        sql.push(q);
        return q.includes('information_schema') ? (hasColumn ? [{ '?column?': 1 }] : []) : [];
      },
    } as any;
    await new DropPendingRevisionFromMiniApps1795300000000()[direction](runner);
    return sql.join('\n');
  };

  it('copies every revision to its version row before dropping the column', async () => {
    const sql = await run('up');
    const drop = sql.indexOf('DROP COLUMN "pendingRevision"');
    expect(drop).toBeGreaterThan(0);
    expect(sql.indexOf('INSERT INTO "mini_app_versions"')).toBeLessThan(drop);
    expect(sql.match(/UPDATE "mini_app_versions"/g)).toHaveLength(2);
    expect(sql).not.toMatch(/DELETE/);
  });

  it('does nothing when the column is already gone', async () => {
    const sql = await run('up', false);
    expect(sql).not.toMatch(/DROP COLUMN|INSERT|UPDATE/);
  });

  it('down brings the column back filled from the version rows', async () => {
    const sql = await run('down');
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "pendingRevision" jsonb/);
    expect(sql).toMatch(/SET "pendingRevision" = \(/);
  });
});
