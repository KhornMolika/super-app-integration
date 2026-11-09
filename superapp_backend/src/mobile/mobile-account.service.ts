import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailService } from '../notifications/channels/mail.service';
import {
  Identity,
  IdentityStatus,
} from '../identities/entities/identity.entity';
import { ConsumerProfile } from '../consumers/entities/consumer-profile.entity';
import {
  intEnv,
  MobileAuthService,
  TokenResponse,
} from './mobile-auth.service';
import { PasswordService } from './password.service';

export const CURRENT_PASSWORD_INCORRECT = 'Current password is incorrect';
export const PASSWORD_INCORRECT = 'Password is incorrect';

const DAY_MS = 24 * 60 * 60 * 1000;

export function deletionGraceMs(): number {
  return intEnv('MOBILE_ACCOUNT_DELETION_GRACE_DAYS', 30, 1, 365) * DAY_MS;
}

/** Self-service account actions that need the user to prove it is them again. */
@Injectable()
export class MobileAccountService {
  private readonly logger = new Logger(MobileAccountService.name);

  constructor(
    @InjectRepository(Identity) private readonly users: Repository<Identity>,
    private readonly passwords: PasswordService,
    private readonly auth: MobileAuthService,
    private readonly mail: MailService,
    @Optional()
    @InjectRepository(ConsumerProfile)
    private readonly consumerProfiles?: Repository<ConsumerProfile>,
  ) {}

  private async loadUser(userId: string): Promise<Identity> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    return user;
  }

  private async verifyPassword(
    user: Identity,
    password: string,
    wrongPasswordMessage: string,
  ): Promise<void> {
    if (!(await this.passwords.verify(password, user.passwordHash))) {
      throw new BadRequestException(wrongPasswordMessage);
    }
  }

  async changePassword(
    userId: string,
    input: { currentPassword: string; newPassword: string },
    userAgent?: string,
  ): Promise<TokenResponse> {
    const user = await this.loadUser(userId);
    await this.verifyPassword(
      user,
      input.currentPassword,
      CURRENT_PASSWORD_INCORRECT,
    );
    const violation = this.passwords.validatePolicy(
      input.newPassword,
      user.email,
    );
    if (violation) throw new BadRequestException(violation);
    // The current password was just verified, so comparing the NFKC forms (what
    // scrypt hashes) detects reuse without a second scrypt.
    if (
      input.newPassword.normalize('NFKC') ===
      input.currentPassword.normalize('NFKC')
    ) {
      throw new BadRequestException(
        'Choose a password you are not already using',
      );
    }
    const passwordHash = await this.passwords.hash(input.newPassword);
    // Sign out everywhere before the new hash is stored: if a step fails, sessions
    // are gone and the old password still works, never the reverse.
    await this.auth.revokeAllSessions(user.id);
    await this.users.update({ id: user.id }, { passwordHash });
    user.passwordHash = passwordHash;
    return this.auth.startSession(user, userAgent);
  }

  async requestDeletion(
    userId: string,
    input: { password: string },
  ): Promise<{ purgeAfter: string }> {
    const user = await this.loadUser(userId);
    await this.verifyPassword(user, input.password, PASSWORD_INCORRECT);
    const now = new Date(Date.now());
    const purgeAfter = new Date(now.getTime() + deletionGraceMs());
    // Only an ACTIVE account can be scheduled: one disabled meanwhile stays DISABLED.
    const res = await this.users.update(
      { id: user.id, status: IdentityStatus.ACTIVE },
      {
        status: IdentityStatus.PENDING_DELETION,
        deletionRequestedAt: now,
        purgeAfter,
      } as any,
    );
    if (!res.affected) throw new UnauthorizedException();

    // Also update consumerProfile deletionRequestedAt and purgeAfter
    try {
      if (this.consumerProfiles) {
        const cpRepo = this.consumerProfiles;
        let cp = await cpRepo.findOne({
          where: { identityId: user.id },
        });
        if (cp) {
          await cpRepo.update(
            { identityId: user.id },
            { deletionRequestedAt: now, purgeAfter },
          );
        } else {
          cp = cpRepo.create({
            identityId: user.id,
            identity: user,
            deletionRequestedAt: now,
            purgeAfter,
          });
          await cpRepo.save(cp);
        }
      }
    } catch {
      // Safe fallback
    }

    await this.auth.revokeAllSessions(user.id, now);
    // Fire and forget: the notice must not delay or fail the request.
    void this.mail
      .sendAccountDeletionScheduled(user.email, user.name, purgeAfter)
      .catch(() =>
        this.logger.error(
          'Account deletion notice dispatch failed unexpectedly',
        ),
      );
    return { purgeAfter: purgeAfter.toISOString() };
  }
}
