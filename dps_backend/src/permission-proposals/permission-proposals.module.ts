import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionProposal } from './entities/permission-proposal.entity';
import { PermissionProposalsController } from './permission-proposals.controller';
import { PermissionProposalsService } from './permission-proposals.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PermissionProposal]),
    NotificationsModule,
    AuthModule,
  ],
  controllers: [PermissionProposalsController],
  providers: [PermissionProposalsService],
  exports: [PermissionProposalsService],
})
export class PermissionProposalsModule {}
