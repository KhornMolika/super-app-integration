import {
  Controller,
  HttpException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  UseGuards,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MiniappsService } from './miniapps.service';
import { CreateMiniAppDto } from './dto/create-miniapp.dto';
import { MiniAppStatus } from './entities/miniapp.entity';
import { UpdateMiniAppDto } from './dto/update-miniapp.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../access-control/guards/rbac.guard';
import { stripNativeSdkServerKeys } from './helpers/native-sdk-config.helper';
import { UrlProbeHelper } from './helpers/url-probe.helper';
import {
  maskMiniAppCredentials,
  secureFlutterIntegrationConfig,
} from './helpers/flutter-credential.helper';

import { RequirePermissions } from '../access-control/decorators/require-permissions.decorator';

import {
  VerifyDomainStandaloneDto,
  DetectPermissionsDto,
  RescanDto,
} from './dto/miniapp-actions.dto';
import { QueryMiniAppsDto } from './dto/query-miniapps.dto';
import { QueryIssuesDto } from './dto/query-issues.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('mini-apps')
export class MiniappsController {
  constructor(
    private readonly miniappService: MiniappsService,
    private readonly urlProbeHelper: UrlProbeHelper,
  ) {}

  @Get('issues/all')
  @RequirePermissions('miniapp:read')
  getAllIssues(@Query() query: QueryIssuesDto) {
    return this.miniappService.findAllIssues(query);
  }

  private extractIntegrationConfig(dto: any): any {
    const dataToSave: any = { ...dto };
    if (dto.integrationMethod === 'WEBVIEW') {
      dataToSave.integrationConfig = dto.integrationConfigWebView;
      if (dto.isDomainVerified !== undefined) {
        dataToSave.isDomainVerified = dto.isDomainVerified;
      } else if (dto.integrationConfigWebView?.isDomainVerified !== undefined) {
        dataToSave.isDomainVerified =
          dto.integrationConfigWebView.isDomainVerified;
      }
      if (dto.domainVerifiedAt !== undefined) {
        dataToSave.domainVerifiedAt = dto.domainVerifiedAt;
      } else if (dto.integrationConfigWebView?.domainVerifiedAt !== undefined) {
        dataToSave.domainVerifiedAt =
          dto.integrationConfigWebView.domainVerifiedAt;
      }
      const token =
        dto.verificationToken ||
        dto.integrationConfigWebView?.verificationToken;
      if (token) {
        dataToSave.verificationToken = token;
        if (dataToSave.integrationConfig) {
          dataToSave.integrationConfig.verificationToken = token;
        }
      }
    } else if (dto.integrationMethod === 'FLUTTER_PACKAGE') {
      dataToSave.integrationConfig = secureFlutterIntegrationConfig(
        dto.integrationConfigFlutter,
      );
    } else if (dto.integrationMethod === 'DEEP_LINK') {
      dataToSave.integrationConfig = dto.integrationConfigDeepLink;
    } else if (dto.integrationMethod === 'NATIVE_SDK') {
      dataToSave.integrationConfig = stripNativeSdkServerKeys(
        dto.integrationConfigNativeSdk,
      );
    }

    // Clean up DTO specific fields
    delete dataToSave.integrationConfigWebView;
    delete dataToSave.integrationConfigFlutter;
    delete dataToSave.integrationConfigDeepLink;
    delete dataToSave.integrationConfigNativeSdk;

    return dataToSave;
  }

  @Post('draft')
  @RequirePermissions('miniapp:create')
  async createDraft(@Body() createData: any, @Req() req: any) {
    const dataToSave = this.extractIntegrationConfig(createData);
    dataToSave.lifecycleStatus = 'DRAFT';
    dataToSave.status = 'DRAFT';
    dataToSave.ownerId = req.user.sub || req.user.id;
    dataToSave.ownerEmail = dataToSave.ownerEmail || req.user.email;
    dataToSave.ownerName = dataToSave.ownerName || req.user.name;

    // Automatic Agency Inheritance
    const userOrgId = req.user?.organizationId;
    const isDeveloper = req.user?.roles?.includes('MA_DEVELOPER');
    if (userOrgId) {
      if (
        isDeveloper &&
        dataToSave.organizationId &&
        dataToSave.organizationId !== userOrgId
      ) {
        throw new ForbiddenException(
          'Access Denied: You cannot create a MiniApp under another organization',
        );
      }
      dataToSave.organizationId = userOrgId;
      if (req.user?.organization)
        dataToSave.organization = req.user.organization;
      if (req.user?.organizationCode)
        dataToSave.organizationCode = req.user.organizationCode;
    }

    const created = await this.miniappService.create(dataToSave, req.user.sub);
    return maskMiniAppCredentials(created);
  }

