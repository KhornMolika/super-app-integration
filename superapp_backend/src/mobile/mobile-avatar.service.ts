import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { StorageService } from '../storage/storage.service';
import { EndUser } from './entities/end-user.entity';

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export interface AvatarType {
  ext: 'jpg' | 'png' | 'webp';
  contentType: string;
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** Identifies by content. The client-declared MIME type and filename are ignored. */
export function detectAvatarType(buf: Buffer): AvatarType | null {
  if (
    buf.length >= 3 &&
    buf[0] === 0xff &&
    buf[1] === 0xd8 &&
    buf[2] === 0xff
  ) {
    return { ext: 'jpg', contentType: 'image/jpeg' };
  }
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_MAGIC)) {
    return { ext: 'png', contentType: 'image/png' };
  }
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { ext: 'webp', contentType: 'image/webp' };
  }
  return null;
}

/** MinIO's missing-object errors; anything else is a storage failure, not "no avatar". */
function isMissingObject(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  return code === 'NoSuchKey' || code === 'NotFound';
}

export type AvatarRead =
  | { notModified: true; etag: string }
  | { notModified: false; etag: string; body: Buffer; contentType: string };

@Injectable()
export class MobileAvatarService {
  private readonly logger = new Logger(MobileAvatarService.name);

  constructor(
    @InjectRepository(EndUser) private readonly users: Repository<EndUser>,
    private readonly storage: StorageService,
  ) {}

  async upload(
    userId: string,
    file: { buffer?: Buffer; size?: number } | undefined,
  ): Promise<EndUser> {
    const buf = file?.buffer;
    if (!buf || buf.length === 0)
      throw new BadRequestException('Choose an image to upload');
    if (buf.length > AVATAR_MAX_BYTES)
      throw new PayloadTooLargeException('Image is larger than 2 MB');
    const type = detectAvatarType(buf);
    if (!type)
      throw new BadRequestException(
        'Only JPEG, PNG or WebP images are allowed',
      );

    const user = await this.findUser(userId);
    const key = `avatars/${userId}/${crypto.randomUUID()}.${type.ext}`;
    await this.storage.putPrivateObject(
      this.storage.endUserMediaBucket,
      key,
      buf,
      type.contentType,
    );
    const previous = user.avatarKey;
    const now = new Date();
    await this.users.update(
      { id: userId },
      { avatarKey: key, avatarUpdatedAt: now },
    );
    user.avatarKey = key;
    user.avatarUpdatedAt = now;
    if (previous) await this.deleteObject(previous);
    return user;
  }

  async read(userId: string, ifNoneMatch?: string): Promise<AvatarRead> {
    const user = await this.findUser(userId);
    if (!user.avatarKey || !user.avatarUpdatedAt) throw new NotFoundException();
    const etag = `"${new Date(user.avatarUpdatedAt).getTime()}"`;
    if (ifNoneMatch === etag) return { notModified: true, etag };
    let body: Buffer;
    try {
      body = await this.storage.getObjectBuffer(
        this.storage.endUserMediaBucket,
        user.avatarKey,
      );
    } catch (err) {
      // Only a genuinely missing object is a 404; an outage or misconfiguration must surface as 5xx.
      if (isMissingObject(err)) throw new NotFoundException();
      const code = (err as { code?: unknown } | null)?.code;
      this.logger.warn(
        `Could not read an avatar object from storage${typeof code === 'string' ? ` (${code})` : ''}`,
      );
      throw err;
    }
    const ext = user.avatarKey.split('.').pop() ?? '';
    return {
      notModified: false,
      etag,
      body,
      contentType: CONTENT_TYPES[ext] ?? 'application/octet-stream',
    };
  }

  async remove(userId: string): Promise<void> {
    const user = await this.findUser(userId);
    const key = user.avatarKey;
    if (!key) return;
    await this.users.update(
      { id: userId },
      { avatarKey: null, avatarUpdatedAt: null },
    );
    await this.deleteObject(key);
  }

  /** Best effort: an orphaned object in the private bucket is harmless; a failed request is not. */
  async deleteObject(key: string): Promise<void> {
    try {
      await this.storage.removeObject(this.storage.endUserMediaBucket, key);
    } catch {
      this.logger.warn('Could not delete an avatar object; it is now orphaned');
    }
  }

  private async findUser(userId: string): Promise<EndUser> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    return user;
  }
}
