import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RequirePermissions } from '../access-control/decorators/require-permissions.decorator';
import { RbacGuard } from '../access-control/guards/rbac.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SdkArtifactUploadService } from './sdk-artifact-upload.service';
import { MiniAppAccessService } from '../miniapps/access/miniapp-access.service';
import { MiniAppAccess } from '../miniapps/access/miniapp-access.policy';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller(['sdk-artifacts', 'api/sdk-artifacts'])
export class SdkArtifactsController {
  constructor(
    private readonly uploads: SdkArtifactUploadService,
    private readonly access: MiniAppAccessService,
  ) {}

  /** 'draft' uploads belong to no app yet; any other ref must be an app the caller may edit. */
  private async requireApp(miniAppId: string, req: any, level: MiniAppAccess) {
    if (miniAppId === 'draft') return;
    await this.access.assert(miniAppId, req?.user, level);
  }

  /** Scans an iOS SDK for the registration form; stores nothing. */
  @Post('inspect/ios')
  @RequirePermissions('miniapp:create')
  @UseInterceptors(FileInterceptor('file'))
  inspectIos(@UploadedFile() file: Express.Multer.File) {
    this.assertFile(file, /\.xcframework\.zip$/i, '.xcframework.zip');
    return this.uploads.inspect('IOS', file.buffer, file.originalname);
  }

  /** Scans an Android SDK for the registration form; stores nothing. */
  @Post('inspect/android')
  @RequirePermissions('miniapp:create')
  @UseInterceptors(FileInterceptor('file'))
  inspectAndroid(@UploadedFile() file: Express.Multer.File) {
    this.assertFile(file, /\.aar$/i, '.aar');
    return this.uploads.inspect('ANDROID', file.buffer, file.originalname);
  }

  @Post(':miniAppId/upload/ios')
  @RequirePermissions('miniapp:update')
  @UseInterceptors(FileInterceptor('file'))
  async uploadIos(
    @Param('miniAppId') miniAppId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('version') version?: string,
    @Req() req?: any,
  ) {
    await this.requireApp(miniAppId, req, MiniAppAccess.EDIT);
    this.assertFile(file, /\.xcframework\.zip$/i, '.xcframework.zip');
    return this.uploads.upload({
      miniAppId,
      platform: 'IOS',
      buffer: file.buffer,
      filename: file.originalname,
      version,
    });
  }

  @Post(':miniAppId/upload/android')
  @RequirePermissions('miniapp:update')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAndroid(
    @Param('miniAppId') miniAppId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('version') version?: string,
    @Body('groupId') groupId?: string,
    @Req() req?: any,
  ) {
    await this.requireApp(miniAppId, req, MiniAppAccess.EDIT);
    this.assertFile(file, /\.aar$/i, '.aar');
    return this.uploads.upload({
      miniAppId,
      platform: 'ANDROID',
      buffer: file.buffer,
      filename: file.originalname,
      version,
      groupId,
    });
  }

  @Get(':miniAppId/status')
  @RequirePermissions('miniapp:read')
  async status(@Param('miniAppId') miniAppId: string, @Req() req: any) {
    await this.requireApp(miniAppId, req, MiniAppAccess.VIEW);
    return this.uploads.getStatus(miniAppId);
  }

  private assertFile(
    file: Express.Multer.File | undefined,
    pattern: RegExp,
    label: string,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException(`A non-empty ${label} file is required.`);
    }
    if (!pattern.test(file.originalname)) {
      throw new BadRequestException(`File must have the ${label} extension.`);
    }
    // Whole-file size is enforced by multer (limits.fileSize, see
    // sdkUploadMulterOptions); oversized uploads are rejected with 413 before
    // reaching this handler.
  }
}
