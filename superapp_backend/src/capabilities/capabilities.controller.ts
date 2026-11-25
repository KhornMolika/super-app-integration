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
import { RbacGuard } from '../access-control/guards/rbac.guard';
import {
  CreateCapabilityDefinitionDto,
  UpdateCapabilityDefinitionDto,
} from './dto/update-capability-definition.dto';
import { QueryCapabilitiesDto } from './dto/query-capabilities.dto';

@Controller(['capabilities', 'permissions', 'api/capabilities', 'api/permissions'])
export class CapabilitiesController {
  constructor(private readonly capabilitiesService: CapabilitiesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query() query: QueryCapabilitiesDto) {
    return this.capabilitiesService.findAll(query);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions('permission:manage')
  async create(@Body() data: CreateCapabilityDefinitionDto) {
    return this.capabilitiesService.create(data);
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
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions('permission:manage')
  async syncGitLab() {
    return this.capabilitiesService.syncCapabilitiesFromGitLab();
  }

  /**
   * Enterprise GitOps Webhook Trigger
   * Triggered by GitLab CI/CD pipeline automated capability extraction job
   */
  @Post('sync')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions('super_app:manage')
  async syncWebhook(@Body() body?: { targetBranch?: string }) {
    return this.capabilitiesService.syncCapabilitiesFromGitLab();
  }

  /**
   * SuperApp Host Supported Capabilities Whitelist Keys
   * Feeds directly into Jenkins build validation parameters and runtime capability gatekeeper.
   */
  @Get('allowed-keys')
  async getAllowedKeys() {
    return {
      allowedKeys: await this.capabilitiesService.getAllowedCapabilityKeys(),
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.capabilitiesService.findOne(id);
  }

  /**
   * Super Admin Policy Decision:
   * Explicitly allows or disallows a capability from being declared/bound by MiniApps.
   */
  @Patch(':id/toggle-allow')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions('permission:manage')
  async toggleAllow(
    @Param('id') id: string,
    @Body('isAllowed') isAllowed: boolean,
  ) {
    return this.capabilitiesService.toggleAllowed(id, isAllowed);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
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
