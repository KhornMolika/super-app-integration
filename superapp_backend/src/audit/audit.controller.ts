import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async findAll(@Query() query: QueryAuditLogDto): Promise<AuditLog[]> {
    return this.auditService.findAll({
      limit: query.limit ?? 100,
      action: query.action,
      resourceType: query.resourceType,
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
