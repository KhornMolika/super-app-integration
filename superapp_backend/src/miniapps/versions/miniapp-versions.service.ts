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
 * MiniAppVersionSyncSubscriber). Approving, publishing and rolling back are
 * explicit calls from the lifecycle.
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
        changelog,
        ...(status === MiniAppVersionStatus.ACTIVE ? { releasedAt: new Date() } : {}),
      }),
    );
  }

  /**
   * Brings the version rows and their capabilities in line with the app.
   * skipLive: leave the live row alone (publishing copies the revision onto
   * the in-memory app before the live row is retired).
   */
  async syncFromApp(app: VersionSyncSource, opts: { skipLive?: boolean } = {}): Promise<void> {
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
        const patch: Partial<MiniAppVersion> = {};
        if (status && work.status !== status) {
          patch.status = status;
          if (status === MiniAppVersionStatus.ACTIVE) patch.releasedAt = new Date();
        }
        if (work.version !== version) patch.version = version;
        if (Object.keys(patch).length) await this.versions.update({ id: work.id }, patch);
      }
      await this.setCapabilities(app.id, work.id, app.capabilities);
      return;
    }

    if (!opts.skipLive) await this.setCapabilities(app.id, live.id, app.capabilities);

    const draft = rows.find((r) => r.status === MiniAppVersionStatus.DRAFT);
    if (app.pendingRevision) {
      const rev = app.pendingRevision;
      const version = revisionVersionOf(app);
      let row = draft;
      if (!row) row = await this.newRow(app, version, MiniAppVersionStatus.DRAFT, rev.changelog);
      await this.versions.update({ id: row.id }, {
        version,
        ...(rev.changelog ? { changelog: rev.changelog } : {}),
        revision: rev,
        reviewStatus: typeof rev.revisionStatus === 'string' ? rev.revisionStatus.slice(0, 30) : null,
        submittedAt: toDate(rev.submittedAt),
      });
      await this.setCapabilities(app.id, row.id, rev.capabilities ?? rev.permissions ?? app.capabilities);
    } else if (draft && app.pendingRevision === null) {
      // Revision discarded (a published one was turned ACTIVE first)
      await this.caps.delete({ versionId: draft.id });
      await this.versions.delete({ id: draft.id });
    }
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
    await this.syncFromApp(app, { skipLive: true });
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
      capabilities: caps.length ? caps.map((c) => c.declaration) : (row.permissions ?? []),
    };
  }

  /** Makes an earlier release live again; the current live row becomes PREVIOUS. */
  async rollbackTo(miniAppId: string, versionId: string): Promise<void> {
    await this.versions.update(
      { miniAppId, status: MiniAppVersionStatus.ACTIVE, id: Not(versionId) },
      { status: MiniAppVersionStatus.PREVIOUS },
    );
    await this.versions.update({ id: versionId }, { status: MiniAppVersionStatus.ACTIVE });
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
   * the declarations as written. An app with no such row is left out, so the
   * caller can fall back to mini_apps.capabilities.
   */
  async servingCapabilities(miniAppIds: string[]): Promise<Map<string, unknown[]>> {
    const ids = [...new Set(miniAppIds.filter((id) => UUID.test(id)))];
    const out = new Map<string, unknown[]>();
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
      out.set(
        miniAppId,
        caps.filter((c) => c.versionId === row.id).map((c) => c.declaration),
      );
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
          'm.capabilities',
          'm.pendingRevision',
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
