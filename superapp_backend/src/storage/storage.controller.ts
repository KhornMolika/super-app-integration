import {
  Controller,
  Get,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { UpdateLicenseDto, UploadBase64Dto } from './dto/storage.dto';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get('license-status')
  getLicenseStatus() {
    return this.storageService.getLicenseStatus();
  }

  @Post('update-license')
  @HttpCode(HttpStatus.OK)
  updateLicense(@Body() body: UpdateLicenseDto) {
    const status = this.storageService.setAistorLicense(body.licenseKey);
    return {
      success: true,
      message: 'MinIO AIStor license key updated successfully',
      ...status,
    };
  }

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Limit to image types
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are permitted');
    }

    const result = await this.storageService.uploadFile(file);
    return {
      success: true,
      url: result.url,
      filename: result.filename,
      size: result.size,
    };
  }

  @Post('upload-base64')
  @HttpCode(HttpStatus.OK)
  async uploadBase64(@Body() body: UploadBase64Dto) {
    const url = await this.storageService.uploadBase64(
      body.base64,
      body.nameHint,
    );
    return {
      success: true,
      url,
    };
  }
}
