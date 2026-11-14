import { MiniAppVersion } from './miniapp-version.entity';

describe('MiniAppVersion serialization', () => {
  it('never sends the stored revision (it can hold integration secrets)', () => {
    const row = Object.assign(new MiniAppVersion(), {
      id: 'v1',
      version: '1.3.0',
      status: 'DRAFT',
      reviewStatus: 'IN_REVIEW',
      revision: { integrationConfig: { gitToken: 'secret' } },
    });
    const json = JSON.parse(JSON.stringify(row));
    expect(json).toMatchObject({ id: 'v1', version: '1.3.0', reviewStatus: 'IN_REVIEW' });
    expect(json).not.toHaveProperty('revision');
    expect(row.revision).toBeDefined();
  });
});
