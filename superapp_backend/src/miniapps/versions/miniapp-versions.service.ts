import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { MiniAppVersion, MiniAppVersionStatus } from '../entities/miniapp-version.entity';
import { MiniApp } from '../entities/miniapp.entity';
import {
  MiniAppVersionCapability,
  VersionCapabilityStatus,
} from '../entities/miniapp-version-capability.entity';
import {
  capabilityChanged,
  parseDeclaredCapabilities,
  revisionRowOf,
  revisionVersionOf,
  workingVersionOf,
  workingVersionStatus,
} from './version-capabilities';

/** A stored ISO date (or Date) as a Date; anything else as null. */
function toDate(value: unknown): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The app fields the version rows follow. */
export interface VersionSyncSource {
  id: string;
  lifecycleStatus?: string | null;
  currentReleaseVersion?: string | null;
  version?: string | null;
  integrationMethod?: string | null;
  integrationConfig?: any;
  homeWidget?: any;
  liveVersionId?: string | null;
  capabilities?: unknown;
  pendingRevision?: any;
}

/**
 * Version rows (mini_app_versions) and the capabilities each version asks
 * for (mini_app_version_capabilities).
 *
 *   never released  one working row (DRAFT, then TESTING, then ACTIVE) holds
 *                   the app's capabilities.
 *   live            the ACTIVE row holds the live capabilities; a pending
 *                   revision is a DRAFT row with its own capabilities.
 *
 * syncFromApp runs after every committed save of a mini app (see
 * MiniAppVersionSyncSubscriber) and keeps the live and working rows. The
 * pending revision lives only on its version row (`revision`): every writer
 * calls persistRevision, and a loaded app gets it back from its eager
 * versions (MiniApp @AfterLoad) or attachRevisions. Approving, publishing and
 * rolling back are explicit calls from the lifecycle.
 */
@Injectable()
export class MiniAppVersionsService {
  private readonly logger = new Logger(MiniAppVersionsService.name);

  constructor(
    @InjectRepository(MiniAppVersion)
    private readonly versions: Repository<MiniAppVersion>,
    @InjectRepository(MiniAppVersionCapability)
    private readonly caps: Repository<MiniAppVersionCapability>,
    @Optional()
    @InjectRepository(MiniApp)
    private readonly apps?: Repository<MiniApp>,
  ) {}

  private rowsOf(miniAppId: string) {
    return this.versions.find({ where: { miniAppId }, order: { createdAt: 'DESC' } });
  }

  private async newRow(app: VersionSyncSource, version: string, status: string, changelog?: string) {
    return this.versions.save(
      this.versions.create({
        miniAppId: app.id,
        version,
        status,
        sourceType: app.integrationMethod || undefined,
        packageName: app.integrationConfig?.packageName || undefined,
        integrationMethod: app.integrationMethod ?? null,
        integrationConfig: app.integrationConfig ?? null,
        homeWidget: app.homeWidget ?? null,
        changelog,
        ...(status === MiniAppVersionStatus.ACTIVE ? { releasedAt: new Date() } : {}),
      }),
    );
  }

  /**
   * The integration a row should hold, from the app (live or working row) or
   * from its revision (DRAFT row of a live app). Fields the source does not
   * carry are left out, so a partial read changes nothing.
   */
  private integrationPatch(row: MiniAppVersion, src: { integrationMethod?: any; integrationConfig?: any; homeWidget?: any }) {
    const patch: Partial<MiniAppVersion> = {};
    const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
    if (src.integrationMethod !== undefined && row.integrationMethod !== (src.integrationMethod ?? null)) {
      patch.integrationMethod = src.integrationMethod ?? null;
    }
    if (src.integrationConfig !== undefined && !same(row.integrationConfig, src.integrationConfig)) {
      patch.integrationConfig = src.integrationConfig ?? null;
    }
    if (src.homeWidget !== undefined && !same(row.homeWidget, src.homeWidget)) {
      patch.homeWidget = src.homeWidget ?? null;
    }
    return patch;
  }

