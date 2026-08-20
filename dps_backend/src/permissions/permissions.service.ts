import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionDefinition } from './entities/permission-definition.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(PermissionDefinition)
    private permissionDefinitionRepository: Repository<PermissionDefinition>,
  ) {}

  async findAll(): Promise<PermissionDefinition[]> {
    return this.permissionDefinitionRepository.find();
  }

  async findByKey(key: string): Promise<PermissionDefinition | null> {
    if (!key) return null;
    return this.permissionDefinitionRepository
      .createQueryBuilder('perm')
      .where('LOWER(perm.key) = LOWER(:key)', { key })
      .orWhere('LOWER(perm.name) = LOWER(:key)', { key })
      .getOne();
  }

  async findOne(id: string): Promise<PermissionDefinition> {
    const perm = await this.permissionDefinitionRepository.findOne({ where: { id } });
    if (!perm) throw new NotFoundException('Permission not found');
    return perm;
  }

  async update(id: string, data: Partial<PermissionDefinition>): Promise<PermissionDefinition> {
    const perm = await this.findOne(id);
    const merged = this.permissionDefinitionRepository.merge(perm, data);
    return this.permissionDefinitionRepository.save(merged);
  }
}
