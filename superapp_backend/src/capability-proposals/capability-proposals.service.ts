import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CapabilityProposal } from './entities/capability-proposal.entity';
import { formatCapabilityProposalResponse } from './helpers/proposal-response.helper';
import { QueryCapabilityProposalsDto } from './dto/query-capability-proposals.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { createPaginatedResponse } from '../common/utils/pagination.util';
import { escapeLikeString } from '../common/utils/sql.util';
import { isPlatformAdmin } from '../access-control/helpers/platform-admin.helper';

/** Someone who added their mini app to a pending request for the same key. */
export interface ProposalSupporter {
  userId: string;
  miniAppId?: string;
  at: string;
}

function requesterId(requester: any): string {
  return requester?.sub || requester?.id || '';
}

@Injectable()
export class CapabilityProposalsService {
  constructor(
    @InjectRepository(CapabilityProposal)
    private capabilityProposalRepository: Repository<CapabilityProposal>,
  ) {}

  async findAll(
    query: QueryCapabilityProposalsDto = new QueryCapabilityProposalsDto(),
    requester?: any,
  ): Promise<PaginatedResult<CapabilityProposal>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, query.limit || 20);
    const skip = (page - 1) * limit;

    const qb = this.capabilityProposalRepository
      .createQueryBuilder('proposal')
      .leftJoinAndSelect('proposal.miniApp', 'miniApp')
      .leftJoinAndSelect('proposal.requestedBy', 'requestedBy');

    // 0. Who may see what: platform staff see every request; anyone else
    // only requests they made or support, or for their own mini apps.
    const mine = query.mine === 'true';
    if (requester !== undefined && (mine || !isPlatformAdmin(requester))) {
      this.applyScope(qb, requester, mine);
    }

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

  /**
   * One request. With a requester, returns null when that person may not see
   * it (the controller answers 404, so other partners' requests stay hidden).
   */
  async findOne(id: string, requester?: any): Promise<CapabilityProposal | null> {
    const qb = this.capabilityProposalRepository
      .createQueryBuilder('proposal')
      .leftJoinAndSelect('proposal.miniApp', 'miniApp')
      .leftJoinAndSelect('proposal.requestedBy', 'requestedBy')
      .where('proposal.id = :id', { id });
    if (requester !== undefined && !isPlatformAdmin(requester)) {
      this.applyScope(qb, requester, false);
    }
    const p = await qb.getOne();
    return p ? formatCapabilityProposalResponse(p) : null;
  }

  private applyScope(qb: any, requester: any, mineOnly: boolean): void {
    const userId = requesterId(requester);
    const orgId = mineOnly ? undefined : requester?.organizationId;
    if (!userId && !orgId) {
      qb.andWhere('1 = 0');
      return;
    }
    const clauses: string[] = [];
    if (userId) {
      clauses.push('requestedBy.id = :scopeUserId');
      clauses.push(
        "COALESCE(proposal.metadata->'supporters', '[]'::jsonb) @> CAST(:scopeSupporter AS jsonb)",
      );
      if (!mineOnly) clauses.push('miniApp.ownerId = :scopeUserId');
    }
    if (orgId) clauses.push('miniApp.organizationId = :scopeOrgId');
    qb.andWhere('(' + clauses.join(' OR ') + ')', {
      scopeUserId: userId,
      scopeSupporter: JSON.stringify([{ userId }]),
      scopeOrgId: orgId,
    });
  }

  /**
   * Adds someone to a pending request for the same capability. Returns false
   * when they already made or support it.
   */
  async addSupporter(
    proposal: CapabilityProposal,
    supporter: { userId: string; miniAppId?: string },
  ): Promise<boolean> {
    const metadata = { ...(proposal.metadata || {}) };
    const supporters: ProposalSupporter[] = Array.isArray(metadata.supporters)
      ? metadata.supporters
      : [];
    const already =
      (!!proposal.requestedBy?.id && proposal.requestedBy.id === supporter.userId) ||
      supporters.some(
        (s) =>
          s.userId === supporter.userId &&
          (s.miniAppId || null) === (supporter.miniAppId || null),
      );
    if (already) return false;
    metadata.supporters = [
      ...supporters,
      { ...supporter, at: new Date().toISOString() },
    ];
    await this.capabilityProposalRepository.update(proposal.id, { metadata });
    proposal.metadata = metadata;
    return true;
  }

  async findPendingByKey(capabilityKey: string): Promise<CapabilityProposal[]> {
    const list = await this.capabilityProposalRepository.find({
      where: [{ capabilityKey, status: 'PENDING_REVIEW' }],
      relations: { requestedBy: true, miniApp: true },
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
