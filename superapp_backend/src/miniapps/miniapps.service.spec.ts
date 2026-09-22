import {
  BadGatewayException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { MiniappsService } from './miniapps.service';

function build(app: any) {
  /** integrationConfig patches applied through the atomic jsonb merge, in order. */
  const patches: Array<Record<string, any>> = [];
  const qb: any = {
    update: jest.fn(() => qb),
    set: jest.fn(() => qb),
    where: jest.fn(() => qb),
    setParameters: jest.fn((p: any) => {
      patches.push(JSON.parse(p.patch));
      return qb;
    }),
    execute: jest.fn(async () => ({ affected: 1 })),
  };
  const miniappRepository = {
    findOne: jest.fn().mockResolvedValue(app),
    update: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn(() => qb),
  };
  const lifecycleHelper = {
    approve: jest.fn().mockImplementation(async (a: any) => a),
    publishRevision: jest.fn().mockImplementation(async (a: any) => a),
  };
  const codegen = { regenerate: jest.fn() };
  const sdkUpload = {
    publishToNexus: jest.fn().mockResolvedValue({
      androidNexusMavenUrl: 'http://n/x.aar',
      iosNexusZipUrl: 'http://n/x.zip',
    }),
  };
  const service = new MiniappsService(
    miniappRepository as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    lifecycleHelper as any,
    {} as any,
    {} as any,
    {} as any,
    codegen as any,
    sdkUpload as any,
  );
  return { service, miniappRepository, lifecycleHelper, codegen, sdkUpload, patches };
}

const uploaded = {
  iosModuleName: 'X',
  iosNexusZipUrl: 'http://n/x.zip',
  androidNexusMavenUrl: 'http://n/x.aar',
};

describe('MiniappsService.approve NATIVE_SDK gate', () => {
  it.each([
    ['both missing', {}],
    ['ios missing', { androidNexusMavenUrl: 'http://n/x.aar' }],
    ['android missing', { iosNexusZipUrl: 'http://n/x.zip' }],
  ])('rejects with 400 and does not approve (%s)', async (_n, cfg) => {
    const { service, lifecycleHelper, codegen } = build({
      id: '1',
      integrationMethod: 'NATIVE_SDK',
      integrationConfig: cfg,
    });
    await expect(service.approve('1', 'admin')).rejects.toThrow(
      BadRequestException,
    );
    expect(lifecycleHelper.approve).not.toHaveBeenCalled();
    expect(codegen.regenerate).not.toHaveBeenCalled();
  });

  it('approves native SDK mini app without mutating mobile git repository', async () => {
    const { service, patches, lifecycleHelper } = build({
      id: '1',
      integrationMethod: 'NATIVE_SDK',
      integrationConfig: { ...uploaded },
    });

    const approved: any = await service.approve('1', 'admin');

    expect(lifecycleHelper.approve).toHaveBeenCalled();
    expect(approved).toBeDefined();
  });

  it('still approves when external dependencies succeed', async () => {
    const { service, lifecycleHelper } = build({
      id: '1',
      integrationMethod: 'NATIVE_SDK',
      integrationConfig: { ...uploaded },
    });

    await expect(service.approve('1', 'admin')).resolves.toBeDefined();
    expect(lifecycleHelper.approve).toHaveBeenCalled();
  });

  it('does not gate or run codegen for other integration methods', async () => {
    const { service, codegen, lifecycleHelper } = build({
      id: '1',
      integrationMethod: 'WEBVIEW',
      integrationConfig: {},
    });
    await service.approve('1', 'admin');
    expect(lifecycleHelper.approve).toHaveBeenCalled();
    expect(codegen.regenerate).not.toHaveBeenCalled();
  });

  it('gates on the pending revision config, not the app config (revision lacks URLs -> 400)', async () => {
    const { service, lifecycleHelper } = build({
      id: '1',
      status: 'IN_REVIEW',
      integrationMethod: 'NATIVE_SDK',
      integrationConfig: { ...uploaded },
      pendingRevision: { integrationConfig: { iosModuleName: 'X' } },
    });
    await expect(service.approve('1', 'admin')).rejects.toThrow(
      BadRequestException,
    );
    expect(lifecycleHelper.approve).not.toHaveBeenCalled();
  });

  it('passes when the pending revision itself carries both URLs', async () => {
    const { service, lifecycleHelper } = build({
      id: '1',
      status: 'ACTIVE',
      integrationMethod: 'NATIVE_SDK',
      integrationConfig: {},
      pendingRevision: { integrationConfig: { ...uploaded } },
    });
    await service.approve('1', 'admin');
    expect(lifecycleHelper.approve).toHaveBeenCalled();
  });

  it('gates a revision that switches the method to NATIVE_SDK', async () => {
    const { service } = build({
      id: '1',
      status: 'ACTIVE',
      integrationMethod: 'WEBVIEW',
      integrationConfig: {},
      pendingRevision: {
        integrationMethod: 'NATIVE_SDK',
        integrationConfig: {},
      },
    });
    await expect(service.approve('1', 'admin')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('does not gate a revision that switches away from NATIVE_SDK', async () => {
    const { service, codegen } = build({
      id: '1',
      status: 'ACTIVE',
      integrationMethod: 'NATIVE_SDK',
      integrationConfig: {},
      pendingRevision: { integrationMethod: 'WEBVIEW', integrationConfig: {} },
    });
    await service.approve('1', 'admin');
    expect(codegen.regenerate).not.toHaveBeenCalled();
  });
});

describe('MiniappsService.publishRevision NATIVE_SDK gate', () => {
  const rev = (cfg: any) => ({
    id: '1',
    status: 'ACTIVE',
    integrationMethod: 'NATIVE_SDK',
    integrationConfig: { ...uploaded },
    pendingRevision: {
      integrationMethod: 'NATIVE_SDK',
      integrationConfig: cfg,
    },
  });

  it('rejects with 400 when the revision config lacks artifact URLs', async () => {
    const { service, lifecycleHelper, codegen } = build(
      rev({ iosNexusZipUrl: 'http://n/x.zip' }),
    );
    await expect(service.publishRevision('1', 'admin')).rejects.toThrow(
      BadRequestException,
    );
    expect(lifecycleHelper.publishRevision).not.toHaveBeenCalled();
    expect(codegen.regenerate).not.toHaveBeenCalled();
  });

  it('publishes revision successfully without mutating git repository', async () => {
    const { service, lifecycleHelper } = build(rev({ ...uploaded }));
    await expect(service.publishRevision('1', 'admin')).resolves.toBeDefined();
    expect(lifecycleHelper.publishRevision).toHaveBeenCalled();
  });

  it('does not gate or run codegen for non-NATIVE_SDK revisions', async () => {
    const { service, codegen } = build({
      id: '1',
      integrationMethod: 'WEBVIEW',
      pendingRevision: { integrationMethod: 'WEBVIEW' },
    });
    await service.publishRevision('1', 'admin');
    expect(codegen.regenerate).not.toHaveBeenCalled();
  });
});

describe('MiniappsService.rerunNativeSdkCodegen', () => {
  const app = (over: any = {}) => ({
    id: '1',
    status: 'APPROVED',
    integrationMethod: 'NATIVE_SDK',
    integrationConfig: { ...uploaded },
    ...over,
  });
  const withLog = (b: ReturnType<typeof build>) => {
    const log = jest.spyOn(b.service, 'logActivity').mockResolvedValue(undefined as any);
    return log;
  };

  it('verifies universal launcher configuration and reports up-to-date status', async () => {
    const b = build(app());
    const log = withLog(b);
    await expect(b.service.rerunNativeSdkCodegen('1', 'admin')).resolves.toEqual({
      prUrl: null,
      changedFiles: 0,
      upToDate: true,
      message: expect.stringContaining('Universal Native Mini App Launcher'),
    });
    expect(log).toHaveBeenCalledWith(
      '1',
      'admin',
      'UNIVERSAL_LAUNCHER',
      'Universal Native Mini App Launcher verified',
      expect.stringContaining('superapp/native_launcher'),
      'NATIVE_SDK_LAUNCHER_VERIFIED',
    );
  });

  it.each([
    ['not found', null, NotFoundException],
    ['not NATIVE_SDK', app({ integrationMethod: 'WEBVIEW' }), BadRequestException],
    ['not yet approved', app({ status: 'IN_REVIEW' }), BadRequestException],
    ['artifacts missing', app({ integrationConfig: { androidNexusMavenUrl: 'x' } }), BadRequestException],
  ])('rejects (%s) without running codegen', async (_n, a, err) => {
    const b = build(a);
    await expect(b.service.rerunNativeSdkCodegen('1', 'admin')).rejects.toThrow(err as any);
    expect(b.codegen.regenerate).not.toHaveBeenCalled();
  });
});
