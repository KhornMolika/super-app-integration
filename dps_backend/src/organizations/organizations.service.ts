import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization, OrganizationStatus } from './entities/organization.entity';
import { FSA_ORGANIZATIONS } from '../common/constants/fsa-organizations';

import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedInitialOrganizations();
  }

  private async seedInitialOrganizations() {
    for (const org of FSA_ORGANIZATIONS) {
      const existing = await this.organizationRepository.findOne({
        where: [{ domain: org.domain }, { name: org.name }],
      });
      const orgData = {
        name: org.name,
        code: org.code,
        domain: org.domain,
        description: org.description,
        status: OrganizationStatus.ACTIVE,
        contactEmail: org.contactEmail,
        metadata: {
          shortCode: org.code,
          acronym: org.code,
          entityType: org.entityType,
          entityTypeLabel: org.entityTypeLabel,
          parentAuthority: org.parentAuthority,
          parentMinistry: org.parentMinistry,
        },
      };
      if (!existing) {
        await this.organizationRepository.save(this.organizationRepository.create(orgData));
      } else {
        existing.code = orgData.code;
        existing.name = orgData.name;
        existing.description = orgData.description;
        existing.contactEmail = orgData.contactEmail;
        existing.metadata = orgData.metadata;
        await this.organizationRepository.save(existing);
      }
    }
  }

  async findAll(): Promise<Organization[]> {
    return this.organizationRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Organization | null> {
    return this.organizationRepository.findOne({ where: { id } });
  }

  async create(data: CreateOrganizationDto): Promise<Organization> {
    const org = this.organizationRepository.create({
      ...data,
      status: data.status || OrganizationStatus.ACTIVE,
    });
    return this.organizationRepository.save(org);
  }

  async update(id: string, data: UpdateOrganizationDto): Promise<Organization> {
    const org = await this.findOne(id);
    if (!org) {
      throw new Error(`Organization ${id} not found`);
    }
    const merged = this.organizationRepository.merge(org, data);
    return this.organizationRepository.save(merged);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.organizationRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
