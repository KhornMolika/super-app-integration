import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CapabilityProposal } from './entities/capability-proposal.entity';

import { formatCapabilityProposalResponse } from './helpers/proposal-response.helper';

@Injectable()
export class CapabilityProposalsService {
  constructor(
    @InjectRepository(CapabilityProposal)
    private capabilityProposalRepository: Repository<CapabilityProposal>,
  ) {}

  async findAll(): Promise<CapabilityProposal[]> {
    const list = await this.capabilityProposalRepository.find({
      relations: { miniApp: true, requestedBy: true },
      order: { createdAt: 'DESC' },
    });
    return list.map((p) => formatCapabilityProposalResponse(p) as CapabilityProposal);
  }

  async findOne(id: string): Promise<CapabilityProposal | null> {
    const p = await this.capabilityProposalRepository.findOne({
      where: { id },
      relations: { miniApp: true, requestedBy: true },
    });
    return p ? (formatCapabilityProposalResponse(p) as CapabilityProposal) : null;
  }

  async findPendingByKey(capabilityKey: string): Promise<CapabilityProposal[]> {
    const list = await this.capabilityProposalRepository.find({
      where: [
        { capabilityKey, status: 'PENDING_REVIEW' },
      ],
    });
    return list.map((p) => formatCapabilityProposalResponse(p) as CapabilityProposal);
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
    return formatCapabilityProposalResponse(saved) as CapabilityProposal;
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
