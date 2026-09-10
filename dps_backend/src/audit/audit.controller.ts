import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async findAll(
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
  ): Promise<AuditLog[]> {
    return this.auditService.findAll({
      limit: limit ? parseInt(limit, 10) : 100,
      action,
      resourceType,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<AuditLog> {
    const log = await this.auditService.findOne(id);
    if (!log) {
      throw new NotFoundException(`Audit log ${id} not found`);
    }
    return log;
  }
}
