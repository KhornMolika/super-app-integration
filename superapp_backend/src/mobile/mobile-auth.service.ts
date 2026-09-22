import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { AuthService } from '../auth/auth.service';
import { MailService } from '../notifications/channels/mail.service';
import { EndUser, EndUserStatus } from './entities/end-user.entity';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordService } from './password.service';
import {
  AuthRateLimiter,
  FULL_RETRY_AFTER_SECONDS,
  RateLimitedException,
} from './auth-rate-limiter';

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;
export const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
/** Max registration/verification mails per email address per window (any IP). */
export const REGISTER_MAIL_MAX_PER_EMAIL = 5;
export const REGISTER_MAIL_WINDOW_MS = 60 * 60 * 1000;
/** A rotated refresh token replayed within this window is a benign race, not theft. */
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
}

export const sha256Hex = (value: string) =>
  crypto.createHash('sha256').update(value).digest('hex');
const newOpaqueToken = () => crypto.randomBytes(32).toString('base64url');
const normalizeEmail = (email: string) => email.trim().toLowerCase();

function intEnv(name: string, fallback: number, min: number, max: number): number {
  const n = Number(process.env[name]);
  const v = Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
  return Math.min(max, Math.max(min, v));
}

@Injectable()
export class MobileAuthService {
  private readonly logger = new Logger(MobileAuthService.name);

  constructor(
    @InjectRepository(EndUser) private readonly users: Repository<EndUser>,
    @InjectRepository(EmailVerificationToken)
    private readonly verificationTokens: Repository<EmailVerificationToken>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    private readonly passwords: PasswordService,
    private readonly authService: AuthService,
    private readonly mail: MailService,
    private readonly limiter: AuthRateLimiter,
  ) {}

  get accessTtlSeconds(): number {
    return intEnv('MOBILE_ACCESS_TOKEN_TTL_SECONDS', 900, 60, 86_400);
  }

  get refreshTtlMs(): number {
    return intEnv('MOBILE_REFRESH_TOKEN_TTL_DAYS', 30, 1, 90) * 24 * 60 * 60 * 1000;
  }

  // ---------------------------------------------------------------- register

