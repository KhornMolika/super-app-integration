import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ReleaseAssemblyVerificationService } from './release-assembly-verification.service';
import { ApkBuildManagerService } from '../flutter/apk-build-manager.service';
import {
  VerifyAndAssembleReleaseDto,
  ReleaseAssemblyAuditResult,
  BuildStageUpdateDto,
  BuildCallbackDto,
} from './dto/release-assembly-verification.dto';
import { CallbackTokenGuard } from './callback-token.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../access-control/guards/rbac.guard';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { LocalBuildsGuard } from '../../common/guards/local-builds.guard';


@Controller(['release-assembly', 'api/release-assembly'])
export class ReleaseAssemblyVerificationController {
  constructor(
    private readonly releaseService: ReleaseAssemblyVerificationService,
    private readonly apkBuildManager: ApkBuildManagerService,
  ) {}

  @Post('verify')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions('super_app:manage')
  @HttpCode(HttpStatus.OK)
  async verify(
    @Body() dto: VerifyAndAssembleReleaseDto,
  ): Promise<ReleaseAssemblyAuditResult> {
    return this.releaseService.verifyAndAssembleRelease(dto);
  }

  @Post('stage')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions('super_app:manage')
  @HttpCode(HttpStatus.OK)
  async stageUpdate(@Body() body: any) {
    return this.releaseService.handleStageUpdate(body);
  }

  @Post('build-stage-update')
  @UseGuards(CallbackTokenGuard)
  @HttpCode(HttpStatus.OK)
  async buildStageUpdate(@Body() dto: BuildStageUpdateDto) {
    return this.releaseService.handleBuildStageUpdate(dto);
  }

  @Post('build-callback')
  @UseGuards(CallbackTokenGuard)
  @HttpCode(HttpStatus.OK)
  async buildCallback(@Body() dto: BuildCallbackDto) {
    return this.releaseService.handleBuildCallback(dto);
  }

  @Post('compile-apk')
  // auth and RBAC first, then the local-build switch (409 when disabled)
  @UseGuards(JwtAuthGuard, RbacGuard, LocalBuildsGuard)
  @RequirePermissions('super_app:manage')
  @HttpCode(HttpStatus.OK)
  async compileApk(
    @Body()
    body: {
      releaseVersion?: string;
      buildType?: string;
      appName?: string;
      apiBaseUrl?: string;
    },
  ) {
    return this.apkBuildManager.triggerBuild({
      releaseVersion: body.releaseVersion || 'v0.0.5',
      buildType: body.buildType || 'debug',
      appName: body.appName || 'superapp',
      apiBaseUrl: body.apiBaseUrl,
    });
  }

  @Get('apk-status')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions('super_app:read')
  getApkStatus() {
    return this.apkBuildManager.getStatus();
  }
}
