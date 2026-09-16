import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { SettingsService, PipelineTimingSettings } from './settings.service';
import {
  ArtifactRetentionService,
  ArtifactRetentionPolicy,
} from './artifact-retention.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdatePipelineTimingDto } from './dto/pipeline-timing-settings.dto';
import { UpdateArtifactRetentionDto } from './dto/artifact-retention-policy.dto';
import { UpdateSystemSettingDto } from './dto/update-system-setting.dto';

@Controller(['settings', 'api/settings'])
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly artifactRetentionService: ArtifactRetentionService,
  ) {}

  @Get('pipeline-timing')
  @UseGuards(JwtAuthGuard)
  async getPipelineTiming(@Req() req: any): Promise<PipelineTimingSettings> {
    const userRoles: string[] = req.user?.roles || [];
    if (!userRoles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException(
        'Only Super Admin can access pipeline timing settings',
      );
    }
    return this.settingsService.getPipelineTiming();
  }

  @Put('pipeline-timing')
  @UseGuards(JwtAuthGuard)
  async updatePipelineTiming(
    @Body() body: UpdatePipelineTimingDto,
    @Req() req: any,
  ): Promise<PipelineTimingSettings> {
    const userRoles: string[] = req.user?.roles || [];
    if (!userRoles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException(
        'Only Super Admin can configure pipeline timing settings',
      );
    }
    return this.settingsService.updatePipelineTiming(body);
  }

  @Get('artifact-retention')
  @UseGuards(JwtAuthGuard)
  async getArtifactRetention(@Req() req: any) {
    const userRoles: string[] = req.user?.roles || [];
    if (!userRoles.includes('SUPER_ADMIN') && !userRoles.includes('ADMIN')) {
      throw new ForbiddenException(
        'Only Super Admin and Admin can access artifact retention settings',
      );
    }
    const [policy, stats] = await Promise.all([
      this.artifactRetentionService.getPolicy(),
      this.artifactRetentionService.getStorageStats(),
    ]);
    return { policy, stats };
  }

  @Put('artifact-retention')
  @UseGuards(JwtAuthGuard)
  async updateArtifactRetention(
    @Body() body: UpdateArtifactRetentionDto,
    @Req() req: any,
  ) {
    const userRoles: string[] = req.user?.roles || [];
    if (!userRoles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException(
        'Only Super Admin can modify artifact retention policies',
      );
    }
    const updated = await this.artifactRetentionService.updatePolicy(body);
    const stats = await this.artifactRetentionService.getStorageStats();
    return { success: true, policy: updated, stats };
  }

  @Post('artifact-retention/run')
  @UseGuards(JwtAuthGuard)
  async runImmediatePruning(@Req() req: any) {
    const userRoles: string[] = req.user?.roles || [];
    if (!userRoles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException(
        'Only Super Admin can execute storage pruning manually',
      );
    }
    return this.artifactRetentionService.executePruning('MANUAL');
  }

  @Get(':key')
  async getSetting(@Param('key') key: string) {
    const value = await this.settingsService.getSetting(key);
    return { key, value };
  }

  @Put(':key')
  @UseGuards(JwtAuthGuard)
  async setSetting(
    @Param('key') key: string,
    @Body() body: UpdateSystemSettingDto,
    @Req() req: any,
  ) {
    const userRoles: string[] = req.user?.roles || [];
    if (!userRoles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException(
        'Only Super Admin can modify system settings',
      );
    }
    const setting = await this.settingsService.setSetting(
      key,
      body.value,
      body.description,
    );
    return { success: true, setting };
  }
}

