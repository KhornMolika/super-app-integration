import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniApp } from '../entities/miniapp.entity';
import { MiniAppCollaborator } from '../entities/miniapp-collaborator.entity';
import {
  AccessSubject,
  MiniAppAccess,
  isSuperAdmin,
  resolveMiniAppAccess,
  subjectId,
} from './miniapp-access.policy';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DENIED_MESSAGE: Record<number, string> = {
  [MiniAppAccess.VIEW]: 'You do not have access to this MiniApp.',
  [MiniAppAccess.EDIT]: 'You do not have permission to edit this MiniApp.',
  [MiniAppAccess.MAINTAIN]:
    'Only the owner, a MAINTAINER collaborator or an organization admin can do this.',
  [MiniAppAccess.OWN]:
    'Only the owner of this MiniApp or an organization admin can do this.',
  [MiniAppAccess.ADMIN]:
    "Only an admin of this MiniApp's organization or a Super Admin can do this.",
};

@Injectable()
export class MiniAppAccessService {
  constructor(
    @InjectRepository(MiniApp)
    private readonly miniappRepository: Repository<MiniApp>,
    @InjectRepository(MiniAppCollaborator)
    private readonly collaboratorRepository: Repository<MiniAppCollaborator>,
  ) {}

  /** The caller's access level on an app already loaded. */
  async levelFor(
    user: AccessSubject | undefined,
    app: MiniApp,
  ): Promise<MiniAppAccess> {
    let collaboratorRole: string | null = null;
    const me = subjectId(user);
    if (me && !isSuperAdmin(user) && app.ownerId !== me) {
      const row = await this.collaboratorRepository.findOne({
        where: { miniAppId: app.id, userId: me },
      });
      collaboratorRole = row?.role ?? null;
    }
    return resolveMiniAppAccess(user, app, collaboratorRole);
  }

  /**
   * Loads the app by id and throws unless the caller holds at least `required`.
   * Apps the caller cannot VIEW answer 404, so ids of other organizations' apps
   * are not confirmed to exist.
   */
  async assert(
    id: string,
    user: AccessSubject | undefined,
    required: MiniAppAccess,
  ): Promise<{ app: MiniApp; level: MiniAppAccess }> {
    // Accepts the row UUID or the public appId (some routes take either)
    const where = UUID_PATTERN.test(id) ? { id } : { appId: id };
    const app = await this.miniappRepository.findOne({ where });
    if (!app) throw new NotFoundException('MiniApp not found');
    const level = await this.levelFor(user, app);
    this.check(level, required);
    return { app, level };
  }

  /** Throws unless `level` satisfies `required`. */
  check(level: MiniAppAccess, required: MiniAppAccess): void {
    if (level >= required) return;
    if (level === MiniAppAccess.NONE) {
      throw new NotFoundException('MiniApp not found');
    }
    throw new ForbiddenException(
      DENIED_MESSAGE[required] ?? DENIED_MESSAGE[MiniAppAccess.VIEW],
    );
  }
}
