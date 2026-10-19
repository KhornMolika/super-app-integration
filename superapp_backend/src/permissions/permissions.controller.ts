import {
  Controller,
  Get,
  Post,
  Param,
  Patch,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsService } from './permissions.service';
import { RequirePermissions } from '../access-control/decorators/require-permissions.decorator';
import { UpdatePermissionDefinitionDto } from './dto/update-permission-definition.dto';

@UseGuards(JwtAuthGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  async findAll() {
    return this.permissionsService.findAll();
  }

  @Get('capabilities')
  async getCapabilities(@Query('refresh') refresh?: string) {
    return this.permissionsService.getRealCapabilities({
      refresh: refresh === 'true' || refresh === '1',
    });
  }

  @Post('sync-gitlab')
  @RequirePermissions('permission:manage')
  async syncGitLab() {
    return this.permissionsService.syncCapabilitiesFromGitLab();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('permission:manage')
  async update(
    @Param('id') id: string,
    @Body() data: UpdatePermissionDefinitionDto,
  ) {
    return this.permissionsService.update(id, data);
  }
}
