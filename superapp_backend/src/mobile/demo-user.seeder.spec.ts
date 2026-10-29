import { FakeRepo } from './testing/fake-repo';
import { EndUser, EndUserStatus } from './entities/end-user.entity';
import { PasswordService } from './password.service';
import {
  DEFAULT_DEMO_USER_EMAIL,
  DEFAULT_DEMO_USER_PASSWORD,
  DemoUserSeeder,
} from './demo-user.seeder';

const dev = { NODE_ENV: 'development' } as NodeJS.ProcessEnv;

describe('DemoUserSeeder', () => {
  const passwords = new PasswordService();
  let users: FakeRepo<EndUser>;
  let seeder: DemoUserSeeder;

  beforeEach(() => {
    users = new FakeRepo<EndUser>(['email']);
    seeder = new DemoUserSeeder(users as any, passwords);
  });

  it('creates a verified, active demo user with a profile and a working password', async () => {
    expect(await seeder.seed(dev)).toBe(true);
    expect(users.rows).toHaveLength(1);
    const user = users.rows[0];
    expect(user.email).toBe(DEFAULT_DEMO_USER_EMAIL);
    expect(user.status).toBe(EndUserStatus.ACTIVE);
    expect(user.emailVerifiedAt).toBeInstanceOf(Date);
    expect(user.name).toBeTruthy();
    expect(user.honorific).toBeTruthy();
    expect(user.position).toBeTruthy();
    expect(user.organizationUnit).toBeTruthy();
    expect(user.staffId).toMatch(/^[A-Za-z0-9-]+$/);
    expect(
      await passwords.verify(DEFAULT_DEMO_USER_PASSWORD, user.passwordHash),
    ).toBe(true);
    expect(
      passwords.validatePolicy(
        DEFAULT_DEMO_USER_PASSWORD,
        DEFAULT_DEMO_USER_EMAIL,
      ),
    ).toBeNull();
  });

  it('leaves an existing account alone, so changes made in the app survive restarts', async () => {
    users.rows.push({
      id: 'u1',
      email: DEFAULT_DEMO_USER_EMAIL,
      passwordHash: 'changed-in-app',
    } as EndUser);
    expect(await seeder.seed(dev)).toBe(false);
    expect(users.rows).toHaveLength(1);
    expect(users.rows[0].passwordHash).toBe('changed-in-app');
  });

  it.each(['production', 'test', undefined])(
    'does nothing when NODE_ENV is %s',
    async (nodeEnv) => {
      expect(await seeder.seed({ NODE_ENV: nodeEnv })).toBe(false);
      expect(users.rows).toHaveLength(0);
    },
  );

  it('uses MOBILE_DEMO_USER_EMAIL / MOBILE_DEMO_USER_PASSWORD when set, lowercasing the email', async () => {
    const env = {
      ...dev,
      MOBILE_DEMO_USER_EMAIL: '  Tester@Example.COM ',
      MOBILE_DEMO_USER_PASSWORD: 'another-long-password',
    } as NodeJS.ProcessEnv;
    expect(await seeder.seed(env)).toBe(true);
    expect(users.rows[0].email).toBe('tester@example.com');
    expect(
      await passwords.verify(
        'another-long-password',
        users.rows[0].passwordHash,
      ),
    ).toBe(true);
  });

  it('refuses a configured password that breaks the policy', async () => {
    const env = {
      ...dev,
      MOBILE_DEMO_USER_PASSWORD: 'short',
    } as NodeJS.ProcessEnv;
    await expect(seeder.seed(env)).rejects.toThrow('MOBILE_DEMO_USER_PASSWORD');
    expect(users.rows).toHaveLength(0);
  });

  it('treats losing a duplicate-key race to another instance as already seeded', async () => {
    const racing = {
      findOne: jest.fn(async () => null),
      create: (data: Partial<EndUser>) => data,
      save: jest.fn(async () => {
        throw Object.assign(new Error('duplicate key'), { code: '23505' });
      }),
    };
    seeder = new DemoUserSeeder(racing as any, passwords);
    expect(await seeder.seed(dev)).toBe(false);
  });

  it('never fails application start-up', async () => {
    const broken = {
      findOne: jest.fn(async () => Promise.reject(new Error('db down'))),
    };
    seeder = new DemoUserSeeder(broken as any, passwords);
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      await expect(seeder.onApplicationBootstrap()).resolves.toBeUndefined();
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
