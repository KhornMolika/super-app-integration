import { FakeRepo } from './testing/fake-repo';
import { EndUser, EndUserStatus } from './entities/end-user.entity';
import { AccountPurgeService } from './account-purge.service';

describe('AccountPurgeService.purgeDue', () => {
  it('hard-deletes only PENDING_DELETION accounts past purgeAfter, and their avatars', async () => {
    const users = new FakeRepo<EndUser>(['email']);
    const now = new Date('2026-12-01T00:00:00Z');
    const past = new Date('2026-11-30T00:00:00Z');
    const future = new Date('2026-12-15T00:00:00Z');
    users.rows.push(
      {
        id: 'due',
        email: 'a@x.io',
        status: EndUserStatus.PENDING_DELETION,
        purgeAfter: past,
        avatarKey: 'avatars/due/a.png',
      } as any,
      {
        id: 'later',
        email: 'b@x.io',
        status: EndUserStatus.PENDING_DELETION,
        purgeAfter: future,
        avatarKey: null,
      } as any,
      {
        id: 'active',
        email: 'c@x.io',
        status: EndUserStatus.ACTIVE,
        purgeAfter: past,
        avatarKey: null,
      } as any,
    );
    const avatars = { deleteObject: jest.fn(async () => undefined) };
    const svc = new AccountPurgeService(users as any, avatars as any);
    expect(await svc.purgeDue(now)).toBe(1);
    expect(users.rows.map((u) => u.id).sort()).toEqual(['active', 'later']);
    expect(avatars.deleteObject).toHaveBeenCalledWith('avatars/due/a.png');
    expect(await svc.purgeDue(now)).toBe(0); // idempotent
  });

  it('respects the batch size', async () => {
    const users = new FakeRepo<EndUser>(['email']);
    for (let i = 0; i < 5; i++) {
      users.rows.push({
        id: `u${i}`,
        email: `u${i}@x.io`,
        status: EndUserStatus.PENDING_DELETION,
        purgeAfter: new Date(0),
        avatarKey: null,
      } as any);
    }
    const svc = new AccountPurgeService(
      users as any,
      { deleteObject: async () => undefined } as any,
    );
    expect(await svc.purgeDue(new Date(), 2)).toBe(2);
    expect(users.rows).toHaveLength(3);
  });

  it('does not start a timer under NODE_ENV=test', () => {
    const svc = new AccountPurgeService(
      new FakeRepo<EndUser>() as any,
      {} as any,
    );
    svc.onModuleInit();
    expect((svc as any).timer).toBeNull();
    svc.onModuleDestroy();
  });
});
