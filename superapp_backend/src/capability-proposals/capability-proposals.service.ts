import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CapabilityProposal } from './entities/capability-proposal.entity';
import { formatCapabilityProposalResponse } from './helpers/proposal-response.helper';
import { QueryCapabilityProposalsDto } from './dto/query-capability-proposals.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { createPaginatedResponse } from '../common/utils/pagination.util';
import { escapeLikeString } from '../common/utils/sql.util';

@Injectable()
export class CapabilityProposalsService {
  constructor(
    @InjectRepository(CapabilityProposal)
    private capabilityProposalRepository: Repository<CapabilityProposal>,
  ) {}

  async findAll(
    query: QueryCapabilityProposalsDto = new QueryCapabilityProposalsDto(),
  ): Promise<PaginatedResult<CapabilityProposal>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, query.limit || 20);
    const skip = (page - 1) * limit;

    const qb = this.capabilityProposalRepository
      .createQueryBuilder('proposal')
      .leftJoinAndSelect('proposal.miniApp', 'miniApp')
      .leftJoinAndSelect('proposal.requestedBy', 'requestedBy');

    // 1. Status Filter
    if (query.status && query.status.toUpperCase() !== 'ALL') {
      const targetStatus =
        query.status.toUpperCase() === 'PENDING'
          ? 'PENDING_REVIEW'
          : query.status.toUpperCase();
      qb.andWhere('proposal.status = :status', { status: targetStatus });
    }

    // 2. MiniApp Filter
    if (query.miniAppId) {
      qb.andWhere('proposal.miniApp.id = :miniAppId', {
        miniAppId: query.miniAppId,
      });
    }

    // 3. Search Filter
    if (query.search?.trim()) {
      const sanitized = escapeLikeString(query.search.trim().toLowerCase());
      qb.andWhere(
        '(LOWER(proposal.capabilityKey) LIKE :pattern OR LOWER(proposal.capabilityName) LIKE :pattern OR LOWER(proposal.description) LIKE :pattern)',
        { pattern: `%${sanitized}%` },
      );
    }

    // 4. Sorting
    const sortField = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'DESC';
    const allowedSortFields: Record<string, string> = {
      createdAt: 'proposal.createdAt',
      updatedAt: 'proposal.updatedAt',
      capabilityName: 'proposal.capabilityName',
      capabilityKey: 'proposal.capabilityKey',
      status: 'proposal.status',
    };
    const dbSortField = allowedSortFields[sortField] || 'proposal.createdAt';
    qb.orderBy(dbSortField, sortOrder);

    qb.skip(skip).take(limit);

    const [items, totalItems] = await qb.getManyAndCount();
    const formatted = items.map(
      (p) => formatCapabilityProposalResponse(p) as CapabilityProposal,
    );

    return createPaginatedResponse(formatted, totalItems, page, limit);
  }

  async findOne(id: string): Promise<CapabilityProposal | null> {
    const p = await this.capabilityProposalRepository.findOne({
      where: { id },
      relations: { miniApp: true, requestedBy: true },
    });
    return p ? formatCapabilityProposalResponse(p) : null;
  }

  async findPendingByKey(capabilityKey: string): Promise<CapabilityProposal[]> {
    const list = await this.capabilityProposalRepository.find({
      where: [{ capabilityKey, status: 'PENDING_REVIEW' }],
    });
    return list.map(
      (p) => formatCapabilityProposalResponse(p) as CapabilityProposal,
    );
  }

  async create(data: any): Promise<CapabilityProposal> {
    const payload: Partial<CapabilityProposal> = {
      ...data,
      capabilityKey: data.capabilityKey || data.permissionKey,
      capabilityName: data.capabilityName || data.permissionName,
    };
    delete (payload as any).permissionKey;
    delete (payload as any).permissionName;
    const proposal = this.capabilityProposalRepository.create(payload);
    const saved = await this.capabilityProposalRepository.save(proposal);
    return formatCapabilityProposalResponse(saved);
  }

  async update(id: string, data: any): Promise<void> {
    const payload: Partial<CapabilityProposal> = { ...data };
    if (data.permissionKey && !data.capabilityKey) {
      payload.capabilityKey = data.permissionKey;
    }
    if (data.permissionName && !data.capabilityName) {
      payload.capabilityName = data.permissionName;
    }
    delete (payload as any).permissionKey;
    delete (payload as any).permissionName;
    await this.capabilityProposalRepository.update(id, payload);
  }
}

// Backwards-compatible alias
export { CapabilityProposalsService as PermissionProposalsService };
