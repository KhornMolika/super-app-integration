import {
  Controller,
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

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

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
  async uploadBase64(@Body() body: { base64: string; nameHint?: string }) {
    if (!body?.base64) {
      throw new BadRequestException('Base64 image data is required');
    }
    const url = await this.storageService.uploadBase64(body.base64, body.nameHint);
    return {
      success: true,
      url,
    };
  }
}
