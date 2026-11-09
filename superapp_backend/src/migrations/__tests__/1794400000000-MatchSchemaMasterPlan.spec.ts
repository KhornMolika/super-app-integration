// Lives in __tests__/ because data-source.ts loads every file matching
// src/migrations/*{.ts,.js} as a migration: a spec there crashes the TypeORM CLI.
import { MatchSchemaMasterPlan1794400000000 } from '../1794400000000-MatchSchemaMasterPlan';

describe('MatchSchemaMasterPlan migration', () => {
  const LEGACY = ['permission_proposals', 'user_roles', 'miniapp_activities', 'permission_definitions', 'user', 'end_users'];

  const run = async (opts: { orgs?: Array<{ id: string; name: string; code: string | null }>; unresolvedApps?: number } = {}) => {
    const tables = new Set([
      'role', 'permission', 'notification', 'miniapp_versions', 'miniapp_builds', 'miniapp_legal',
      'mini_app_issue', 'end_user_refresh_tokens', ...LEGACY,
    ]);
    const columns: Record<string, string[]> = {
      mini_apps: ['id', 'organizationId', 'organizationCode', 'organization', 'ownerId'],
      mini_app_collaborators: ['userId'],
      notifications: ['userId'],
      developer_tokens: ['userId'],
      refresh_tokens: ['endUserId'],
    };
    const sql: string[] = [];
    const runner = {
      hasTable: async (t: string) => tables.has(t),
      query: async (q: string, params?: unknown[]) => {
        if (q.includes('FROM "organizations" ORDER BY')) return opts.orgs ?? [];
        if (q.includes('information_schema.columns')) return (columns[params![0] as string] ?? []).map((column_name) => ({ column_name }));
        if (q.includes('pg_constraint c')) return [];
        if (q.includes('AS remaining')) return [{ remaining: opts.unresolvedApps ?? 0 }];
        sql.push(q);
        const rename = q.match(/ALTER TABLE "([^"]+)" RENAME TO "([^"]+)"/);
        if (rename) { tables.delete(rename[1]); tables.add(rename[2]); }
        const drop = q.match(/DROP TABLE "([^"]+)"/);
        if (drop) tables.delete(drop[1]);
        return [];
      },
    } as any;
    await new MatchSchemaMasterPlan1794400000000().up(runner);
    return { sql: sql.join('\n'), statements: sql, tables };
  };

  it('renames tables and identity FK columns to the documented names', async () => {
    const { sql } = await run();
    for (const [from, to] of [['role', 'roles'], ['permission', 'permissions'], ['notification', 'notifications'], ['miniapp_versions', 'mini_app_versions'], ['end_user_refresh_tokens', 'refresh_tokens'], ['mini_app_issue', 'mini_app_issues']]) {
      expect(sql).toContain(`ALTER TABLE "${from}" RENAME TO "${to}"`);
    }
    expect(sql).toContain('ALTER TABLE "refresh_tokens" RENAME COLUMN "endUserId" TO "identityId"');
    expect(sql).toContain('ALTER TABLE "notifications" RENAME COLUMN "userId" TO "identityId"');
  });

  it('applies the documented ON DELETE rules and constraints', async () => {
    const { sql } = await run();
    expect(sql).toMatch(/"mini_apps" ADD CONSTRAINT "[^"]+" FOREIGN KEY \("organizationId"\) REFERENCES "organizations"\("id"\) ON DELETE RESTRICT/);
    expect(sql).toMatch(/"mini_apps" ADD CONSTRAINT "[^"]+" FOREIGN KEY \("ownerId"\) REFERENCES "identities"\("id"\) ON DELETE SET NULL/);
    expect(sql).toMatch(/"capability_proposals" ADD CONSTRAINT "[^"]+" FOREIGN KEY \("requestedById"\) REFERENCES "identities"\("id"\) ON DELETE SET NULL/);
    expect(sql).toContain('UNIQUE ("organizationId", "staffId")');
    expect(sql).toContain('ALTER TABLE "organizations" ALTER COLUMN "code" SET NOT NULL');
    expect(sql).toContain("ADD VALUE IF NOT EXISTS 'SUSPENDED'");
  });

  it('copies legacy capability rows before dropping legacy tables, without CASCADE', async () => {
    const { statements, tables } = await run();
    const copyIdx = statements.findIndex((s) => s.includes('INSERT INTO "capability_proposals"'));
    const dropIdx = statements.findIndex((s) => s.includes('DROP TABLE "permission_proposals"'));
    expect(copyIdx).toBeGreaterThan(-1);
    expect(dropIdx).toBeGreaterThan(copyIdx);
    expect(statements.join('\n')).not.toMatch(/DROP TABLE[^;]*CASCADE/);
    for (const t of LEGACY) expect(tables.has(t)).toBe(false);
  });

  it('generates unique codes for organizations missing or duplicating one', async () => {
    const { statements } = await run({
      orgs: [
        { id: 'a', name: 'Non-Bank Financial Services Authority', code: 'FSA' },
        { id: 'b', name: 'Trust Regulator', code: null },
        { id: 'c', name: 'Dup Org', code: 'FSA' },
      ],
    });
    const updates = statements.filter((s) => s.startsWith('UPDATE "organizations" SET "code"'));
    expect(updates).toHaveLength(2);
  });

  it('aborts instead of guessing when a mini app has no resolvable organization', async () => {
    await expect(run({ unresolvedApps: 2 })).rejects.toThrow(/2 mini_apps have no organization/);
  });
});
