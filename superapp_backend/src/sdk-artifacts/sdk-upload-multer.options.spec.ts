import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_SDK_ARTIFACT_MAX_BYTES,
  sdkUploadMulterOptions,
} from './sdk-upload-multer.options';

const cfg = (v?: string) => ({ get: () => v }) as unknown as ConfigService;

describe('sdkUploadMulterOptions', () => {
  it('defaults limits.fileSize to 200 MB and one file', () => {
    expect(sdkUploadMulterOptions(cfg()).limits).toEqual({
      fileSize: 200 * 1024 * 1024,
      files: 1,
    });
    expect(DEFAULT_SDK_ARTIFACT_MAX_BYTES).toBe(200 * 1024 * 1024);
  });

  it('honours SDK_ARTIFACT_MAX_BYTES from config', () => {
    expect(sdkUploadMulterOptions(cfg('1024')).limits?.fileSize).toBe(1024);
  });

  it('falls back to default for invalid values', () => {
    for (const bad of ['abc', '0', '-5']) {
      expect(sdkUploadMulterOptions(cfg(bad)).limits?.fileSize).toBe(
        DEFAULT_SDK_ARTIFACT_MAX_BYTES,
      );
    }
  });
});
