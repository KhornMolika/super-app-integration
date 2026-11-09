import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';
import { AuditController } from './audit.controller';
import { Identity } from '../identities/entities/identity.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, Identity])],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
