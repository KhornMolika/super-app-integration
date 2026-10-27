// Lives in __tests__/ because data-source.ts loads every file matching
// src/migrations/*{.ts,.js} as a migration: a spec there crashes the TypeORM CLI.
import { AddEndUserAccountFeatures1790700000000 } from '../1790700000000-AddEndUserAccountFeatures';

describe('AddEndUserAccountFeatures migration', () => {
  const run = async (dir: 'up' | 'down') => {
    const sql: string[] = [];
    const runner = { query: async (q: string) => void sql.push(q) } as any;
    await new AddEndUserAccountFeatures1790700000000()[dir](runner);
    return sql.join('\n');
  };

  it('adds every end_users column idempotently', async () => {
    const up = await run('up');
    for (const col of [
      'honorific',
      'position',
      'organizationUnit',
      'staffId',
      'avatarKey',
      'avatarUpdatedAt',
      'sessionsRevokedAt',
      'deletionRequestedAt',
      'purgeAfter',
    ]) {
      expect(up).toContain(`ADD COLUMN IF NOT EXISTS "${col}"`);
    }
  });

  it('adds the nullable refresh-token familyStartedAt column idempotently', async () => {
    const up = await run('up');
    expect(up).toMatch(
      /ALTER TABLE "end_user_refresh_tokens"\s+ADD COLUMN IF NOT EXISTS "familyStartedAt" TIMESTAMP WITH TIME ZONE\s*$/m,
    );
  });

  it('down drops the columns', async () => {
    const down = await run('down');
    expect(down).toContain('DROP COLUMN IF EXISTS "purgeAfter"');
    expect(down).toMatch(
      /ALTER TABLE "end_user_refresh_tokens"\s+DROP COLUMN IF EXISTS "familyStartedAt"/,
    );
  });
});
