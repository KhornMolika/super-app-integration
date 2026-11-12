import { MiniappLifecycleHelper } from './miniapp-lifecycle.helper';
import AdmZip from 'adm-zip';
import { MiniApp } from '../entities/miniapp.entity';

function setup(deps: Record<string, any> = {}) {
  const repo = { save: jest.fn((entity: MiniApp) => Promise.resolve(entity)) };
  const notifications = { createNotification: jest.fn().mockResolvedValue({}) };
  const helper = new MiniappLifecycleHelper(
    repo as any,
    notifications as any,
    { sendMiniAppApprovedEmail: jest.fn().mockResolvedValue({}) } as any,
    {} as any,
    { getAndRegisterNextVersion: jest.fn().mockResolvedValue('v1.1.9') } as any,
    {} as any,
    {} as any,
    (deps.gitService ?? {}) as any,
    (deps.pubspecService ?? {}) as any,
    deps.storageService,
    deps.nexusService,
  );
  return { helper, repo, notifications, log: jest.fn().mockResolvedValue(undefined) };
}

const HR_SRC = 'class HrHomeWidget { HrHomeWidget({required this.onOpen}); final void Function() onOpen; }';

function zipOf(files: Record<string, string>): Buffer {
  const zip = new AdmZip();
  for (const [name, text] of Object.entries(files)) {
    zip.addFile(name, Buffer.from(text, 'utf8'));
  }
  return zip.toBuffer();
}

// Live AMS with the version keys startTesting/activate wrote into integrationConfig.
const ams = (over: Partial<MiniApp> = {}): MiniApp =>
  ({
    id: 'app-ams',
    appId: 'miniapp_ams_ccef3a',
    name: 'AMS',
    status: 'ACTIVE',
    currentReleaseVersion: '1.0.0',
    integrationMethod: 'DEEP_LINK',
    integrationConfig: {
      urlScheme: 'amsattendance://login',
      superAppTestVersion: 'v1.1.4',
      superAppReleaseVersion: 'v1.1.5',
    },
    permissions: [],
    homeWidget: null,
    versionHistory: [],
    ...over,
  }) as unknown as MiniApp;

// A revision staged by PATCH: its integrationConfig went through the DTO
// whitelist, so it has no lifecycle keys.
const revision = (
  over: Record<string, unknown> = {},
): Record<string, unknown> => ({
  name: 'AMS',
  integrationMethod: 'DEEP_LINK',
  integrationConfig: { urlScheme: 'amsattendance://login' },
  permissions: [],
  homeWidget: { widgetClass: 'HrHomeWidget' },
  revisionStatus: 'IN_REVIEW',
  ...over,
});

