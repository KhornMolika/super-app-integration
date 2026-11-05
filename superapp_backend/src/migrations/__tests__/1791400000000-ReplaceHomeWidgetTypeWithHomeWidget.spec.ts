// Lives in __tests__/ because data-source.ts loads every file matching
// src/migrations/*{.ts,.js} as a migration: a spec there crashes the TypeORM CLI.
import { QueryRunner } from 'typeorm';
import { ReplaceHomeWidgetTypeWithHomeWidget1791400000000 } from '../1791400000000-ReplaceHomeWidgetTypeWithHomeWidget';

describe('ReplaceHomeWidgetTypeWithHomeWidget migration', () => {
  const run = async (dir: 'up' | 'down') => {
    const sql: string[] = [];
    const runner = {
      query: (q: string) => {
        sql.push(q);
        return Promise.resolve();
      },
    } as unknown as QueryRunner;
    await new ReplaceHomeWidgetTypeWithHomeWidget1791400000000()[dir](runner);
    return sql.join('; ');
  };

  it('has a name equal to the class name', () => {
    expect(new ReplaceHomeWidgetTypeWithHomeWidget1791400000000().name).toBe(
      'ReplaceHomeWidgetTypeWithHomeWidget1791400000000',
    );
  });

  it('up drops homeWidgetType and adds the nullable homeWidget jsonb column', async () => {
    expect(await run('up')).toBe(
      'ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "homeWidgetType"; ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "homeWidget" jsonb',
    );
  });

  it('down drops homeWidget and restores homeWidgetType', async () => {
    expect(await run('down')).toBe(
      'ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "homeWidget"; ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "homeWidgetType" character varying',
    );
  });
});
