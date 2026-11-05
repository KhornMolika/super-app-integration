import { VersionDiffHelper } from './version-diff.helper';

// HR as it is live: a FLUTTER_PACKAGE app without a Home widget.
const live = {
  id: 'app-hr',
  appId: 'miniapp_hr_ccef3a',
  name: 'HR',
  status: 'ACTIVE',
  integrationMethod: 'FLUTTER_PACKAGE',
  integrationConfig: { packageName: 'fsa_hr_miniapp' },
  permissions: [],
  homeWidget: null as Record<string, string> | null,
};

// What PATCH /mini-apps/:id hands the mutation helper for an HR edit.
const edit = (over: Record<string, unknown> = {}) => ({
  integrationMethod: 'FLUTTER_PACKAGE',
  integrationConfig: { packageName: 'fsa_hr_miniapp' },
  permissions: [],
  ...over,
});

describe('VersionDiffHelper and homeWidget', () => {
  describe('hasSecurityChanges', () => {
    it('is true when the widget changes', () => {
      expect(
        VersionDiffHelper.hasSecurityChanges(
          live,
          edit({ homeWidget: { widgetClass: 'A' } }),
        ),
      ).toBe(true);
      expect(
        VersionDiffHelper.hasSecurityChanges(
          { ...live, homeWidget: { widgetClass: 'A' } },
          edit({ homeWidget: null }),
        ),
      ).toBe(true);
      expect(
        VersionDiffHelper.hasSecurityChanges(
          { ...live, homeWidget: { widgetClass: 'A' } },
          edit({ homeWidget: { widgetClass: 'B' } }),
        ),
      ).toBe(true);
    });

    it('is false when it is unchanged (verifiedClass does not count) or not sent', () => {
      expect(
        VersionDiffHelper.hasSecurityChanges(live, edit({ homeWidget: null })),
      ).toBe(false);
      const withWidget = {
        ...live,
        homeWidget: { widgetClass: 'A', verifiedClass: 'A' },
      };
      expect(
        VersionDiffHelper.hasSecurityChanges(
          withWidget,
          edit({ homeWidget: { widgetClass: 'A' } }),
        ),
      ).toBe(false);
      expect(VersionDiffHelper.hasSecurityChanges(withWidget, edit())).toBe(
        false,
      );
    });

    it('treats a row without the field as having no widget', () => {
      const legacy: Record<string, unknown> = { ...live };
      delete legacy.homeWidget;
      expect(
        VersionDiffHelper.hasSecurityChanges(legacy, edit({ homeWidget: null })),
      ).toBe(false);
    });
  });

  describe('computeDiff', () => {
    it('lists a new widget as none -> HrHomeWidget', () => {
      const diff = VersionDiffHelper.computeDiff(
        live,
        edit({
          homeWidget: { widgetClass: 'HrHomeWidget' },
          revisionStatus: 'IN_REVIEW',
        }),
      );
      expect(diff.differences.metadata.homeWidget).toEqual({
        base: 'none',
        target: 'HrHomeWidget',
        changed: true,
      });
      expect(diff.hasChanges).toBe(true);
    });

    it('lists a removed widget as HrHomeWidget -> none', () => {
      const diff = VersionDiffHelper.computeDiff(
        { ...live, homeWidget: { widgetClass: 'HrHomeWidget' } },
        edit({ homeWidget: null }),
      );
      expect(diff.differences.metadata.homeWidget).toEqual({
        base: 'HrHomeWidget',
        target: 'none',
        changed: true,
      });
    });

    it('omits it when unchanged or not carried by the revision', () => {
      const withWidget = { ...live, homeWidget: { widgetClass: 'HrHomeWidget' } };
      expect(
        VersionDiffHelper.computeDiff(
          withWidget,
          edit({
            homeWidget: { widgetClass: 'HrHomeWidget', verifiedClass: 'HrHomeWidget' },
          }),
        ).differences.metadata.homeWidget,
      ).toBeUndefined();
      const untouched = VersionDiffHelper.computeDiff(withWidget, edit());
      expect(untouched.differences.metadata.homeWidget).toBeUndefined();
      expect(untouched.hasChanges).toBe(false);
    });

    it('omits it when the base does not carry it (a version-history record)', () => {
      const record = {
        version: '1.0.0',
        type: 'PRODUCTION',
        status: 'PREVIOUS',
      };
      expect(
        VersionDiffHelper.computeDiff(record, {
          ...live,
          homeWidget: { widgetClass: 'HrHomeWidget' },
        }).differences.metadata.homeWidget,
      ).toBeUndefined();
    });
  });
});
