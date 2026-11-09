// Lives in __tests__/ because data-source.ts loads every file matching
// src/migrations/*{.ts,.js} as a migration: a spec there crashes the TypeORM CLI.
import { AlignIdentitiesColumnsAndForeignKeys1794300000000 } from '../1794300000000-AlignIdentitiesColumnsAndForeignKeys';

describe('AlignIdentitiesColumnsAndForeignKeys migration', () => {
  const tableColumns: Record<string, string[]> = {
    user: ['id', 'email', 'telegramChatId', 'telegramUsername', 'telegramConnectedAt'],
    end_users: ['id', 'email', 'deletionRequestedAt', 'purgeAfter'],
    notification: ['id', 'userId'],
    mini_apps: ['id', 'ownerId'],
    developer_tokens: ['id', 'userId'],
    capability_proposals: ['id', 'requestedById'],
    mini_app_collaborators: ['id', 'userId'],
    end_user_email_verification_tokens: ['id', 'userId'],
    end_user_refresh_tokens: ['id', 'endUserId'],
  };

  const runUp = async () => {
    const sql: string[] = [];
    const runner = {
      hasTable: async (t: string) => t in tableColumns,
      query: async (q: string, params?: unknown[]) => {
        if (q.includes('information_schema.columns') && q.includes('is_nullable')) {
          return [{ is_nullable: params![0] === 'mini_apps' ? 'YES' : 'NO' }];
        }
        if (q.includes('information_schema.columns')) {
          return (tableColumns[params![0] as string] ?? []).map((column_name) => ({ column_name }));
        }
        if (q.includes('pg_constraint')) return [{ conname: `FK_legacy_${params![0]}` }];
        sql.push(q);
        return [];
      },
    } as any;
    await new AlignIdentitiesColumnsAndForeignKeys1794300000000().up(runner);
    return sql.join('\n');
  };

  it('adds every Identity entity column the previous migration missed', async () => {
    const up = await runUp();
    for (const col of ['deletionRequestedAt', 'purgeAfter', 'telegramChatId', 'telegramUsername', 'telegramConnectedAt']) {
      expect(up).toContain(`ADD COLUMN IF NOT EXISTS "${col}"`);
    }
  });

  it('repoints every user FK to identities after dropping the legacy one', async () => {
    const up = await runUp();
    for (const table of Object.keys(tableColumns).filter((t) => t !== 'user' && t !== 'end_users')) {
      expect(up).toContain(`ALTER TABLE "${table}" DROP CONSTRAINT "FK_legacy_${table}"`);
      expect(up).toMatch(new RegExp(`ALTER TABLE "${table}"\\s+ADD CONSTRAINT "[^"]+" FOREIGN KEY \\("[^"]+"\\)\\s+REFERENCES "identities"\\("id"\\)`));
    }
  });

  it('remaps merged legacy ids by email and clears orphans by nullability', async () => {
    const up = await runUp();
    expect(up).toContain('JOIN "identities" i ON i."email" = lower(trim(l."email"))');
    expect(up).toMatch(/UPDATE "mini_apps" SET "ownerId" = NULL WHERE/);
    expect(up).toMatch(/DELETE FROM "end_user_refresh_tokens" WHERE/);
  });
});
