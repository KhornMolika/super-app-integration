import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MiniAppVersion } from '../entities/miniapp-version.entity';
import { MiniAppVersionCapability } from '../entities/miniapp-version-capability.entity';
import { MiniAppVersionsService } from './miniapp-versions.service';
import { MiniAppVersionSyncSubscriber } from './miniapp-version-sync.subscriber';

/** Version rows and the capabilities each version asks for. */
@Module({
  imports: [TypeOrmModule.forFeature([MiniAppVersion, MiniAppVersionCapability])],
  providers: [MiniAppVersionsService, MiniAppVersionSyncSubscriber],
  exports: [MiniAppVersionsService],
})
export class MiniAppVersionsModule {}
