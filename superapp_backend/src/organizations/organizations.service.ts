import {
  Injectable,
  OnApplicationBootstrap,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization, OrganizationStatus } from './entities/organization.entity';
import {
  setOrganizationDataSource,
  resolveOrganizationDetails,
  ResolvedOrganization,
} from '../common/constants/fsa-organizations';
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
    this.logger.log(`Initialized OrganizationsService with ${count} real database records`);
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
        order: { name: 'ASC' },
      });
    }

    const query: QueryOrganizationsDto = (queryOrStatus || {}) as QueryOrganizationsDto;
    const {
      page = 1,
      limit = 20,
      search,
      status,
      sortBy = 'name',
      sortOrder = SortOrder.ASC,
    } = query;

    const qb = this.organizationRepository.createQueryBuilder('org');

    if (status && (status as any) !== 'ALL') {
      qb.andWhere('org.status = :status', { status });
    }

    if (search?.trim()) {
      const sanitized = escapeLikeString(search.trim());
      qb.andWhere(
        '(org.name ILIKE :search OR org.code ILIKE :search OR org.parentAuthority ILIKE :search OR org.description ILIKE :search)',
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

  async findOne(id: string): Promise<Organization | null> {
    const org = await this.organizationRepository.findOne({ where: { id } });
    if (!org) return null;

    const users = await this.organizationRepository.manager.getRepository(User).find({
      where: { organizationId: id },
      relations: { role: true },
      order: { name: 'ASC' },
    });

    const miniApps = await this.organizationRepository.manager.getRepository(MiniApp).find({
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
    } as Organization;
  }

  async findByCodeOrName(codeOrName: string): Promise<Organization | null> {
    const clean = codeOrName.trim().toLowerCase();
    return this.organizationRepository
      .createQueryBuilder('org')
      .where('LOWER(TRIM(org.code)) = :term OR LOWER(TRIM(org.name)) = :term', {
        term: clean,
      })
      .getOne();
  }

  async create(data: CreateOrganizationDto): Promise<Organization> {
    const org = this.organizationRepository.create({
      ...data,
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

    // Guard: Prevent deactivating Root System Anchors (FTC, FSA)
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
          `Regulatory system anchor "${org.name}" (${org.code || 'ROOT'}) cannot be deactivated. It hosts the SuperApp core platform and active system governance.`,
        );
      }

      // Guard: Self-deactivation prevention
      const currentOrgId = currentUser?.organizationId || currentUser?.orgId;
      if (currentOrgId && currentOrgId === org.id) {
        throw new BadRequestException(
          `Self-deactivation guard: You cannot deactivate your own assigned organization ("${org.name}").`,
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
        `Regulatory system anchor "${org.name}" (${org.code || 'ROOT'}) cannot be deleted. It hosts the SuperApp core platform and active system governance.`,
      );
    }

    const hasUsers = (org.users?.length ?? 0) > 0;
    const hasMiniApps = (org.miniApps?.length ?? 0) > 0;
    if (hasUsers || hasMiniApps) {
      throw new BadRequestException(
        `Regulatory organizations cannot be deleted because historical records (users or mini-apps) are associated with it. Please set its status to INACTIVE to disable instead.`,
      );
    }
    const result = await this.organizationRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
