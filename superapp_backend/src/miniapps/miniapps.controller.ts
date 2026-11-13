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
  Optional,
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
import { RetirementActor } from './helpers/miniapp-retirement.helper';

import {
  VerifyDomainStandaloneDto,
  DetectPermissionsDto,
  RescanDto,
  AddCollaboratorDto,
  TransferOwnershipDto,
} from './dto/miniapp-actions.dto';
import { CollaboratorRole } from './entities/miniapp-collaborator.entity';
import { MiniAppAccessService } from './access/miniapp-access.service';
import {
  MiniAppAccess,
  capabilityTypes,
  isSuperAdmin,
  subjectId,
} from './access/miniapp-access.policy';
import { CapabilityGateService } from '../capabilities/capability-gate.service';
import { QueryMiniAppsDto } from './dto/query-miniapps.dto';
import { QueryIssuesDto } from './dto/query-issues.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

function retirementActor(req: any): RetirementActor {
  const user = req?.user ?? {};
  return {
    id: user.sub || user.id,
    name: user.name || user.email,
    roles: Array.isArray(user.roles) ? user.roles : [],
  };
}

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller([
  'mini-apps',
  'miniapps',
  'api/mini-apps',
  'api/miniapps',
])
export class MiniappsController {
  constructor(
    private readonly miniappService: MiniappsService,
    private readonly urlProbeHelper: UrlProbeHelper,
    private readonly access: MiniAppAccessService,
    @Optional() private readonly capabilityGate?: CapabilityGateService,
  ) {}

  /** Loads the app and throws 404/403 unless the caller holds `level` on it. */
  private require(id: string, req: any, level: MiniAppAccess) {
    return this.access.assert(id, req?.user, level);
  }

