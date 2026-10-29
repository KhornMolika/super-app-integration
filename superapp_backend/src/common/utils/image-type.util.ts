const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export interface ImageTypeResult {
  ext: 'jpg' | 'png' | 'webp';
  contentType: string;
}

/**
 * Detects image format strictly via magic byte inspection.
 * Client-declared MIME types and filenames are safely ignored to prevent file-type spoofing.
 */
export function detectImageFileType(buf: Buffer): ImageTypeResult | null {
  if (!buf || buf.length < 4) return null;

  // JPEG: Starts with FF D8 FF
  if (
    buf.length >= 3 &&
    buf[0] === 0xff &&
    buf[1] === 0xd8 &&
    buf[2] === 0xff
  ) {
    return { ext: 'jpg', contentType: 'image/jpeg' };
  }

  // PNG: Starts with 89 50 4E 47 0D 0A 1A 0A
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_MAGIC)) {
    return { ext: 'png', contentType: 'image/png' };
  }

  // WebP: RIFF ... WEBP
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { ext: 'webp', contentType: 'image/webp' };
  }

  return null;
}

