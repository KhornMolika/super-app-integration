import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionProposal } from './entities/permission-proposal.entity';

@Injectable()
export class PermissionProposalsService {
  constructor(
    @InjectRepository(PermissionProposal)
    private permissionProposalRepository: Repository<PermissionProposal>,
  ) {}

  async findAll(): Promise<PermissionProposal[]> {
    return this.permissionProposalRepository.find({
      relations: { miniApp: true, requestedBy: true },
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(id: string): Promise<PermissionProposal | null> {
    return this.permissionProposalRepository.findOne({
      where: { id },
      relations: { miniApp: true, requestedBy: true }
    });
  }

  async findPendingByKey(permissionKey: string): Promise<PermissionProposal[]> {
    return this.permissionProposalRepository.find({
      where: { permissionKey, status: 'PENDING_REVIEW' }
    });
  }

  async create(data: Partial<PermissionProposal>): Promise<PermissionProposal> {
    const proposal = this.permissionProposalRepository.create(data);
    return this.permissionProposalRepository.save(proposal);
  }

  async update(id: string, data: Partial<PermissionProposal>): Promise<void> {
    await this.permissionProposalRepository.update(id, data);
  }
}
