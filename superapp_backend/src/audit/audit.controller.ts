import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../access-control/guards/rbac.guard';
import { RequirePermissions } from '../access-control/decorators/require-permissions.decorator';
import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@Controller(['audit-logs', 'api/audit-logs'])
// Audit trail is sensitive: previously readable without login
@UseGuards(JwtAuthGuard, RbacGuard)
@RequirePermissions('audit_log:read')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async findAll(@Query() query: QueryAuditLogDto, @Req() req: any) {
    return this.auditService.findAll(query, req?.user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any): Promise<AuditLog> {
    const log = await this.auditService.findOne(id, req?.user);
    if (!log) {
      throw new NotFoundException(`Audit log ${id} not found`);
    }
    return log;
  }
}