  @Post()
  @RequirePermissions('miniapp:create')
  async create(@Body() createData: CreateMiniAppDto, @Req() req: any) {
    const dataToSave = this.extractIntegrationConfig(createData);
    dataToSave.lifecycleStatus = 'IN_REVIEW';
    dataToSave.status = 'IN_REVIEW';
    dataToSave.ownerId = req.user.sub || req.user.id;
    dataToSave.ownerEmail = dataToSave.ownerEmail || req.user.email;
    dataToSave.ownerName = dataToSave.ownerName || req.user.name;

    // Automatic Agency Inheritance
    const userOrgId = req.user?.organizationId;
    const isDeveloper = req.user?.roles?.includes('MA_DEVELOPER');
    if (userOrgId) {
      if (
        isDeveloper &&
        dataToSave.organizationId &&
        dataToSave.organizationId !== userOrgId
      ) {
        throw new ForbiddenException(
          'Access Denied: You cannot create a MiniApp under another organization',
        );
      }
      dataToSave.organizationId = userOrgId;
      if (req.user?.organization)
        dataToSave.organization = req.user.organization;
      if (req.user?.organizationCode)
        dataToSave.organizationCode = req.user.organizationCode;
    }

    const created = await this.miniappService.create(dataToSave, req.user.sub);
    return maskMiniAppCredentials(created);
  }

  @Get()
  @RequirePermissions('miniapp:read')
  async findAll(@Query() query: QueryMiniAppsDto, @Req() req?: any) {
    const user = req?.user;
    const roles = user?.roles || [];
    try {
      return await this.miniappService.findAll(query, roles, user);
    } catch (error: any) {
      console.error('FIND ALL ERROR:', error);
      throw new HttpException(
        { message: error?.message || 'Error', stack: error?.stack },
        500,
      );
    }
  }

  @Get('check-url')
  @RequirePermissions('miniapp:read')
  async checkUrl(@Query('url') url: string) {
    return this.urlProbeHelper.checkUrl(url);
  }

  @Get('check-exists')
  @RequirePermissions('miniapp:read')
  checkExists(
    @Query('appId') appId?: string,
    @Query('name') name?: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.miniappService.checkExists(appId, name, excludeId);
  }

  @Get('generate-token')
  @RequirePermissions('miniapp:create')
  generateToken() {
    return { token: this.miniappService.generateVerificationToken() };
  }

  @Post('verify-domain')
  @RequirePermissions('miniapp:create')
  verifyDomainStandalone(
    @Body()
    body: VerifyDomainStandaloneDto,
  ) {
    return this.miniappService.verifyDomainStandalone(
      body.productionUrl,
      body.appId,
      body.verificationToken,
    );
  }