describe('MiniappLifecycleHelper and homeWidget', () => {
  describe('publishRevision', () => {
    it('applies the widget and keeps the lifecycle integrationConfig keys', async () => {
      const { helper, log } = setup();
      const app = ams({ pendingRevision: revision() });

      const result = await helper.publishRevision(app, 'super-admin', log);

      expect(result.homeWidget?.widgetClass).toBe('HrHomeWidget');
      expect(result.homeWidget?.verifiedClass).toBeUndefined();
      expect(result.pendingRevision).toBeNull();
      expect(result.integrationConfig).toEqual({
        urlScheme: 'amsattendance://login',
        superAppTestVersion: 'v1.1.4',
        superAppReleaseVersion: 'v1.1.5',
      });
      expect((result as any).versionHistory?.[0].saVersion).toBe('v1.1.5');
    });

    it('keeps the live verifiedClass when the revision widget is unchanged', async () => {
      const { helper, log } = setup();
      const app = ams({
        homeWidget: { widgetClass: 'HrHomeWidget', verifiedClass: 'HrHomeWidget' },
        pendingRevision: revision(),
      });

      const result = await helper.publishRevision(app, 'super-admin', log);

      expect(result.homeWidget).toEqual({
        widgetClass: 'HrHomeWidget',
        verifiedClass: 'HrHomeWidget',
      });
    });

    it('drops verifiedClass when the widget changed (re-verified later)', async () => {
      const { helper, log } = setup();
      const app = ams({
        homeWidget: { widgetClass: 'HrHomeWidget', verifiedClass: 'HrHomeWidget' },
        pendingRevision: revision({ homeWidget: { widgetClass: 'OtherWidget' } }),
      });

      const result = await helper.publishRevision(app, 'super-admin', log);

      expect(result.homeWidget).toEqual({ widgetClass: 'OtherWidget' });
    });

    it('applies null (widget removed)', async () => {
      const { helper, log } = setup();
      const app = ams({
        homeWidget: { widgetClass: 'HrHomeWidget', verifiedClass: 'HrHomeWidget' },
        pendingRevision: revision({ homeWidget: null }),
      });

      const result = await helper.publishRevision(app, 'super-admin', log);

      expect(result.homeWidget).toBeNull();
    });

    it('leaves the live value when the revision does not carry the field', async () => {
      const { helper, log } = setup();
      const older = revision();
      delete older.homeWidget;
      const app = ams({
        homeWidget: { widgetClass: 'HrHomeWidget', verifiedClass: 'HrHomeWidget' },
        pendingRevision: older,
      });

      const result = await helper.publishRevision(app, 'super-admin', log);

      expect(result.homeWidget).toEqual({
        widgetClass: 'HrHomeWidget',
        verifiedClass: 'HrHomeWidget',
      });
    });

    it('ignores a stale homeWidgetType in an old revision', async () => {
      const { helper, log } = setup();
      const older = revision({ homeWidgetType: 'hr_summary' });
      delete older.homeWidget;
      const app = ams({ pendingRevision: older });

      const result = await helper.publishRevision(app, 'super-admin', log);

      expect(result.homeWidget).toBeNull();
    });

    it('takes every other key from the revision and adds no lifecycle key the live row lacks', async () => {
      const { helper, log } = setup();
      const app = ams({
        integrationConfig: { urlScheme: 'amsattendance://login' },
        pendingRevision: revision({
          integrationConfig: { urlScheme: 'amsattendance://home' },
        }),
      });

      const result = await helper.publishRevision(app, 'super-admin', log);

      expect(result.integrationConfig).toEqual({
        urlScheme: 'amsattendance://home',
      });
    });
  });

  describe('approve (an app in review that still holds a revision)', () => {
    it('applies the widget and keeps the lifecycle keys', async () => {
      const { helper, log } = setup();
      const app = ams({ status: 'IN_REVIEW', pendingRevision: revision() });

      const result = await helper.approve(app, 'super-admin', log);

      expect(result.status).toBe('APPROVED');
      expect(result.homeWidget).toEqual({ widgetClass: 'HrHomeWidget' });
      expect(result.integrationConfig).toEqual({
        urlScheme: 'amsattendance://login',
        superAppTestVersion: 'v1.1.4',
        superAppReleaseVersion: 'v1.1.5',
      });
    });

    it('keeps the live verifiedClass when the revision widget is unchanged', async () => {
      const { helper, log } = setup();
      const app = ams({
        status: 'IN_REVIEW',
        homeWidget: { widgetClass: 'HrHomeWidget', verifiedClass: 'HrHomeWidget' },
        pendingRevision: revision(),
      });

      const result = await helper.approve(app, 'super-admin', log);

      expect(result.homeWidget).toEqual({
        widgetClass: 'HrHomeWidget',
        verifiedClass: 'HrHomeWidget',
      });
    });

    it('drops verifiedClass when the widget changed', async () => {
      const { helper, log } = setup();
      const app = ams({
        status: 'IN_REVIEW',
        homeWidget: { widgetClass: 'HrHomeWidget', verifiedClass: 'HrHomeWidget' },
        pendingRevision: revision({ homeWidget: { widgetClass: 'OtherWidget' } }),
      });

      const result = await helper.approve(app, 'super-admin', log);

      expect(result.homeWidget).toEqual({ widgetClass: 'OtherWidget' });
    });

    it('leaves the live value when the revision does not carry the field', async () => {
      const { helper, log } = setup();
      const older = revision();
      delete older.homeWidget;
      const app = ams({
        status: 'IN_REVIEW',
        homeWidget: { widgetClass: 'HrHomeWidget', verifiedClass: 'HrHomeWidget' },
        pendingRevision: older,
      });

      const result = await helper.approve(app, 'super-admin', log);

      expect(result.homeWidget).toEqual({
        widgetClass: 'HrHomeWidget',
        verifiedClass: 'HrHomeWidget',
      });
    });
  });

  describe('widget class verification (FLUTTER_PACKAGE)', () => {
    const PKG = 'fsa_hr_miniapp';

    function pkgSetup(opts: {
      archive?: Buffer | Error | null;
      files?: Record<string, string>;
    }) {
      const order: string[] = [];
      const storageService = {
        packageSubmissionsBucket: 'bucket',
        getObjectBuffer: jest.fn(() => {
          if (opts.archive instanceof Error) return Promise.reject(opts.archive);
          return Promise.resolve(opts.archive as Buffer);
        }),
        deleteObject: jest.fn(() => {
          order.push('delete');
          return Promise.resolve();
        }),
      };
      const nexusService = {
        publishPubArchive: jest.fn(() => {
          order.push('publish');
          return Promise.resolve();
        }),
      };
      const gitService = {
        getFileContent: jest.fn((_url: string, path: string, _ref?: string) =>
          opts.files && path in opts.files
            ? Promise.resolve(opts.files[path])
            : Promise.reject(new Error('404')),
        ),
      };
      // what the registry generator would read at the moment it runs
      const registryWidgets: Array<unknown> = [];
      const pubspecService = {
        inferCanonicalPackageName: jest.fn().mockReturnValue(PKG),
        regenerateRegistry: jest.fn(() => {
          order.push('regenerate');
          registryWidgets.push(lastSaved());
          return Promise.resolve();
        }),
        injectMiniApp: jest.fn(() => {
          order.push('inject');
          return Promise.resolve({});
        }),
        validateDependencies: jest.fn().mockResolvedValue({}),
        triggerSandboxRebuild: jest.fn().mockResolvedValue(undefined),
      };
      const ctx = setup({ storageService, nexusService, gitService, pubspecService });
      const saves: Array<unknown> = [];
      const lastSaved = () => saves[saves.length - 1];
      ctx.repo.save.mockImplementation((e: MiniApp) => {
        order.push('save');
        saves.push(JSON.parse(JSON.stringify(e.homeWidget ?? null)));
        return Promise.resolve(e);
      });
      return { ...ctx, storageService, nexusService, gitService, pubspecService, order, saves, registryWidgets };
    }

    const pkgApp = (over: any = {}): MiniApp =>
      ams({
        status: 'IN_REVIEW',
        integrationMethod: 'FLUTTER_PACKAGE',
        integrationConfig: { packageStoragePath: 'pkgs/hr.zip', packageName: PKG },
        homeWidget: { widgetClass: 'HrHomeWidget' },
        ...over,
      });

    const goodZip = () =>
      zipOf({
        'pubspec.yaml': `name: ${PKG}`,
        [`lib/${PKG}.dart`]: "export 'src/hr.dart';",
        'lib/src/hr.dart': HR_SRC,
      });

    it('approve: marks the widget verified from the archive, before publishing it', async () => {
      const { helper, log, order, saves, nexusService } = pkgSetup({ archive: goodZip() });

      const result = await helper.approve(pkgApp(), 'super-admin', log);

      expect(result.homeWidget).toEqual({
        widgetClass: 'HrHomeWidget',
        verifiedClass: 'HrHomeWidget',
      });
      expect(saves[saves.length - 1]).toEqual({
        widgetClass: 'HrHomeWidget',
        verifiedClass: 'HrHomeWidget',
      });
      expect(nexusService.publishPubArchive).toHaveBeenCalledTimes(1);
      // the verified widget is saved before the archive is published/deleted
      const verifiedSave = order.indexOf('save', order.indexOf('save') + 1);
      expect(verifiedSave).toBeGreaterThan(-1);
      expect(verifiedSave).toBeLessThan(order.indexOf('publish'));
      // The archive stays in MinIO after publishing: a re-scan reads it from there
      expect(order).not.toContain('delete');
    });

    it('approve: archive without the class stays unverified and approve still resolves', async () => {
      const archive = zipOf({
        'pubspec.yaml': `name: ${PKG}`,
        [`lib/${PKG}.dart`]: 'class Other {}',
      });
      const { helper, log, nexusService } = pkgSetup({ archive });

      const result = await helper.approve(pkgApp(), 'super-admin', log);

      expect(result.status).toBe('APPROVED');
      expect(result.homeWidget).toEqual({ widgetClass: 'HrHomeWidget' });
      expect(nexusService.publishPubArchive).toHaveBeenCalledTimes(1);
    });

    it('approve: a verification crash never throws out of approve', async () => {
      const { helper, log, gitService } = pkgSetup({ archive: Buffer.from('not a zip') });
      gitService.getFileContent.mockRejectedValue(new Error('boom'));

      const result = await helper.approve(pkgApp(), 'super-admin', log);

      expect(result.status).toBe('APPROVED');
      expect(result.homeWidget).toEqual({ widgetClass: 'HrHomeWidget' });
    });

    it('approve: skips verification when already verified for the same class', async () => {
      const { helper, log, storageService } = pkgSetup({ archive: goodZip() });
      const app = pkgApp({
        homeWidget: { widgetClass: 'HrHomeWidget', verifiedClass: 'HrHomeWidget' },
      });

      const result = await helper.approve(app, 'super-admin', log);

      expect(result.homeWidget?.verifiedClass).toBe('HrHomeWidget');
      expect(storageService.getObjectBuffer).toHaveBeenCalledTimes(1); // publish read only
    });

    it('approve: does not verify non-FLUTTER_PACKAGE apps or apps without a widgetClass', async () => {
      const a = pkgSetup({ archive: goodZip() });
      const noWidget = pkgApp({ homeWidget: null });
      const r1 = await a.helper.approve(noWidget, 'super-admin', a.log);
      expect(r1.homeWidget).toBeNull();

      const b = pkgSetup({ archive: goodZip() });
      const deep = pkgApp({
        integrationMethod: 'DEEP_LINK',
        homeWidget: { url: 'https://x.example/w' },
      });
      const r2 = await b.helper.approve(deep, 'super-admin', b.log);
      expect(r2.homeWidget).toEqual({ url: 'https://x.example/w' });
      expect(b.storageService.getObjectBuffer).not.toHaveBeenCalled();
    });

    it('approve: Git source verifies through gitService.getFileContent', async () => {
      const { helper, log, gitService } = pkgSetup({
        files: {
          [`pkg/lib/${PKG}.dart`]: "export 'src/hr.dart';",
          'pkg/lib/src/hr.dart': HR_SRC,
        },
      });
      const app = pkgApp({
        integrationConfig: {
          sourceType: 'GIT',
          gitUrl: 'https://github.com/acme/fsa_hr_miniapp.git',
          gitBranch: 'release',
          gitPath: 'pkg',
          packageName: PKG,
        },
      });

      const result = await helper.approve(app, 'super-admin', log);

      expect(result.homeWidget).toEqual({
        widgetClass: 'HrHomeWidget',
        verifiedClass: 'HrHomeWidget',
      });
      expect(gitService.getFileContent).toHaveBeenCalledWith(
        'https://github.com/acme/fsa_hr_miniapp.git',
        `pkg/lib/${PKG}.dart`,
        'release',
        undefined,
      );
    });

    it('publishRevision: verifies from the MinIO archive when the widget class changed', async () => {
      const { helper, log, storageService, nexusService } = pkgSetup({ archive: goodZip() });
      const app = pkgApp({
        status: 'ACTIVE',
        homeWidget: { widgetClass: 'OldWidget', verifiedClass: 'OldWidget' },
        pendingRevision: revision({
          integrationMethod: 'FLUTTER_PACKAGE',
          integrationConfig: { packageStoragePath: 'pkgs/hr.zip', packageName: PKG },
        }),
      });

      const result = await helper.publishRevision(app, 'super-admin', log);

      expect(result.homeWidget).toEqual({
        widgetClass: 'HrHomeWidget',
        verifiedClass: 'HrHomeWidget',
      });
      expect(storageService.getObjectBuffer).toHaveBeenCalledWith('bucket', 'pkgs/hr.zip');
      expect(storageService.deleteObject).not.toHaveBeenCalled();
      expect(nexusService.publishPubArchive).not.toHaveBeenCalled();
    });

    it('publishRevision: falls back to Git when the archive object is gone', async () => {
      const { helper, log, gitService } = pkgSetup({
        archive: new Error('NoSuchKey'),
        files: { [`lib/${PKG}.dart`]: HR_SRC },
      });
      const app = pkgApp({
        status: 'ACTIVE',
        homeWidget: null,
        pendingRevision: revision({
          integrationMethod: 'FLUTTER_PACKAGE',
          integrationConfig: {
            packageStoragePath: 'pkgs/hr.zip',
            gitUrl: 'https://github.com/acme/fsa_hr_miniapp.git',
            packageName: PKG,
          },
        }),
      });

      const result = await helper.publishRevision(app, 'super-admin', log);

      expect(result.homeWidget?.verifiedClass).toBe('HrHomeWidget');
      expect(gitService.getFileContent).toHaveBeenCalled();
    });

    it('publishRevision: does not re-verify when the widget class is unchanged and already verified', async () => {
      const { helper, log, storageService, gitService } = pkgSetup({ archive: goodZip() });
      const app = pkgApp({
        status: 'ACTIVE',
        homeWidget: { widgetClass: 'HrHomeWidget', verifiedClass: 'HrHomeWidget' },
        pendingRevision: revision({
          integrationMethod: 'FLUTTER_PACKAGE',
          integrationConfig: { packageStoragePath: 'pkgs/hr.zip', packageName: PKG },
        }),
      });

      const result = await helper.publishRevision(app, 'super-admin', log);

      expect(result.homeWidget?.verifiedClass).toBe('HrHomeWidget');
      expect(storageService.getObjectBuffer).not.toHaveBeenCalled();
      expect(gitService.getFileContent).not.toHaveBeenCalled();
    });

    describe('force re-verification of a stale verifiedClass', () => {
      const GIT_URL = 'https://github.com/acme/fsa_hr_miniapp.git';
      const verified = { widgetClass: 'HrHomeWidget', verifiedClass: 'HrHomeWidget' };
      const noWidgetSrc = { [`lib/${PKG}.dart`]: 'class Other {}' };

      // Git files that only exist at the given refs
      const filesAt = (refs: Record<string, Record<string, string>>) =>
        (_url: string, path: string, ref: string) =>
          refs[ref] && path in refs[ref]
            ? Promise.resolve(refs[ref][path])
            : Promise.reject(new Error('404'));

      const gitApp = (over: Partial<MiniApp> = {}): MiniApp =>
        pkgApp({
          status: 'ACTIVE',
          currentReleaseVersion: '1.1.0',
          integrationConfig: {
            sourceType: 'GIT',
            gitUrl: GIT_URL,
            gitBranch: 'main',
            packageName: PKG,
          },
          homeWidget: { ...verified },
          versionHistory: [
            { version: '1.1.0', type: 'PRODUCTION', status: 'ACTIVE', releasedAt: '2026-02-01' },
            {
              version: '1.0.0',
              type: 'PRODUCTION',
              status: 'PREVIOUS',
              releasedAt: '2026-01-01',
              gitRef: 'v1.0.0',
            },
          ],
          ...over,
        });

      it('rollback: clears verifiedClass before the registry is generated when the old source lacks the class', async () => {
        const ctx = pkgSetup({});
        ctx.gitService.getFileContent.mockImplementation(
          filesAt({ 'v1.0.0': noWidgetSrc }),
        );

        const result = await ctx.helper.rollbackToVersion(gitApp(), '1.0.0', 'admin', ctx.log);

        expect(ctx.gitService.getFileContent).toHaveBeenCalledWith(
          GIT_URL,
          `lib/${PKG}.dart`,
          'v1.0.0',
          undefined,
        );
        expect(result.homeWidget).toEqual({ widgetClass: 'HrHomeWidget' });
        expect(ctx.registryWidgets).toEqual([{ widgetClass: 'HrHomeWidget' }]);
        expect(ctx.order.indexOf('regenerate')).toBeGreaterThan(ctx.order.indexOf('inject'));
        expect(ctx.pubspecService.regenerateRegistry).toHaveBeenCalledTimes(1);
      });

      it('rollback: stays verified when the rolled-back source still exports the class', async () => {
        const ctx = pkgSetup({});
        ctx.gitService.getFileContent.mockImplementation(
          filesAt({ 'v1.0.0': { [`lib/${PKG}.dart`]: HR_SRC } }),
        );

        const result = await ctx.helper.rollbackToVersion(gitApp(), '1.0.0', 'admin', ctx.log);

        expect(result.homeWidget).toEqual(verified);
        expect(ctx.registryWidgets).toEqual([verified]);
        expect(ctx.notifications.createNotification).not.toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.anything(),
          'HOME_WIDGET_UNVERIFIED',
          expect.anything(),
        );
      });

      it('rollback: re-checks the MinIO archive when it still exists', async () => {
        const ctx = pkgSetup({ archive: goodZip() });
        const app = gitApp({
          integrationConfig: { packageStoragePath: 'pkgs/hr.zip', packageName: PKG },
        });

        const result = await ctx.helper.rollbackToVersion(app, '1.0.0', 'admin', ctx.log);

        expect(ctx.storageService.getObjectBuffer).toHaveBeenCalledWith('bucket', 'pkgs/hr.zip');
        expect(result.homeWidget).toEqual(verified);
        expect(ctx.registryWidgets).toEqual([verified]);
      });

      it('rollback: an archive-sourced app whose archive is gone ends up unverified and the owner is told', async () => {
        const ctx = pkgSetup({ archive: new Error('NoSuchKey') });
        const app = gitApp({
          ownerId: 'owner-1',
          integrationConfig: { packageStoragePath: 'pkgs/hr.zip', packageName: PKG },
        });

        const result = await ctx.helper.rollbackToVersion(app, '1.0.0', 'admin', ctx.log);

        expect(result.homeWidget).toEqual({ widgetClass: 'HrHomeWidget' });
        expect(ctx.registryWidgets).toEqual([{ widgetClass: 'HrHomeWidget' }]);
        expect(ctx.notifications.createNotification).toHaveBeenCalledWith(
          'owner-1',
          expect.any(String),
          expect.stringContaining('HrHomeWidget'),
          'HOME_WIDGET_UNVERIFIED',
          'app-ams',
        );
      });

      it('rollback: leaves apps without a Home widget alone', async () => {
        const ctx = pkgSetup({});
        const result = await ctx.helper.rollbackToVersion(
          gitApp({ homeWidget: null }),
          '1.0.0',
          'admin',
          ctx.log,
        );
        expect(result.homeWidget).toBeNull();
        expect(ctx.gitService.getFileContent).not.toHaveBeenCalled();
      });

      const gitRevision = (cfg: Record<string, unknown>) =>
        revision({
          integrationMethod: 'FLUTTER_PACKAGE',
          integrationConfig: {
            sourceType: 'GIT',
            gitUrl: GIT_URL,
            packageName: PKG,
            ...cfg,
          },
          homeWidget: { widgetClass: 'HrHomeWidget' },
        });

      it('publishRevision: same widget class but a changed gitTag is re-verified from Git', async () => {
        const ctx = pkgSetup({});
        ctx.gitService.getFileContent.mockImplementation(
          filesAt({ 'v2.0.0': { [`lib/${PKG}.dart`]: HR_SRC } }),
        );
        const app = gitApp({
          integrationConfig: { sourceType: 'GIT', gitUrl: GIT_URL, gitTag: 'v1.0.0', packageName: PKG },
          pendingRevision: gitRevision({ gitTag: 'v2.0.0' }),
        });

        const result = await ctx.helper.publishRevision(app, 'admin', ctx.log);

        expect(ctx.gitService.getFileContent).toHaveBeenCalledWith(
          GIT_URL,
          `lib/${PKG}.dart`,
          'v2.0.0',
          undefined,
        );
        expect(result.homeWidget).toEqual(verified);
        expect(ctx.registryWidgets).toEqual([verified]);
      });

      it('publishRevision: a changed source that lacks the class drops the stale verifiedClass before the registry is built', async () => {
        const ctx = pkgSetup({});
        ctx.gitService.getFileContent.mockImplementation(
          filesAt({ 'v2.0.0': noWidgetSrc }),
        );
        const app = gitApp({
          integrationConfig: { sourceType: 'GIT', gitUrl: GIT_URL, gitTag: 'v1.0.0', packageName: PKG },
          pendingRevision: gitRevision({ gitTag: 'v2.0.0' }),
        });

        const result = await ctx.helper.publishRevision(app, 'admin', ctx.log);

        expect(result.homeWidget).toEqual({ widgetClass: 'HrHomeWidget' });
        expect(ctx.registryWidgets).toEqual([{ widgetClass: 'HrHomeWidget' }]);
      });

      it.each([
        ['gitUrl', 'https://github.com/acme/other.git'],
        ['gitBranch', 'release'],
        ['commitSha', 'abc123'],
        ['gitPath', 'packages/hr'],
        ['packageStoragePath', 'pkgs/hr-v2.zip'],
        ['versionConstraint', '^2.0.0'],
        ['sourceType', 'ARTIFACT'],
      ])('publishRevision: a changed %s forces re-verification', async (key, value) => {
        const ctx = pkgSetup({ archive: new Error('gone') });
        const app = gitApp({
          integrationConfig: { sourceType: 'GIT', gitUrl: GIT_URL, packageName: PKG },
          pendingRevision: gitRevision({ [key]: value }),
        });

        const result = await ctx.helper.publishRevision(app, 'admin', ctx.log);

        // sources unreadable in this test, so a forced re-check can only end unverified
        expect(result.homeWidget).toEqual({ widgetClass: 'HrHomeWidget' });
        expect(ctx.registryWidgets).toEqual([{ widgetClass: 'HrHomeWidget' }]);
      });

      it('publishRevision: an unchanged source keeps the live verification without a re-check', async () => {
        const ctx = pkgSetup({});
        const cfg = { sourceType: 'GIT', gitUrl: GIT_URL, gitTag: 'v1.0.0', packageName: PKG };
        const app = gitApp({
          integrationConfig: { ...cfg },
          pendingRevision: gitRevision({ gitTag: 'v1.0.0' }),
        });

        const result = await ctx.helper.publishRevision(app, 'admin', ctx.log);

        expect(result.homeWidget).toEqual(verified);
        expect(ctx.gitService.getFileContent).not.toHaveBeenCalled();
      });
    });

    describe('verification failures', () => {
      it('approve: tells the owner when the class is not found in the package', async () => {
        const archive = zipOf({
          'pubspec.yaml': `name: ${PKG}`,
          [`lib/${PKG}.dart`]: 'class Other {}',
        });
        const { helper, log, notifications } = pkgSetup({ archive });

        await helper.approve(pkgApp({ ownerId: 'owner-1' }), 'super-admin', log);

        expect(notifications.createNotification).toHaveBeenCalledWith(
          'owner-1',
          expect.any(String),
          `Home widget HrHomeWidget was not found in package ${PKG}; the widget won't be shown. Upload a package that exports it.`,
          'HOME_WIDGET_UNVERIFIED',
          'app-ams',
        );
      });

      it('publishRevision: tells the owner when the class is not found', async () => {
        const archive = zipOf({
          'pubspec.yaml': `name: ${PKG}`,
          [`lib/${PKG}.dart`]: 'class Other {}',
        });
        const { helper, log, notifications } = pkgSetup({ archive });
        const app = pkgApp({
          status: 'ACTIVE',
          ownerId: 'owner-1',
          homeWidget: null,
          pendingRevision: revision({
            integrationMethod: 'FLUTTER_PACKAGE',
            integrationConfig: { packageStoragePath: 'pkgs/hr.zip', packageName: PKG },
          }),
        });

        await helper.publishRevision(app, 'super-admin', log);

        expect(notifications.createNotification).toHaveBeenCalledWith(
          'owner-1',
          expect.any(String),
          expect.stringContaining('was not found in package'),
          'HOME_WIDGET_UNVERIFIED',
          'app-ams',
        );
      });

      it('does not notify when the class verifies', async () => {
        const { helper, log, notifications } = pkgSetup({ archive: goodZip() });

        await helper.approve(pkgApp({ ownerId: 'owner-1' }), 'super-admin', log);

        const types = notifications.createNotification.mock.calls.map((c) => c[3]);
        expect(types).not.toContain('HOME_WIDGET_UNVERIFIED');
      });

      it('says the sources could not be read, not "not exported", when nothing could be fetched', async () => {
        const ctx = pkgSetup({});
        const warn = jest.spyOn((ctx.helper as any).logger, 'warn').mockImplementation();
        const app = pkgApp({
          ownerId: 'owner-1',
          integrationConfig: {
            sourceType: 'GIT',
            gitUrl: 'https://github.com/acme/fsa_hr_miniapp.git',
            packageName: PKG,
          },
        });

        await ctx.helper.approve(app, 'super-admin', ctx.log);

        const messages = warn.mock.calls.map((c) => String(c[0]));
        expect(messages.some((m) => m.includes('could not read package sources'))).toBe(true);
        expect(messages.some((m) => m.includes('not exported'))).toBe(false);
        expect(ctx.notifications.createNotification).toHaveBeenCalledWith(
          'owner-1',
          expect.any(String),
          expect.stringContaining('could not be read'),
          'HOME_WIDGET_UNVERIFIED',
          'app-ams',
        );
        warn.mockRestore();
      });
    });
  });
});
