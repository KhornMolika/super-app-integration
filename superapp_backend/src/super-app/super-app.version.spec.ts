import { SuperAppService } from './super-app.service';

describe('SuperAppService test build versions', () => {
  function serviceWith(latestVersion: string, appsWithLatest: any[], publishedAt: Date | null = null) {
    const capRepo = {
      find: jest.fn(async () => [{ superAppVersion: latestVersion, capabilities: ['x'], publishedAt }]),
      save: jest.fn(async (v: any) => v),
      update: jest.fn(async () => ({ affected: 1 })),
    };
    const appRepo = { find: jest.fn(async () => appsWithLatest) };
    const caps = { findAll: jest.fn(async () => []) };
    const svc = new SuperAppService(capRepo as any, appRepo as any, {} as any, caps as any);
    jest.spyOn(svc as any, 'getActiveCapabilities').mockResolvedValue(['x']);
    return { svc, capRepo, appRepo };
  }

  it('reuses the latest version when every build with it failed', async () => {
    const { svc, capRepo, appRepo } = serviceWith('v1.0.5', [
      { lifecycleStatus: 'BUILD_FAILED', buildStatus: 'FAILED' },
      { lifecycleStatus: 'APPROVED', buildStatus: 'FAILED' },
    ]);
    expect(await svc.getAndRegisterNextVersion()).toBe('v1.0.5');
    expect(capRepo.save).not.toHaveBeenCalled();
    expect(appRepo.find).toHaveBeenCalledWith({ where: { activeTestVersion: 'v1.0.5' } });
    expect(await svc.getNextSuggestedVersion()).toBe('v1.0.5');
  });

  it('moves on when a build with it is running, testing or live', async () => {
    for (const app of [
      { lifecycleStatus: 'BUILDING', buildStatus: 'BUILDING' },
      { lifecycleStatus: 'TESTING', buildStatus: 'COMPLETED' },
    ]) {
      const { svc, capRepo } = serviceWith('v1.0.5', [{ lifecycleStatus: 'BUILD_FAILED', buildStatus: 'FAILED' }, app]);
      expect(await svc.getAndRegisterNextVersion()).toBe('v1.0.6');
      expect(capRepo.save).toHaveBeenCalledWith(expect.objectContaining({ superAppVersion: 'v1.0.6' }));
    }
  });

  it('reuses a never-published version whose app is gone (deleted after its build failed)', async () => {
    const { svc, capRepo } = serviceWith('v1.0.5', []);
    expect(await svc.getAndRegisterNextVersion()).toBe('v1.0.5');
    expect(capRepo.save).not.toHaveBeenCalled();
  });

  it('moves on once a build of the version succeeded (published), even with no app holding it', async () => {
    const { svc } = serviceWith('v1.0.5', [], new Date('2026-11-12T02:21:00Z'));
    expect(await svc.getAndRegisterNextVersion()).toBe('v1.0.6');
  });

  it('a published version that an app is testing is not reused', async () => {
    const { svc } = serviceWith('v1.0.5', [{ lifecycleStatus: 'TESTING', buildStatus: 'COMPLETED' }], new Date());
    expect(await svc.getAndRegisterNextVersion()).toBe('v1.0.6');
  });
});
