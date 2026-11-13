import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../access-control/decorators/require-permissions.decorator';
import { SdkArtifactsController } from './sdk-artifacts.controller';

const file = (name: string, size = 10): any => ({
  originalname: name,
  buffer: Buffer.alloc(size, 1),
  size,
});
const ID = '11111111-1111-4111-8111-111111111111';

describe('SdkArtifactsController', () => {
  let uploads: { upload: jest.Mock; getStatus: jest.Mock };
  let access: { assert: jest.Mock };
  let controller: SdkArtifactsController;

  beforeEach(() => {
    uploads = {
      upload: jest.fn().mockResolvedValue({ ok: 1 }),
      getStatus: jest.fn().mockResolvedValue({}),
    };
    access = { assert: jest.fn().mockResolvedValue({ app: {}, level: 2 }) };
    controller = new SdkArtifactsController(uploads as any, access as any);
  });

  it('uploadIos delegates with IOS platform', async () => {
    const f = file('Foo.xcframework.zip');
    await controller.uploadIos(ID, f, '2.0.0');
    expect(uploads.upload).toHaveBeenCalledWith({
      miniAppId: ID,
      platform: 'IOS',
      buffer: f.buffer,
      filename: 'Foo.xcframework.zip',
      version: '2.0.0',
    });
  });

  it('uploadAndroid delegates with ANDROID platform', async () => {
    const f = file('a-1.0.aar');
    await controller.uploadAndroid(ID, f, undefined, 'org.x');
    expect(uploads.upload).toHaveBeenCalledWith({
      miniAppId: ID,
      platform: 'ANDROID',
      buffer: f.buffer,
      filename: 'a-1.0.aar',
      version: undefined,
      groupId: 'org.x',
    });
  });

  it.each([
    ['ios', 'Foo.zip'],
    ['ios', 'Foo.aar'],
    ['android', 'Foo.xcframework.zip'],
    ['android', 'evil.aar.exe'],
  ])('%s rejects wrong extension %s', async (kind, name) => {
    const call =
      kind === 'ios'
        ? controller.uploadIos(ID, file(name))
        : controller.uploadAndroid(ID, file(name));
    await expect(call).rejects.toThrow(BadRequestException);
    expect(uploads.upload).not.toHaveBeenCalled();
  });

  it('rejects missing/empty file', async () => {
    await expect(controller.uploadIos(ID, undefined as any)).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      controller.uploadAndroid(ID, file('a.aar', 0)),
    ).rejects.toThrow(BadRequestException);
  });

  it('status delegates', async () => {
    await controller.status(ID, { user: { sub: 'u1' } });
    expect(uploads.getStatus).toHaveBeenCalledWith(ID);
    expect(access.assert).toHaveBeenCalledWith(ID, { sub: 'u1' }, 1);
  });

  it('uploads need EDIT on the app; draft uploads skip the app check', async () => {
    const req = { user: { sub: 'u1' } };
    await controller.uploadIos(ID, file('Foo.xcframework.zip'), '1.0.0', req);
    expect(access.assert).toHaveBeenCalledWith(ID, req.user, 2);

    access.assert.mockClear();
    await controller.uploadAndroid(
      'draft',
      file('a.aar'),
      undefined,
      undefined,
      req,
    );
    expect(access.assert).not.toHaveBeenCalled();
  });

  it('refuses an upload for an app the caller cannot edit', async () => {
    access.assert.mockRejectedValue(new NotFoundException('MiniApp not found'));
    await expect(
      controller.uploadIos(ID, file('Foo.xcframework.zip'), '1.0.0', {
        user: { sub: 'x' },
      }),
    ).rejects.toThrow(NotFoundException);
    expect(uploads.upload).not.toHaveBeenCalled();
  });

  it('declares permissions', () => {
    const perms = (m: string) =>
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        (SdkArtifactsController.prototype as any)[m],
      );
    expect(perms('uploadIos')).toEqual(['miniapp:update']);
    expect(perms('uploadAndroid')).toEqual(['miniapp:update']);
    expect(perms('status')).toEqual(['miniapp:read']);
  });
});
