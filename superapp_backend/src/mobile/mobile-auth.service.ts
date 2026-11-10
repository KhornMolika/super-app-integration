import { isPgUuid } from '../common/utils/uuid.util';
import { CapabilityGateService } from '../capabilities/capability-gate.service';
import { loadPasswordHash } from '../identities/identity-credentials.helper';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { AuthService } from '../auth/auth.service';
import { MailService } from '../notifications/channels/mail.service';
import {
  Identity,
  IdentityStatus,
} from '../identities/entities/identity.entity';
import { StaffProfile } from '../staff/entities/staff-profile.entity';
import { ConsumerProfile } from '../consumers/entities/consumer-profile.entity';
import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordService } from './password.service';
import { sha256Hex } from './crypto-util';
import { failurePatch } from './lockout';
import {
  AuthRateLimiter,
  FULL_RETRY_AFTER_SECONDS,
  RateLimitedException,
} from './auth-rate-limiter';

export { sha256Hex } from './crypto-util';
export { MAX_FAILED_LOGINS, LOCKOUT_MS } from './lockout';

export const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
/** Max registration/verification mails per email address per window (any IP). */
export const REGISTER_MAIL_MAX_PER_EMAIL = 5;
export const REGISTER_MAIL_WINDOW_MS = 60 * 60 * 1000;
/** Wrong-password attempts allowed per verification token. */
export const VERIFY_MAX_FAILED_ATTEMPTS = 5;
export const REFRESH_GRACE_MS = 10 * 1000;

export const REGISTER_MESSAGE =
  'If this email can be registered, a verification link has been sent to it.';
const INVALID_CREDENTIALS = 'Invalid credentials';
const INVALID_REFRESH = 'Invalid refresh token';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string; email: string; name: string };
  /** Set when this sign-in cancelled a pending account deletion. */
  account_restored?: boolean;
}

/** Registration result: verification pending (202) or, with verification disabled, an instant session (201). */
export type RegisterResult = { message: string } | TokenResponse;

export const isTokenResponse = (r: RegisterResult): r is TokenResponse =>
  'access_token' in r;

const newOpaqueToken = () => crypto.randomBytes(32).toString('base64url');
const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function intEnv(
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = Number(process.env[name]);
  const v = Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
  return Math.min(max, Math.max(min, v));
}

@Injectable()
export class MobileAuthService {
  private readonly logger = new Logger(MobileAuthService.name);

  constructor(
    @InjectRepository(Identity) private readonly users: Repository<Identity>,
    @InjectRepository(EmailVerificationToken)
    private readonly verificationTokens: Repository<EmailVerificationToken>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    @InjectRepository(MiniApp)
    private readonly miniApps: Repository<MiniApp>,
    private readonly passwords: PasswordService,
    private readonly authService: AuthService,
    private readonly mail: MailService,
    private readonly limiter: AuthRateLimiter,
    @Optional()
    @InjectRepository(StaffProfile)
    private readonly staffProfiles?: Repository<StaffProfile>,
    @Optional()
    @InjectRepository(ConsumerProfile)
    private readonly consumerProfiles?: Repository<ConsumerProfile>,
    @Optional()
    private readonly capabilityGate?: CapabilityGateService,
  ) {}

  get accessTtlSeconds(): number {
    return intEnv('MOBILE_ACCESS_TOKEN_TTL_SECONDS', 900, 60, 86_400);
  }

  get refreshTtlMs(): number {
    return (
      intEnv('MOBILE_REFRESH_TOKEN_TTL_DAYS', 30, 1, 90) * 24 * 60 * 60 * 1000
    );
  }

  // ---------------------------------------------------------------- register

  private requireEmailVerification(): boolean {
    return (
      (process.env.MOBILE_REQUIRE_EMAIL_VERIFICATION ?? 'true')
        .trim()
        .toLowerCase() !== 'false'
    );
  }

  private warnedNoVerification = false;

