import { Injectable } from '@nestjs/common';
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
    return this.permissionDefinitionRepository.findOne({ where: { key } });
  }
}
