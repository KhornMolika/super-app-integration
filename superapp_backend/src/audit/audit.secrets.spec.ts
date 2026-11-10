import { AuditService } from './audit.service';

function service(rows: any[] = []) {
  const saved: any[] = [];
  const qb: any = {
    where: () => qb,
    take: () => qb,
    getMany: async () => rows.filter((r) => JSON.stringify(r).includes('Hash')),
  };
  const repo = {
    create: (d: any) => ({ ...d }),
    save: async (e: any) => {
      saved.push(JSON.parse(JSON.stringify(e)));
      return e;
    },
    createQueryBuilder: () => qb,
  };
  const users = { findOne: async () => null };
  return { svc: new AuditService(repo as any, users as any), saved };
}

describe('AuditService never stores secrets', () => {
  it('strips password and token hashes from new entries, at any depth', async () => {
    const { svc, saved } = service();
    await svc.log({
      action: 'MINIAPP_UPDATED',
      actorName: 'x',
      oldValue: { owner: { id: 'u1', passwordHash: 'scrypt$old' } },
      newValue: { owner: { id: 'u1', name: 'Dara', passwordHash: 'scrypt$new' }, tokens: [{ tokenHash: 'h' }] },
      metadata: { refreshTokenHash: 'r' },
    } as any);
    const text = JSON.stringify(saved[0]);
    expect(text).not.toMatch(/scrypt|passwordHash|tokenHash|refreshTokenHash/);
    expect(saved[0].newValue.owner.name).toBe('Dara');
  });

  it('scrubs entries that were stored with secrets before', async () => {
    const rows = [
      { id: 'a', newValue: { owner: { id: 'u1', passwordHash: 'scrypt$x' } }, oldValue: null, metadata: null },
      { id: 'b', newValue: { owner: { id: 'u2', passwordHash: null } }, oldValue: null, metadata: null },
    ];
    const { svc, saved } = service(rows);
    // b only had an empty key, which is removed too
    expect(await svc.scrubStoredSecrets()).toBe(2);
    expect(saved.map((r) => r.id)).toEqual(['a', 'b']);
    expect(JSON.stringify(saved)).not.toMatch(/scrypt|passwordHash/);
    expect(saved[0].newValue.owner.id).toBe('u1');
  });
});
