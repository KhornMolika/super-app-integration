import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MiniApp } from '../entities/miniapp.entity';
import { MiniAppVersion } from '../entities/miniapp-version.entity';
import { MiniAppVersionCapability } from '../entities/miniapp-version-capability.entity';
import { MiniAppVersionsService } from './miniapp-versions.service';
import { MiniAppVersionSyncSubscriber } from './miniapp-version-sync.subscriber';

/** Version rows and the capabilities each version asks for. */
@Module({
  imports: [TypeOrmModule.forFeature([MiniApp, MiniAppVersion, MiniAppVersionCapability])],
  providers: [MiniAppVersionsService, MiniAppVersionSyncSubscriber],
  exports: [MiniAppVersionsService],
})
export class MiniAppVersionsModule {}
