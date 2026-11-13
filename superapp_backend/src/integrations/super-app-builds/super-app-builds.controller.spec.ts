import { SuperAppBuildsController } from './super-app-builds.controller';

describe('SuperAppBuildsController', () => {
  const setup = () => {
    const jenkins = {
      triggerSuperAppBuild: jest
        .fn()
        .mockResolvedValue({ success: true, message: 'queued' }),
    };
    const sandbox = {
      triggerBuild: jest.fn().mockResolvedValue({ success: true }),
    };
    const superApp = {
      getAndRegisterNextVersion: jest.fn().mockResolvedValue('v1.1.5'),
    };
    const audit = { log: jest.fn().mockResolvedValue({}) };
    const controller = new SuperAppBuildsController(
      jenkins as any,
      sandbox as any,
      superApp as any,
      audit as any,
    );
    return { controller, jenkins, sandbox, audit };
  };
  const req = { user: { sub: 'sa', email: 'sa@ftc' } };

  it('a test build gets a new version and bundles the test set (not the release set)', async () => {
    const { controller, jenkins, audit } = setup();
    const res = await controller.rebuildTestBuild(req);
    expect(jenkins.triggerSuperAppBuild).toHaveBeenCalledWith(
      expect.objectContaining({ releaseVersion: 'v1.1.5', miniAppSet: 'test' }),
    );
    expect(res).toMatchObject({ success: true, version: 'v1.1.5' });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SUPER_APP_TEST_BUILD_TRIGGERED',
        resourceId: 'v1.1.5',
      }),
    );
  });

  it('a web rebuild runs the sandbox build only', async () => {
    const { controller, sandbox, jenkins } = setup();
    await controller.rebuildWebPreview(req);
    expect(sandbox.triggerBuild).toHaveBeenCalledWith('sa@ftc');
    expect(jenkins.triggerSuperAppBuild).not.toHaveBeenCalled();
  });
});
