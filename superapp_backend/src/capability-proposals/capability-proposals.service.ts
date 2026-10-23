import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CapabilityProposal } from './entities/capability-proposal.entity';

@Injectable()
export class CapabilityProposalsService {
  constructor(
    @InjectRepository(CapabilityProposal)
    private capabilityProposalRepository: Repository<CapabilityProposal>,
  ) {}

  async findAll(): Promise<CapabilityProposal[]> {
    return this.capabilityProposalRepository.find({
      relations: { miniApp: true, requestedBy: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<CapabilityProposal | null> {
    return this.capabilityProposalRepository.findOne({
      where: { id },
      relations: { miniApp: true, requestedBy: true },
    });
  }

  async findPendingByKey(capabilityKey: string): Promise<CapabilityProposal[]> {
    return this.capabilityProposalRepository.find({
      where: [
        { capabilityKey, status: 'PENDING_REVIEW' },
      ],
    });
  }

  async create(data: Partial<CapabilityProposal>): Promise<CapabilityProposal> {
    const proposal = this.capabilityProposalRepository.create(data);
    return this.capabilityProposalRepository.save(proposal);
  }

  async update(id: string, data: Partial<CapabilityProposal>): Promise<void> {
    await this.capabilityProposalRepository.update(id, data);
  }
}

// Backwards-compatible alias
export { CapabilityProposalsService as PermissionProposalsService };
