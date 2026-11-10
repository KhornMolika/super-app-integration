import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MiniApp,
  MiniAppAvailabilityStatus,
  MiniAppLifecycleStatus,
} from '../entities/miniapp.entity';
import { NotificationsService } from '../../notifications';

/** Who is acting, taken from the signed-in user's token. */
export interface RetirementActor {
  id: string;
  name?: string;
  roles: string[];
}

export type LogActivityFn = (
  miniAppId: string,
  actorId: string,
  actionType: string,
  title: string,
  description: string,
  auditAction: string,
  oldVal?: any,
  newVal?: any,
) => Promise<void>;

/** Statuses an app can be suspended from: in testing or live. */
const SUSPENDABLE_LIFECYCLE = ['TESTING', 'APPROVED', 'ACTIVE'];
/** Never built or turned down: delete these instead of archiving. */
const DELETE_INSTEAD = ['DRAFT', 'REJECTED'];

function requireReason(reason: unknown, action: string): string {
  const text = typeof reason === 'string' ? reason.trim() : '';
  if (text.length < 5) {
    throw new BadRequestException(
      `Please give a reason (at least 5 characters) to ${action} this mini app.`,
    );
  }
  return text.slice(0, 1000);
}

/**
 * Suspend, resume, archive and restore.
 *
 * - Suspend (ADMIN or SUPER_ADMIN): takes the app off phones at once and can be
 *   undone with Resume. An ADMIN can also ask a SUPER_ADMIN to archive it.
 * - Archive (SUPER_ADMIN only): ends the app for good. The row and its App ID
 *   stay, as a record. Restore brings it back as a DRAFT.
 */
@Injectable()
export class MiniappRetirementHelper {
  private readonly logger = new Logger(MiniappRetirementHelper.name);

