import { BadRequestException } from '@nestjs/common';
import { MiniappMutationHelper } from './miniapp-mutation.helper';
import { MiniApp } from '../entities/miniapp.entity';

// HR as registered: a FLUTTER_PACKAGE app; `status` decides live vs non-live.
const hr = (over: Partial<MiniApp> = {}): MiniApp =>
  ({
    id: 'app-hr',
    appId: 'miniapp_hr_ccef3a',
    name: 'HR',
    status: 'ACTIVE',
    ownerId: 'owner-1',
    integrationMethod: 'FLUTTER_PACKAGE',
    integrationConfig: { packageName: 'fsa_hr_miniapp' },
    permissions: [],
    homeWidget: null,
    pendingRevision: null,
    versionHistory: [],
    ...over,
  }) as unknown as MiniApp;

// What PATCH /mini-apps/:id hands the helper for an HR edit
// (extractIntegrationConfig output; the DTO whitelist strips lifecycle keys).
const edit = (over: any = {}): Partial<MiniApp> => ({
  name: 'HR',
  integrationMethod: 'FLUTTER_PACKAGE',
  integrationConfig: { packageName: 'fsa_hr_miniapp' },
  capabilities: [],
  ...over,
});

function setup(
  orgs: { name: string; code: string }[] = [],
  // mini_apps.organizationId is NOT NULL: the helper falls back to the creator's
  // staff profile agency when the organization name does not resolve to a row.
  creatorOrgId: string | null = 'org-of-admin-1',
) {
  const repo = {
    create: jest.fn((data: Partial<MiniApp>) => ({ ...data })),
    save: jest.fn((entity: Partial<MiniApp>) =>
      Promise.resolve({ id: 'app-new', ...entity }),
    ),
    // TypeORM's merge copies every defined value (null included).
    merge: jest.fn((target: MiniApp, ...sources: Partial<MiniApp>[]) => {
      const fields = target as unknown as Record<string, unknown>;
      for (const source of sources) {
        for (const [key, value] of Object.entries(source)) {
          if (value !== undefined) fields[key] = value;
        }
      }
      return target;
    }),
    findOne: jest.fn(() => Promise.resolve(null)),
  };
  const validationHelper = {
    validateMiniAppAsync: jest.fn().mockResolvedValue(undefined),
  };
  const helper = new MiniappMutationHelper(
    repo as any,
    { uploadBase64: jest.fn() } as any,
    { generateVerificationToken: () => 'token' } as any,
    {
      sendRegistrationSuccessEmail: jest.fn().mockResolvedValue(undefined),
    } as any,
    { createNotification: jest.fn().mockResolvedValue(undefined) } as any,
    validationHelper as any,
    {} as any,
    {
      // where: [{ name }, { code }], matched exactly.
      findOne: jest.fn(({ where }: { where: Record<string, string>[] }) =>
        Promise.resolve(
          orgs.find((o) => where.some((w) => (w.name ?? w.code) === (w.name ? o.name : o.code))) ?? null,
        ),
      ),
      manager: {
        findOne: jest.fn(() =>
          Promise.resolve(creatorOrgId ? { organizationId: creatorOrgId } : null),
        ),
      },
    } as any,
  );
  return { helper, repo, validationHelper };
}

