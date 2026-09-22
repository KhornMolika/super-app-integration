import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
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
  let controller: SdkArtifactsController;

  beforeEach(() => {
    uploads = {
      upload: jest.fn().mockResolvedValue({ ok: 1 }),
      getStatus: jest.fn().mockResolvedValue({}),
    };
    controller = new SdkArtifactsController(uploads as any);
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
  ])('%s rejects wrong extension %s', (kind, name) => {
    const call = () =>
      kind === 'ios'
        ? controller.uploadIos(ID, file(name))
        : controller.uploadAndroid(ID, file(name));
    expect(call).toThrow(BadRequestException);
    expect(uploads.upload).not.toHaveBeenCalled();
  });

  it('rejects missing/empty file', () => {
    expect(() => controller.uploadIos(ID, undefined as any)).toThrow(
      BadRequestException,
    );
    expect(() => controller.uploadAndroid(ID, file('a.aar', 0))).toThrow(
      BadRequestException,
    );
  });

  it('status delegates', async () => {
    await controller.status(ID);
    expect(uploads.getStatus).toHaveBeenCalledWith(ID);
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
