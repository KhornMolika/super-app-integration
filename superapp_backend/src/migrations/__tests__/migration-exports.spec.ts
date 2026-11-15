import { readdirSync } from 'fs';
import { join } from 'path';

/**
 * TypeORM loads every export of every file the migrations glob matches
 * (src/migrations/*.ts) as a migration, and refuses the whole run when one
 * is not a class named with a 13-digit timestamp ("insertCaps migration name
 * is wrong. Migration class name should have a JavaScript timestamp
 * appended."). Shared SQL helpers belong in src/migrations/sql/.
 */
describe('migration files', () => {
  const dir = join(__dirname, '..');
  const files = readdirSync(dir).filter((f) => /\.ts$/.test(f) && !f.endsWith('.spec.ts'));

  it.each(files)('%s exports only its migration class', (file) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(join(dir, file));
    const exported = Object.entries(mod);
    expect(exported.length).toBeGreaterThan(0);
    for (const [name, value] of exported) {
      expect({ name, isClass: typeof value === 'function' && /^class\s/.test(Function.prototype.toString.call(value)) }).toEqual({
        name,
        isClass: true,
      });
      expect(name).toMatch(/\d{13}$/);
    }
  });
});
