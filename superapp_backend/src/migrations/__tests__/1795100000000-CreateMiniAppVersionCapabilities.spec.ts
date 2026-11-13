// Lives in __tests__/ because data-source.ts loads every file matching
// src/migrations/*{.ts,.js} as a migration: a spec there crashes the TypeORM CLI.
// The backfill itself was verified against a real Postgres (PGlite): version
// row clean-up, capability parsing equal to parseDeclaredCapabilities(), reruns.
import { CreateMiniAppVersionCapabilities1795100000000 } from '../1795100000000-CreateMiniAppVersionCapabilities';

describe('CreateMiniAppVersionCapabilities migration', () => {
  const run = async (direction: 'up' | 'down') => {
    const sql: string[] = [];
    const runner = { query: async (q: string) => void sql.push(q) } as any;
    await new CreateMiniAppVersionCapabilities1795100000000()[direction](runner);
    return sql.join('\n');
  };

  it('creates one row per key per version, deleted with the version or the app', async () => {
    const sql = await run('up');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "mini_app_version_capabilities"');
    expect(sql).toMatch(/REFERENCES "mini_app_versions"\("id"\) ON DELETE CASCADE/);
    expect(sql).toMatch(/REFERENCES "mini_apps"\("id"\) ON DELETE CASCADE/);
    expect(sql).toMatch(/REFERENCES "identities"\("id"\) ON DELETE SET NULL/);
    expect(sql).toContain('"UQ_mini_app_version_capabilities_version_key"');
  });

  it('never deletes version rows: surplus ones become DEPRECATED', async () => {
    const sql = await run('up');
    expect(sql).not.toMatch(/DELETE FROM "mini_app_versions"/);
    expect(sql).toContain(`SET "status" = 'DEPRECATED'`);
  });

  it('backfills capabilities only for versions that have none yet (safe to rerun)', async () => {
    const sql = await run('up');
    expect(sql.match(/INSERT INTO "mini_app_version_capabilities"/g)).toHaveLength(4);
    expect(sql).toContain('NOT EXISTS (SELECT 1 FROM "mini_app_version_capabilities" c');
  });

  it('down drops only the new table', async () => {
    const sql = await run('down');
    expect(sql.trim()).toBe('DROP TABLE IF EXISTS "mini_app_version_capabilities"');
  });
});
