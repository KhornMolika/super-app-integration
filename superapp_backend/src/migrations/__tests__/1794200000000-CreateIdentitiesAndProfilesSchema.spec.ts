// Lives in __tests__/ because data-source.ts loads every file matching
// src/migrations/*{.ts,.js} as a migration: a spec there crashes the TypeORM CLI.
import { CreateIdentitiesAndProfilesSchema1794200000000 } from '../1794200000000-CreateIdentitiesAndProfilesSchema';

describe('CreateIdentitiesAndProfilesSchema migration', () => {
  // Mirrors production: legacy "user" never got staffId/position/phoneNumber,
  // and end_users never got phoneNumber.
  const legacyColumns: Record<string, string[]> = {
    user: ['id', 'email', 'name', 'externalId', 'passwordHash', 'status', 'roleId', 'organizationId', 'createdAt', 'updatedAt'],
    end_users: ['id', 'email', 'name', 'passwordHash', 'status', 'emailVerifiedAt', 'failedLoginCount', 'staffId', 'position', 'createdAt', 'updatedAt'],
  };
  const tables = new Set(['role', 'organizations', 'user', 'user_roles', 'end_users']);

  const runUp = async () => {
    const sql: string[] = [];
    const runner = {
      hasTable: async (t: string) => tables.has(t),
      query: async (q: string, params?: unknown[]) => {
        if (q.includes('information_schema.columns')) {
          return (legacyColumns[params![0] as string] ?? []).map((column_name) => ({ column_name }));
        }
        sql.push(q);
        return [];
      },
    } as any;
    await new CreateIdentitiesAndProfilesSchema1794200000000().up(runner);
    return sql.join('\n');
  };

  it('never references legacy columns that do not exist', async () => {
    const up = await runUp();
    for (const missing of ['u."staffId"', 'u."position"', 'u."phoneNumber"', 'eu."phoneNumber"']) {
      expect(up).not.toContain(missing);
    }
  });

  it('still copies legacy columns that do exist', async () => {
    const up = await runUp();
    expect(up).toContain('u."externalId"');
    expect(up).toContain('COALESCE(u."roleId", ur."roleId")');
    expect(up).toContain('eu."emailVerifiedAt"');
  });
});
