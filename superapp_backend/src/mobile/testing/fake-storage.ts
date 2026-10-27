/** Minimal image bytes and an in-memory StorageService stand-in (test use only). */
export const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3,
]);
export const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2]);
export const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0, 0, 0, 0]),
  Buffer.from('WEBPVP8 '),
]);

export function fakeStorage() {
  const objects = new Map<string, Buffer>();
  return {
    objects,
    endUserMediaBucket: 'end-user-media',
    putPrivateObject: jest.fn(
      async (_b: string, k: string, body: Buffer) => void objects.set(k, body),
    ),
    getObjectBuffer: jest.fn(async (_b: string, k: string) => {
      const o = objects.get(k);
      if (!o)
        throw Object.assign(new Error('NoSuchKey'), { code: 'NoSuchKey' });
      return o;
    }),
    removeObject: jest.fn(
      async (_b: string, k: string) => void objects.delete(k),
    ),
  };
}
