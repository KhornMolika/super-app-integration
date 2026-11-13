// Lives in __tests__/: see 1794900000000-CreateMiniAppScans.spec.ts.
// Verified against a real Postgres (PGlite) as well.
import { DropRunColumnsFromMiniApps1795000000000 } from '../1795000000000-DropRunColumnsFromMiniApps';

describe('DropRunColumnsFromMiniApps migration', () => {
  const run = async (dir: 'up' | 'down') => {
    const sql: string[] = [];
    await new DropRunColumnsFromMiniApps1795000000000()[dir]({
      query: async (q: string) => {
        sql.push(q);
        return [];
      },
    } as any);
    return sql.join('\n');
  };

  it('drops the sync triggers and the 7 run columns, keeps securityChecks', async () => {
    const sql = await run('up');
    expect(sql).toContain('DROP TRIGGER IF EXISTS "trg_mini_app_scan_sync"');
    expect(sql).toContain('DROP TRIGGER IF EXISTS "trg_mini_app_build_sync"');
    for (const col of [
      'validationStatus',
      'validationStages',
      'validationReport',
      'validationErrors',
      'buildStatus',
      'buildStages',
      'buildError',
    ]) {
      expect(sql).toContain(`DROP COLUMN IF EXISTS "${col}"`);
    }
    expect(sql).not.toContain('"securityChecks"');
  });

  it('removes scan fields from pendingRevision', async () => {
    expect(await run('up')).toMatch(/"pendingRevision" - 'validationStatus'/);
  });

  it('down restores the columns from the latest runs', async () => {
    const sql = await run('down');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "buildStatus"');
    expect(sql).toMatch(/FROM "mini_app_scans"\s+WHERE "scope" = 'APP'/);
  });
});
