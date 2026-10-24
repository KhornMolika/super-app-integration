import { SetMetadata } from '@nestjs/common';

export const BYPASS_TRANSFORM_KEY = 'bypassTransform';

/**
 * Decorator to bypass the global TransformInterceptor for endpoints
 * that return raw binaries, streams, downloads, or external webhook responses.
 */
export const BypassTransform = () => SetMetadata(BYPASS_TRANSFORM_KEY, true);
