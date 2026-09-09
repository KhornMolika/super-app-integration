import { Injectable, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionDefinition } from './entities/permission-definition.entity';

@Injectable()
export class PermissionsService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(PermissionDefinition)
    private permissionDefinitionRepository: Repository<PermissionDefinition>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedInitialPermissions();
  }

  private async seedInitialPermissions() {
    const defaultPermissions = [
      {
        key: 'camera',
        name: 'Camera',
        category: 'DEVICE',
        description: 'Access device camera to take photos or scan QR codes',
      },
      {
        key: 'location',
        name: 'Location',
        category: 'DEVICE',
        description: 'Access device GPS location for map and geolocation features',
      },
      {
        key: 'biometrics',
        name: 'Biometrics',
        category: 'SECURITY',
        description: 'Access biometric authentication (FaceID, TouchID, Fingerprint)',
      },
      {
        key: 'microphone',
        name: 'Microphone',
        category: 'DEVICE',
        description: 'Access device microphone to record audio notes or voice features',
      },
      {
        key: 'storage',
        name: 'Storage',
        category: 'DEVICE',
        description: 'Read and write local files or device storage',
      },
    ];

    for (const p of defaultPermissions) {
      const exists = await this.findByKey(p.key);
      if (!exists) {
        await this.permissionDefinitionRepository.save(
          this.permissionDefinitionRepository.create(p),
        );
      }
    }
  }

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
    const perm = await this.permissionDefinitionRepository.findOne({
      where: { id },
    });
    if (!perm) throw new NotFoundException('Permission not found');
    return perm;
  }

  async update(
    id: string,
    data: Partial<PermissionDefinition>,
  ): Promise<PermissionDefinition> {
    const perm = await this.findOne(id);
    const merged = this.permissionDefinitionRepository.merge(perm, data);
    return this.permissionDefinitionRepository.save(merged);
  }
}
