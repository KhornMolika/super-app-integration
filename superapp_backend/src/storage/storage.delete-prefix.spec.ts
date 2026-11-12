import { EventEmitter } from 'events';
import { StorageService } from './storage.service';

function serviceWith(keys: string[]) {
  const removeObject = jest.fn(async () => undefined);
  const svc: any = Object.create(StorageService.prototype);
  svc.minioClient = {
    listObjectsV2: jest.fn(() => {
      const stream = new EventEmitter();
      setImmediate(() => {
        keys.forEach((name) => stream.emit('data', { name }));
        stream.emit('end');
      });
      return stream;
    }),
    removeObject,
  };
  return { svc: svc as StorageService, removeObject };
}

describe('StorageService.deleteByPrefix', () => {
  it('deletes every object in the folder', async () => {
    const { svc, removeObject } = serviceWith(['quarantine/packages/hr/1.0.0/a.zip', 'quarantine/packages/hr/1.2.0/b.zip']);
    const res = await svc.deleteByPrefix('superapp-storage', 'quarantine/packages/hr/');
    expect(res.removed).toHaveLength(2);
    expect(removeObject).toHaveBeenCalledWith('superapp-storage', 'quarantine/packages/hr/1.2.0/b.zip');
  });

  it('refuses a prefix that could empty a whole area', async () => {
    const { svc, removeObject } = serviceWith(['x']);
    for (const prefix of ['', 'quarantine/', 'quarantine/packages', 'quarantine/../', 'a/./']) {
      await expect(svc.deleteByPrefix('b', prefix)).rejects.toThrow(/unsafe prefix/);
    }
    expect(removeObject).not.toHaveBeenCalled();
  });
});