  @Post('inspect-artifact')
  @RequirePermissions('miniapp:create')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 500 * 1024 * 1024 },
    }),
  )
  async inspectArtifact(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'Package archive file (.zip / .tar.gz) is required.',
      );
    }
    return this.miniappService.inspectPackageArtifact(file);
  }

  @Post('upload-artifact')
  @RequirePermissions('miniapp:create')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 500 * 1024 * 1024 },
    }),
  )
  async uploadArtifact(
    @UploadedFile() file: Express.Multer.File,
    @Body('miniAppId') miniAppId?: string,
    @Body('version') version?: string,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Package archive file (.zip / .tar.gz) is required.',
      );
    }
    return this.miniappService.uploadPackageArtifact(file, miniAppId, version);
  }

  @Post('detect-permissions')
  @RequirePermissions('miniapp:create')
  detectPermissions(
    @Body()
    body: DetectPermissionsDto,
  ) {
    return this.miniappService.detectPermissions(body);
  }

  @Post(':id/verify-domain')
  @RequirePermissions('miniapp:update')
  verifyDomain(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body?: { productionUrl?: string },
  ) {
    return this.miniappService.verifyDomain(id, body?.productionUrl);
  }

  @Post(':id/submit')
  @RequirePermissions('miniapp:update')
  async submitForReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    const app = await this.miniappService.findOne(id);
    if (!app) throw new NotFoundException('MiniApp not found');

    const user = req?.user;
    const isElevated =
      user?.roles?.includes('SUPER_ADMIN') || user?.roles?.includes('ADMIN');

    // Step 2: Cross-Agency Strict Isolation
    if (
      !isElevated &&
      user?.organizationId &&
      app.organizationId &&
      user.organizationId !== app.organizationId
    ) {
      throw new ForbiddenException(
        "Access Denied: You cannot access another organization's MiniApp",
      );
    }

    // Step 3: Sensitive Governance Gate (Option C: Only Lead Developer or SuperAdmin/Admin can submit for review)
    const isLeadMaintainer = app.ownerId === (user?.sub || user?.id);
    if (!isElevated && !isLeadMaintainer) {
      throw new ForbiddenException(
        'Only the Lead Developer (ownerId) or a SuperAdmin can submit releases or change availability',
      );
    }

    return this.miniappService.submitForReview(id, req.user.sub);
  }

  @Post(':id/rescan')
  @RequirePermissions('miniapp:update')
  rescan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RescanDto,
    @Req() req: any,
  ) {
    return this.miniappService.rescan(id, req.user?.sub, body?.securityChecks);
  }

  @Post(':id/cancel-validation')
  @RequirePermissions('miniapp:update')
  cancelValidation(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.miniappService.cancelValidation(id, req.user?.sub);
  }

  @Post(':id/approve')
  @RequirePermissions('miniapp:approve')
  approve(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.miniappService.approve(id, req.user.sub);
  }

  @Post(':id/codegen')
  @RequirePermissions('miniapp:approve')
  rerunCodegen(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.miniappService.rerunNativeSdkCodegen(id, req.user.sub);
  }

  @Post(':id/reject')
  @RequirePermissions('miniapp:reject')
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.miniappService.reject(id, reason, req.user.sub);
  }

  @Post(':id/request-changes')
  @RequirePermissions('miniapp:reject')
  requestChanges(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.miniappService.requestChanges(id, reason, req.user.sub);
  }

  @Post(':id/start-testing')
  @RequirePermissions('miniapp:approve')
  startTesting(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.miniappService.startTesting(id, req.user.sub);
  }

  @Post(':id/activate')
  @RequirePermissions('miniapp:approve')
  activate(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.miniappService.activate(id, req.user.sub);
  }

  @Post(':id/publish-revision')
  @RequirePermissions('miniapp:approve')
  publishRevision(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.miniappService.publishRevision(id, req.user.sub);
  }

  @Post(':id/discard-revision')
  @RequirePermissions('miniapp:update')
  discardRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.miniappService.discardRevision(id, req.user.sub, reason);
  }

  @Post(':id/suspend')
  @RequirePermissions('miniapp:suspend')
  suspend(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.miniappService.suspend(id, req.user.sub);
  }

  @Get(':id/activities')
  @RequirePermissions('miniapp:read')
  async getActivities(@Param('id', ParseUUIDPipe) id: string) {
    return this.miniappService.getActivities(id);
  }

  @Get(':id/collaborators')
  @RequirePermissions('miniapp:read')
  async getCollaborators(@Param('id', ParseUUIDPipe) id: string) {
    return this.miniappService.getCollaborators(id);
  }

  @Post(':id/collaborators')
  @RequirePermissions('miniapp:update')
  async addCollaborator(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { userId: string; role?: any },
  ) {
    return this.miniappService.addCollaborator(
      id,
      body.userId,
      body.role || 'DEVELOPER',
    );
  }

  @Delete(':id/collaborators/:userId')
  @RequirePermissions('miniapp:update')
  async removeCollaborator(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    await this.miniappService.removeCollaborator(id, userId);
    return { success: true };
  }

  @Get(':id')
  @RequirePermissions('miniapp:read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req?: any) {
    const app = await this.miniappService.findOne(id);
    if (!app) throw new NotFoundException('MiniApp not found');

    const user = req?.user;
    const isElevated =
      user?.roles?.includes('SUPER_ADMIN') ||
      user?.roles?.includes('ADMIN') ||
      user?.roles?.includes('SECURITY_ADMIN') ||
      user?.roles?.includes('COMPLIANCE_OFFICER');

    if (
      !isElevated &&
      user?.organizationId &&
      app.organizationId &&
      user.organizationId !== app.organizationId
    ) {
      throw new ForbiddenException(
        "Access Denied: You cannot access another organization's MiniApp",
      );
    }

    return maskMiniAppCredentials(app);
  }

  @Patch(':id')
  @RequirePermissions('miniapp:update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: UpdateMiniAppDto,
    @Req() req: any,
  ) {
    const app = await this.miniappService.findOne(id);
    if (!app) throw new NotFoundException('MiniApp not found');

    const user = req?.user;
    const isElevated =
      user?.roles?.includes('SUPER_ADMIN') ||
      user?.roles?.includes('ADMIN') ||
      user?.roles?.includes('SECURITY_ADMIN') ||
      user?.roles?.includes('COMPLIANCE_OFFICER');

    if (
      !isElevated &&
      user?.organizationId &&
      app.organizationId &&
      user.organizationId !== app.organizationId
    ) {
      throw new ForbiddenException(
        "Access Denied: You cannot access another organization's MiniApp",
      );
    }

    const dataToSave = this.extractIntegrationConfig(updateData);
    const updated = await this.miniappService.update(
      id,
      dataToSave,
      user?.sub || user?.id,
    );
    return maskMiniAppCredentials(updated);
  }

  @Delete(':id')
  @RequirePermissions('miniapp:delete')
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.miniappService.remove(id, req.user.sub);
  }

  @Get(':id/versions')
  @RequirePermissions('miniapp:read')
  async getVersions(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Query() query: PaginationQueryDto,
  ) {
    return this.miniappService.getVersionHistory(id, req.user, query);
  }

  @Get(':id/diff')
  @RequirePermissions('miniapp:read')
  getDiff(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('baseVersion') baseVersion?: string,
    @Query('targetVersion') targetVersion?: string,
  ) {
    return this.miniappService.getDiff(id, baseVersion, targetVersion);
  }

  @Post(':id/rollback')
  @RequirePermissions('miniapp:update')
  async rollback(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('targetVersion') targetVersion: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.miniappService.rollback(
      id,
      targetVersion,
      req.user?.sub,
      reason,
    );
  }

  @Post(':id/invite-token')
  @RequirePermissions('miniapp:read')
  async createInviteToken(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('expiresIn') expiresIn: string,
    @Req() req: any,
  ) {
    return this.miniappService.generateInviteToken(
      id,
      req.user,
      expiresIn || '7d',
    );
  }

  @Get(':id/artifacts/test-apk')
  async downloadTestApk(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('version') version: string,
    @Query('token') inviteToken: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    return this.miniappService.streamArtifact(
      id,
      'test',
      version,
      req.user,
      inviteToken,
      res,
    );
  }

  @Get(':id/artifacts/release-apk')
  async downloadReleaseApk(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('version') version: string,
    @Query('token') inviteToken: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    return this.miniappService.streamArtifact(
      id,
      'release',
      version,
      req.user,
      inviteToken,
      res,
    );
  }

  @Get(':id/artifacts/download')
  async downloadArtifact(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('type') type: 'test' | 'release',
    @Query('version') version: string,
    @Query('token') inviteToken: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    return this.miniappService.streamArtifact(
      id,
      type === 'release' ? 'release' : 'test',
      version,
      req.user,
      inviteToken,
      res,
    );
  }
}
