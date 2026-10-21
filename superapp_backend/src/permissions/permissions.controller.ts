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
    return this.permissionsService.getCapabilities({
      refresh: refresh === 'true' || refresh === '1',
    });
  }

  /**
   * Phase 2: Official FSASuperApp SDK JS Bridge Runtime Manifest
   * Serves dynamically generated capability signatures, canIUse contract, and error envelope.
   * Publicly accessible for WebView runtime initialization and client introspection.
   */
  @Get('bridge-manifest')
  async getBridgeManifest() {
    return this.permissionsService.getJsBridgeManifest();
  }

  @Post('sync-gitlab')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('permission:manage')
  async syncGitLab() {
    return this.permissionsService.syncCapabilitiesFromGitLab();
  }

  /**
   * Enterprise GitOps Webhook Trigger
   * Triggered by GitLab CI/CD pipeline automated capability extraction job
   */
  @Post('sync')
  async syncWebhook(@Body() body?: { targetBranch?: string }) {
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
