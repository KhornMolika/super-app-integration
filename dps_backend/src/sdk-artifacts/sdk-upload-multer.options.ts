import { ConfigService } from '@nestjs/config';
import { MulterModuleOptions } from '@nestjs/platform-express';

export const DEFAULT_SDK_ARTIFACT_MAX_BYTES = 200 * 1024 * 1024;

/**
 * Multer options for SDK artifact uploads. Built through ConfigService (via
 * MulterModule.registerAsync) rather than read from process.env at import time,
 * because ConfigModule loads .env files after controller modules are imported.
 * Set SDK_ARTIFACT_MAX_BYTES to override the 200 MB default.
 */
export function sdkUploadMulterOptions(
  config: ConfigService,
): MulterModuleOptions {
  const configured = Number(config.get('SDK_ARTIFACT_MAX_BYTES'));
  const fileSize =
    Number.isFinite(configured) && configured > 0
      ? configured
      : DEFAULT_SDK_ARTIFACT_MAX_BYTES;
  return { limits: { fileSize, files: 1 } };
}
