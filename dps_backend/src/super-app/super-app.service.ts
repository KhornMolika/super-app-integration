import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SuperAppCapability } from './entities/super-app-capability.entity';

@Injectable()
export class SuperAppService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(SuperAppCapability)
    private superAppCapabilityRepository: Repository<SuperAppCapability>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedInitialCapabilities();
  }

  private async seedInitialCapabilities() {
    const version = '2.0.0';
    const count = await this.superAppCapabilityRepository.count({ where: { superAppVersion: version } });
    if (count > 0) return;

    const initialCapabilities = ['camera', 'location', 'storage', 'microphone'];
    
    for (const key of initialCapabilities) {
      await this.superAppCapabilityRepository.save({
        superAppVersion: version,
        permissionKey: key,
        supportedPlatform: 'ALL',
        isSupported: true
      });
    }
  }

  async findCapabilitiesForVersion(version: string): Promise<SuperAppCapability[]> {
    return this.superAppCapabilityRepository.find({ where: { superAppVersion: version } });
  }

  async findLatestCapability(): Promise<SuperAppCapability | null> {
    return this.superAppCapabilityRepository.findOne({ order: { createdAt: 'DESC' } });
  }
}
