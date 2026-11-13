import { ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CapabilityProposalsController } from './capability-proposals.controller';
import { CapabilityProposalsService } from './capability-proposals.service';
import { ReviewProposalDto, ProposalDecision } from './dto/review-proposal.dto';
import { userHasPermissions } from '../access-control/guards/rbac.guard';
import { NotificationsService } from '../notifications/notifications.service';

const superAdmin = { sub: 'u-super', email: 's@fsa.gov.kh', roles: ['SUPER_ADMIN'], permissions: [] };
// A regulatory ADMIN token as issued after the seeder ran (no review/approve)
const admin = {
  sub: 'u-admin',
  email: 'a@fsa.gov.kh',
  roles: ['ADMIN'],
  permissions: ['permission_proposal:read', 'miniapp:approve'],
};
const developer = { sub: 'u-dev', email: 'd@partner.com', roles: ['MA_DEVELOPER'], permissions: [] };

function pendingProposal(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    capabilityKey: 'microphone',
    status: 'PENDING_REVIEW',
    requestedBy: { id: 'u-first' },
    metadata: {},
    ...overrides,
  } as any;
}

function makeController(opts: { pending?: any[]; proposal?: any } = {}) {
  const service = {
    findPendingByKey: jest.fn().mockResolvedValue(opts.pending ?? []),
    findOne: jest.fn().mockResolvedValue(opts.proposal ?? null),
    create: jest.fn().mockImplementation(async (d: any) => ({ id: 'new', ...d })),
    update: jest.fn().mockResolvedValue(undefined),
    addSupporter: jest.fn().mockResolvedValue(true),
  };
  const notifications = {
    notifyAdmins: jest.fn().mockResolvedValue(undefined),
    createNotification: jest.fn().mockResolvedValue(undefined),
  };
  const generator = {
    generateCapabilityMr: jest.fn().mockResolvedValue({
      status: 'created',
      mrUrl: 'https://git.example/frontend/super-app/-/merge_requests/7',
      targetBranch: 'development',
      filesModified: [],
      message: 'ok',
    }),
    getMergeRequestState: jest.fn().mockResolvedValue('opened'),
  };
  const controller = new CapabilityProposalsController(
    service as any,
    notifications as any,
    generator as any,
    {} as any,
  );
  return { controller, service, notifications, generator };
}