  constructor(
    @InjectRepository(MiniApp)
    private readonly miniappRepository: Repository<MiniApp>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private static isSuperAdmin(actor: RetirementActor) {
    return actor.roles.includes('SUPER_ADMIN');
  }

  private static requireSuperAdmin(actor: RetirementActor, action: string) {
    if (!MiniappRetirementHelper.isSuperAdmin(actor)) {
      throw new ForbiddenException(`Only a Super Admin can ${action} a mini app.`);
    }
  }

  private static label(app: MiniApp) {
    return app.name || app.appId || 'MiniApp';
  }

  private async notifyOwner(app: MiniApp, title: string, message: string, type: string) {
    if (!app.ownerId) return;
    try {
      await this.notificationsService.createNotification(app.ownerId, title, message, type, app.id);
    } catch (err) {
      this.logger.warn(`Could not notify owner of ${app.id}: ${(err as Error).message}`);
    }
  }

  private async askSuperAdmins(app: MiniApp, actor: RetirementActor, reason: string) {
    app.archiveRequest = {
      reason,
      requestedById: actor.id,
      requestedByName: actor.name,
      requestedAt: new Date().toISOString(),
    };
    try {
      await this.notificationsService.notifyAdmins(
        'Archive requested',
        `${actor.name || 'An admin'} asks to archive "${MiniappRetirementHelper.label(app)}": ${reason}`,
        'MINIAPP_ARCHIVE_REQUESTED',
        app.id,
        { reason, requestedById: actor.id },
        { roles: ['SUPER_ADMIN'] },
      );
    } catch (err) {
      this.logger.warn(`Could not notify Super Admins: ${(err as Error).message}`);
    }
  }

  async suspend(
    app: MiniApp,
    actor: RetirementActor,
    body: { reason?: string; requestArchive?: boolean },
    log: LogActivityFn,
  ) {
    const reason = requireReason(body?.reason, 'suspend');
    const lifecycle = (app.lifecycleStatus || '').toUpperCase();
    if (app.availabilityStatus === MiniAppAvailabilityStatus.SUSPENDED) {
      throw new BadRequestException('This mini app is already suspended.');
    }
    const suspendable =
      SUSPENDABLE_LIFECYCLE.includes(lifecycle) ||
      app.availabilityStatus === MiniAppAvailabilityStatus.PRODUCTION;
    if (!suspendable) {
      throw new BadRequestException(
        `Only mini apps in testing or live can be suspended (this one is ${lifecycle}).`,
      );
    }

    const before = { availabilityStatus: app.availabilityStatus };
    app.suspension = {
      reason,
      suspendedById: actor.id,
      suspendedByName: actor.name,
      suspendedAt: new Date().toISOString(),
      previousAvailability: app.availabilityStatus,
    };
    app.availabilityStatus = MiniAppAvailabilityStatus.SUSPENDED;
    if (body?.requestArchive && !MiniappRetirementHelper.isSuperAdmin(actor)) {
      await this.askSuperAdmins(app, actor, reason);
    }
    await this.miniappRepository.save(app);

    await this.notifyOwner(
      app,
      'MiniApp suspended',
      `"${MiniappRetirementHelper.label(app)}" was suspended and is hidden from users: ${reason}`,
      'MINIAPP_SUSPENDED',
    );
    await log(
      app.id,
      actor.id,
      'STATUS_CHANGE',
      'MiniApp Suspended',
      `Suspended: ${reason}${app.archiveRequest ? ' (archive requested)' : ''}`,
      'SUSPEND_MINI_APP',
      before,
      { availabilityStatus: app.availabilityStatus, suspension: app.suspension },
    );
    return app;
  }

  async resume(app: MiniApp, actor: RetirementActor, log: LogActivityFn) {
    if (app.lifecycleStatus === MiniAppLifecycleStatus.ARCHIVED) {
      throw new BadRequestException('This mini app is archived. A Super Admin must restore it.');
    }
    if (app.availabilityStatus !== MiniAppAvailabilityStatus.SUSPENDED) {
      throw new BadRequestException('This mini app is not suspended.');
    }
    const previous = app.suspension?.previousAvailability;
    app.availabilityStatus =
      previous === MiniAppAvailabilityStatus.PRODUCTION
        ? MiniAppAvailabilityStatus.PRODUCTION
        : MiniAppAvailabilityStatus.TESTING;
    app.suspension = null;
    app.archiveRequest = null;
    await this.miniappRepository.save(app);

    await this.notifyOwner(
      app,
      'MiniApp resumed',
      `"${MiniappRetirementHelper.label(app)}" is available again.`,
      'MINIAPP_RESUMED',
    );
    await log(
      app.id,
      actor.id,
      'STATUS_CHANGE',
      'MiniApp Resumed',
      `Suspension lifted; availability back to ${app.availabilityStatus}`,
      'RESUME_MINI_APP',
      null,
      { availabilityStatus: app.availabilityStatus },
    );
    return app;
  }

  async requestArchive(
    app: MiniApp,
    actor: RetirementActor,
    reasonInput: string | undefined,
    log: LogActivityFn,
  ) {
    const reason = requireReason(reasonInput, 'request archiving');
    if (app.lifecycleStatus === MiniAppLifecycleStatus.ARCHIVED) {
      throw new BadRequestException('This mini app is already archived.');
    }
    if (DELETE_INSTEAD.includes(app.lifecycleStatus || '')) {
      throw new BadRequestException('Draft and rejected mini apps can be deleted instead.');
    }
    if (app.archiveRequest) {
      throw new BadRequestException('Archiving was already requested for this mini app.');
    }
    await this.askSuperAdmins(app, actor, reason);
    await this.miniappRepository.save(app);
    await log(
      app.id,
      actor.id,
      'STATUS_CHANGE',
      'Archive Requested',
      `Asked a Super Admin to archive: ${reason}`,
      'REQUEST_ARCHIVE_MINI_APP',
      null,
      { archiveRequest: app.archiveRequest },
    );
    return app;
  }

  async archive(
    app: MiniApp,
    actor: RetirementActor,
    reasonInput: string | undefined,
    log: LogActivityFn,
  ) {
    MiniappRetirementHelper.requireSuperAdmin(actor, 'archive');
    const lifecycle = app.lifecycleStatus || '';
    if (lifecycle === MiniAppLifecycleStatus.ARCHIVED) {
      throw new BadRequestException('This mini app is already archived.');
    }
    if (DELETE_INSTEAD.includes(lifecycle)) {
      throw new BadRequestException(
        `A ${lifecycle} mini app was never released; delete it instead.`,
      );
    }
    // No reason given when approving a request: use the requester's reason
    const reason = requireReason(reasonInput?.trim() || app.archiveRequest?.reason, 'archive');
    const request = app.archiveRequest;
    const before = { lifecycleStatus: lifecycle, availabilityStatus: app.availabilityStatus };
    const now = new Date().toISOString();

    app.suspension = {
      ...(app.suspension ?? {
        suspendedById: actor.id,
        suspendedByName: actor.name,
        suspendedAt: now,
        previousAvailability: app.availabilityStatus,
      }),
      reason,
      archivedAt: now,
    };
    app.lifecycleStatus = MiniAppLifecycleStatus.ARCHIVED;
    app.availabilityStatus = MiniAppAvailabilityStatus.SUSPENDED;
    app.archiveRequest = null;
    await this.miniappRepository.save(app);

    const label = MiniappRetirementHelper.label(app);
    await this.notifyOwner(app, 'MiniApp archived', `"${label}" was archived: ${reason}`, 'MINIAPP_ARCHIVED');
    if (request?.requestedById && request.requestedById !== app.ownerId) {
      try {
        await this.notificationsService.createNotification(
          request.requestedById,
          'Archive approved',
          `"${label}" was archived as you requested.`,
          'MINIAPP_ARCHIVED',
          app.id,
        );
      } catch {
        // the archive itself succeeded
      }
    }
    await log(
      app.id,
      actor.id,
      'STATUS_CHANGE',
      'MiniApp Archived',
      `Archived: ${reason}`,
      'ARCHIVE_MINI_APP',
      before,
      { lifecycleStatus: app.lifecycleStatus, availabilityStatus: app.availabilityStatus },
    );
    return app;
  }

  async declineArchive(
    app: MiniApp,
    actor: RetirementActor,
    note: string | undefined,
    log: LogActivityFn,
  ) {
    MiniappRetirementHelper.requireSuperAdmin(actor, 'decline archiving');
    const request = app.archiveRequest;
    if (!request) {
      throw new BadRequestException('Nobody asked to archive this mini app.');
    }
    app.archiveRequest = null;
    await this.miniappRepository.save(app);

    if (request.requestedById) {
      try {
        await this.notificationsService.createNotification(
          request.requestedById,
          'Archive declined',
          `Archiving "${MiniappRetirementHelper.label(app)}" was declined${note ? `: ${note}` : '.'}`,
          'MINIAPP_ARCHIVE_DECLINED',
          app.id,
        );
      } catch {
        // decline still stands
      }
    }
    await log(
      app.id,
      actor.id,
      'STATUS_CHANGE',
      'Archive Declined',
      note ? `Archive request declined: ${note}` : 'Archive request declined',
      'DECLINE_ARCHIVE_MINI_APP',
      { archiveRequest: request },
      null,
    );
    return app;
  }

  async restore(app: MiniApp, actor: RetirementActor, log: LogActivityFn) {
    MiniappRetirementHelper.requireSuperAdmin(actor, 'restore');
    if (app.lifecycleStatus !== MiniAppLifecycleStatus.ARCHIVED) {
      throw new BadRequestException('Only archived mini apps can be restored.');
    }
    app.lifecycleStatus = MiniAppLifecycleStatus.DRAFT;
    app.availabilityStatus = MiniAppAvailabilityStatus.TESTING;
    app.suspension = null;
    app.archiveRequest = null;
    await this.miniappRepository.save(app);

    await this.notifyOwner(
      app,
      'MiniApp restored',
      `"${MiniappRetirementHelper.label(app)}" was restored as a draft. Submit it again for review.`,
      'MINIAPP_RESTORED',
    );
    await log(
      app.id,
      actor.id,
      'STATUS_CHANGE',
      'MiniApp Restored',
      'Restored from the archive as a DRAFT',
      'RESTORE_MINI_APP',
      { lifecycleStatus: MiniAppLifecycleStatus.ARCHIVED },
      { lifecycleStatus: app.lifecycleStatus },
    );
    return app;
  }
}
