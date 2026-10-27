import { readdirSync } from 'fs';
import { join } from 'path';

// TypeORM runs migrations in timestamp order. InitialSchema creates every table
// from scratch, so on an empty database anything dated before it would run
// against tables that do not exist yet.
describe('migration order', () => {
  it('runs InitialSchema before every other migration', () => {
    const files = readdirSync(join(__dirname, '..')).filter((f) => /^\d+-.+\.ts$/.test(f));
    const stamp = (f: string) => Number(f.split('-')[0]);
    const initial = files.find((f) => f.endsWith('-InitialSchema.ts'));
    expect(initial).toBeDefined();
    for (const f of files.filter((f) => f !== initial)) {
      expect({ file: f, after: stamp(f) > stamp(initial!) }).toEqual({ file: f, after: true });
    }
  });
});
