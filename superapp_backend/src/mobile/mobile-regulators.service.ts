import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization, OrganizationStatus } from '../organizations/entities/organization.entity';

export interface RegulatorItem {
  /** Lowercased organization code; matches a catalog item's `regulator`. */
  key: string;
  name: string;
}

/** Always first: FTC publishes the FSA's own apps. */
const FIRST_CODE = 'FTC';

/** True for the organizations the app lists as regulators. */
function isListedRegulator(org: Organization): boolean {
  const code = org.code?.toUpperCase();
  return (
    code === FIRST_CODE ||
    org.name.toLowerCase().includes('regulator') ||
    (org as any).metadata?.entityType === 'SECTOR_REGULATOR'
  );
}

@Injectable()
export class MobileRegulatorsService {
  constructor(
    @InjectRepository(Organization) private readonly organizations: Repository<Organization>,
  ) {}

  /** Active FTC and sector regulators under the FSA: FTC first, then by name. */
  async list(): Promise<{ items: RegulatorItem[] }> {
    const rows = await this.organizations.find({ where: { status: OrganizationStatus.ACTIVE } });
    const items = rows
      .filter((o) => o.code && isListedRegulator(o))
      .sort((a, b) =>
        a.code === FIRST_CODE ? -1 : b.code === FIRST_CODE ? 1 : a.name.localeCompare(b.name),
      )
      .map((o) => ({ key: o.code!.toLowerCase(), name: o.name }));
    return { items };
  }
}