  /** Brings the live or working row (status, capabilities, integration) in line with the app. */
  async syncFromApp(app: VersionSyncSource): Promise<void> {
    if (!app?.id) return;
    const rows = await this.rowsOf(app.id);
    const live = rows.find((r) => r.status === MiniAppVersionStatus.ACTIVE);

    if (!live) {
      const status = app.lifecycleStatus === undefined ? null : workingVersionStatus(app.lifecycleStatus);
      const version = workingVersionOf(app);
      let work = rows.find(
        (r) => r.status === MiniAppVersionStatus.DRAFT || r.status === MiniAppVersionStatus.TESTING,
      );
      if (!work) {
        work = await this.newRow(app, version, status ?? MiniAppVersionStatus.DRAFT);
      } else {
        const patch: Partial<MiniAppVersion> = this.integrationPatch(work, app);
        if (status && work.status !== status) {
          patch.status = status;
          if (status === MiniAppVersionStatus.ACTIVE) patch.releasedAt = new Date();
        }
        if (work.version !== version) patch.version = version;
        if (Object.keys(patch).length) await this.versions.update({ id: work.id }, patch);
      }
      await this.setCapabilities(app.id, work.id, app.capabilities);
      if (status === MiniAppVersionStatus.ACTIVE) await this.pointLive(app, work.id);
      return;
    }

    const livePatch = this.integrationPatch(live, app);
    if (Object.keys(livePatch).length) await this.versions.update({ id: live.id }, livePatch);
    await this.setCapabilities(app.id, live.id, app.capabilities);
    await this.pointLive(app, live.id);
  }

  /** mini_apps.liveVersionId follows the ACTIVE row. */
  private async pointLive(app: VersionSyncSource, versionId: string): Promise<void> {
    if (typeof this.apps?.update !== 'function' || app.liveVersionId === versionId) return;
    // update() leaves the entity subscriber's watched columns alone: no sync loop
    await this.apps.update({ id: app.id }, { liveVersionId: versionId });
    app.liveVersionId = versionId;
  }

  /**
   * Stores app.pendingRevision on its version row (the only place it lives).
   *   object     live app: the DRAFT row (made if missing) gets the revision,
   *              its version, changelog, review state and capabilities;
   *              unreleased app: the working row keeps it.
   *   null       the revision is gone: a live app's DRAFT row is deleted, a
   *              working row's revision cleared.
   *   undefined  not loaded: nothing changes.
   * Unchanged revisions are not written again.
   */
  async persistRevision(app: VersionSyncSource): Promise<void> {
    if (!app?.id || app.pendingRevision === undefined) return;
    const rev = app.pendingRevision && typeof app.pendingRevision === 'object' ? app.pendingRevision : null;
    let rows = await this.rowsOf(app.id);
    const live = rows.some((r) => r.status === MiniAppVersionStatus.ACTIVE);
    let row = revisionRowOf(rows);

    if (!rev) {
      if (!row) return;
      if (live) {
        await this.caps.delete({ versionId: row.id });
        await this.versions.delete({ id: row.id });
      } else if (row.revision != null) {
        await this.versions.update({ id: row.id }, { revision: null, reviewStatus: null, submittedAt: null });
      }
      return;
    }

    const review = {
      revision: rev,
      reviewStatus: typeof rev.revisionStatus === 'string' ? rev.revisionStatus.slice(0, 30) : null,
      submittedAt: toDate(rev.submittedAt),
    };
    if (!live) {
      if (!row) {
        await this.syncFromApp(app);
        rows = await this.rowsOf(app.id);
        row = revisionRowOf(rows);
      }
      if (row && JSON.stringify(row.revision ?? null) !== JSON.stringify(rev)) {
        await this.versions.update({ id: row.id }, review);
      }
      return;
    }

    const version = revisionVersionOf(app);
    if (!row) row = await this.newRow(app, version, MiniAppVersionStatus.DRAFT, rev.changelog);
    const changed =
      JSON.stringify(row.revision ?? null) !== JSON.stringify(rev) ||
      row.version !== version ||
      Boolean(rev.changelog && row.changelog !== rev.changelog);
    if (changed) {
      await this.versions.update({ id: row.id }, {
        version,
        ...(rev.changelog ? { changelog: rev.changelog } : {}),
        ...review,
        ...this.integrationPatch(row, {
          integrationMethod: rev.integrationMethod ?? app.integrationMethod,
          integrationConfig: rev.integrationConfig ?? app.integrationConfig,
          homeWidget: rev.homeWidget !== undefined ? rev.homeWidget : app.homeWidget,
        }),
      });
    }
    await this.setCapabilities(app.id, row.id, rev.capabilities ?? rev.permissions ?? app.capabilities);
  }

