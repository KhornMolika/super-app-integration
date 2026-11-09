import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Identity,
  IdentityHonorific,
  IdentityStatus,
} from '../identities/entities/identity.entity';
import { StaffProfile } from '../staff/entities/staff-profile.entity';
import { PasswordService } from './password.service';

/** Override with MOBILE_DEMO_USER_EMAIL / MOBILE_DEMO_USER_PASSWORD (see .env.example). */
export const DEFAULT_DEMO_USER_EMAIL = 'demo@example.com';
export const DEFAULT_DEMO_USER_PASSWORD = 'DemoUser@2026';

/**
 * Development only: makes sure a verified mobile demo account exists so the app
 * can be signed into without registering. It is created when missing and an
 * existing row is never touched, so password and profile changes made in the
 * app survive restarts (delete the row to start over).
 */
@Injectable()
export class DemoUserSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(DemoUserSeeder.name);

  constructor(
    @InjectRepository(Identity) private readonly users: Repository<Identity>,
    private readonly passwords: PasswordService,
    @Optional()
    @InjectRepository(StaffProfile)
    private readonly staffProfiles?: Repository<StaffProfile>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.seed();
    } catch (err) {
      // A convenience must never stop the backend from starting.
      this.logger.warn(
        `Mobile demo user not seeded: ${(err as Error).message}`,
      );
    }
  }

  /** Returns true when it created the account. */
  async seed(env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
    if (env.NODE_ENV !== 'development') return false;
    const email = (env.MOBILE_DEMO_USER_EMAIL || DEFAULT_DEMO_USER_EMAIL)
      .trim()
      .toLowerCase();
    if (await this.users.findOne({ where: { email } })) return false;

    const password =
      env.MOBILE_DEMO_USER_PASSWORD || DEFAULT_DEMO_USER_PASSWORD;
    const violation = this.passwords.validatePolicy(password, email);
    if (violation) throw new Error(`MOBILE_DEMO_USER_PASSWORD: ${violation}`);

    const user = this.users.create({
      email,
      name: 'Sok Dara',
      passwordHash: await this.passwords.hash(password),
      emailVerifiedAt: new Date(),
      status: IdentityStatus.ACTIVE,
      honorific: IdentityHonorific.MR,
      position: 'Officer',
      organizationUnit: 'Non-Bank Financial Services Authority',
      staffId: 'FSA-0001',
    } as any);
    try {
      const savedUser: Identity = (await this.users.save(user)) as any;
      if (this.staffProfiles) {
        try {
          const staffProfile = this.staffProfiles.create({
            identityId: savedUser.id,
            identity: savedUser,
            position: 'Officer',
            staffId: 'FSA-0001',
            status: 'ACTIVE',
          });
          await this.staffProfiles.save(staffProfile);
        } catch {
          // Safe fallback
        }
      }
    } catch (err) {
      // Another instance seeded it first.
      if ((err as { code?: string }).code === '23505') return false;
      throw err;
    }
    this.logger.log(`Seeded mobile demo user ${email}`);
    return true;
  }
}
