import {
  Organization,
  OrganizationStatus,
} from '../organizations/entities/organization.entity';
import { MobileRegulatorsService } from './mobile-regulators.service';
import { FakeRepo } from './testing/fake-repo';

const FSA = {
  id: 'FSA',
  code: 'FSA',
  name: 'Non-Bank Financial Services Authority',
  status: OrganizationStatus.ACTIVE,
  parentId: null,
  parent: null,
} as unknown as Organization;

function org(
  code: string,
  name: string,
  parent: Organization | null = FSA,
  status = OrganizationStatus.ACTIVE,
): Organization {
  return {
    id: code,
    code,
    name,
    status,
    parentId: parent?.id ?? null,
    parent,
  } as unknown as Organization;
}

describe('MobileRegulatorsService.list', () => {
  it('lists FTC and the active regulators under the FSA, FTC first, then by name', async () => {
    const ftc = org('FTC', 'Financial Technology Center (FTC)');
    const repo = new FakeRepo<Organization>();
    repo.rows = [
      FSA,
      org('TR', 'Trust Regulator (TR)'),
      org('GAD', 'General Affairs Dept. (GAD)'),
      org('IAU', 'Internal Audit Unit (IAU)'),
      org('ACAR', 'Accounting and Auditing Regulator (ACAR)'),
      ftc,
      org(
        'IRC',
        'Insurance Regulator of Cambodia (IRC)',
        FSA,
        OrganizationStatus.INACTIVE,
      ),
      org('NBOCN', 'National Bank of Cambodia (NBC)', ftc),
      org('IAU-2', 'Internal Audit Unit', ftc),
      org('XR', 'Example Regulator (XR)', null),
    ];
    const { items } = await new MobileRegulatorsService(repo as any).list();
    expect(items).toEqual([
      { key: 'ftc', name: 'Financial Technology Center (FTC)' },
      { key: 'acar', name: 'Accounting and Auditing Regulator (ACAR)' },
      { key: 'iau', name: 'Internal Audit Unit (IAU)' },
      { key: 'tr', name: 'Trust Regulator (TR)' },
    ]);
  });

  // FakeRepo ignores `relations`; without this TypeORM leaves `parent` undefined.
  it('asks the repository to load each organization parent', async () => {
    const repo = new FakeRepo<Organization>();
    const find = jest.spyOn(repo, 'find');
    await new MobileRegulatorsService(repo as any).list();
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ relations: { parent: true } }),
    );
  });
});
