import { StreamableFile } from '@nestjs/common';
import { stripSensitiveFields } from './sensitive-fields.interceptor';

describe('stripSensitiveFields', () => {
  it('removes secret keys at any depth, including arrays and eager relations', () => {
    const stripped: string[] = [];
    const body = {
      success: true,
      data: {
        id: 'app-1',
        owner: { id: 'u1', email: 'a@b.c', passwordHash: 'scrypt$...' },
        collaborators: [{ user: { id: 'u2', passwordHash: 'x' } }],
        tokens: [{ id: 't1', tokenPrefix: 'fsa_pat_', tokenHash: 'h' }],
      },
    };

    const out: any = stripSensitiveFields(body, (p) => stripped.push(p));

    expect(out.data.owner).toEqual({ id: 'u1', email: 'a@b.c' });
    expect(out.data.collaborators[0].user).toEqual({ id: 'u2' });
    expect(out.data.tokens[0]).toEqual({ id: 't1', tokenPrefix: 'fsa_pat_' });
    expect(stripped).toEqual([
      '$.data.owner.passwordHash',
      '$.data.collaborators[0].user.passwordHash',
      '$.data.tokens[0].tokenHash',
    ]);
  });

  it('drops but does not report unloaded (undefined) secret fields from entity instances', () => {
    class IdentityLike {
      id = 'u1';
      passwordHash: string | undefined = undefined; // select:false column, not loaded
    }
    const stripped: string[] = [];
    const out: any = stripSensitiveFields({ owner: new IdentityLike() }, (p) => stripped.push(p));
    expect('passwordHash' in out.owner).toBe(false);
    expect(stripped).toEqual([]); // no false alarm
  });

  it('does not mutate the original object', () => {
    const entity = { id: 'u1', passwordHash: 'secret' };
    stripSensitiveFields({ user: entity });
    expect(entity.passwordHash).toBe('secret');
  });

  it('keeps dates, buffers, streams and primitives intact', () => {
    const date = new Date('2026-11-09T00:00:00Z');
    const buf = Buffer.from('x');
    const file = new StreamableFile(buf);
    const out: any = stripSensitiveFields({ date, buf, file, n: 1, s: 'a', nil: null });
    expect(out.date).toBe(date);
    expect(out.buf).toBe(buf);
    expect(out.file).toBe(file);
    expect(out).toMatchObject({ n: 1, s: 'a', nil: null });
  });

  it('handles circular references without recursing forever', () => {
    const a: any = { id: 'a', passwordHash: 'x' };
    a.self = a;
    const out: any = stripSensitiveFields(a);
    expect(out.passwordHash).toBeUndefined();
    expect(out.self).toBe(out);
  });
});
