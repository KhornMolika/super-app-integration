import { MiniappsService } from './miniapps.service';

function build(app: any) {
  const miniappRepository = {
    findOne: jest.fn().mockResolvedValue(app),
  };
  const service = new MiniappsService(
    miniappRepository as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );
  return { service, miniappRepository };
}

// Version-history records are snapshots of a release: they carry no homeWidget.
const historyRecord = (version: string) => ({
  version,
  name: 'AMS',
  integrationMethod: 'DEEP_LINK',
  integrationConfig: { urlScheme: 'amsattendance://login' },
  permissions: [],
});

// AMS as it is live: v1.0.0, a DEEP_LINK app without a Home widget.
const liveApp = (over: Record<string, unknown> = {}) => ({
  id: 'app-ams',
  appId: 'miniapp_ams_ccef3a',
  name: 'AMS',
  status: 'ACTIVE',
  integrationMethod: 'DEEP_LINK',
  integrationConfig: { urlScheme: 'amsattendance://login' },
  permissions: [],
  currentReleaseVersion: '1.0.0',
  homeWidget: null as Record<string, string> | null,
  versionHistory: [historyRecord('1.0.0')],
  ...over,
});

describe('MiniappsService.getDiff and homeWidget', () => {
  it('shows a widget-only revision in the "Ready to Publish" version-pair compare', async () => {
    const { service } = build(
      liveApp({
        pendingRevision: { homeWidget: { widgetClass: 'HrHomeWidget' } },
      }),
    );

    const diff = await service.getDiff('app-ams', '1.0.0', '1.1.0');

    expect(diff.differences.metadata.homeWidget).toEqual({
      base: 'none',
      target: 'HrHomeWidget',
      changed: true,
    });
    expect(diff.hasChanges).toBe(true);
  });

  it('shows removing the live widget in the version-pair compare', async () => {
    const { service } = build(
      liveApp({
        homeWidget: { widgetClass: 'HrHomeWidget' },
        pendingRevision: { homeWidget: null },
      }),
    );

    const diff = await service.getDiff('app-ams', '1.0.0', '1.1.0');

    expect(diff.differences.metadata.homeWidget).toEqual({
      base: 'HrHomeWidget',
      target: 'none',
      changed: true,
    });
  });

  it('stays quiet when the revision keeps the live widget', async () => {
    const { service } = build(
      liveApp({
        homeWidget: { widgetClass: 'HrHomeWidget' },
        pendingRevision: { homeWidget: { widgetClass: 'HrHomeWidget' } },
      }),
    );

    const diff = await service.getDiff('app-ams', '1.0.0', '1.1.0');

    expect(diff.differences.metadata.homeWidget).toBeUndefined();
  });

  it('does not invent a widget change when comparing two older releases', async () => {
    const { service } = build(
      liveApp({
        currentReleaseVersion: '1.1.0',
        homeWidget: { widgetClass: 'HrHomeWidget' },
        versionHistory: [historyRecord('1.0.0'), historyRecord('1.1.0')],
      }),
    );

    // Both records are history snapshots without the field, so computeDiff skips it.
    const older = await service.getDiff('app-ams', '1.0.0', '1.1.0');
    expect(older.differences.metadata.homeWidget).toBeUndefined();
  });

  it('does not give an older release the live widget as its base', async () => {
    const { service } = build(
      liveApp({
        currentReleaseVersion: '1.1.0',
        homeWidget: { widgetClass: 'HrHomeWidget' },
        versionHistory: [historyRecord('1.0.0'), historyRecord('1.1.0')],
        pendingRevision: { homeWidget: { widgetClass: 'HrHomeWidget' } },
      }),
    );

    // 1.0.0 is not the live release, so its base stays widget-less and quiet.
    const diff = await service.getDiff('app-ams', '1.0.0', '1.2.0');
    expect(diff.differences.metadata.homeWidget).toBeUndefined();
  });
});
