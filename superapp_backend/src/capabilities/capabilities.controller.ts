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
import { CapabilitiesService } from './capabilities.service';
import { RequirePermissions } from '../access-control/decorators/require-permissions.decorator';
import { UpdateCapabilityDefinitionDto } from './dto/update-capability-definition.dto';

@Controller(['capabilities', 'permissions'])
export class CapabilitiesController {
  constructor(private readonly capabilitiesService: CapabilitiesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll() {
    return this.capabilitiesService.findAll();
  }

  /**
   * Public Platform Capability Directory
   * Open to MiniApps, client shells, and unauthenticated registration steps.
   */
  @Get('capabilities')
  async getCapabilities(@Query('refresh') refresh?: string) {
    return this.capabilitiesService.getCapabilities({
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
    return this.capabilitiesService.getJsBridgeManifest();
  }

  @Post('sync-gitlab')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('permission:manage')
  async syncGitLab() {
    return this.capabilitiesService.syncCapabilitiesFromGitLab();
  }

  /**
   * Enterprise GitOps Webhook Trigger
   * Triggered by GitLab CI/CD pipeline automated capability extraction job
   */
  @Post('sync')
  async syncWebhook(@Body() body?: { targetBranch?: string }) {
    return this.capabilitiesService.syncCapabilitiesFromGitLab();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.capabilitiesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('permission:manage')
  async update(
    @Param('id') id: string,
    @Body() data: UpdateCapabilityDefinitionDto,
  ) {
    return this.capabilitiesService.update(id, data);
  }
}

// Backwards-compatible alias
export { CapabilitiesController as PermissionsController };