  /**
   * Fills pendingRevision and capabilities on apps loaded without their
   * versions (query builder lists): two queries for the whole list. Apps that
   * already carry them are left alone.
   */
  async attachRevisions<T extends { id: string; pendingRevision?: any; capabilities?: any }>(apps: T[]): Promise<T[]> {
    const needCaps = apps.filter((a) => a?.id && a.capabilities === undefined && UUID.test(a.id));
    if (needCaps.length) {
      const served = await this.servingCapabilities(needCaps.map((a) => a.id));
      for (const app of needCaps) app.capabilities = served.get(app.id) ?? [];
    }
    const todo = apps.filter((a) => a?.id && a.pendingRevision === undefined && UUID.test(a.id));
    if (!todo.length) return apps;
    const rows = await this.versions.find({
      where: {
        miniAppId: In(todo.map((a) => a.id)),
        status: In([MiniAppVersionStatus.ACTIVE, MiniAppVersionStatus.DRAFT, MiniAppVersionStatus.TESTING]),
      },
      order: { createdAt: 'DESC' },
    });
    for (const app of todo) {
      app.pendingRevision = revisionRowOf(rows.filter((r) => r.miniAppId === app.id))?.revision ?? null;
    }
    return apps;
  }

  /**
   * Merges fields into the pending revision's integrationConfig in one
   * UPDATE, so concurrent scan callbacks cannot lose each other's fields.
   */
  async patchRevisionConfig(miniAppId: string, patch: Record<string, any>): Promise<void> {
    const row = revisionRowOf(await this.rowsOf(miniAppId));
    if (!row) return;
    await this.versions
      .createQueryBuilder()
      .update(MiniAppVersion)
      .set({
        revision: () =>
          `jsonb_set(COALESCE("revision", '{}'::jsonb), '{integrationConfig}', ` +
          `COALESCE("revision"->'integrationConfig', '{}'::jsonb) || CAST(:patch AS jsonb))`,
      } as any)
      .where('id = :id', { id: row.id })
      .setParameters({ patch: JSON.stringify(patch) })
      .execute();
  }

  /**
   * Makes a version's capability rows match a declared list. Unchanged rows
   * keep their review; new or changed ones go back to REQUESTED.
   * undefined leaves the rows alone.
   */
  async setCapabilities(miniAppId: string, versionId: string, declared: unknown): Promise<void> {
    if (declared === undefined) return;
    const want = parseDeclaredCapabilities(declared);
    const have = await this.caps.find({ where: { versionId } });
    const byKey = new Map(have.map((r) => [r.capabilityKey, r]));
    const wanted = new Set(want.map((w) => w.key));

    const gone = have.filter((r) => !wanted.has(r.capabilityKey)).map((r) => r.id);
    if (gone.length) await this.caps.delete({ id: In(gone) });

    for (const w of want) {
      const row = byKey.get(w.key);
      if (!row) {
        await this.caps.save(
          this.caps.create({
            miniAppId,
            versionId,
            capabilityKey: w.key,
            required: w.required,
            purpose: w.purpose,
            declaration: w.declaration as any,
            position: w.position,
            status: VersionCapabilityStatus.REQUESTED,
          }),
        );
      } else if (capabilityChanged(row, w)) {
        await this.caps.update(
          { id: row.id },
          {
            required: w.required,
            purpose: w.purpose,
            declaration: w.declaration as any,
            position: w.position,
            status: VersionCapabilityStatus.REQUESTED,
            approvedById: null,
            approvedAt: null,
          },
        );
      } else if (row.position !== w.position || JSON.stringify(row.declaration) !== JSON.stringify(w.declaration)) {
        await this.caps.update({ id: row.id }, { position: w.position, declaration: w.declaration as any });
      }
    }
  }

  /** A reviewer accepted every capability of this version. */
  async approveVersion(versionId: string, actorId?: string | null): Promise<void> {
    await this.caps.update(
      { versionId, status: Not(VersionCapabilityStatus.APPROVED) },
      {
        status: VersionCapabilityStatus.APPROVED,
        approvedById: actorId && UUID.test(actorId) ? actorId : null,
        approvedAt: new Date(),
      },
    );
  }