  /** True when the caller holds VIEW; false lets an invite token decide. */
  private async canView(id: string, req: any): Promise<boolean> {
    try {
      await this.require(id, req, MiniAppAccess.VIEW);
      return true;
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        return false;
      }
      throw err;
    }
  }

  @Get('issues/all')
  @RequirePermissions('miniapp:read')
  getAllIssues(@Query() query: QueryIssuesDto, @Req() req: any) {
    return this.miniappService.findAllIssues(query, req?.user);
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
    // The draft body is intentionally not DTO-validated (partial forms are allowed),
    // but appId and name are NOT NULL columns: reject early with a 400, not a DB 500.
    const missing = ['appId', 'name'].filter(
      (k) => typeof createData?.[k] !== 'string' || !createData[k].trim(),
    );
    if (missing.length) {
      throw new BadRequestException(
        `${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} required to save a draft.`,
      );
    }
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
    @Req() req: any,
    @Body('miniAppId') miniAppId?: string,
    @Body('version') version?: string,
  ) {
    // An upload for an existing app needs EDIT on it; draft uploads belong to no app yet
    if (miniAppId && miniAppId !== 'draft') {
      await this.require(miniAppId, req, MiniAppAccess.EDIT);
    }
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
  async verifyDomain(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Body() body?: { productionUrl?: string },
  ) {
    await this.require(id, req, MiniAppAccess.EDIT);
    return this.miniappService.verifyDomain(id, body?.productionUrl);
  }

  @Post(':id/submit')
  @RequirePermissions('miniapp:update')
  async submitForReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    // Owner, MAINTAINER collaborator, organization admin or Super Admin
    await this.require(id, req, MiniAppAccess.MAINTAIN);
    return this.miniappService.submitForReview(id, req.user.sub);
  }

  @Post(':id/rescan')
  @RequirePermissions('miniapp:update')
  async rescan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RescanDto,
    @Req() req: any,
  ) {
    await this.require(id, req, MiniAppAccess.EDIT);
    return this.miniappService.rescan(id, req.user?.sub, body?.securityChecks);
  }

  /** Publishes (or confirms) the scanned Flutter package in Nexus pub-hosted. */
  @Post(':id/publish-package')
  @RequirePermissions('miniapp:approve')
  async publishPackage(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    await this.require(id, req, MiniAppAccess.ADMIN);
    return this.miniappService.publishPackageToNexus(id);
  }

  @Post(':id/cancel-validation')
  @RequirePermissions('miniapp:update')
  async cancelValidation(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    await this.require(id, req, MiniAppAccess.EDIT);
    return this.miniappService.cancelValidation(id, req.user?.sub);
  }

  @Post(':id/approve')
  @RequirePermissions('miniapp:approve')
  async approve(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    await this.require(id, req, MiniAppAccess.ADMIN);
    return this.miniappService.approve(id, req.user.sub);
  }

  @Post(':id/codegen')
  @RequirePermissions('miniapp:approve')
  async rerunCodegen(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    await this.require(id, req, MiniAppAccess.ADMIN);
    return this.miniappService.rerunNativeSdkCodegen(id, req.user.sub);
  }

  @Post(':id/reject')
  @RequirePermissions('miniapp:reject')
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    await this.require(id, req, MiniAppAccess.ADMIN);
    return this.miniappService.reject(id, reason, req.user.sub);
  }

  @Post(':id/request-changes')
  @RequirePermissions('miniapp:reject')
  async requestChanges(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    await this.require(id, req, MiniAppAccess.ADMIN);
    return this.miniappService.requestChanges(id, reason, req.user.sub);
  }

  @Post(':id/start-testing')
  @RequirePermissions('miniapp:approve')
  async startTesting(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    await this.require(id, req, MiniAppAccess.ADMIN);
    return this.miniappService.startTesting(id, req.user.sub);
  }

  /** TESTING -> TEST_PASSED: the test build works; the app can then be activated. */
  @Post(':id/pass-testing')
  @RequirePermissions('miniapp:approve')
  async passTesting(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    await this.require(id, req, MiniAppAccess.ADMIN);
    return this.miniappService.passTesting(id, req.user.sub);
  }

  @Post(':id/activate')
  @RequirePermissions('miniapp:approve')
  async activate(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    await this.require(id, req, MiniAppAccess.ADMIN);
    return this.miniappService.activate(id, req.user.sub);
  }

  @Post(':id/publish-revision')
  @RequirePermissions('miniapp:approve')
  async publishRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    await this.require(id, req, MiniAppAccess.ADMIN);
    return this.miniappService.publishRevision(id, req.user.sub);
  }

  @Post(':id/discard-revision')
  @RequirePermissions('miniapp:update')
  async discardRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    await this.require(id, req, MiniAppAccess.MAINTAIN);
    return this.miniappService.discardRevision(id, req.user.sub, reason);
  }

  // Suspend / resume: ADMIN and SUPER_ADMIN (miniapp:suspend). Archive, decline
  // and restore: SUPER_ADMIN only (checked in MiniappRetirementHelper).
  @Post(':id/suspend')
  @RequirePermissions('miniapp:suspend')
  async suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string; requestArchive?: boolean },
    @Req() req: any,
  ) {
    await this.require(id, req, MiniAppAccess.ADMIN);
    return this.miniappService.suspend(id, retirementActor(req), body ?? {});
  }

  @Post(':id/resume')
  @RequirePermissions('miniapp:suspend')
  async resume(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    await this.require(id, req, MiniAppAccess.ADMIN);
    return this.miniappService.resume(id, retirementActor(req));
  }

  @Post(':id/request-archive')
  @RequirePermissions('miniapp:suspend')
  async requestArchive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    await this.require(id, req, MiniAppAccess.ADMIN);
    return this.miniappService.requestArchive(id, retirementActor(req), reason);
  }

  @Post(':id/archive')
  @RequirePermissions('miniapp:suspend')
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    await this.require(id, req, MiniAppAccess.ADMIN);
    return this.miniappService.archive(id, retirementActor(req), reason);
  }

  @Post(':id/decline-archive')
  @RequirePermissions('miniapp:suspend')
  async declineArchive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    await this.require(id, req, MiniAppAccess.ADMIN);
    return this.miniappService.declineArchive(id, retirementActor(req), reason);
  }

  @Post(':id/restore')
  @RequirePermissions('miniapp:suspend')
  async restore(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    await this.require(id, req, MiniAppAccess.ADMIN);
    return this.miniappService.restore(id, retirementActor(req));
  }

  @Get(':id/activities')
  @RequirePermissions('miniapp:read')
  async getActivities(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    await this.require(id, req, MiniAppAccess.VIEW);
    return this.miniappService.getActivities(id);
  }

  @Get(':id/collaborators')
  @RequirePermissions('miniapp:read')
  async getCollaborators(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    await this.require(id, req, MiniAppAccess.VIEW);
    return this.miniappService.getCollaborators(id);
  }

  @Post(':id/collaborators')
  @RequirePermissions('miniapp:update')
  async addCollaborator(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AddCollaboratorDto,
    @Req() req: any,
  ) {
    // The same-organization rule and the owner check live in the service
    await this.require(id, req, MiniAppAccess.MAINTAIN);
    return this.miniappService.addCollaborator(
      id,
      body.userId,
      body.role || CollaboratorRole.DEVELOPER,
    );
  }

  @Delete(':id/collaborators/:userId')
  @RequirePermissions('miniapp:update')
  async removeCollaborator(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: any,
  ) {
    // Anyone may leave an app they collaborate on; removing others needs MAINTAIN
    const leaving = userId === subjectId(req?.user);
    await this.require(
      id,
      req,
      leaving ? MiniAppAccess.VIEW : MiniAppAccess.MAINTAIN,
    );
    await this.miniappService.removeCollaborator(id, userId);
    return { success: true };
  }

  /**
   * Hands the app to another active developer or admin of its organization.
   * Owner, organization admin or Super Admin (OWN access). The organization
   * never changes here.
   */
  @Post(':id/transfer-ownership')
  @RequirePermissions('miniapp:update')
  async transferOwnership(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: TransferOwnershipDto,
    @Req() req: any,
  ) {
    await this.require(id, req, MiniAppAccess.OWN);
    const updated = await this.miniappService.transferOwnership(
      id,
      body.newOwnerId,
      {
        id: subjectId(req?.user) || undefined,
        name: req?.user?.name || req?.user?.email,
      },
      body.keepPreviousOwner !== false,
    );
    return maskMiniAppCredentials(updated);
  }

  @Get(':id')
  @RequirePermissions('miniapp:read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req?: any) {
    const { level } = await this.require(id, req, MiniAppAccess.VIEW);
    const app = await this.miniappService.findOne(id);
    if (!app) throw new NotFoundException('MiniApp not found');

    // myAccess lets the Backoffice hide actions the caller cannot take
    const masked = {
      ...maskMiniAppCredentials(app),
      myAccess: MiniAppAccess[level],
    };
    // ADR-004 Section 5: which capabilities are disabled and whether it can launch
    return this.capabilityGate
      ? {
          ...masked,
          capabilityAvailability: await this.capabilityGate.evaluate(app.capabilities),
        }
      : masked;
  }

  @Patch(':id')
  @RequirePermissions('miniapp:update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: UpdateMiniAppDto,
    @Req() req: any,
  ) {
    const user = req?.user;
    const { app, level } = await this.require(id, req, MiniAppAccess.EDIT);

    // Changing the requested permissions needs MAINTAIN. DEVELOPER collaborators
    // may re-send the current list, as the edit form does on every save.
    const requested = updateData.permissions ?? updateData.capabilities;
    if (requested !== undefined) {
      const next = capabilityTypes(requested).join(',');
      const revision = (app as any).pendingRevision;
      const unchanged = [
        app.capabilities,
        revision?.capabilities,
        revision?.permissions,
      ].some(
        (list) =>
          list !== undefined && capabilityTypes(list).join(',') === next,
      );
      if (!unchanged) this.access.check(level, MiniAppAccess.MAINTAIN);
    }

    const dataToSave = this.extractIntegrationConfig(updateData);
    const updated = await this.miniappService.update(
      id,
      dataToSave,
      user?.sub || user?.id,
      // Only a Super Admin may move an app to another organization or owner
      { lockOwnership: !isSuperAdmin(user) },
    );
    return maskMiniAppCredentials(updated);
  }

  // Owners may delete their own DRAFT/REJECTED apps; the helper checks owner or admin.
  @Delete(':id')
  @RequirePermissions('miniapp:update')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('confirm') confirm: string | undefined,
    @Req() req: any,
  ) {
    await this.require(id, req, MiniAppAccess.OWN);
    return this.miniappService.remove(id, req.user?.sub, req.user, confirm);
  }

  @Get(':id/versions')
  @RequirePermissions('miniapp:read')
  async getVersions(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Query() query: PaginationQueryDto,
  ) {
    await this.require(id, req, MiniAppAccess.VIEW);
    return this.miniappService.getVersionHistory(id, req.user, query);
  }

  @Get(':id/diff')
  @RequirePermissions('miniapp:read')
  async getDiff(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Query('baseVersion') baseVersion?: string,
    @Query('targetVersion') targetVersion?: string,
  ) {
    await this.require(id, req, MiniAppAccess.VIEW);
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
    await this.require(id, req, MiniAppAccess.MAINTAIN);
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
    // An invite link hands download access to people outside the app's team
    await this.require(id, req, MiniAppAccess.MAINTAIN);
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
      await this.canView(id, req),
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
      await this.canView(id, req),
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
      await this.canView(id, req),
      inviteToken,
      res,
    );
  }
}