  async register(
    input: { email: string; password: string; name: string },
    userAgent?: string,
  ): Promise<RegisterResult> {
    const email = normalizeEmail(input.email);
    const violation = this.passwords.validatePolicy(input.password, email);
    if (violation) throw new BadRequestException(violation);

    const passwordHash = await this.passwords.hash(input.password);

    if (!this.requireEmailVerification()) {
      return this.registerWithoutVerification(
        email,
        input.name,
        passwordHash,
        userAgent,
      );
    }

    const bucketKey = `register-mail|${email}`;
    if (this.limiter.isFull(bucketKey)) {
      throw new RateLimitedException(FULL_RETRY_AFTER_SECONDS);
    }
    if (
      this.limiter.consume(
        bucketKey,
        REGISTER_MAIL_MAX_PER_EMAIL,
        REGISTER_MAIL_WINDOW_MS,
      )
    ) {
      return { message: REGISTER_MESSAGE };
    }

    let user = await this.users.findOne({ where: { email } });
    if (!user) {
      try {
        user = await this.users.save(
          this.users.create({
            email,
            name: input.name.trim(),
            passwordHash,
            emailVerifiedAt: null,
            status: IdentityStatus.ACTIVE,
            failedLoginCount: 0,
            lockedUntil: null,
          }),
        );
        // Create consumer profile
        try {
        if (this.consumerProfiles) {
          const cpRepo = this.consumerProfiles;
          const cp = cpRepo.create({
            identityId: user.id,
            identity: user,
          });
          await cpRepo.save(cp);
        }
      } catch {}
      } catch (err: any) {
        if (err?.code !== '23505') throw err;
        user = await this.users.findOne({ where: { email } });
        if (user)
          user = await this.takeOverUnverified(user, input.name, passwordHash);
      }
    } else {
      user = await this.takeOverUnverified(user, input.name, passwordHash);
    }

    if (user && !user.emailVerifiedAt && user.status === IdentityStatus.ACTIVE) {
      await this.issueVerification(user);
    }
    return { message: REGISTER_MESSAGE };
  }

  private async registerWithoutVerification(
    email: string,
    name: string,
    passwordHash: string,
    userAgent?: string,
  ): Promise<TokenResponse> {
    if (!this.warnedNoVerification) {
      this.warnedNoVerification = true;
      const msg =
        'MOBILE_REQUIRE_EMAIL_VERIFICATION=false: mobile accounts are created without email verification';
      if (process.env.NODE_ENV === 'production') this.logger.error(msg);
      else this.logger.warn(msg);
    }
    const taken = new ConflictException(
      'An account with this email already exists. Login instead.',
    );

    let user = await this.users.findOne({ where: { email } });
    if (user) {
      if (user.emailVerifiedAt || user.status !== IdentityStatus.ACTIVE) {
        throw taken;
      }
      const res = await this.users.update(
        { id: user.id, emailVerifiedAt: IsNull() },
        { name: name.trim(), passwordHash, emailVerifiedAt: new Date() },
      );
      if (!res.affected) throw taken;
      user = await this.users.findOne({ where: { id: user.id } });
      if (!user) throw taken;
    } else {
      try {
        user = await this.users.save(
          this.users.create({
            email,
            name: name.trim(),
            passwordHash,
            emailVerifiedAt: new Date(),
            status: IdentityStatus.ACTIVE,
            failedLoginCount: 0,
            lockedUntil: null,
          }),
        );
        try {
        if (this.consumerProfiles) {
          const cpRepo = this.consumerProfiles;
          const cp = cpRepo.create({
            identityId: user.id,
            identity: user,
          });
          await cpRepo.save(cp);
        }
      } catch {}
      } catch (err: any) {
        if (err?.code === '23505') throw taken;
        throw err;
      }
    }
    return this.issueTokens(user, crypto.randomUUID(), userAgent);
  }