  /** An unreleased app was approved: its working version's capabilities are accepted. */
  async approveWorking(app: VersionSyncSource, actorId?: string | null): Promise<void> {
    await this.syncFromApp(app);
    const rows = await this.rowsOf(app.id);
    if (rows.some((r) => r.status === MiniAppVersionStatus.ACTIVE)) return;
    const work = rows.find(
      (r) => r.status === MiniAppVersionStatus.DRAFT || r.status === MiniAppVersionStatus.TESTING,
    );
    if (work) await this.approveVersion(work.id, actorId);
  }

  /**
   * Publishes the pending revision: its DRAFT row becomes ACTIVE (with its
   * capabilities approved) and the live row becomes PREVIOUS. Call while
   * app.pendingRevision is still set.
   */
  async publishDraft(
    app: VersionSyncSource,
    version: string,
    actorId?: string | null,
    changelog?: string,
  ): Promise<void> {
    await this.persistRevision(app);
    const rows = await this.rowsOf(app.id);
    const draft = rows.find((r) => r.status === MiniAppVersionStatus.DRAFT);
    if (!draft) return;
    await this.versions.update(
      { miniAppId: app.id, status: MiniAppVersionStatus.ACTIVE },
      { status: MiniAppVersionStatus.PREVIOUS },
    );
    await this.versions.update(
      { id: draft.id },
      {
        version,
        status: MiniAppVersionStatus.ACTIVE,
        releasedAt: new Date(),
        releasedBy: actorId || undefined,
        ...(changelog ? { changelog } : {}),
      },
    );
    await this.approveVersion(draft.id, actorId);
  }

  /** A released version and the capabilities it shipped with, for rollback. */
  async findReleased(
    miniAppId: string,
    version: string,
  ): Promise<{ row: MiniAppVersion; capabilities: unknown[] } | null> {
    const row = await this.versions.findOne({
      where: { miniAppId, version, status: Not(MiniAppVersionStatus.DRAFT) },
      order: { createdAt: 'DESC' },
    });
    if (!row) return null;
    const caps = await this.caps.find({ where: { versionId: row.id }, order: { position: 'ASC' } });
    return {
      row,
      capabilities: caps.map((c) => c.declaration),
    };
  }

  /** Makes an earlier release live again; the current live row becomes PREVIOUS. */
  async rollbackTo(miniAppId: string, versionId: string): Promise<void> {
    await this.versions.update(
      { miniAppId, status: MiniAppVersionStatus.ACTIVE, id: Not(versionId) },
      { status: MiniAppVersionStatus.PREVIOUS },
    );
    await this.versions.update({ id: versionId }, { status: MiniAppVersionStatus.ACTIVE });
    if (typeof this.apps?.update === 'function') await this.apps.update({ id: miniAppId }, { liveVersionId: versionId });
  }

  /** Versions of one app, newest first, each with its capabilities. */
  async listWithCapabilities(miniAppId: string) {
    const rows = await this.rowsOf(miniAppId);
    const caps = rows.length
      ? await this.caps.find({
          where: { versionId: In(rows.map((r) => r.id)) },
          order: { position: 'ASC' },
        })
      : [];
    return rows.map((r) => ({
      id: r.id,
      version: r.version,
      status: r.status,
      changelog: r.changelog,
      reviewStatus: r.reviewStatus ?? null,
      submittedAt: r.submittedAt ?? null,
      releasedAt: r.releasedAt,
      releasedBy: r.releasedBy,
      createdAt: r.createdAt,
      capabilities: caps
        .filter((c) => c.versionId === r.id)
        .map((c) => ({
          key: c.capabilityKey,
          required: c.required,
          purpose: c.purpose ?? null,
          status: c.status,
          approvedById: c.approvedById ?? null,
          approvedAt: c.approvedAt ?? null,
        })),
    }));
  }

  /**
   * The capabilities each app is served with on phones: those of its live
   * (ACTIVE) row, else of its working row (TESTING, then DRAFT). Entries are
   * the declarations as written. An app with no such row is left out.
   */
  async servingCapabilities(miniAppIds: string[]): Promise<Map<string, unknown[]>> {
    const out = new Map<string, unknown[]>();
    for (const [id, v] of await this.servingVersions(miniAppIds)) out.set(id, v.capabilities);
    return out;
  }

