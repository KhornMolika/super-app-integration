// Lives in __tests__/ because data-source.ts loads every file matching
// src/migrations/*{.ts,.js} as a migration: a spec there crashes the TypeORM CLI.
// The trigger behaviour itself was verified against a real Postgres (PGlite).
import { CreateMiniAppScans1794900000000 } from '../1794900000000-CreateMiniAppScans';

describe('CreateMiniAppScans migration', () => {
  const run = async (buildColumns: string[]) => {
    const sql: string[] = [];
    const runner = {
      query: async (q: string, params?: unknown[]) => {
        if (q.includes('information_schema.columns')) {
          return params?.[0] === 'mini_app_builds'
            ? buildColumns.map((column_name) => ({ column_name }))
            : [];
        }
        sql.push(q);
        return [];
      },
    } as any;
    await new CreateMiniAppScans1794900000000().up(runner);
    return sql.join('\n');
  };

  it('creates mini_app_scans tied to the app and its version', async () => {
    const sql = await run([]);
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "mini_app_scans"');
    expect(sql).toMatch(/REFERENCES "mini_apps"\("id"\) ON DELETE CASCADE/);
    expect(sql).toMatch(
      /REFERENCES "mini_app_versions"\("id"\) ON DELETE SET NULL/,
    );
  });

  it('moves scan results off mini_app_builds only when the columns exist', async () => {
    const withLegacy = await run(['validationStatus', 'validationReport']);
    expect(withLegacy).toContain('FROM "mini_app_builds" b');
    expect(withLegacy).toContain('DROP COLUMN IF EXISTS "validationStatus"');
    const fresh = await run([]);
    expect(fresh).not.toContain('DROP COLUMN IF EXISTS "validationStatus"');
  });

  it('backfills app scans, revision scans and builds', async () => {
    const sql = await run([]);
    expect(sql).toMatch(/SELECT m\."id", v\."id", m\."version", 'APP'/);
    expect(sql).toMatch(
      /'REVISION',\s+m\."pendingRevision"->>'validationStatus'/,
    );
    expect(sql).toContain('INSERT INTO "mini_app_builds"');
  });

  it('keeps the legacy columns in sync without ever blocking a mini_apps write', async () => {
    const sql = await run([]);
    expect(sql).toContain('CREATE TRIGGER "trg_mini_app_scan_sync"');
    expect(sql).toContain('CREATE TRIGGER "trg_mini_app_build_sync"');
    expect(
      sql.match(/EXCEPTION WHEN OTHERS THEN\s+RAISE WARNING/g),
    ).toHaveLength(2);
  });
});
