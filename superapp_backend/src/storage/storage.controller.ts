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
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { UpdateLicenseDto, UploadBase64Dto } from './dto/storage.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../access-control/guards/rbac.guard';
import { RequirePermissions } from '../access-control/decorators/require-permissions.decorator';
import { verifyAssetSignature } from './asset-url-signer';

/**
 * The asset routes (/storage/asset, /logos/*, /mini-app-assets/*, ...) need a
 * backend-issued signature (see asset-url-signer.ts). As a second layer, since
 * the bucket also holds partner package sources, SDK uploads, security reports
 * and end-user avatars, only images under these prefixes are ever served, even
 * with a valid signature: a partner could otherwise put a crafted asset link in
 * a field the backend echoes back signed.
 */
export const PUBLIC_ASSET_PREFIXES = [
  'miniapps/',
  'organizations/',
  'logos/',
  'platform/',
  'users/backoffice/',
  'avatars/', // legacy backoffice-user-media layout
];
const PUBLIC_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'ico']);

export function isPublicAssetKey(key: string): boolean {
  const normalized = key.replace(/^\/+/, '');
  if (normalized.split('/').some((seg) => seg === '..')) return false;
  const ext = normalized.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  return (
    PUBLIC_IMAGE_EXTENSIONS.has(ext) &&
    PUBLIC_ASSET_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  );
}

async function pipeAssetHelper(
  storageService: StorageService,
  rawKey: string,
  rawBucket: string | undefined,
  res: Response,
) {
  if (!rawKey) {
    return res
      .status(HttpStatus.BAD_REQUEST)
      .json({ message: 'Key is required' });
  }

  // Use provided bucket or fallback to mini-app-assets
  // Callers cannot choose arbitrary buckets: only the backoffice media bucket may be
  // named explicitly; any other value (incl. legacy names) maps to the asset bucket.
  const defaultBucket = storageService.assetsBucket || 'superapp-storage';
  const targetBucket =
    rawBucket && rawBucket === storageService.backofficeUserMediaBucket
      ? rawBucket
      : defaultBucket;

  const cleanKey = decodeURIComponent(rawKey)
    .replace(/^https?:\/\/[^\/]+\//, '')
    .replace(/^\/+/, '')
    .replace(/^(?:superapp-storage\/|mini-app-assets\/|mini-app-logos\/)/, '')
    .replace(/^\/+/, '')
    .split('?')[0];

  const strippedKey = cleanKey.replace(/^logos\//, '');

  // Candidate object keys to check in MinIO
  const candidateKeys = [
    cleanKey,
    `miniapps/${strippedKey}/logos/logo.png`,
    `miniapps/${strippedKey}/logos/logo.jpg`,
    `miniapps/${strippedKey}/logos/logo.jpeg`,
    `miniapps/${strippedKey}/logos/logo.webp`,
    `miniapps/${cleanKey}`,
    `organizations/${strippedKey}/branding/logo.png`,
    `organizations/${strippedKey}/branding/logo.jpg`,
    `organizations/${strippedKey}/branding/logo.svg`,
    `organizations/${strippedKey}/branding/logo.webp`,
    `organizations/${strippedKey}/logo.png`,
    `logos/${strippedKey}`,
    `logos/${strippedKey}/logo.png`,
    `logos/${strippedKey}/logo.jpg`,
    `logos/${strippedKey}/logo.jpeg`,
    `logos/${strippedKey}/logo.webp`,
    `${strippedKey}/logo.png`,
    `${strippedKey}/logo.jpg`,
  ];

  const bucketsToCheck = [targetBucket];
  if (
    storageService.assetsBucket &&
    !bucketsToCheck.includes(storageService.assetsBucket)
  ) {
    bucketsToCheck.push(storageService.assetsBucket);
  }

  let resolvedKey: string | null = null;
  let resolvedBucket: string = targetBucket;

  for (const b of bucketsToCheck) {
    for (const candidate of candidateKeys) {
      if (!isPublicAssetKey(candidate)) continue;
      try {
        await storageService.statObject(b, candidate);
        resolvedKey = candidate;
        resolvedBucket = b;
        break;
      } catch {
        // Continue to next candidate
      }
    }
    if (resolvedKey) break;
  }

  if (!resolvedKey) {
    return res
      .status(HttpStatus.NOT_FOUND)
      .json({ message: 'Asset not found' });
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
    const stream = await storageService.getObjectStream(
      resolvedBucket,
      resolvedKey,
    );
    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(HttpStatus.NOT_FOUND).json({ message: 'Asset not found' });
      }
    });
    return stream.pipe(res);
  } catch (_) {
    return res
      .status(HttpStatus.NOT_FOUND)
      .json({ message: 'Asset not found' });
  }
}

@Controller(['storage', 'api/storage'])
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get('asset')
  async getAsset(
    @Query('key') key: string,
    @Query('bucket') bucket: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Res() res: Response,
  ) {
    // Only links the backend issued (AssetUrlSigningInterceptor) are served.
    if (!verifyAssetSignature(key, bucket ?? '', exp, sig)) {
      return res
        .status(HttpStatus.FORBIDDEN)
        .json({ message: 'Invalid or expired asset link' });
    }
    return pipeAssetHelper(this.storageService, key, bucket, res);
  }

  @Get('presign')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions('settings:manage')
  getLicenseStatus() {
    return this.storageService.getLicenseStatus();
  }

  @Post('update-license')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions('settings:manage')
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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

@Controller([
  'mini-app-assets',
  'mini-app-logos',
  'logos',
  'backoffice-user-media',
  'api/mini-app-assets',
  'api/mini-app-logos',
  'api/logos',
  'api/backoffice-user-media',
])
export class PublicAssetProxyController {
  constructor(private readonly storageService: StorageService) {}

  @Get('*path')
  async serveAsset(@Req() req: Request, @Res() res: Response) {
    // Legacy path-style routes. The backend never issues these links (it signs
    // /storage/asset links only), so they serve nothing without a valid signature
    // over the path key, and MinIO keys cannot be guessed through them.
    const pathKey = (req.path || '').replace(
      /^\/(?:api\/)?(?:mini-app-assets|mini-app-logos|logos|backoffice-user-media)\/?/,
      '',
    );
    const { exp, sig } = req.query as Record<string, string | undefined>;
    if (!verifyAssetSignature(pathKey, '', exp, sig)) {
      return res
        .status(HttpStatus.FORBIDDEN)
        .json({ message: 'Invalid or expired asset link' });
    }
    const rawUrl = req.originalUrl || req.url || '';
    const isBackofficeMedia = rawUrl.includes('backoffice-user-media');
    const bucket = isBackofficeMedia
      ? this.storageService.backofficeUserMediaBucket || 'backoffice-user-media'
      : this.storageService.assetsBucket || 'superapp-storage';
    const key = rawUrl.replace(
      /^\/(?:api\/)?(?:mini-app-assets|mini-app-logos|logos|backoffice-user-media)\/?/,
      '',
    );
    return pipeAssetHelper(this.storageService, key, bucket, res);
  }
}
