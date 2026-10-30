import {
  Injectable,
  OnApplicationBootstrap,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Organization,
  OrganizationStatus,
} from './entities/organization.entity';
import {
  setOrganizationDataSource,
  resolveOrganizationDetails,
  ResolvedOrganization,
} from './helpers/organization-resolver.helper';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { User } from '../access-control/entities/user.entity';
import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { QueryOrganizationsDto } from './dto/query-organizations.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { createPaginatedResponse } from '../common/utils/pagination.util';
import { escapeLikeString } from '../common/utils/sql.util';
import { SortOrder } from '../common/dto/pagination-query.dto';

@Injectable()
export class OrganizationsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) {}

  async onApplicationBootstrap() {
    // Register the repository for global database organization resolution
    setOrganizationDataSource(this.organizationRepository);
    const count = await this.organizationRepository.count();
    this.logger.log(
      `Initialized OrganizationsService with ${count} real database records`,
    );
    await this.backfillPrimaryAuthorityRelationships();
  }

  private async backfillPrimaryAuthorityRelationships() {
    try {
      // Find Primary Root Authority: Non-Bank Financial Services Authority (FSA)
      const root = await this.organizationRepository
        .createQueryBuilder('org')
        .where("org.code = 'FSA' OR LOWER(org.name) LIKE :term", {
          term: '%non-bank financial services authority%',
        })
        .getOne();

      if (root?.id) {
        await this.organizationRepository
          .createQueryBuilder()
          .update(Organization)
          .set({ parentId: root.id, parentAuthority: root.name })
          .where(
            '("parentId" IS NULL OR "parentAuthority" = :legacyParent OR "parentAuthority" = :ftcParent) AND id != :rootId',
            {
              legacyParent: 'Fintech Center',
              ftcParent: 'Financial Technology Center',
              rootId: root.id,
            },
          )
          .execute();
      }
    } catch (err: any) {
      this.logger.debug(
        `Parent relationship backfill skipped: ${err?.message || err}`,
      );
    }
  }

  async resolveOrganization(input?: string): Promise<ResolvedOrganization> {
    return resolveOrganizationDetails(input, this.organizationRepository);
  }

  async findAll(
    queryOrStatus?: QueryOrganizationsDto | OrganizationStatus | string,
  ): Promise<PaginatedResult<Organization> | Organization[]> {
    if (typeof queryOrStatus === 'string') {
      return this.organizationRepository.find({
        where: { status: queryOrStatus as OrganizationStatus },
        relations: { parent: true },
        order: { name: 'ASC' },
      });
    }

    const query: QueryOrganizationsDto = (queryOrStatus ||
      {}) as QueryOrganizationsDto;
    const {
      page = 1,
      limit = 20,
      search,
      status,
      sortBy = 'name',
      sortOrder = SortOrder.ASC,
    } = query;

    const qb = this.organizationRepository
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.parent', 'parent')
      .leftJoinAndSelect('org.children', 'children');

    if (status && (status as any) !== 'ALL') {
      qb.andWhere('org.status = :status', { status });
    }

    if (search?.trim()) {
      const sanitized = escapeLikeString(search.trim());
      qb.andWhere(
        '(org.name ILIKE :search OR org.code ILIKE :search OR org.parentAuthority ILIKE :search OR parent.name ILIKE :search OR org.description ILIKE :search)',
        { search: `%${sanitized}%` },
      );
    }

    const sortColumns: Record<string, string> = {
      name: 'org.name',
      code: 'org.code',
      createdAt: 'org.createdAt',
      status: 'org.status',
    };
    const orderColumn = sortColumns[sortBy] || 'org.name';
    const direction = sortOrder === SortOrder.DESC ? 'DESC' : 'ASC';

    qb.orderBy(orderColumn, direction).addOrderBy('org.id', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, totalItems] = await qb.getManyAndCount();
    return createPaginatedResponse(items, totalItems, page, limit);
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    const rawCounts = await this.organizationRepository
      .createQueryBuilder('org')
      .select('org.status', 'status')
      .addSelect('COUNT(org.id)', 'count')
      .groupBy('org.status')
      .getRawMany();

    let total = 0;
    let active = 0;
    let inactive = 0;

    for (const row of rawCounts) {
      const c = parseInt(row.count, 10) || 0;
      total += c;
      if (row.status === 'ACTIVE') {
        active += c;
      } else {
        inactive += c;
      }
    }

    return { total, active, inactive };
  }

  async findOne(id: string): Promise<Organization | null> {
    const org = await this.organizationRepository.findOne({
      where: { id },
      relations: { parent: true, children: true },
    });
    if (!org) return null;

    const users = await this.organizationRepository.manager
      .getRepository(User)
      .find({
        where: { organizationId: id },
        relations: { role: true },
        order: { name: 'ASC' },
      });

    const miniApps = await this.organizationRepository.manager
      .getRepository(MiniApp)
      .find({
        where: { organizationId: id },
        order: { name: 'ASC' },
      });

    const safeUsers = users.map((u) => {
      const { passwordHash, organization, ...rest } = u as any;
      return rest;
    });

    const safeMiniApps = miniApps.map((m) => {
      const { organizationRelation, ...rest } = m as any;
      return rest;
    });

    return {
      ...org,
      users: safeUsers,
      miniApps: safeMiniApps,
    };
  }

  async findByNameOrCode(term?: string): Promise<Organization | null> {
    if (!term?.trim()) return null;
    const clean = term.trim().toLowerCase();
    let org = await this.organizationRepository
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.parent', 'parent')
      .where('LOWER(TRIM(org.code)) = :term OR LOWER(TRIM(org.name)) = :term', {
        term: clean,
      })
      .getOne();

    if (!org) {
      org = await this.organizationRepository
        .createQueryBuilder('org')
        .leftJoinAndSelect('org.parent', 'parent')
        .where(
          'LOWER(org.name) ILIKE :likeTerm OR LOWER(org.code) ILIKE :likeTerm',
          {
            likeTerm: `%${clean}%`,
          },
        )
        .orderBy('org.name', 'ASC')
        .getOne();
    }
    return org;
  }

  async findByCodeOrName(codeOrName: string): Promise<Organization | null> {
    return this.findByNameOrCode(codeOrName);
  }

  async create(data: CreateOrganizationDto): Promise<Organization> {
    let parentAuthority = data.parentAuthority;
    if (data.parentId) {
      const parent = await this.organizationRepository.findOne({
        where: { id: data.parentId },
      });
      if (!parent) {
        throw new BadRequestException(
          `Parent organization ${data.parentId} not found`,
        );
      }
      parentAuthority = parent.name;
    }

    const org = this.organizationRepository.create({
      ...data,
      parentId: data.parentId || null,
      parentAuthority: parentAuthority || null,
      status: data.status || OrganizationStatus.ACTIVE,
    });
    return this.organizationRepository.save(org);
  }

  async update(
    id: string,
    data: UpdateOrganizationDto,
    currentUser?: any,
  ): Promise<Organization> {
    const org = await this.findOne(id);
    if (!org) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    // Guard: Prevent self-parenting
    if (data.parentId && data.parentId === id) {
      throw new BadRequestException(
        'An organization cannot be its own parent authority.',
      );
    }

    if (data.parentId) {
      const parent = await this.organizationRepository.findOne({
        where: { id: data.parentId },
      });
      if (!parent) {
        throw new BadRequestException(
          `Parent organization ${data.parentId} not found`,
        );
      }
      org.parent = parent;
      org.parentId = parent.id;
      data.parentAuthority = parent.name;
    } else if (data.parentId === null || (data.parentId as any) === '') {
      data.parentId = null;
      org.parent = null;
      org.parentId = null;
      data.parentAuthority = null;
      org.parentAuthority = null;
    }

    // Guard: Prevent deactivating Primary Authority (FTC, FSA)
    if (
      data.status === OrganizationStatus.INACTIVE ||
      (data.status as any) === 'INACTIVE'
    ) {
      const code = (org.code || '').trim().toUpperCase();
      const name = (org.name || '').toLowerCase();
      const isRootAnchor =
        code === 'FSA' ||
        code === 'FTC' ||
        name.includes('financial technology center') ||
        name.includes('non-bank financial services authority');

      if (isRootAnchor) {
        throw new BadRequestException(
          `Primary regulatory authority "${org.name}" (${org.code || 'ROOT'}) cannot be set to inactive. It hosts the SuperApp core platform and active system governance.`,
        );
      }

      // Guard: Self-deactivation prevention
      const currentOrgId = currentUser?.organizationId || currentUser?.orgId;
      if (currentOrgId && currentOrgId === org.id) {
        throw new BadRequestException(
          `Self-deactivation guard: You cannot set your own assigned organization to inactive ("${org.name}").`,
        );
      }

      // Guard: Cannot disable a parent organization while active subordinate children exist
      const activeChildren = (org.children || []).filter(
        (c) =>
          c.status === OrganizationStatus.ACTIVE ||
          (c.status as any) === 'ACTIVE',
      );
      if (activeChildren.length > 0) {
        const childNames = activeChildren
          .map((c) => c.name)
          .slice(0, 3)
          .join(', ');
        const extra =
          activeChildren.length > 3
            ? ` and ${activeChildren.length - 3} more`
            : '';
        throw new BadRequestException(
          `Cannot disable parent authority "${org.name}" because it governs ${activeChildren.length} active subordinate organization(s) (${childNames}${extra}). Please disable or reassign all subordinate entities first.`,
        );
      }
    }

    const merged = this.organizationRepository.merge(org, data);
    return this.organizationRepository.save(merged);
  }

  async remove(id: string, currentUser?: any): Promise<boolean> {
    const org = await this.findOne(id);
    if (!org) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    const code = (org.code || '').trim().toUpperCase();
    const name = (org.name || '').toLowerCase();
    const isRootAnchor =
      code === 'FSA' ||
      code === 'FTC' ||
      name.includes('financial technology center') ||
      name.includes('non-bank financial services authority');

    if (isRootAnchor) {
      throw new BadRequestException(
        `Primary regulatory authority "${org.name}" (${org.code || 'ROOT'}) cannot be deleted. It hosts the SuperApp core platform and active system governance.`,
      );
    }

    const hasUsers = (org.users?.length ?? 0) > 0;
    const hasMiniApps = (org.miniApps?.length ?? 0) > 0;
    const hasChildren = (org.children?.length ?? 0) > 0;
    if (hasUsers || hasMiniApps || hasChildren) {
      throw new BadRequestException(
        hasChildren
          ? `Organization "${org.name}" cannot be deleted because subordinate organization(s) are linked to it as their parent authority. Please reassign or delete its subordinate entities first.`
          : `Regulatory organizations cannot be deleted because historical records (users or mini-apps) are associated with it. Please set its status to INACTIVE to disable instead.`,
      );
    }
    const result = await this.organizationRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