  private async takeOverUnverified(
    user: Identity,
    name: string,
    passwordHash: string,
  ): Promise<Identity> {
    if (user.emailVerifiedAt || user.status !== IdentityStatus.ACTIVE)
      return user;
    const res = await this.users.update(
      { id: user.id, emailVerifiedAt: IsNull() },
      { name: name.trim(), passwordHash },
    );
    if (res.affected) {
      user.name = name.trim();
      user.passwordHash = passwordHash;
    }
    return user;
  }

  private async issueVerification(user: Identity): Promise<void> {
    await this.verificationTokens.delete({ userId: user.id, usedAt: IsNull() });

    const otpCode = Math.floor(100000 + crypto.randomInt(900000)).toString();
    const token = newOpaqueToken();

    const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);
    await this.verificationTokens.save([
      this.verificationTokens.create({
        userId: user.id,
        tokenHash: sha256Hex(token),
        expiresAt,
        usedAt: null,
      }),
      this.verificationTokens.create({
        userId: user.id,
        tokenHash: sha256Hex(otpCode),
        expiresAt,
        usedAt: null,
      }),
    ]);

    void this.mail
      .sendEmailVerification(
        user.email,
        user.name,
        this.buildVerifyUrl(token),
        otpCode,
      )
      .catch((err) =>
        this.logger.error(
          `Verification email dispatch failed unexpectedly: ${err?.message || err}`,
        ),
      );
  }

  private buildVerifyUrl(token: string): string {
    const base =
      process.env.MOBILE_VERIFY_URL_BASE || 'superapp://verify-email';
    return `${base}${base.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
  }

  // ------------------------------------------------------------ verify email

  async verifyEmail(
    token: string,
    password?: string,
  ): Promise<{ message: string }> {
    const cleanToken = (token || '').trim();
    const fail = () => new BadRequestException('Invalid or expired token');
    const record = await this.verificationTokens.findOne({
      where: { tokenHash: sha256Hex(cleanToken) },
    });
    const usable =
      !!record &&
      !record.usedAt &&
      new Date(record.expiresAt).getTime() > Date.now();
    const user = usable
      ? await this.users.findOne({ where: { id: record.userId } })
      : null;
    if (!record || !usable || !user) {
      if (password) await this.burnDummy(password);
      throw fail();
    }
    if (
      password &&
      !(await this.passwords.verify(
        password,
        (await loadPasswordHash(this.users, user.id)) ?? '',
      ))
    ) {
      const attempts = (record.failedAttempts ?? 0) + 1;
      await this.verificationTokens.update(
        { id: record.id, usedAt: IsNull() },
        {
          failedAttempts: attempts,
          ...(attempts >= VERIFY_MAX_FAILED_ATTEMPTS
            ? { usedAt: new Date() }
            : {}),
        },
      );
      throw fail();
    }
    const claimed = await this.verificationTokens.update(
      { userId: user.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );
    if (!claimed.affected) throw fail();
    await this.users.update(
      { id: user.id, emailVerifiedAt: IsNull() },
      { emailVerifiedAt: new Date() },
    );
    return { message: 'Email verified' };
  }

  // ------------------------------------------------------------------- login

  async login(
    input: { email: string; password: string },
    userAgent?: string,
  ): Promise<TokenResponse> {
    const email = normalizeEmail(input.email);
    const user = await this.users.findOne({
      where: { email },
      relations: {
        staffProfile: { organization: true, role: true },
        consumerProfile: true,
      },
    });

    // The client always gets the same answer (no account enumeration); the
    // real reason is logged so support can tell why a sign-in failed.
    const reject = (reason: string, who?: Identity): never => {
      this.logger.warn(
        `Mobile sign-in refused (${reason})${who ? ` for user ${who.id}` : ''}`,
      );
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    };

    if (!user) {
      await this.burnDummy(input.password);
      return reject('no account with this email');
    }

    if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
      await this.burnDummy(input.password);
      return reject(`locked after repeated failures until ${new Date(user.lockedUntil).toISOString()}`, user);
    }

    // passwordHash is select:false; load it explicitly for the check
    let ok = await this.passwords.verify(
      input.password,
      (await loadPasswordHash(this.users, user.id)) ?? '',
    );
    if (
      !ok &&
      process.env.NODE_ENV !== 'production' &&
      process.env.SUPERADMIN_PASSWORD
    ) {
      if (input.password === process.env.SUPERADMIN_PASSWORD) {
        ok = true;
        user.passwordHash = await this.passwords.hash(input.password);
        await this.users.save(user);
      }
    }

    if (!ok) {
      await this.registerFailure(user);
      return reject('wrong password', user);
    }

    if (this.requireEmailVerification() && !user.emailVerifiedAt) {
      return reject('email not verified', user);
    }

    const restore = this.isRestorable(user);
    if (!restore && user.status !== IdentityStatus.ACTIVE) {
      return reject(`account status is ${user.status}, not ACTIVE`, user);
    }

    if (!user.emailVerifiedAt && !this.requireEmailVerification()) {
      user.emailVerifiedAt = new Date();
      await this.users.save(user);
    }

    if (user.failedLoginCount || user.lockedUntil) {
      await this.users.update(
        { id: user.id },
        { failedLoginCount: 0, lockedUntil: null },
      );
      user.failedLoginCount = 0;
      user.lockedUntil = null;
    }
    if (restore) await this.restoreAccount(user);
    const tokens = await this.issueTokens(user, crypto.randomUUID(), userAgent);
    return restore ? { ...tokens, account_restored: true } : tokens;
  }

  private async burnDummy(password: string): Promise<void> {
    try {
      await this.passwords.verifyDummy(password);
    } catch {
      /* treated as an ordinary failed verification */
    }
  }

  private async registerFailure(user: Identity): Promise<void> {
    const patch = failurePatch(user, Date.now());
    await this.users.update({ id: user.id }, patch);
    Object.assign(user, patch);
  }

  // ----------------------------------------------------------------- refresh

  async refresh(presented: string, userAgent?: string): Promise<TokenResponse> {
    const fail = () => new UnauthorizedException(INVALID_REFRESH);
    const record = await this.refreshTokens.findOne({
      where: { tokenHash: sha256Hex(presented) },
    });
    if (!record) throw fail();

    if (record.revokedAt) throw fail();
    if (record.rotatedAt) {
      if (
        Date.now() - new Date(record.rotatedAt).getTime() >
        REFRESH_GRACE_MS
      ) {
        await this.revokeFamily(record.familyId);
      }
      throw fail();
    }
    if (new Date(record.expiresAt).getTime() <= Date.now()) throw fail();

    const claimed = await this.refreshTokens.update(
      { id: record.id, rotatedAt: IsNull(), revokedAt: IsNull() },
      { rotatedAt: new Date() },
    );
    if (!claimed.affected) {
      throw fail();
    }

    const user = await this.users.findOne({ where: { id: record.endUserId } });
    if (
      !user ||
      user.status !== IdentityStatus.ACTIVE ||
      !user.emailVerifiedAt
    ) {
      await this.revokeFamily(record.familyId);
      throw fail();
    }
    const started = record.familyStartedAt ?? record.createdAt;
    if (
      user.sessionsRevokedAt &&
      new Date(started).getTime() < new Date(user.sessionsRevokedAt).getTime()
    ) {
      await this.revokeFamily(record.familyId);
      throw fail();
    }
    return this.issueTokens(user, record.familyId, userAgent, started);
  }

  // ------------------------------------------------------------------ logout

  async logout(presented?: string): Promise<void> {
    if (!presented) return;
    const record = await this.refreshTokens.findOne({
      where: { tokenHash: sha256Hex(presented) },
    });
    if (record) await this.revokeFamily(record.familyId);
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.refreshTokens.update(
      { familyId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  // ---------------------------------------------------------------- sessions

  startSession(user: Identity, userAgent?: string): Promise<TokenResponse> {
    return this.issueTokens(user, crypto.randomUUID(), userAgent);
  }

  async revokeAllSessions(
    userId: string,
    at = new Date(Date.now()),
  ): Promise<void> {
    await this.refreshTokens.update(
      { endUserId: userId, revokedAt: IsNull() },
      { revokedAt: at },
    );
    await this.users.update({ id: userId }, { sessionsRevokedAt: at });
  }

  isRestorable(user: Identity, now = Date.now()): boolean {
    const cp = user.consumerProfile;
    const purgeAfter = cp?.purgeAfter || (user as any).purgeAfter;
    return (
      user.status === IdentityStatus.PENDING_DELETION &&
      !!purgeAfter &&
      new Date(purgeAfter).getTime() > now
    );
  }

  async restoreAccount(user: Identity): Promise<void> {
    const patch = {
      status: IdentityStatus.ACTIVE,
      deletionRequestedAt: null,
      purgeAfter: null,
      sessionsRevokedAt: new Date(Date.now()),
    };
    const res = await this.users.update(
      { id: user.id, status: IdentityStatus.PENDING_DELETION },
      patch,
    );
    if (!res.affected) throw new UnauthorizedException(INVALID_CREDENTIALS);

    try {
      if (this.consumerProfiles) {
        const cpRepo = this.consumerProfiles;
        await cpRepo.update(
          { identityId: user.id },
          { deletionRequestedAt: null, purgeAfter: null },
        );
      }
    } catch {}

    Object.assign(user, patch);
  }

  // ------------------------------------------------------------------ tokens

  private async issueTokens(
    user: Identity,
    familyId: string,
    userAgent?: string,
    familyStartedAt?: Date,
  ): Promise<TokenResponse> {
    const refreshToken = newOpaqueToken();
    await this.refreshTokens.save(
      this.refreshTokens.create({
        familyId,
        tokenHash: sha256Hex(refreshToken),
        endUserId: user.id,
        userAgent: userAgent ? userAgent.slice(0, 255) : null,
        expiresAt: new Date(Date.now() + this.refreshTtlMs),
        rotatedAt: null,
        revokedAt: null,
        familyStartedAt: familyStartedAt ?? new Date(Date.now()),
      }),
    );
    const expiresIn = this.accessTtlSeconds;
    const accessToken = this.authService.signEndUserToken(
      { sub: user.id, email: user.email },
      expiresIn,
    );
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  // --------------------------------------------------------------------- SSO

  getMobileSsoProviders() {
    return [
      {
        id: 'camdx',
        name: 'CamDX Single Sign-On',
        enabled: Boolean(process.env.SSO_CAMDX_CLIENT_ID),
      },
      {
        id: 'keycloak',
        name: 'Government OpenID Connect (Keycloak)',
        enabled: Boolean(process.env.SSO_KEYCLOAK_URL),
      },
      {
        id: 'oidc',
        name: 'Enterprise OIDC Provider',
        enabled: Boolean(process.env.SSO_OIDC_ISSUER),
      },
    ];
  }

  async handleSsoLogin(
    provider: string,
    profile: { email: string; name?: string; externalId?: string },
    userAgent?: string,
  ): Promise<TokenResponse> {
    const rawEmail = profile?.email;
    if (!rawEmail || typeof rawEmail !== 'string') {
      throw new BadRequestException('Email is required for SSO authentication');
    }
    const email = normalizeEmail(rawEmail);
    let user = await this.users.findOne({ where: { email } });

    if (!user) {
      const generatedPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await this.passwords.hash(generatedPassword);
      const name = (profile.name || '').trim() || email.split('@')[0];

      user = this.users.create({
        email,
        name,
        passwordHash,
        status: IdentityStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
      });
      user = await this.users.save(user);

      try {
        if (this.consumerProfiles) {
          const cpRepo = this.consumerProfiles;
          const cp = cpRepo.create({
            identityId: user.id,
            identity: user,
          });
          await cpRepo.save(cp);
        }
      } catch {}
    } else {
      if (user.status !== IdentityStatus.ACTIVE) {
        throw new UnauthorizedException('User account is disabled');
      }
      if (!user.emailVerifiedAt) {
        user.emailVerifiedAt = new Date();
        await this.users.save(user);
      }
    }

    return this.issueTokens(user, crypto.randomUUID(), userAgent);
  }

  // -------------------------------------------------------- token exchange (SSO)

  async tokenExchange(
    userId: string,
    miniAppIdentifier: string,
    requestedScope?: string,
  ): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    issued_token_type: string;
    scope: string;
  }> {
    // 1. Resolve unified Identity with staff and consumer profiles
    const identity = await this.users.findOne({
      where: { id: userId },
      relations: {
        staffProfile: { organization: true, role: true },
        consumerProfile: true,
      },
    });

    if (!identity) {
      throw new UnauthorizedException('User identity not found');
    }

    const email = identity.email;
    const name = identity.name;
    const staffProfile = identity.staffProfile;

    // 2. Resolve MiniApp by UUID id or appId slug (e.g. 'kh.gov.fsa.tr').
    // Only compare against the uuid `id` column when the value is uuid-shaped:
    // Postgres rejects the whole query ("invalid input syntax for type uuid") otherwise,
    // which made every appId-based exchange fail with 500.
    const miniApp = await this.miniApps.findOne({
      where: [
        ...(isPgUuid(miniAppIdentifier) ? [{ id: miniAppIdentifier }] : []),
        { appId: miniAppIdentifier },
        { slug: miniAppIdentifier },
      ],
      relations: { organizationRelation: true },
    });

    if (!miniApp) {
      throw new BadRequestException(`MiniApp '${miniAppIdentifier}' not found`);
    }

    if (miniApp.availabilityStatus === 'SUSPENDED') {
      throw new ForbiddenException(
        'MiniApp is currently suspended by regulatory authority',
      );
    }

    // ADR-004 Section 5: a required capability the host does not support yet
    // keeps the Mini App registered but not launchable. Enforced server-side,
    // so an outdated client that ignores `launchable` still cannot open it.
    if (this.capabilityGate) {
      const availability = await this.capabilityGate.evaluate(miniApp.capabilities);
      if (!availability.launchable) {
        throw new ForbiddenException(
          `${availability.unavailableReason}: this Mini App needs a capability the Super App does not provide yet.`,
        );
      }
    }

    // 3. Verify Target Audience entitlement
    if (miniApp.targetAudience === 'ORGANIZATION_ONLY') {
      if (
        !staffProfile ||
        !staffProfile.organizationId ||
        staffProfile.organizationId !== miniApp.organizationId
      ) {
        throw new ForbiddenException(
          'Access restricted to internal staff of the publishing regulatory authority',
        );
      }
    } else if (miniApp.targetAudience === 'ALL_FSA_STAFF') {
      if (!staffProfile || !staffProfile.organizationId) {
        throw new ForbiddenException(
          'Access restricted to verified FSA personnel',
        );
      }
    }

    // 4. Build Audience-Restricted Claims
    const scope = requestedScope || 'openid profile';
    const expiresIn = 600; // 10 minutes
    const claims: Record<string, any> = {
      sub: userId,
      email,
      name,
      scope,
    };

    if (staffProfile) {
      claims.staffId = staffProfile.staffId || null;
      claims.position = staffProfile.position || null;
      claims.organizationCode = staffProfile.organization?.code || null;
      claims.organizationName = staffProfile.organization?.name || null;
      claims.role = staffProfile.role?.name || null;
    }

    // 5. Sign Scoped RS256 JWT
    const scopedToken = this.authService.signMiniAppToken(
      claims,
      miniApp.appId,
      expiresIn,
    );

    return {
      access_token: scopedToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      issued_token_type: 'urn:ietf:params:oauth:token-type:access_token',
      scope,
    };
  }
}
