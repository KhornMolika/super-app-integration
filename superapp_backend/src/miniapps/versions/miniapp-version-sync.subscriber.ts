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
import { MiniApp } from '../entities/miniapp.entity';
import { MiniAppVersionsService } from './miniapp-versions.service';

/** Saving any of these can change the version rows or their capabilities. */
const WATCHED = new Set([
  'lifecycleStatus',
  'currentReleaseVersion',
  'integrationMethod',
  'integrationConfig',
  'homeWidget',
]);

/**
 * Keeps version rows in step with every save of a mini app, whichever code
 * path saved it. The sync runs after the transaction commits, on a fresh read
 * of the app: a partial save never looks like "no capabilities", and a sync
 * failure is logged without touching the committed save.
 */
@Injectable()
export class MiniAppVersionSyncSubscriber implements EntitySubscriberInterface<MiniApp> {
  private readonly pending = new WeakMap<QueryRunner, Set<string>>();

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
    return this.track(event.queryRunner, event.entity?.id);
  }

  afterUpdate(event: UpdateEvent<MiniApp>) {
    const id = (event.entity as MiniApp | undefined)?.id ?? (event.databaseEntity as MiniApp | undefined)?.id;
    const touched = event.updatedColumns.some((c) => WATCHED.has(c.propertyName));
    if (touched) return this.track(event.queryRunner, id);
  }

  afterTransactionCommit(event: TransactionCommitEvent) {
    // A nested commit only releases a savepoint: wait for the outer one.
    if (event.queryRunner.isTransactionActive) return;
    return this.flush(event.queryRunner);
  }

  afterTransactionRollback(event: TransactionRollbackEvent) {
    if (!event.queryRunner.isTransactionActive) this.pending.delete(event.queryRunner);
  }

  private async track(qr: QueryRunner, id?: string) {
    if (!id) return;
    if (!qr?.isTransactionActive) {
      await this.syncById(id);
      return;
    }
    const set = this.pending.get(qr) ?? new Set<string>();
    set.add(id);
    this.pending.set(qr, set);
  }

  private async flush(qr: QueryRunner) {
    const ids = this.pending.get(qr);
    if (!ids) return;
    this.pending.delete(qr);
    for (const id of ids) await this.syncById(id);
  }

  private async syncById(id: string) {
    await this.versions.resyncApp(id);
  }
}