describe('MiniappMutationHelper and homeWidget', () => {
  describe('live app (ACTIVE / TESTING)', () => {
    it('stages a changed widget in pendingRevision and re-validates', async () => {
      const { helper, validationHelper } = setup();
      const existing = hr();

      await helper.update(
        existing,
        edit({ homeWidget: { widgetClass: 'HrHomeWidget' } }),
        'admin-1',
      );

      expect(existing.homeWidget).toBeNull();
      expect(existing.pendingRevision).toMatchObject({
        homeWidget: { widgetClass: 'HrHomeWidget' },
        revisionStatus: 'IN_REVIEW',
        validationStatus: 'RUNNING',
      });
      expect(validationHelper.validateMiniAppAsync).toHaveBeenCalledWith(
        existing,
        undefined,
      );
    });

    it('stages clearing the widget (null) on a TESTING app', async () => {
      const { helper } = setup();
      const existing = hr({
        status: 'TESTING',
        homeWidget: { widgetClass: 'HrHomeWidget' },
      });

      await helper.update(existing, edit({ homeWidget: null }), 'admin-1');

      expect(existing.homeWidget).toEqual({ widgetClass: 'HrHomeWidget' });
      expect(existing.pendingRevision).toMatchObject({ homeWidget: null });
    });

    it('fast-tracks an unchanged widget without review', async () => {
      const { helper, validationHelper } = setup();
      const existing = hr({ homeWidget: { widgetClass: 'HrHomeWidget' } });

      await helper.update(
        existing,
        edit({
          name: 'HR Attendance',
          homeWidget: { widgetClass: 'HrHomeWidget' },
        }),
        'admin-1',
      );

      expect(existing.name).toBe('HR Attendance');
      expect(existing.pendingRevision).toBeNull();
      expect(validationHelper.validateMiniAppAsync).not.toHaveBeenCalled();
    });

    it('treats a stored row that only differs by verifiedClass as unchanged', async () => {
      const { helper, validationHelper } = setup();
      const existing = hr({
        homeWidget: { widgetClass: 'HrHomeWidget', verifiedClass: 'HrHomeWidget' },
      });

      await helper.update(
        existing,
        edit({ homeWidget: { widgetClass: ' HrHomeWidget ' } }),
        'admin-1',
      );

      expect(existing.pendingRevision).toBeNull();
      expect(validationHelper.validateMiniAppAsync).not.toHaveBeenCalled();
      // The live row keeps its verification.
      expect(existing.homeWidget).toEqual({
        widgetClass: 'HrHomeWidget',
        verifiedClass: 'HrHomeWidget',
      });
    });

    it('re-saving an identical widget into an open revision keeps its verifiedClass', async () => {
      const { helper } = setup();
      const live = { widgetClass: 'HrHomeWidget', verifiedClass: 'HrHomeWidget' };
      const existing = hr({
        homeWidget: live,
        pendingRevision: {
          name: 'HR',
          homeWidget: live,
          revisionStatus: 'IN_REVIEW',
        },
      });

      await helper.update(
        existing,
        edit({ homeWidget: { widgetClass: 'HrHomeWidget' } }),
        'admin-1',
      );

      expect(existing.pendingRevision.homeWidget).toEqual(live);
    });

    it('a revision that does not send the field carries the live value', async () => {
      const { helper } = setup();
      const existing = hr({ homeWidget: { widgetClass: 'HrHomeWidget' } });

      await helper.update(
        existing,
        edit({ integrationConfig: { packageName: 'fsa_hr_miniapp_v2' } }),
        'admin-1',
      );

      expect(existing.pendingRevision).toMatchObject({
        homeWidget: { widgetClass: 'HrHomeWidget' },
        integrationConfig: { packageName: 'fsa_hr_miniapp_v2' },
      });
    });

    it('setting it back to the live value updates an open revision without review', async () => {
      const { helper, validationHelper } = setup();
      const existing = hr({
        pendingRevision: {
          name: 'HR',
          homeWidget: { widgetClass: 'HrHomeWidget' },
          revisionStatus: 'IN_REVIEW',
        },
      });

      await helper.update(existing, edit({ homeWidget: null }), 'admin-1');

      expect(existing.pendingRevision).toMatchObject({
        homeWidget: null,
        revisionStatus: 'IN_REVIEW',
      });
      expect(validationHelper.validateMiniAppAsync).not.toHaveBeenCalled();
    });

    it('a client verifiedClass never reaches the staged revision', async () => {
      const { helper } = setup();
      const existing = hr();

      await helper.update(
        existing,
        edit({
          homeWidget: { widgetClass: 'HrHomeWidget', verifiedClass: 'HrHomeWidget' },
        }),
        'admin-1',
      );

      expect(existing.pendingRevision.homeWidget).toEqual({
        widgetClass: 'HrHomeWidget',
      });
    });
  });

  describe('non-live app (draft, rejected, ...)', () => {
    it.each(['DRAFT', 'REJECTED'])(
      'saves it directly on a %s app',
      async (status) => {
        const { helper, repo } = setup();
        const existing = hr({ status });

        await helper.update(
          existing,
          edit({ homeWidget: { widgetClass: 'HrHomeWidget' } }),
          'admin-1',
        );

        expect(repo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            homeWidget: { widgetClass: 'HrHomeWidget' },
          }),
        );
        expect(existing.pendingRevision).toBeNull();
      },
    );

    it('normalizes the input and drops a client verifiedClass', async () => {
      const { helper, repo } = setup();
      const existing = hr({ status: 'DRAFT' });

      await helper.update(
        existing,
        edit({
          homeWidget: {
            widgetClass: ' HrHomeWidget ',
            verifiedClass: 'HrHomeWidget',
          },
        }),
        'admin-1',
      );

      const saved = (repo.save.mock.calls[0] as any[])[0];
      expect(saved.homeWidget).toEqual({ widgetClass: 'HrHomeWidget' });
    });

    it('re-saving an identical widget keeps the stored verifiedClass', async () => {
      const { helper, repo } = setup();
      const existing = hr({
        status: 'DRAFT',
        homeWidget: { widgetClass: 'HrHomeWidget', verifiedClass: 'HrHomeWidget' },
      });

      await helper.update(
        existing,
        edit({ homeWidget: { widgetClass: 'HrHomeWidget' } }),
        'admin-1',
      );

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          homeWidget: {
            widgetClass: 'HrHomeWidget',
            verifiedClass: 'HrHomeWidget',
          },
        }),
      );
    });

    it('null clears it', async () => {
      const { helper, repo } = setup();
      const existing = hr({
        status: 'DRAFT',
        homeWidget: { widgetClass: 'HrHomeWidget' },
      });

      await helper.update(existing, edit({ homeWidget: null }), 'admin-1');

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ homeWidget: null }),
      );
    });
  });

  describe('integration method switch', () => {
    it.each(['DRAFT', 'ACTIVE'])(
      'rejects FLUTTER_PACKAGE -> DEEP_LINK on a %s app that keeps a widgetClass and sends no widget',
      async (status) => {
        const { helper, repo } = setup();
        const existing = hr({
          status,
          homeWidget: { widgetClass: 'HrHomeWidget' },
        });

        await expect(
          helper.update(
            existing,
            edit({
              integrationMethod: 'DEEP_LINK',
              integrationConfig: { urlScheme: 'hr://home' },
            }),
            'admin-1',
          ),
        ).rejects.toThrow(/re-enter the widget field for DEEP_LINK/);
        expect(repo.save).not.toHaveBeenCalled();
      },
    );

    it('checks the open revision widget and method, not the live ones', async () => {
      const { helper } = setup();
      const existing = hr({
        integrationMethod: 'DEEP_LINK',
        homeWidget: null,
        pendingRevision: {
          integrationMethod: 'FLUTTER_PACKAGE',
          homeWidget: { widgetClass: 'HrHomeWidget' },
        },
      });

      await expect(
        helper.update(
          existing,
          edit({
            integrationMethod: 'NATIVE_SDK',
            integrationConfig: { sdkName: 'hr' },
          }),
          'admin-1',
        ),
      ).rejects.toThrow(/re-enter the widget field for NATIVE_SDK/);
    });

    it('allows the switch when the widget is cleared or re-entered', async () => {
      const { helper } = setup();

      await expect(
        helper.update(
          hr({
            status: 'DRAFT',
            homeWidget: { widgetClass: 'HrHomeWidget' },
          }),
          edit({
            integrationMethod: 'DEEP_LINK',
            integrationConfig: { urlScheme: 'hr://home' },
            homeWidget: null,
          }),
          'admin-1',
        ),
      ).resolves.toBeDefined();

      await expect(
        helper.update(
          hr({
            status: 'DRAFT',
            homeWidget: { widgetClass: 'HrHomeWidget' },
          }),
          edit({
            integrationMethod: 'DEEP_LINK',
            integrationConfig: { urlScheme: 'hr://home' },
            homeWidget: { url: 'https://hr.example.com/widget' },
          }),
          'admin-1',
        ),
      ).resolves.toBeDefined();
    });

    it('allows a switch between methods sharing the field (WEBVIEW -> DEEP_LINK keeps the url)', async () => {
      const { helper } = setup();

      await expect(
        helper.update(
          hr({
            status: 'DRAFT',
            integrationMethod: 'WEBVIEW',
            homeWidget: { url: 'https://hr.example.com/widget' },
          }),
          edit({
            integrationMethod: 'DEEP_LINK',
            integrationConfig: { urlScheme: 'hr://home' },
          }),
          'admin-1',
        ),
      ).resolves.toBeDefined();
    });

    it('does not complain when the app had no widget', async () => {
      const { helper } = setup();

      await expect(
        helper.update(
          hr({ status: 'DRAFT' }),
          edit({
            integrationMethod: 'DEEP_LINK',
            integrationConfig: { urlScheme: 'hr://home' },
          }),
          'admin-1',
        ),
      ).resolves.toBeDefined();
    });
  });

  describe('create (POST /mini-apps and /mini-apps/draft)', () => {
    it('stores the normalized widget', async () => {
      const { helper, repo } = setup();

      await helper.create(
        {
          appId: 'miniapp_hr_ccef3a',
          name: 'HR',
          integrationMethod: 'FLUTTER_PACKAGE',
          integrationConfig: { packageName: 'fsa_hr_miniapp' },
          homeWidget: { widgetClass: ' HrHomeWidget ', verifiedClass: 'Spoof' },
        },
        'admin-1',
      );

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ homeWidget: { widgetClass: 'HrHomeWidget' } }),
      );
    });

    it('rejects an invalid widget with 400 (the draft body is not DTO-validated)', async () => {
      const { helper, repo } = setup();

      await expect(
        helper.create({
          appId: 'x',
          name: 'X',
          integrationMethod: 'FLUTTER_PACKAGE',
          homeWidget: { widgetClass: 'hrHomeWidget' },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('rejects a widget when no integration method is chosen', async () => {
      const { helper } = setup();

      await expect(
        helper.create({
          appId: 'x',
          name: 'X',
          homeWidget: { widgetClass: 'HrHomeWidget' },
        }),
      ).rejects.toThrow(/integration method first/);
    });
  });

  it('update rejects an invalid widget with 400 before saving', async () => {
    const { helper, repo } = setup();

    await expect(
      helper.update(
        hr({ status: 'DRAFT' }),
        edit({ homeWidget: { widgetClass: 'hrHomeWidget' } }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  describe('organization', () => {
    const create = (helper: MiniappMutationHelper, organization: string) =>
      helper.create(
        {
          appId: 'miniapp_hr_ccef3a',
          name: 'HR',
          organization,
          integrationMethod: 'FLUTTER_PACKAGE',
          integrationConfig: { packageName: 'fsa_hr_miniapp' },
        },
        'admin-1',
      );

    it('takes the code of an organization created in the portal', async () => {
      const { helper, repo } = setup([{ name: 'Microfinance Regulator (MFR)', code: 'MFR' }]);
      await create(helper, 'Microfinance Regulator (MFR)');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ organization: 'Microfinance Regulator (MFR)', organizationCode: 'MFR' }),
      );
    });

    it('drops a category that only repeats the organization, keeps a service type', async () => {
      const { helper, repo } = setup([{ name: 'Microfinance Regulator (MFR)', code: 'MFR' }]);
      await helper.create(
        { appId: 'a', name: 'A', organization: 'Microfinance Regulator (MFR)', category: 'Microfinance Regulator (MFR)' },
        'admin-1',
      );
      expect(repo.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ organizationCode: 'MFR', category: null }),
      );
      await helper.create(
        { appId: 'b', name: 'B', organization: 'Trust Regulator (TR)', category: 'licensing' },
        'admin-1',
      );
      expect(repo.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ organizationCode: 'TR', category: 'licensing' }),
      );
    });

    it('on update, an organization named only in category still sets it, and category is cleared', async () => {
      const { helper } = setup();
      const existing = hr({ status: 'DRAFT', category: 'Trust Regulator (TR)' } as any);
      const saved = await helper.update(existing, edit({ category: 'Insurance Regulator of Cambodia (IRC)' } as any), 'admin-1');
      expect(saved).toMatchObject({ organizationCode: 'IRC', category: null });
    });

    it('falls back to the built-in FSA list', async () => {
      const { helper, repo } = setup();
      await create(helper, 'Insurance Regulator of Cambodia (IRC)');
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ organizationCode: 'IRC' }));
    });

    it("assigns the creator's agency when the organization does not resolve to a row", async () => {
      const { helper, repo } = setup([], 'org-of-admin-1');
      await create(helper, 'Insurance Regulator of Cambodia (IRC)');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: 'org-of-admin-1' }),
      );
    });

    it('rejects with 400 when no owning organization can be determined', async () => {
      const { helper, repo } = setup([], null);
      await expect(create(helper, 'Unknown Agency')).rejects.toThrow(/owning organization is required/);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });
});
