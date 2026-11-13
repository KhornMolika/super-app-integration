import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MiniApp } from '../entities/miniapp.entity';
import { MiniAppCollaborator } from '../entities/miniapp-collaborator.entity';
import { MiniAppAccessService } from './miniapp-access.service';

/**
 * Stand-alone so modules that MiniappsModule itself imports (sdk-artifacts, ...)
 * can check Mini App access without a circular import.
 */
@Module({
  imports: [TypeOrmModule.forFeature([MiniApp, MiniAppCollaborator])],
  providers: [MiniAppAccessService],
  exports: [MiniAppAccessService],
})
export class MiniAppAccessModule {}
