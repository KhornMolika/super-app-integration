import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CapabilityProposal } from './entities/capability-proposal.entity';
import { CapabilityProposalsController } from './capability-proposals.controller';
import { CapabilityProposalsService } from './capability-proposals.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { CapabilitiesModule } from '../capabilities/capabilities.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CapabilityProposal]),
    NotificationsModule,
    AuthModule,
    CapabilitiesModule,
  ],
  controllers: [CapabilityProposalsController],
  providers: [CapabilityProposalsService],
  exports: [CapabilityProposalsService],
})
export class CapabilityProposalsModule {}

// Backwards-compatible alias
export { CapabilityProposalsModule as PermissionProposalsModule };
