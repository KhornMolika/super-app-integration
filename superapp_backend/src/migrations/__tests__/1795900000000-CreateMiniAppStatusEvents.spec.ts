// Verified against a real Postgres (PGlite) too: events made from the
// existing suspension / archive request, replayed to the same state, the
// jsonb columns dropped, a second run inserts nothing, down.
import { CreateMiniAppStatusEvents1795900000000 } from '../1795900000000-CreateMiniAppStatusEvents';

describe('CreateMiniAppStatusEvents migration', () => {
  const run = async (direction: 'up' | 'down', present = true) => {
    const sql: string[] = [];
    const runner = {
      query: async (q: string) => {
        sql.push(q);
        if (q.includes('information_schema')) {
          return present ? [{ column_name: 'suspension' }, { column_name: 'archiveRequest' }] : [];
        }
        return [];
      },
    } as any;
    await new CreateMiniAppStatusEvents1795900000000()[direction](runner);
    return sql.join('\n');
  };

  it('makes events from the existing state before dropping the jsonb columns', async () => {
    const sql = await run('up');
    const drop = sql.indexOf('DROP COLUMN IF EXISTS "suspension"');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "mini_app_status_events"');
    expect(sql).toContain('ON DELETE CASCADE');
    expect(sql.indexOf("'SUSPENDED'")).toBeLessThan(drop);
    expect(sql.indexOf("'ARCHIVED'")).toBeLessThan(drop);
    expect(sql.indexOf("'ARCHIVE_REQUESTED'")).toBeLessThan(drop);
  });

  it('runs again without the columns (no events made twice)', async () => {
    const sql = await run('up', false);
    expect(sql).not.toMatch(/INSERT INTO/);
  });

  it('down puts the columns back from the events', async () => {
    const sql = await run('down');
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "suspension" jsonb/);
    expect(sql).toContain('DROP TABLE IF EXISTS "mini_app_status_events"');
  });
});
