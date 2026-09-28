import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RequirePermissions } from '../access-control/decorators/require-permissions.decorator';
import { RbacGuard } from '../access-control/guards/rbac.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SdkArtifactUploadService } from './sdk-artifact-upload.service';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller(['sdk-artifacts', 'api/sdk-artifacts'])
export class SdkArtifactsController {
  constructor(private readonly uploads: SdkArtifactUploadService) {}

  @Post(':miniAppId/upload/ios')
  @RequirePermissions('miniapp:update')
  @UseInterceptors(FileInterceptor('file'))
  uploadIos(
    @Param('miniAppId') miniAppId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('version') version?: string,
  ) {
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
  uploadAndroid(
    @Param('miniAppId') miniAppId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('version') version?: string,
    @Body('groupId') groupId?: string,
  ) {
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
  status(@Param('miniAppId') miniAppId: string) {
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
