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

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll() {
    return this.permissionsService.findAll();
  }

  /**
   * Public Platform Capability Directory
   * Open to MiniApps, client shells, and unauthenticated registration steps.
   */
  @Get('capabilities')
  async getCapabilities(@Query('refresh') refresh?: string) {
    return this.permissionsService.getRealCapabilities({
      refresh: refresh === 'true' || refresh === '1',
    });
  }

  @Post('sync-gitlab')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('permission:manage')
  async syncGitLab() {
    return this.permissionsService.syncCapabilitiesFromGitLab();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('permission:manage')
  async update(
    @Param('id') id: string,
    @Body() data: UpdatePermissionDefinitionDto,
  ) {
    return this.permissionsService.update(id, data);
  }
}
