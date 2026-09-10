import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization, OrganizationStatus } from './entities/organization.entity';

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
    const count = await this.organizationRepository.count();
    if (count > 0) return;

    const initial = [
      {
        name: 'Insurance Authority',
        domain: 'insurance.gov.kh',
        description: 'National regulatory body for general, life, and micro-insurance programs.',
        status: OrganizationStatus.ACTIVE,
        contactEmail: 'support@insurance.gov.kh',
      },
      {
        name: 'National Bank of Cambodia (NBC)',
        domain: 'nbc.org.kh',
        description: 'Central bank and financial regulator oversight for digital payment services.',
        status: OrganizationStatus.ACTIVE,
        contactEmail: 'info@nbc.org.kh',
      },
      {
        name: 'Ministry of Economy and Finance (MEF)',
        domain: 'mef.gov.kh',
        description: 'Public sector digital integration and financial governance.',
        status: OrganizationStatus.ACTIVE,
        contactEmail: 'digital@mef.gov.kh',
      },
    ];

    for (const org of initial) {
      await this.organizationRepository.save(this.organizationRepository.create(org));
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

  async create(data: Partial<Organization>): Promise<Organization> {
    const org = this.organizationRepository.create({
      ...data,
      status: data.status || OrganizationStatus.ACTIVE,
    });
    return this.organizationRepository.save(org);
  }

  async update(id: string, data: Partial<Organization>): Promise<Organization> {
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
