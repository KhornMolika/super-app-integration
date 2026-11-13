import { BadRequestException } from '@nestjs/common';
import { AccessControlService } from './access-control.service';

/** Create-user form checks: email taken, staff ID taken within an organization. */
function setup(opts: {
  emails?: string[];
  staff?: Array<{
    organizationId: string;
    staffId: string;
    identityId: string;
  }>;
}) {
  const identities = {
    count: jest.fn(async ({ where }: any) =>
      (opts.emails || []).includes(where.email) ? 1 : 0,
    ),
  };
  const staff = {
    count: jest.fn(
      async ({ where }: any) =>
        (opts.staff || []).filter(
          (s) =>
            s.organizationId === where.organizationId &&
            s.staffId === where.staffId,
        ).length,
    ),
    findOne: jest.fn(
      async ({ where }: any) =>
        (opts.staff || []).find(
          (s) =>
            s.organizationId === where.organizationId &&
            s.staffId === where.staffId,
        ) ?? null,
    ),
  };
  const svc = new AccessControlService(
    identities as any,
    staff as any,
    {} as any,
    {} as any,
  );
  return { svc, staff };
}

const superAdmin = { sub: 'sa', roles: ['SUPER_ADMIN'], organizationId: 'ftc' };
const adminA = { sub: 'a', roles: ['ADMIN'], organizationId: 'org-a' };

describe('user availability', () => {
  it('reports a taken email, ignoring case and spaces', async () => {
    const { svc } = setup({ emails: ['jane@fsa.gov.kh'] });
    expect(
      await svc.userAvailability({ email: '  Jane@FSA.gov.kh ' }, superAdmin),
    ).toEqual({
      emailTaken: true,
      staffIdTaken: false,
    });
  });

  it('a staff ID is taken only within the same organization', async () => {
    const { svc } = setup({
      staff: [{ organizationId: 'org-a', staffId: 'S-1', identityId: 'u1' }],
    });
    expect(
      (
        await svc.userAvailability(
          { staffId: 'S-1', organizationId: 'org-a' },
          adminA,
        )
      ).staffIdTaken,
    ).toBe(true);
    expect(
      (
        await svc.userAvailability(
          { staffId: 'S-1', organizationId: 'org-b' },
          superAdmin,
        )
      ).staffIdTaken,
    ).toBe(false);
  });

  it('an organization admin cannot probe another organization', async () => {
    const { svc, staff } = setup({
      staff: [{ organizationId: 'org-b', staffId: 'S-1', identityId: 'u1' }],
    });
    expect(
      (
        await svc.userAvailability(
          { staffId: 'S-1', organizationId: 'org-b' },
          adminA,
        )
      ).staffIdTaken,
    ).toBe(false);
    expect(staff.count).not.toHaveBeenCalled();
  });
});

describe('staff ID must be unique in its organization', () => {
  const check = (svc: any, ...args: any[]) => svc.assertStaffIdFree(...args);

  it('refuses a staff ID another person already has', async () => {
    const { svc } = setup({
      staff: [{ organizationId: 'org-a', staffId: 'S-1', identityId: 'u1' }],
    });
    await expect(check(svc, 'org-a', 'S-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('lets a person keep their own staff ID when edited', async () => {
    const { svc } = setup({
      staff: [{ organizationId: 'org-a', staffId: 'S-1', identityId: 'u1' }],
    });
    await expect(check(svc, 'org-a', 'S-1', 'u1')).resolves.toBeUndefined();
  });

  it('an empty staff ID is never a conflict', async () => {
    const { svc } = setup({});
    await expect(check(svc, 'org-a', '  ')).resolves.toBeUndefined();
  });
});
