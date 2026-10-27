import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { EndUser, EndUserStatus } from './entities/end-user.entity';
import { MobileAvatarService } from './mobile-avatar.service';

const HOUR_MS = 60 * 60 * 1000;
export const PURGE_BATCH_SIZE = 100;

/**
 * Hard-deletes accounts whose deletion grace period is over. Refresh tokens and
 * verification tokens go with the row via ON DELETE CASCADE. Safe to run on
 * several instances (idempotent deletes).
 */
@Injectable()
export class AccountPurgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AccountPurgeService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @InjectRepository(EndUser) private readonly users: Repository<EndUser>,
    private readonly avatars: MobileAvatarService,
  ) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.tick(), HOUR_MS);
    this.timer.unref?.();
    void this.tick(); // catch up after downtime
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const n = await this.purgeDue();
      if (n) this.logger.log(`Purged ${n} deleted account(s)`);
    } catch (err) {
      this.logger.error(
        `Account purge failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      this.running = false;
    }
  }

  async purgeDue(now = new Date(), batch = PURGE_BATCH_SIZE): Promise<number> {
    const due = await this.users.find({
      where: {
        status: EndUserStatus.PENDING_DELETION,
        purgeAfter: LessThanOrEqual(now),
      },
      take: batch,
    });
    let purged = 0;
    for (const user of due) {
      // Guarded by status: a user who restored meanwhile is not deleted.
      const res = await this.users.delete({
        id: user.id,
        status: EndUserStatus.PENDING_DELETION,
      });
      if (!res.affected) continue;
      purged += res.affected;
      if (user.avatarKey) await this.avatars.deleteObject(user.avatarKey);
    }
    return purged;
  }
}
