import { NotFoundException } from '@nestjs/common';
import { FakeRepo } from './testing/fake-repo';
import {
  EndUser,
  EndUserHonorific,
  EndUserStatus,
} from './entities/end-user.entity';
import { MobileProfileService, toProfile } from './mobile-profile.service';

function seed() {
  const users = new FakeRepo<EndUser>(['email']);
  const user = {
    id: 'u1',
    email: 'jane@example.io',
    name: 'Jane',
    passwordHash: 'scrypt$secret',
    emailVerifiedAt: new Date('2026-01-01'),
    status: EndUserStatus.ACTIVE,
    createdAt: new Date('2026-01-01'),
    avatarKey: 'avatars/u1/a.png',
    avatarUpdatedAt: new Date('2026-10-02T09:41:00.000Z'),
  } as unknown as EndUser;
  users.rows.push(user);
  return { users, svc: new MobileProfileService(users as any), user };
}

describe('toProfile', () => {
  it('projects safe fields only', () => {
    const { user } = seed();
    const p = toProfile(user);
    expect(p).toMatchObject({
      id: 'u1',
      email: 'jane@example.io',
      name: 'Jane',
      emailVerified: true,
      status: 'ACTIVE',
      honorific: null,
      position: null,
      organizationUnit: null,
      staffId: null,
      avatarVersion: '2026-10-02T09:41:00.000Z',
    });
    expect(JSON.stringify(p)).not.toMatch(/scrypt|passwordHash|avatars\//);
  });

  it('has no avatarVersion without an avatar', () => {
    const { user } = seed();
    user.avatarKey = null;
    expect(toProfile(user).avatarVersion).toBeNull();
  });
});

describe('MobileProfileService.updateProfile', () => {
  it('applies only provided fields; null clears; name null is ignored', async () => {
    const { svc, users } = seed();
    await svc.updateProfile('u1', {
      honorific: EndUserHonorific.MRS,
      position: 'Officer',
      staffId: '1870200369',
    });
    let p = await svc.updateProfile('u1', {
      organizationUnit: 'Non-Bank Financial Services Authority',
    });
    expect(p).toMatchObject({
      honorific: 'MRS',
      position: 'Officer',
      staffId: '1870200369',
      organizationUnit: 'Non-Bank Financial Services Authority',
    });
    p = await svc.updateProfile('u1', { position: null, name: null as any });
    expect(p.position).toBeNull();
    expect(p.name).toBe('Jane');
    expect(users.rows[0].position).toBeNull();
  });

  it('404 for an unknown user', async () => {
    const { svc } = seed();
    await expect(
      svc.updateProfile('nope', { name: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
