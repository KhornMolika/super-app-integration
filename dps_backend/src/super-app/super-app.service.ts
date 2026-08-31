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

    const initialCapabilities = ['camera', 'location', 'storage', 'microphone', 'biometrics'];
    
    await this.superAppCapabilityRepository.save({
      superAppVersion: version,
      platform: 'ALL',
      capabilities: initialCapabilities
    });
  }

  async findCapabilitiesForVersion(version: string): Promise<SuperAppCapability[]> {
    return this.superAppCapabilityRepository.find({ where: { superAppVersion: version } });
  }

  async findLatestCapability(): Promise<SuperAppCapability | null> {
    const list = await this.superAppCapabilityRepository.find({
      order: { createdAt: 'DESC' },
      take: 1,
    });
    return list[0] || null;
  }
}