  async register(input: {
    email: string;
    password: string;
    name: string;
  }): Promise<{ message: string }> {
    const email = normalizeEmail(input.email);
    const violation = this.passwords.validatePolicy(input.password, email);
    if (violation) throw new BadRequestException(violation);

    // Hash unconditionally so the response time does not reveal whether the
    // address is already registered.
    const passwordHash = await this.passwords.hash(input.password);

    // Per-address mail bucket (independent of IP) so an address cannot be
    // mail-bombed from many IPs. Consumed for every registration attempt
    // (existing or not) so the behaviour does not reveal existence. When
    // exceeded we still answer with the generic 202 but change/send nothing.
    // Trade-off: an attacker can burn a victim's hourly registration budget.
    const bucketKey = `register-mail|${email}`;
    // Limiter out of capacity (flood): explicit 429 like every other path.
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
            status: EndUserStatus.ACTIVE,
            failedLoginCount: 0,
            lockedUntil: null,
          }),
        );
      } catch (err: any) {
        if (err?.code !== '23505') throw err; // unique violation = lost a race
        user = await this.users.findOne({ where: { email } });
        if (user) user = await this.takeOverUnverified(user, input.name, passwordHash);
      }
    } else {
      user = await this.takeOverUnverified(user, input.name, passwordHash);
    }

    // Verified accounts are never modified and get no mail; unverified
    // (incl. brand new) get a fresh link.
    if (user && !user.emailVerifiedAt && user.status === EndUserStatus.ACTIVE) {
      await this.issueVerification(user);
    }
    return { message: REGISTER_MESSAGE };
  }

  /**
   * Re-registering an UNVERIFIED email replaces name + password hash
   * (last-writer-wins). This is safe against squatting because the account can
   * only be activated with a token that is mailed to the address AND the
   * password matching the current hash (see verifyEmail). A VERIFIED or
   * DISABLED account is never touched.
   */
  private async takeOverUnverified(
    user: EndUser,
    name: string,
    passwordHash: string,
  ): Promise<EndUser> {
    if (user.emailVerifiedAt || user.status !== EndUserStatus.ACTIVE) return user;
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

  private async issueVerification(user: EndUser): Promise<void> {
    // Invalidate every older unused token for this user (they belong to the
    // previous password / registrant).
    await this.verificationTokens.delete({ userId: user.id, usedAt: IsNull() });
    const token = newOpaqueToken();
    await this.verificationTokens.save(
      this.verificationTokens.create({
        userId: user.id,
        tokenHash: sha256Hex(token),
        expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
        usedAt: null,
      }),
    );
    // Fire and forget: mail latency must not differ between the branches.
    void this.mail
      .sendEmailVerification(user.email, user.name, this.buildVerifyUrl(token))
      .catch(() =>
        this.logger.error('Verification email dispatch failed unexpectedly'),
      );
  }

  private buildVerifyUrl(token: string): string {
    const base = process.env.MOBILE_VERIFY_URL_BASE || 'superapp://verify-email';
    return `${base}${base.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
  }

  // ------------------------------------------------------------ verify email

  /**
   * Requires the emailed token AND the password chosen at registration, so a
   * squatter who registered someone else's address with THEIR password cannot
   * be "activated" by the victim clicking the link alone. Every failure is the
   * same generic 400 with comparable timing (dummy scrypt when no hash to check).
   */
  async verifyEmail(token: string, password: string): Promise<{ message: string }> {
    const fail = () => new BadRequestException('Invalid or expired token');
    const record = await this.verificationTokens.findOne({
      where: { tokenHash: sha256Hex(token) },
    });
    const usable =
      !!record &&
      !record.usedAt &&
      new Date(record.expiresAt).getTime() > Date.now();
    const user = usable
      ? await this.users.findOne({ where: { id: record!.userId } })
      : null;
    if (!record || !usable || !user) {
      await this.burnDummy(password);
      throw fail();
    }
    if (!(await this.passwords.verify(password, user.passwordHash))) {
      // A token holder must not be able to use this endpoint as an unmetered
      // password oracle: after VERIFY_MAX_FAILED_ATTEMPTS wrong passwords the
      // token is invalidated (the user has to register again for a new one).
      const attempts = (record.failedAttempts ?? 0) + 1;
      await this.verificationTokens.update(
        { id: record.id, usedAt: IsNull() },
        {
          failedAttempts: attempts,
          ...(attempts >= VERIFY_MAX_FAILED_ATTEMPTS ? { usedAt: new Date() } : {}),
        },
      );
      throw fail();
    }
    // Atomic single-use claim.
    const claimed = await this.verificationTokens.update(
      { id: record.id, usedAt: IsNull() },
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
    const user = await this.users.findOne({ where: { email } });

    if (!user) {
      await this.burnDummy(input.password);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
      // Locked: same generic error, same CPU cost, and no further counting.
      await this.burnDummy(input.password);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const ok = await this.passwords.verify(input.password, user.passwordHash);
    if (!ok) {
      await this.registerFailure(user);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (!user.emailVerifiedAt || user.status !== EndUserStatus.ACTIVE) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (user.failedLoginCount || user.lockedUntil) {
      user.failedLoginCount = 0;
      user.lockedUntil = null;
      await this.users.save(user);
    }
    return this.issueTokens(user, crypto.randomUUID(), userAgent);
  }

  /** Timing-parity scrypt; an internal failure must not turn into a 500. */
  private async burnDummy(password: string): Promise<void> {
    try {
      await this.passwords.verifyDummy(password);
    } catch {
      /* treated as an ordinary failed verification */
    }
  }

  // NOTE: read-modify-write; concurrent guesses can under-count by a few. The
  // IP/email rate limiter bounds the burst, so this is acceptable.
  private async registerFailure(user: EndUser): Promise<void> {
    user.failedLoginCount = (user.failedLoginCount ?? 0) + 1;
    if (user.failedLoginCount >= MAX_FAILED_LOGINS) {
      user.lockedUntil = new Date(Date.now() + LOCKOUT_MS);
      user.failedLoginCount = 0;
    }
    await this.users.save(user);
  }

  // ----------------------------------------------------------------- refresh

  async refresh(
    presented: string,
    userAgent?: string,
  ): Promise<TokenResponse> {
    const fail = () => new UnauthorizedException(INVALID_REFRESH);
    const record = await this.refreshTokens.findOne({
      where: { tokenHash: sha256Hex(presented) },
    });
    if (!record) throw fail();

    if (record.revokedAt) throw fail();
    if (record.rotatedAt) {
      // Within the grace window this is almost certainly the losing side of a
      // benign race (double-tap / retry after a lost response): plain 401, the
      // family stays alive. Older reuse is treated as theft: revoke the family.
      if (Date.now() - new Date(record.rotatedAt).getTime() > REFRESH_GRACE_MS) {
        await this.revokeFamily(record.familyId);
      }
      throw fail();
    }
    if (new Date(record.expiresAt).getTime() <= Date.now()) throw fail();

    // Atomic claim so two concurrent refreshes cannot both succeed.
    const claimed = await this.refreshTokens.update(
      { id: record.id, rotatedAt: IsNull(), revokedAt: IsNull() },
      { rotatedAt: new Date() },
    );
    if (!claimed.affected) {
      // Lost a concurrent rotation to the winner (just now): grace, no revoke.
      throw fail();
    }

    const user = await this.users.findOne({ where: { id: record.userId } });
    if (!user || user.status !== EndUserStatus.ACTIVE || !user.emailVerifiedAt) {
      await this.revokeFamily(record.familyId);
      throw fail();
    }
    return this.issueTokens(user, record.familyId, userAgent);
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

  // ------------------------------------------------------------------ tokens

  private async issueTokens(
    user: EndUser,
    familyId: string,
    userAgent?: string,
  ): Promise<TokenResponse> {
    const refreshToken = newOpaqueToken();
    await this.refreshTokens.save(
      this.refreshTokens.create({
        familyId,
        tokenHash: sha256Hex(refreshToken),
        userId: user.id,
        userAgent: userAgent ? userAgent.slice(0, 255) : null,
        expiresAt: new Date(Date.now() + this.refreshTtlMs),
        rotatedAt: null,
        revokedAt: null,
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
}
