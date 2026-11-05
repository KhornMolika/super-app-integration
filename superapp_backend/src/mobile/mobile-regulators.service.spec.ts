import { Organization, OrganizationStatus } from '../organizations/entities/organization.entity';
import { MobileRegulatorsService } from './mobile-regulators.service';
import { FakeRepo } from './testing/fake-repo';

function org(code: string, name: string, entityType: string, status = OrganizationStatus.ACTIVE): Organization {
  return { id: code, code, name, domain: `${code}.gov.kh`, status, metadata: { entityType } } as Organization;
}

describe('MobileRegulatorsService.list', () => {
  it('lists active FTC and sector regulators, FTC first, then by name', async () => {
    const repo = new FakeRepo<Organization>();
    repo.rows = [
      org('TR', 'Trust Regulator (TR)', 'SECTOR_REGULATOR'),
      org('GAD', 'General Affairs Dept. (GAD)', 'ADMINISTRATIVE'),
      org('IAU', 'Internal Audit Unit (IAU)', 'OVERSIGHT_UNIT'),
      org('ACAR', 'Accounting and Auditing Regulator (ACAR)', 'SECTOR_REGULATOR'),
      org('FTC', 'Financial Technology Center (FTC)', 'ADMINISTRATIVE'),
      org('IRC', 'Insurance Regulator of Cambodia (IRC)', 'SECTOR_REGULATOR', OrganizationStatus.INACTIVE),
    ];
    const { items } = await new MobileRegulatorsService(repo as any).list();
    expect(items).toEqual([
      { key: 'ftc', name: 'Financial Technology Center (FTC)' },
      { key: 'acar', name: 'Accounting and Auditing Regulator (ACAR)' },
      { key: 'tr', name: 'Trust Regulator (TR)' },
    ]);
  });
});
