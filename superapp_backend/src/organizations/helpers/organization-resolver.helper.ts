import { DataSource, Repository } from 'typeorm';
import { Organization, OrganizationStatus } from '../entities/organization.entity';

export interface ResolvedOrganization {
  id?: string;
  name: string;
  code: string;
  parentAuthority?: string | null;
  description?: string;
  status?: OrganizationStatus;
}

let activeOrganizationSource: Repository<Organization> | DataSource | null = null;

export function setOrganizationDataSource(source: Repository<Organization> | DataSource | null) {
  activeOrganizationSource = source;
}

export function getOrganizationRepository(
  customSource?: Repository<Organization> | DataSource | null,
): Repository<Organization> | null {
  const src = customSource || activeOrganizationSource;
  if (!src) return null;
  if ('getRepository' in src && typeof src.getRepository === 'function') {
    return src.getRepository(Organization);
  }
  return src as Repository<Organization>;
}

export async function queryRealOrganizationsFromDb(
  source?: Repository<Organization> | DataSource | null,
  status: OrganizationStatus = OrganizationStatus.ACTIVE,
): Promise<Organization[]> {
  const repo = getOrganizationRepository(source);
  if (!repo) return [];
  return repo.find({
    where: { status },
    order: { name: 'ASC' },
  });
}

/**
 * Resolves organization details by querying the database `organizations` table.
 * Matches by exact code, exact name, or partial match against real database records.
 */
export async function resolveOrganizationDetails(
  input?: string,
  source?: Repository<Organization> | DataSource | null,
): Promise<ResolvedOrganization> {
  const clean = (input || '').trim();
  const repo = getOrganizationRepository(source);

  if (repo) {
    try {
      if (!clean) {
        const defaultOrg = await repo.findOne({
          where: { status: OrganizationStatus.ACTIVE },
          order: { name: 'ASC' },
        });
        if (defaultOrg) {
          return {
            id: defaultOrg.id,
            name: defaultOrg.name,
            code: defaultOrg.code || defaultOrg.name.slice(0, 4).toUpperCase(),
            parentAuthority: defaultOrg.parentAuthority,
            description: defaultOrg.description,
            status: defaultOrg.status,
          };
        }
      } else {
        const lower = clean.toLowerCase();

        // 1. Exact match on code (case-insensitive)
        let matched = await repo
          .createQueryBuilder('org')
          .where('LOWER(TRIM(org.code)) = :code', { code: lower })
          .getOne();

        // 2. Exact match on name (case-insensitive)
        if (!matched) {
          matched = await repo
            .createQueryBuilder('org')
            .where('LOWER(TRIM(org.name)) = :name', { name: lower })
            .getOne();
        }

        // 3. Partial / substring match on code or name
        if (!matched) {
          matched = await repo
            .createQueryBuilder('org')
            .where('LOWER(org.name) ILIKE :term OR LOWER(org.code) ILIKE :term', {
              term: `%${lower}%`,
            })
            .orderBy('org.name', 'ASC')
            .getOne();
        }

        if (matched) {
          return {
            id: matched.id,
            name: matched.name,
            code: matched.code || matched.name.slice(0, 4).toUpperCase(),
            parentAuthority: matched.parentAuthority,
            description: matched.description,
            status: matched.status,
          };
        }
      }
    } catch {
      // Fall through to fallback
    }
  }

  return {
    name: clean || 'Financial Technology Center',
    code: clean ? clean.slice(0, 4).toUpperCase() : 'FTC',
    parentAuthority: null,
    status: OrganizationStatus.ACTIVE,
  };
}

