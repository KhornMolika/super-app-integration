import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { UpdateLicenseDto, UploadBase64Dto } from './dto/storage.dto';

async function pipeAssetHelper(
  storageService: StorageService,
  rawKey: string,
  rawBucket: string | undefined,
  res: Response,
) {
  if (!rawKey) {
    return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Key is required' });
  }

  // We exclusively use mini-app-assets bucket
  const targetBucket = storageService.assetsBucket || 'mini-app-assets';

  const cleanKey = decodeURIComponent(rawKey)
    .replace(/^https?:\/\/[^\/]+\//, '')
    .replace(/^\/+/, '')
    .replace(/^(?:mini-app-assets\/|mini-app-logos\/)/, '')
    .replace(/^\/+/, '')
    .split('?')[0];

  const strippedKey = cleanKey.replace(/^logos\//, '');

  // Candidate object keys to check in MinIO
  const candidateKeys = [
    cleanKey,
    `logos/${strippedKey}`,
    `logos/${strippedKey}/logo.png`,
    `logos/${strippedKey}/logo.jpg`,
    `logos/${strippedKey}/logo.jpeg`,
    `logos/${strippedKey}/logo.webp`,
    `${strippedKey}/logo.png`,
    `${strippedKey}/logo.jpg`,
  ];

  let resolvedKey: string | null = null;
  for (const candidate of candidateKeys) {
    try {
      await storageService.statObject(targetBucket, candidate);
      resolvedKey = candidate;
      break;
    } catch {
      // Continue to next candidate
    }
  }

  if (!resolvedKey) {
    return res.status(HttpStatus.NOT_FOUND).json({ message: 'Asset not found' });
  }

  const ext = resolvedKey.split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    gif: 'image/gif',
    ico: 'image/x-icon',
  };
  const contentType = (ext && mimeMap[ext]) || 'image/png';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable');

  try {
    const stream = await storageService.getObjectStream(targetBucket, resolvedKey);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(HttpStatus.NOT_FOUND).json({ message: 'Asset not found' });
      }
    });
    return stream.pipe(res);
  } catch (_) {
    return res.status(HttpStatus.NOT_FOUND).json({ message: 'Asset not found' });
  }
}

@Controller(['storage', 'api/storage'])
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get('asset')
  async getAsset(
    @Query('key') key: string,
    @Query('bucket') bucket: string,
    @Res() res: Response,
  ) {
    return pipeAssetHelper(this.storageService, key, bucket, res);
  }

  @Get('presign')
  async getPresignedUrl(@Query('key') key?: string) {
    if (!key) {
      throw new BadRequestException('Query parameter "key" is required');
    }
    const url = await this.storageService.resolveLogoUrl(key);
    return {
      success: true,
      url,
    };
  }

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

@Controller(['mini-app-assets', 'mini-app-logos', 'logos'])
export class PublicAssetProxyController {
  constructor(private readonly storageService: StorageService) {}

  @Get('*path')
  async serveAsset(@Req() req: Request, @Res() res: Response) {
    const rawUrl = req.originalUrl || req.url || '';
    const key = rawUrl.replace(/^\/(?:api\/)?(?:mini-app-assets|mini-app-logos|logos)\/?/, '');
    const bucket = 'mini-app-assets';
    return pipeAssetHelper(this.storageService, key, bucket, res);
  }
}