describe('who can do what with capability requests', () => {
  it('developers and super admins may request; the regulatory admin may only read', () => {
    expect(userHasPermissions(developer, ['permission_proposal:create'])).toBe(true);
    expect(userHasPermissions(superAdmin, ['permission_proposal:create'])).toBe(true);
    expect(userHasPermissions(admin, ['permission_proposal:read'])).toBe(true);
    expect(userHasPermissions(admin, ['permission_proposal:create'])).toBe(false);
    expect(userHasPermissions(admin, ['permission_proposal:review'])).toBe(false);
    expect(userHasPermissions(admin, ['permission_proposal:approve'])).toBe(false);
  });

  it('the ADMIN role fallback (legacy token, no permissions) cannot review or approve either', () => {
    const legacyAdmin = { sub: 'x', roles: ['ADMIN'] };
    expect(userHasPermissions(legacyAdmin, ['permission_proposal:read'])).toBe(true);
    expect(userHasPermissions(legacyAdmin, ['permission_proposal:review'])).toBe(false);
    expect(userHasPermissions(legacyAdmin, ['permission_proposal:approve'])).toBe(false);
  });

  it('a user with no role, or a role merely containing DEV, gets no developer rights', () => {
    expect(userHasPermissions({ sub: 'x', roles: [] }, ['permission_proposal:create'])).toBe(false);
    expect(userHasPermissions({ sub: 'x', roles: ['DEVOPS'] }, ['permission_proposal:create'])).toBe(false);
    expect(userHasPermissions({ sub: 'x', roles: ['MINI_APP_VIEWER'] }, ['miniapp:create'])).toBe(false);
  });

  it('an ADMIN token that still carries review cannot approve (403), and nothing is generated', async () => {
    const { controller, generator, service } = makeController({ proposal: pendingProposal() });
    const staleAdmin = { ...admin, permissions: ['permission_proposal:read', 'permission_proposal:review'] };
    await expect(
      controller.reviewProposal({ user: staleAdmin }, 'p1', {
        decision: ProposalDecision.APPROVED,
        targetVersion: '1.2.0',
      } as ReviewProposalDto),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(generator.generateCapabilityMr).not.toHaveBeenCalled();
    expect(service.update).not.toHaveBeenCalled();
  });

  it('a super admin can approve; the requester and every supporter are told', async () => {
    const proposal = pendingProposal({
      metadata: { supporters: [{ userId: 'u-second', at: 'x' }, { userId: 'u-first', at: 'y' }] },
    });
    const { controller, notifications } = makeController({ proposal });
    const res = await controller.reviewProposal({ user: superAdmin }, 'p1', {
      decision: ProposalDecision.APPROVED,
      targetVersion: '1.2.0',
    } as ReviewProposalDto);
    expect(res.codeChange?.status).toBe('created');
    const told = notifications.createNotification.mock.calls.map((c: any[]) => c[0]).sort();
    expect(told).toEqual(['u-first', 'u-second']);
  });
});

describe('progress links', () => {
  const approved = pendingProposal({
    status: 'APPROVED',
    metadata: {
      codeChange: {
        status: 'needs_work',
        mrUrl: 'https://git.example/frontend/super-app/-/merge_requests/7',
        issueUrl: 'https://git.example/frontend/super-app/-/issues/3',
      },
    },
  });
  const linksIn = (p: any) => p.steps.flatMap((s: any) => s.links ?? []);

  it('the platform admin (Super Admin) sees the code change and task links', async () => {
    const { controller } = makeController({ proposal: approved });
    expect(linksIn(await controller.getProgress({ user: superAdmin }, 'p1'))).toHaveLength(2);
  });

  it('an organization admin gets the steps without internal GitLab links', async () => {
    const { controller } = makeController({ proposal: approved });
    expect(linksIn(await controller.getProgress({ user: admin }, 'p1'))).toEqual([]);
  });

  it('a developer gets the same steps without internal GitLab links', async () => {
    const { controller } = makeController({ proposal: approved });
    const progress = await controller.getProgress({ user: developer }, 'p1');
    expect(linksIn(progress)).toEqual([]);
    expect(progress.steps.map((s: any) => s.key)).toContain('code_change');
  });
});

describe('rejecting needs a reason', () => {
  async function errorsFor(body: Record<string, unknown>) {
    const dto = plainToInstance(ReviewProposalDto, body);
    return (await validate(dto)).map((e) => e.property);
  }

  it('refuses a rejection without a real reason', async () => {
    expect(await errorsFor({ decision: 'REJECTED' })).toContain('reason');
    expect(await errorsFor({ decision: 'REJECTED', reason: '   no    ' })).toContain('reason');
  });

  it('accepts a rejection with a reason, and an approval without one', async () => {
    expect(await errorsFor({ decision: 'REJECTED', reason: 'Not needed: use the scan_qr_code capability.' })).toEqual([]);
    expect(await errorsFor({ decision: 'APPROVED' })).toEqual([]);
  });
});

describe('duplicate requests and reviewer notices', () => {
  it('adds the mini app to a pending request for the same key and says so', async () => {
    const pending = pendingProposal();
    const { controller, service } = makeController({ pending: [pending] });
    const res: any = await controller.createProposal({ user: developer }, {
      capabilityKey: 'Microphone',
      miniAppId: 'm2',
    });
    expect(service.create).not.toHaveBeenCalled();
    expect(service.addSupporter).toHaveBeenCalledWith(pending, { userId: 'u-dev', miniAppId: 'm2' });
    expect(res).toMatchObject({ id: 'p1', duplicate: true, supporterAdded: true });
    expect(res.message).toMatch(/already asked/);
  });

  it('a new request is stored against the requester and only Super Admins are notified', async () => {
    const { controller, service, notifications } = makeController();
    await controller.createProposal({ user: developer }, { capabilityKey: 'microphone' });
    expect(service.create.mock.calls[0][0].requestedBy).toEqual({ id: 'u-dev' });
    expect(notifications.createNotification).not.toHaveBeenCalled();
    const args = notifications.notifyAdmins.mock.calls[0];
    expect(args[5]).toEqual({ roles: ['SUPER_ADMIN'] });
  });
});

describe('CapabilityProposalsService', () => {
  function serviceWith(repo: Record<string, unknown>) {
    return new CapabilityProposalsService(repo as any);
  }

  it('addSupporter: never adds the requester or the same supporter twice', async () => {
    const repo = { update: jest.fn() };
    const service = serviceWith(repo);
    const proposal = pendingProposal();
    expect(await service.addSupporter(proposal, { userId: 'u-first' })).toBe(false);
    expect(await service.addSupporter(proposal, { userId: 'u-dev', miniAppId: 'm2' })).toBe(true);
    expect(await service.addSupporter(proposal, { userId: 'u-dev', miniAppId: 'm2' })).toBe(false);
    expect(await service.addSupporter(proposal, { userId: 'u-dev', miniAppId: 'm3' })).toBe(true);
    expect(proposal.metadata.supporters.map((s: any) => s.miniAppId)).toEqual(['m2', 'm3']);
    expect(repo.update).toHaveBeenCalledTimes(2);
  });

  function capturingRepo() {
    const wheres: Array<{ sql: string; params?: any }> = [];
    const qb: any = {
      leftJoinAndSelect: () => qb,
      where: (sql: string, params?: any) => (wheres.push({ sql, params }), qb),
      andWhere: (sql: string, params?: any) => (wheres.push({ sql, params }), qb),
      orderBy: () => qb,
      skip: () => qb,
      take: () => qb,
      getManyAndCount: async () => [[], 0],
      getOne: async () => null,
    };
    return { repo: { createQueryBuilder: () => qb }, wheres };
  }

  it('a developer only sees requests they made or support, or for their organization', async () => {
    const { repo, wheres } = capturingRepo();
    await serviceWith(repo).findAll({} as any, { ...developer, organizationId: 'org-1' });
    const scope = wheres.find((w) => w.sql.includes('requestedBy.id'))!;
    expect(scope.sql).toContain('miniApp.organizationId = :scopeOrgId');
    expect(scope.sql).toContain("proposal.metadata->'supporters'");
    expect(scope.params).toMatchObject({ scopeUserId: 'u-dev', scopeOrgId: 'org-1' });
  });

  it('the Super Admin sees everything, unless they ask for their own', async () => {
    const all = capturingRepo();
    await serviceWith(all.repo).findAll({} as any, superAdmin);
    expect(all.wheres.some((w) => w.sql.includes('requestedBy.id'))).toBe(false);

    const mine = capturingRepo();
    await serviceWith(mine.repo).findAll({ mine: 'true' } as any, superAdmin);
    const scope = mine.wheres.find((w) => w.sql.includes('requestedBy.id'))!;
    expect(scope.sql).not.toContain('organizationId');
  });

  it('an organization admin sees their own organization only', async () => {
    const { repo, wheres } = capturingRepo();
    await serviceWith(repo).findAll({} as any, { ...admin, organizationId: 'org-a' });
    const scope = wheres.find((w) => w.sql.includes('miniApp.organizationId'))!;
    expect(scope).toBeDefined();
    expect(scope.params.scopeOrgId).toBe('org-a');
  });

  it('findOne for someone outside the scope adds the scope (so the answer is 404)', async () => {
    const { repo, wheres } = capturingRepo();
    expect(await serviceWith(repo).findOne('p1', developer)).toBeNull();
    expect(wheres.some((w) => w.sql.includes('requestedBy.id'))).toBe(true);
  });
});

describe('NotificationsService.notifyAdmins roles', () => {
  function serviceWithUsers(users: any[]) {
    const apps: Record<string, any> = {
      'app-a': { id: 'app-a', organizationId: 'org-a' },
    };
    const service = new NotificationsService(
      {} as any,
      { find: jest.fn().mockResolvedValue(users) } as any,
      {
        findOne: jest.fn(async ({ where }: any) => apps[where.id ?? where.appId] ?? null),
      } as any,
      {} as any,
      {} as any,
      {} as any,
    );
    const spy = jest.spyOn(service, 'createNotification').mockResolvedValue(undefined as any);
    return { service, spy };
  }
  const users = [
    { id: 'a', roles: [{ name: 'SUPER_ADMIN' }] },
    { id: 'b', roles: [{ name: 'ADMIN' }], staffProfile: { organizationId: 'org-a' } },
    { id: 'c', roles: [{ name: 'MA_DEVELOPER' }] },
    { id: 'd', roles: [{ name: 'ADMIN' }], staffProfile: { organizationId: 'org-b' } },
  ];

  it('reaches only the roles asked for', async () => {
    const { service, spy } = serviceWithUsers(users);
    await service.notifyAdmins('t', 'm', 'x', undefined, undefined, { roles: ['SUPER_ADMIN'] });
    expect(spy.mock.calls.map((c) => c[0])).toEqual(['a']);
  });

  it('with a role filter that matches nobody, tells nobody', async () => {
    const { service, spy } = serviceWithUsers([users[2]]);
    await service.notifyAdmins('t', 'm', 'x', undefined, undefined, { roles: ['SUPER_ADMIN'] });
    expect(spy).not.toHaveBeenCalled();
  });

  it('by default reaches super admins and the admins of the app organization', async () => {
    const { service, spy } = serviceWithUsers(users);
    await service.notifyAdmins('t', 'm', 'x', 'app-a');
    expect(spy.mock.calls.map((c) => c[0])).toEqual(['a', 'b']);
  });

  it('an alert without an app reaches super admins only (no organization to scope to)', async () => {
    const { service, spy } = serviceWithUsers(users);
    await service.notifyAdmins('t', 'm', 'x');
    expect(spy.mock.calls.map((c) => c[0])).toEqual(['a']);
  });
});
