import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  EntitySubscriberInterface,
  InsertEvent,
  QueryRunner,
  TransactionCommitEvent,
  TransactionRollbackEvent,
  UpdateEvent,
} from 'typeorm';
import { MiniApp, writtenLifecycle } from '../entities/miniapp.entity';
import { MiniAppVersionsService } from './miniapp-versions.service';

/** Saving any of these can change the version rows. */
const WATCHED = new Set(['appStatus', 'integrationMethod']);

/**
 * Keeps version rows in step with every save of a mini app, whichever code
 * path saved it. The sync runs after the transaction commits, on a fresh read
 * of the app: a partial save never looks like "no capabilities", and a sync
 * failure is logged without touching the committed save.
 */
@Injectable()
export class MiniAppVersionSyncSubscriber implements EntitySubscriberInterface<MiniApp> {
  private readonly pending = new WeakMap<QueryRunner, Map<string, MiniApp | null>>();

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly versions: MiniAppVersionsService,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return MiniApp;
  }

  afterInsert(event: InsertEvent<MiniApp>) {
    return this.track(event.queryRunner, event.entity?.id, this.statusWriter(event.entity));
  }

  afterUpdate(event: UpdateEvent<MiniApp>) {
    const id = (event.entity as MiniApp | undefined)?.id ?? (event.databaseEntity as MiniApp | undefined)?.id;
    const writer = this.statusWriter(event.entity);
    const touched = event.updatedColumns.some((c) => WATCHED.has(c.propertyName));
    if (writer || touched) return this.track(event.queryRunner, id, writer);
  }

  /**
   * The saved app itself when code wrote a status on it: the stage of the
   * version being worked on is not a mini_apps column, so the rows are
   * synced from that app (not from a fresh read).
   */
  private statusWriter(entity: unknown): MiniApp | null {
    return entity instanceof MiniApp && writtenLifecycle(entity) !== undefined ? entity : null;
  }

  afterTransactionCommit(event: TransactionCommitEvent) {
    // A nested commit only releases a savepoint: wait for the outer one.
    if (event.queryRunner.isTransactionActive) return;
    return this.flush(event.queryRunner);
  }

  afterTransactionRollback(event: TransactionRollbackEvent) {
    if (!event.queryRunner.isTransactionActive) this.pending.delete(event.queryRunner);
  }

  private async track(qr: QueryRunner, id?: string, writer: MiniApp | null = null) {
    if (!id) return;
    if (!qr?.isTransactionActive) {
      await this.sync(id, writer);
      return;
    }
    const map = this.pending.get(qr) ?? new Map<string, MiniApp | null>();
    map.set(id, writer ?? map.get(id) ?? null);
    this.pending.set(qr, map);
  }

  private async flush(qr: QueryRunner) {
    const apps = this.pending.get(qr);
    if (!apps) return;
    this.pending.delete(qr);
    for (const [id, writer] of apps) await this.sync(id, writer);
  }

  private async sync(id: string, writer: MiniApp | null) {
    if (writer) await this.versions.syncQuietly(writer);
    else await this.versions.resyncApp(id);
  }
}
