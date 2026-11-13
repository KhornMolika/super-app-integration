import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MiniAppScan } from './entities/miniapp-scan.entity';
import { MiniAppBuild } from './entities/miniapp-build.entity';
import { MiniAppRunsService } from './miniapp-runs.service';

/** Scan and build runs. Own module: integrations and miniapps both use it. */
@Module({
  imports: [TypeOrmModule.forFeature([MiniAppScan, MiniAppBuild])],
  providers: [MiniAppRunsService],
  exports: [MiniAppRunsService],
})
export class MiniAppRunsModule {}
