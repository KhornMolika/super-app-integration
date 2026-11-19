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

/** The authority the listed organizations sit under. */
const PARENT_CODE = 'FSA';

/** Listed although their names don't say "Regulator". */
const ALSO_LISTED_CODES = new Set([FIRST_CODE, 'IAU']);

/**
 * True for the organizations the app lists: FTC, IAU and the sector regulators
 * directly under the FSA. The FSA's departments (GAD, PD, TLAD) are left out.
 */
function isListedRegulator(org: Organization): boolean {
  if (org.parent?.code !== PARENT_CODE) return false;
  return (
    ALSO_LISTED_CODES.has(org.code.toUpperCase()) ||
    /\bregulator\b/i.test(org.name)
  );
}

@Injectable()
export class MobileRegulatorsService {
  constructor(
    @InjectRepository(Organization) private readonly organizations: Repository<Organization>,
  ) { }

  /** Active FTC and sector regulators under the FSA: FTC first, then by name. */
  async list(): Promise<{ items: RegulatorItem[] }> {
    // TypeORM only fills `parent` when the relation is requested; otherwise it is undefined.
    const rows = await this.organizations.find({
      where: { status: OrganizationStatus.ACTIVE },
      relations: { parent: true },
    });
    const items = rows
      .filter((o) => o.code && isListedRegulator(o))
      .sort((a, b) =>
        a.code === FIRST_CODE ? -1 : b.code === FIRST_CODE ? 1 : a.name.localeCompare(b.name),
      )
      .map((o) => ({ key: o.code!.toLowerCase(), name: o.name }));
    return { items };
  }
}
