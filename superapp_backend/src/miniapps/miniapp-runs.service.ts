import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  MiniAppScan,
  MiniAppScanScope,
  MiniAppScanStatus,
} from './entities/miniapp-scan.entity';
import { MiniAppBuild } from './entities/miniapp-build.entity';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { createPaginatedResponse } from '../common/utils/pagination.util';

const MAX_LIMIT = 100;

const SCAN_DONE = new Set(['PASSED', 'FAILED', 'CANCELLED', 'ERROR']);
const BUILD_START = new Set(['QUEUED', 'BUILDING', 'RUNNING']);
const BUILD_DONE = new Set([
  'COMPLETED',
  'FAILED',
  'SUCCESS',
  'CANCELLED',
  'ABORTED',
]);

function pageOf(query?: { page?: number; limit?: number }) {
  const page = Math.max(1, Number(query?.page) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query?.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

const upper = (v: unknown) =>
  typeof v === 'string' && v.trim() ? v.trim().toUpperCase() : null;

/** What a scan looks like right now (the app's view of its latest run). */
export interface ScanState {
  status?: string | null;
  stages?: Record<string, any> | null;
  report?: any;
  errors?: any;
  checks?: string[] | null;
  version?: string | null;
}

export interface BuildState {
  status?: string | null;
  stages?: Record<string, any> | null;
  error?: string | null;
  version?: string | null;
  buildType?: 'debug' | 'release' | null;
  jenkinsJobUrl?: string | null;
}

/** The fields an app object carries for its runs (filled by `attach`). */
export interface AppRunFields {
  id: string;
  version?: string | null;
  activeTestVersion?: string | null;
  securityChecks?: string[] | null;
  validationStatus?: string;
  validationStages?: any;
  validationReport?: any;
  validationErrors?: any;
  buildStatus?: string;
  buildStages?: any;
  buildError?: string | null;
  pendingRevision?: Record<string, any> | null;
}

/**
 * Scan and build runs of mini apps (mini_app_scans, mini_app_builds).
 *
 * Writers report the state a run is in; this service decides whether that is
 * a new run or progress of the latest one:
 *   - a new run starts on RUNNING (scan) or QUEUED/BUILDING (build), or when
 *     the latest run already finished and the state differs;
 *   - anything else updates the latest run of that app (and scan scope);
 *   - a scan reset to PENDING is not a run: it cancels one still in progress.
 *
 * `attach` puts the latest runs back on app objects (validationStatus,
 * buildStatus, ...), so API responses keep their shape.
 */
@Injectable()
export class MiniAppRunsService {
  constructor(
    @InjectRepository(MiniAppScan)
    private readonly scans: Repository<MiniAppScan>,
    @InjectRepository(MiniAppBuild)
    private readonly builds: Repository<MiniAppBuild>,
  ) {}

  // --- history -------------------------------------------------------------

  async listScans(
    miniAppId: string,
    query?: { page?: number; limit?: number },
  ): Promise<PaginatedResult<MiniAppScan>> {
    const { page, limit, skip } = pageOf(query);
    const [rows, total] = await this.scans.findAndCount({
      where: { miniAppId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    return createPaginatedResponse(rows, total, page, limit);
  }

  async listBuilds(
    miniAppId: string,
    query?: { page?: number; limit?: number },
  ): Promise<PaginatedResult<MiniAppBuild>> {
    const { page, limit, skip } = pageOf(query);
    const [rows, total] = await this.builds.findAndCount({
      where: { miniAppId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    return createPaginatedResponse(rows, total, page, limit);
  }

  /** Latest scan of a scope (APP: the app itself, REVISION: its pending revision). */
  latestScan(
    miniAppId: string,
    scope: MiniAppScanScope = 'APP',
  ): Promise<MiniAppScan | null> {
    return this.scans.findOne({
      where: { miniAppId, scope },
      order: { createdAt: 'DESC' },
    });
  }

  latestBuild(miniAppId: string): Promise<MiniAppBuild | null> {
    return this.builds.findOne({
      where: { miniAppId },
      order: { createdAt: 'DESC' },
    });
  }

  // --- writes --------------------------------------------------------------

  /** Records the current state of an app's (or its revision's) scan. */
  async recordScan(
    miniAppId: string,
    scope: MiniAppScanScope,
    state: ScanState,
    actorId?: string | null,
  ): Promise<MiniAppScan | null> {
    const status = upper(state.status);
    const latest = await this.latestScan(miniAppId, scope);

    if (!status || status === 'PENDING') {
      if (latest && !SCAN_DONE.has(latest.status)) {
        latest.status = 'CANCELLED';
        latest.completedAt = new Date();
        return this.scans.save(latest);
      }
      return latest;
    }

    const startsRun =
      !latest ||
      (status === 'RUNNING' && latest.status !== 'RUNNING') ||
      (SCAN_DONE.has(latest.status) && status !== latest.status);

    if (startsRun) {
      return this.scans.save(
        this.scans.create({
          miniAppId,
          scope,
          version: state.version ?? null,
          status: status as MiniAppScanStatus,
          stages: state.stages ?? {},
          report: state.report ?? null,
          errors: state.errors ?? null,
          checks: state.checks ?? [],
          actorId: isUuid(actorId) ? actorId : null,
          startedAt: new Date(),
          completedAt: SCAN_DONE.has(status) ? new Date() : null,
        }),
      );
    }

    latest!.status = status as MiniAppScanStatus;
    if (state.stages !== undefined) latest!.stages = state.stages ?? {};
    if (state.report !== undefined) latest!.report = state.report;
    if (state.errors !== undefined) latest!.errors = state.errors;
    if (state.checks) latest!.checks = state.checks;
    if (state.version && !latest!.version) latest!.version = state.version;
    if (isUuid(actorId) && !latest!.actorId) latest!.actorId = actorId;
    latest!.completedAt = SCAN_DONE.has(status)
      ? (latest!.completedAt ?? new Date())
      : null;
    return this.scans.save(latest!);
  }

  /** Records the current state of an app's build. IDLE is never a run. */
  async recordBuild(
    miniAppId: string,
    state: BuildState,
    actorId?: string | null,
  ): Promise<MiniAppBuild | null> {
    const status = upper(state.status);
    const latest = await this.latestBuild(miniAppId);
    if (!status || status === 'IDLE') return latest;

    const startsRun =
      !latest ||
      (BUILD_START.has(status) && !BUILD_START.has(latest.buildStatus)) ||
      (BUILD_DONE.has(latest.buildStatus) && status !== latest.buildStatus);

    if (startsRun) {
      return this.builds.save(
        this.builds.create({
          miniAppId,
          version: state.version ?? undefined,
          buildType: state.buildType ?? null,
          buildStatus: status,
          buildStages: state.stages ?? {},
          buildError: state.error ?? undefined,
          jenkinsJobUrl: state.jenkinsJobUrl ?? undefined,
          actorId: actorId ?? undefined,
          startedAt: new Date(),
          completedAt: BUILD_DONE.has(status) ? new Date() : undefined,
        }),
      );
    }

    latest!.buildStatus = status;
    if (state.stages !== undefined) latest!.buildStages = state.stages ?? {};
    if (state.error !== undefined)
      latest!.buildError = state.error ?? undefined;
    if (state.buildType) latest!.buildType = state.buildType;
    if (state.jenkinsJobUrl) latest!.jenkinsJobUrl = state.jenkinsJobUrl;
    latest!.completedAt = BUILD_DONE.has(status)
      ? (latest!.completedAt ?? new Date())
      : undefined;
    return this.builds.save(latest!);
  }

  /**
   * Records the scan an app object is running, from its working fields
   * (validationStatus, validationStages, ...): the pending revision's scan when
   * the app has one, otherwise the app's own.
   */
  syncScan(app: AppRunFields, actorId?: string | null) {
    const rev =
      app.pendingRevision && typeof app.pendingRevision === 'object'
        ? app.pendingRevision
        : null;
    return this.recordScan(
      app.id,
      rev ? 'REVISION' : 'APP',
      {
        status: app.validationStatus,
        stages: app.validationStages,
        report: app.validationReport,
        errors: app.validationErrors,
        checks: app.securityChecks ?? undefined,
        version: rev ? (rev.version ?? null) : (app.version ?? null),
      },
      actorId,
    );
  }

  /**
   * Puts the scan an app is running (its pending revision's when it has one)
   * on its working fields, for code that continues that scan (stage callbacks,
   * cancel, finalize).
   */
  async loadScanInProgress<T extends AppRunFields>(app: T): Promise<T> {
    const scope =
      app.pendingRevision && typeof app.pendingRevision === 'object'
        ? 'REVISION'
        : 'APP';
    const scan = await this.latestScan(app.id, scope);
    app.validationStatus = scan?.status ?? 'PENDING';
    app.validationStages = scan?.stages ?? {};
    app.validationReport = scan?.report ?? null;
    app.validationErrors = scan?.errors ?? null;
    return app;
  }

  /** A published revision is the app now: its latest scan becomes the app's scan. */
  async promoteRevisionScan(miniAppId: string): Promise<void> {
    const rev = await this.latestScan(miniAppId, 'REVISION');
    if (rev) await this.scans.update({ id: rev.id }, { scope: 'APP' });
  }

  /** Records the scan state an app object carries (APP, or its pending revision). */
  syncScanFromApp(
    app: AppRunFields,
    scope: MiniAppScanScope = 'APP',
    actorId?: string | null,
  ) {
    if (scope === 'REVISION') {
      const rev = app.pendingRevision || {};
      return this.recordScan(
        app.id,
        'REVISION',
        {
          status: rev.validationStatus,
          stages: rev.validationStages,
          report: rev.validationReport,
          errors: rev.validationErrors,
          checks: app.securityChecks ?? undefined,
          version: rev.version ?? null,
        },
        actorId,
      );
    }
    return this.recordScan(
      app.id,
      'APP',
      {
        status: app.validationStatus,
        stages: app.validationStages,
        report: app.validationReport,
        errors: app.validationErrors,
        checks: app.securityChecks ?? undefined,
        version: app.version ?? null,
      },
      actorId,
    );
  }

  /** Records the build state an app object carries. */
  syncBuildFromApp(
    app: AppRunFields,
    extra?: Pick<BuildState, 'buildType' | 'jenkinsJobUrl'>,
    actorId?: string | null,
  ) {
    return this.recordBuild(
      app.id,
      {
        status: app.buildStatus,
        stages: app.buildStages,
        error: app.buildError ?? null,
        version:
          app.pendingRevision?.version ??
          app.activeTestVersion ??
          app.version ??
          null,
        ...extra,
      },
      actorId,
    );
  }

  /** Apps whose latest build is in progress (QUEUED, BUILDING, RUNNING). */
  async appIdsWithBuildInProgress(): Promise<string[]> {
    const rows: Array<{ miniAppId: string }> = await this.builds.query(
      `SELECT t."miniAppId" FROM (
         SELECT DISTINCT ON ("miniAppId") "miniAppId", "buildStatus"
         FROM "mini_app_builds" ORDER BY "miniAppId", "createdAt" DESC
       ) t WHERE t."buildStatus" IN ('QUEUED', 'BUILDING', 'RUNNING')`,
    );
    return rows.map((r) => r.miniAppId);
  }

  /**
   * Sets one pipeline stage on every build in progress, one atomic UPDATE per
   * row (jsonb_set), so concurrent stage callbacks cannot lose each other's
   * stages. `failure` also marks those builds FAILED.
   */
  async setStageOnBuildsInProgress(
    stageId: string,
    stage: Record<string, any>,
    failure?: string | null,
  ): Promise<Array<{ miniAppId: string; buildStages: any }>> {
    const rows = await this.builds.query(
      `UPDATE "mini_app_builds" b SET
         "buildStages" = jsonb_set(COALESCE(b."buildStages", '{}'::jsonb), ARRAY[$1]::text[], CAST($2 AS jsonb), true),
         "buildStatus" = CASE WHEN $3::boolean THEN 'FAILED' ELSE b."buildStatus" END,
         "buildError" = CASE WHEN $3::boolean THEN $4 ELSE b."buildError" END,
         "completedAt" = CASE WHEN $3::boolean THEN now() ELSE b."completedAt" END,
         "updatedAt" = now()
       WHERE b."buildStatus" IN ('QUEUED', 'BUILDING', 'RUNNING')
         AND b."id" = (SELECT x."id" FROM "mini_app_builds" x
                       WHERE x."miniAppId" = b."miniAppId" ORDER BY x."createdAt" DESC LIMIT 1)
       RETURNING b."miniAppId", b."buildStages"`,
      [stageId, JSON.stringify(stage), Boolean(failure), failure ?? null],
    );
    // node-postgres returns [rows, count] for UPDATE ... RETURNING through TypeORM
    const list = Array.isArray(rows?.[0]) ? rows[0] : rows;
    return (list || []) as Array<{ miniAppId: string; buildStages: any }>;
  }

  // --- reads onto app objects ---------------------------------------------

  /**
   * Puts the latest runs on each app: validationStatus/Stages/Report/Errors
   * (APP scan), the same fields inside pendingRevision (REVISION scan) and
   * buildStatus/Stages/Error (latest build). Three queries for any number of apps.
   */
  async attach<T extends AppRunFields>(apps: T | T[] | null | undefined) {
    const list = (Array.isArray(apps) ? apps : apps ? [apps] : []).filter(
      (a): a is T => Boolean(a?.id),
    );
    if (list.length === 0) return apps;
    const ids = [...new Set(list.map((a) => a.id))];

    const [scanRows, buildRows] = await Promise.all([
      this.scans
        .createQueryBuilder('s')
        .distinctOn(['s.miniAppId', 's.scope'])
        .where({ miniAppId: In(ids) })
        .orderBy('s.miniAppId')
        .addOrderBy('s.scope')
        .addOrderBy('s.createdAt', 'DESC')
        .getMany(),
      this.builds
        .createQueryBuilder('b')
        .distinctOn(['b.miniAppId'])
        .where({ miniAppId: In(ids) })
        .orderBy('b.miniAppId')
        .addOrderBy('b.createdAt', 'DESC')
        .getMany(),
    ]);

    const scanOf = new Map(
      scanRows.map((s) => [`${s.miniAppId}:${s.scope}`, s]),
    );
    const buildOf = new Map(buildRows.map((b) => [b.miniAppId, b]));

    for (const app of list) {
      applyRunState(
        app,
        scanOf.get(`${app.id}:APP`),
        scanOf.get(`${app.id}:REVISION`),
        buildOf.get(app.id),
      );
    }
    return apps;
  }
}

/** Puts one app's latest runs on it (exported for tests and callers with rows in hand). */
export function applyRunState(
  app: AppRunFields,
  appScan?: MiniAppScan | null,
  revisionScan?: MiniAppScan | null,
  build?: MiniAppBuild | null,
) {
  app.validationStatus = appScan?.status ?? 'PENDING';
  app.validationStages = appScan?.stages ?? {};
  app.validationReport = appScan?.report ?? null;
  app.validationErrors = appScan?.errors ?? null;

  if (app.pendingRevision && typeof app.pendingRevision === 'object') {
    const rev = app.pendingRevision;
    // A revision scan is the one that ran for this revision (same version)
    if (
      revisionScan &&
      (!rev.version ||
        !revisionScan.version ||
        rev.version === revisionScan.version)
    ) {
      rev.validationStatus = revisionScan.status;
      rev.validationStages = revisionScan.stages ?? {};
      rev.validationReport = revisionScan.report ?? null;
      rev.validationErrors = revisionScan.errors ?? null;
    } else {
      delete rev.validationStatus;
      delete rev.validationStages;
      delete rev.validationReport;
      delete rev.validationErrors;
    }
  }

  app.buildStatus = build?.buildStatus ?? 'IDLE';
  app.buildStages = build?.buildStages ?? {};
  app.buildError = build?.buildError ?? null;
}

function isUuid(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
  );
}