  /**
   * What phones get for each app, from the version it serves (ACTIVE row,
   * else its TESTING, then DRAFT working row): capabilities and integration.
   * integration is null when that row does not hold one yet.
   */
  async servingVersions(miniAppIds: string[]): Promise<
    Map<
      string,
      {
        versionId: string;
        capabilities: unknown[];
        integration: { integrationMethod: string | null; integrationConfig: any; homeWidget: any } | null;
      }
    >
  > {
    const ids = [...new Set(miniAppIds.filter((id) => UUID.test(id)))];
    const out = new Map<string, any>();
    if (!ids.length) return out;

    const order = [MiniAppVersionStatus.ACTIVE, MiniAppVersionStatus.TESTING, MiniAppVersionStatus.DRAFT];
    const rows = await this.versions.find({
      where: { miniAppId: In(ids), status: In(order) },
      order: { createdAt: 'DESC' },
    });
    const serving = new Map<string, MiniAppVersion>();
    for (const row of rows) {
      const current = serving.get(row.miniAppId);
      if (!current || order.indexOf(row.status as any) < order.indexOf(current.status as any)) {
        serving.set(row.miniAppId, row);
      }
    }
    if (!serving.size) return out;

    const versionIds = [...serving.values()].map((r) => r.id);
    const caps = await this.caps.find({
      where: { versionId: In(versionIds) },
      order: { position: 'ASC' },
    });
    for (const [miniAppId, row] of serving) {
      out.set(miniAppId, {
        versionId: row.id,
        capabilities: caps.filter((c) => c.versionId === row.id).map((c) => c.declaration),
        integration:
          row.integrationConfig != null
            ? {
                integrationMethod: row.integrationMethod ?? null,
                integrationConfig: row.integrationConfig,
                homeWidget: row.homeWidget ?? null,
              }
            : null,
      });
    }
    return out;
  }

  /**
   * Re-reads an app and syncs its version rows. For writes the entity
   * subscriber cannot see (raw UPDATEs) and for the subscriber itself.
   */
  async resyncApp(miniAppId: string): Promise<void> {
    if (!this.apps) return;
    try {
      const app = await this.apps
        .createQueryBuilder('m')
        .select([
          'm.id',
          'm.lifecycleStatus',
          'm.currentReleaseVersion',
          'm.integrationMethod',
          'm.integrationConfig',
          'm.homeWidget',
          'm.liveVersionId',
        ])
        .where('m.id = :id', { id: miniAppId })
        .getOne();
      if (app) await this.syncQuietly(app);
    } catch (err: any) {
      this.logger.warn(`Could not re-read mini app ${miniAppId} for version sync: ${err?.message}`);
    }
  }

  /** Runs syncFromApp and only logs a failure: the app save already happened. */
  async syncQuietly(app: VersionSyncSource): Promise<void> {
    try {
      await this.syncFromApp(app);
    } catch (err: any) {
      this.logger.warn(`Version sync failed for mini app ${app?.id}: ${err?.message}`);
    }
  }
}

/**
 * Writes what lives on the version rows after an app save: its capabilities
 * (live or working row) and its pending revision. For code that has a
 * MiniApp repository but not the service: the version tables are reached
 * through the repository's manager. A stand-in repository without a manager
 * (unit tests) is skipped.
 */
export async function persistAppVersions(
  appRepository: Repository<MiniApp> | undefined | null,
  app: VersionSyncSource | null | undefined,
): Promise<void> {
  if (!app?.id) return;
  const svc = versionsServiceFor(appRepository);
  if (!svc) return;
  // The live or working row with the app's capabilities, then the revision
  if (app.capabilities !== undefined) await svc.syncFromApp(app);
  if (app.pendingRevision !== undefined) await svc.persistRevision(app);
}

/** A MiniAppVersionsService on the same connection as a MiniApp repository. */
export function versionsServiceFor(
  appRepository: Repository<MiniApp> | undefined | null,
): MiniAppVersionsService | null {
  const manager = (appRepository as any)?.manager;
  if (typeof manager?.getRepository !== 'function') return null;
  return new MiniAppVersionsService(
    manager.getRepository(MiniAppVersion),
    manager.getRepository(MiniAppVersionCapability),
    appRepository as Repository<MiniApp>,
  );
}
