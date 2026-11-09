import { StorageService } from '../storage/storage.service';
import { Optional, Inject, forwardRef } from '@nestjs/common';
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
import { StaffProfile } from '../staff/entities/staff-profile.entity';
import { Identity } from '../identities/entities/identity.entity';
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
    @Optional()
    @Inject(forwardRef(() => StorageService))
    private storageService?: StorageService,
  ) {}

  async uploadLogo(id: string, file: Express.Multer.File): Promise<Organization> {
    const org = await this.findOne(id);
    if (!org) {
      throw new NotFoundException(`Organization ${id} not found`);
    }
    if (!this.storageService) {
      throw new BadRequestException('Storage service is not available');
    }
    const result = await this.storageService.uploadOrganizationLogo(id, file);
    org.logo = result.url;
    return this.organizationRepository.save(org);
  }

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

    const staffProfiles = await this.organizationRepository.manager
      .getRepository(StaffProfile)
      .find({
        where: { organizationId: id },
        relations: { identity: true, role: true },
        order: { identity: { name: 'ASC' } },
      });

    const miniApps = await this.organizationRepository.manager
      .getRepository(MiniApp)
      .find({
        where: { organizationId: id },
        order: { name: 'ASC' },
      });

    const safeUsers = staffProfiles.map((sp) => {
      const identity = sp.identity;
      return {
        id: identity?.id ?? sp.id,
        identityId: sp.identityId,
        staffProfileId: sp.id,
        name: identity?.name ?? '',
        email: identity?.email ?? '',
        status: identity?.status ?? sp.status,
        position: sp.position,
        staffId: sp.staffId,
        phoneNumber: sp.phoneNumber,
        roleId: sp.roleId,
        role: sp.role,
        organizationId: sp.organizationId,
        createdAt: sp.createdAt,
        updatedAt: sp.updatedAt,
      };
    });

    const safeMiniApps = miniApps.map((m) => {
      const { organizationRelation, ...rest } = m as any;
      return rest;
    });

    return {
      ...org,
      users: safeUsers,
      miniApps: safeMiniApps,
    } as any;
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
      code: await this.resolveUniqueCode(data.code, data.name),
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

    // organizations.code is NOT NULL + UNIQUE: ignore a blank code, reject a taken one
    if ('code' in data) {
      if (!data.code || !String(data.code).trim()) {
        delete (data as any).code;
      } else {
        data.code = await this.resolveUniqueCode(data.code, org.name, org.id);
      }
    }

    // Guard: Prevent deactivating or suspending Primary Authority (FTC, FSA)
    if (
      data.status === OrganizationStatus.INACTIVE ||
      data.status === OrganizationStatus.SUSPENDED ||
      (data.status as any) === 'INACTIVE' ||
      (data.status as any) === 'SUSPENDED'
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

  /**
   * organizations.code is NOT NULL + UNIQUE. Uses the requested code when given;
   * otherwise derives one from the name's initials (e.g. "Trust Regulator" -> "TR"),
   * adding a numeric suffix until it is unique. A requested code that is already
   * taken is rejected, never silently changed.
   */
  private async resolveUniqueCode(
    requested: string | undefined | null,
    name: string,
    excludeId?: string,
  ): Promise<string> {
    const wanted = requested?.trim();
    const base =
      wanted ||
      (name || '')
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 10) ||
      'ORG';

    const isTaken = async (code: string) => {
      const existing = await this.organizationRepository.findOne({ where: { code } });
      return !!existing && existing.id !== excludeId;
    };

    if (!(await isTaken(base))) return base;
    // An explicitly requested code is never silently changed
    if (wanted) {
      throw new BadRequestException(`Organization code "${wanted}" is already in use.`);
    }
    for (let n = 2; ; n++) {
      const candidate = `${base}-${n}`;
      if (!(await isTaken(candidate))) return candidate;
    }
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

    const hasUsers = ((org as any).users?.length ?? (org as any).staffProfiles?.length ?? 0) > 0;
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
