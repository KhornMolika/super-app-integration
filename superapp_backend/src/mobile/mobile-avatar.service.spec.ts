import {
  BadRequestException,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { FakeRepo } from './testing/fake-repo';
import { JPEG, PNG, WEBP, fakeStorage } from './testing/fake-storage';
import { EndUser } from './entities/end-user.entity';
import {
  AVATAR_MAX_BYTES,
  MobileAvatarService,
  detectAvatarType,
} from './mobile-avatar.service';

function build() {
  const users = new FakeRepo<EndUser>(['email']);
  users.rows.push({
    id: 'u1',
    email: 'a@b.io',
    avatarKey: null,
    avatarUpdatedAt: null,
  } as unknown as EndUser);
  const storage = fakeStorage();
  return {
    users,
    storage,
    svc: new MobileAvatarService(users as any, storage as any),
  };
}

describe('detectAvatarType', () => {
  it('recognises JPEG/PNG/WebP by magic bytes only', () => {
    expect(detectAvatarType(JPEG)?.contentType).toBe('image/jpeg');
    expect(detectAvatarType(PNG)?.ext).toBe('png');
    expect(detectAvatarType(WEBP)?.contentType).toBe('image/webp');
    expect(detectAvatarType(Buffer.from('GIF89a....'))).toBeNull();
    expect(detectAvatarType(Buffer.from('<svg onload=alert(1)>'))).toBeNull();
  });
});

describe('MobileAvatarService', () => {
  it('stores privately, versions the user row and replaces the previous object', async () => {
    const { svc, users, storage } = build();
    const first = await svc.upload('u1', { buffer: PNG, size: PNG.length });
    const firstKey = first.avatarKey!;
    expect(firstKey).toMatch(/^avatars\/u1\/[0-9a-f-]+\.png$/);
    expect(storage.putPrivateObject).toHaveBeenCalledWith(
      'end-user-media',
      firstKey,
      PNG,
      'image/png',
    );
    await svc.upload('u1', { buffer: JPEG, size: JPEG.length });
    expect(users.rows[0].avatarKey).toMatch(/\.jpg$/);
    expect(storage.objects.has(firstKey)).toBe(false);
    expect(storage.objects.size).toBe(1);
  });

  it('rejects empty, oversized and non-image uploads', async () => {
    const { svc } = build();
    await expect(svc.upload('u1', undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      svc.upload('u1', { buffer: Buffer.alloc(0), size: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    const big = Buffer.concat([PNG, Buffer.alloc(AVATAR_MAX_BYTES)]);
    await expect(
      svc.upload('u1', { buffer: big, size: big.length }),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
    await expect(
      svc.upload('u1', { buffer: Buffer.from('hello'), size: 5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('read returns bytes + etag, honours If-None-Match, 404 without avatar', async () => {
    const { svc } = build();
    await expect(svc.read('u1')).rejects.toBeInstanceOf(NotFoundException);
    await svc.upload('u1', { buffer: PNG, size: PNG.length });
    const full = await svc.read('u1');
    if (full.notModified) throw new Error('expected body');
    expect(full.body.equals(PNG)).toBe(true);
    expect(full.contentType).toBe('image/png');
    const again = await svc.read('u1', full.etag);
    expect(again.notModified).toBe(true);
  });

  it('read maps only a missing object to 404 and lets other storage errors propagate', async () => {
    const { svc, storage } = build();
    await svc.upload('u1', { buffer: PNG, size: PNG.length });
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    try {
      storage.objects.clear(); // row still points at the key, the object is gone
      await expect(svc.read('u1')).rejects.toBeInstanceOf(NotFoundException);
      storage.getObjectBuffer.mockRejectedValueOnce(
        Object.assign(new Error('missing'), { code: 'NotFound' }),
      );
      await expect(svc.read('u1')).rejects.toBeInstanceOf(NotFoundException);
      expect(warn).not.toHaveBeenCalled();

      const outage = Object.assign(new Error('connect ECONNREFUSED'), {
        code: 'ECONNREFUSED',
      });
      storage.getObjectBuffer.mockRejectedValueOnce(outage);
      const failure = await svc.read('u1').catch((e) => e);
      expect(failure).toBe(outage);
      expect(failure).not.toBeInstanceOf(NotFoundException);
      expect(warn).toHaveBeenCalledTimes(1);

      storage.getObjectBuffer.mockRejectedValueOnce(
        new Error('no code at all'),
      );
      await expect(svc.read('u1')).rejects.not.toBeInstanceOf(
        NotFoundException,
      );
    } finally {
      warn.mockRestore();
    }
  });

  it('remove clears the row and the object; deleteObject swallows storage errors', async () => {
    const { svc, users, storage } = build();
    await svc.upload('u1', { buffer: PNG, size: PNG.length });
    await svc.remove('u1');
    expect(users.rows[0].avatarKey).toBeNull();
    expect(storage.objects.size).toBe(0);
    storage.removeObject.mockRejectedValueOnce(new Error('minio down'));
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    try {
      await expect(
        svc.deleteObject('avatars/u1/x.png'),
      ).resolves.toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });
});
