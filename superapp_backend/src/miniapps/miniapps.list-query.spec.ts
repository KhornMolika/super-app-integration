import { MiniappsService } from './miniapps.service';

/**
 * GET /mini-apps list query: what each filter and sort key turns into. The
 * Backoffice table drives these from its URL state.
 */

const superAdmin = { sub: 'sa', roles: ['SUPER_ADMIN'] };

function listService() {
  const wheres: Array<{ sql: string; params?: any }> = [];
  const joins: string[] = [];
  let orderBy: [string, string] | null = null;
  const qb: any = {
    leftJoinAndSelect: jest.fn((rel: string) => (joins.push(rel), qb)),
    andWhere: jest.fn(
      (sql: string, params?: any) => (wheres.push({ sql, params }), qb),
    ),
    orderBy: jest.fn(
      (col: string, dir: string) => ((orderBy = [col, dir]), qb),
    ),
    addOrderBy: jest.fn(() => qb),
    skip: jest.fn(() => qb),
    take: jest.fn(() => qb),
    getManyAndCount: jest.fn(async () => [[], 0]),
  };
  const repo = { createQueryBuilder: jest.fn(() => qb) };
  const none = {} as any;
  const service = new MiniappsService(
    repo as any,
    none,
    none,
    none,
    none,
    none,
    none,
    none,
    none,
    none,
    none,
    none,
    none,
  );
  return { service, wheres, joins, order: () => orderBy };
}

const run = async (query: Record<string, any>) => {
  const ctx = listService();
  await ctx.service.findAll(query as any, ['SUPER_ADMIN'], superAdmin);
  return ctx;
};

describe('MiniappsService.findAll list query', () => {
  it('joins the organization (code shown, sorted and searched in the table)', async () => {
    const { joins } = await run({});
    expect(joins).toContain('app.organizationRelation');
  });

  it('filters the lifecycle stage on lifecycleStatus only', async () => {
    const { wheres } = await run({ status: 'TESTING' });
    const clause = wheres.find((w) => w.params?.reqStatus);
    expect(clause?.sql).toBe('app.lifecycleStatus = :reqStatus');
  });

  it('SUSPENDED also matches the availability gate', async () => {
    const { wheres } = await run({ status: 'SUSPENDED' });
    expect(wheres.find((w) => w.params?.reqStatus)?.sql).toContain(
      'app.availabilityStatus',
    );
  });

  it.each([
    ['LIVE', /NOT .*SUSPENDED.* AND .*ACTIVE/],
    ['SUSPENDED', /^\(app\.availabilityStatus = 'SUSPENDED'/],
    ['NOT_LIVE', /NOT .*SUSPENDED.* AND NOT .*ACTIVE/],
  ])('availability %s', async (availability, pattern) => {
    const { wheres } = await run({ availability });
    expect(wheres.some((w) => pattern.test(w.sql))).toBe(true);
  });

  it('availability ALL adds no clause', async () => {
    const { wheres } = await run({ availability: 'ALL' });
    expect(wheres.some((w) => w.sql.includes("'SUSPENDED'"))).toBe(false);
  });

  it.each([
    ['lifecycle', 'app.lifecycleStatus'],
    ['availability', 'app.availabilityStatus'],
    ['organization', 'org.code'],
    ['updatedAt', 'app.updatedAt'],
    ['name', 'app.name'],
    ['anything-else', 'app.createdAt'],
  ])('sorts by %s on %s', async (sortBy, column) => {
    const { order } = await run({ sortBy, sortOrder: 'ASC' });
    expect(order()).toEqual([column, 'ASC']);
  });

  it('search covers name, App ID and the organization', async () => {
    const { wheres } = await run({ search: 'irc' });
    const clause = wheres.find((w) => w.params?.search)!;
    expect(clause.sql).toContain('app.appId ILIKE');
    expect(clause.sql).toContain('org.code ILIKE');
    expect(clause.params.search).toBe('%irc%');
  });
});
