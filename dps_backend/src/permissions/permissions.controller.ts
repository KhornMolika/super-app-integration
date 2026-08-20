import { Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsService } from './permissions.service';
import { RequirePermissions } from '../access-control/decorators/require-permissions.decorator';

@UseGuards(JwtAuthGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  async findAll() {
    return this.permissionsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('permission:manage')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.permissionsService.update(id, data);
  }
}
