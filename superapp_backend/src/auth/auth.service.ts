import {
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import {
  AccessControlService,
  OFFICIAL_SEEDS,
} from '../access-control/access-control.service';
import {
  AccessToken,
  DeveloperToken,
} from '../access-control/entities/access-token.entity';
import { AuthOtp, OtpPurpose } from './entities/auth-otp.entity';
import { MailService } from '../notifications/channels/mail.service';
import { verifyPassword, hashPassword } from '../common/utils/password.util';
import {
  LoginDto,
  RegisterDto,
  ChangePasswordDto,
  RequestOtpDto,
  VerifyOtpDto,
  ResetPasswordDto,
} from './dto';
import { resolveOrganizationDetails } from '../organizations/helpers/organization-resolver.helper';
import { OrganizationsService } from '../organizations/organizations.service';

export const END_USER_TYP = 'end_user';
export const BACK_OFFICE_TYP = 'back_office';
export const REFRESH_TYP = 'back_office_refresh';
export const END_USER_AUDIENCE = 'super-app-mobile';

/** Short-lived access token lifetime (default 15 minutes) for security & quick permission reflection */
export const BACK_OFFICE_ACCESS_TOKEN_TTL_SECONDS =
  Number(process.env.BACK_OFFICE_ACCESS_TOKEN_TTL_SECONDS) || 15 * 60; // 15 mins

/** Long-lived refresh token lifetime (default 7 days) for seamless background rotation & convenience */
export const BACK_OFFICE_REFRESH_TOKEN_TTL_SECONDS =
  Number(process.env.BACK_OFFICE_REFRESH_TOKEN_TTL_SECONDS) || 7 * 24 * 60 * 60; // 7 days

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private privateKey!: string;
  private publicKey!: string;
  private keyId!: string;
  private jwk: any;

  constructor(
    private jwtService: JwtService,
    private accessControlService: AccessControlService,
    @Optional()
    @InjectRepository(AccessToken)
    private accessTokenRepo?: Repository<AccessToken>,
    @Optional()
    @InjectRepository(AuthOtp)
    private otpRepo?: Repository<AuthOtp>,
    @Optional()
    private mailService?: MailService,
    @Optional()
    @Inject(forwardRef(() => OrganizationsService))
    private organizationsService?: OrganizationsService,
  ) {}

  private get developerTokenRepo(): Repository<AccessToken> | undefined {
    return this.accessTokenRepo;
  }

  private get issuer(): string {
    return process.env.JWT_ISSUER || 'super-app-backend';
  }

  onModuleInit() {
    this.keyId = process.env.JWT_KEY_ID || 'dps-key-1';
    const configured = process.env.JWT_PRIVATE_KEY;

    if (configured && configured.trim()) {
      this.privateKey = configured.replace(/\\n/g, '\n').trim();
      let keyObj: crypto.KeyObject;
      try {
        keyObj = crypto.createPrivateKey(this.privateKey);
      } catch {
        throw new Error('JWT_PRIVATE_KEY is set but is not a valid PEM key');
      }
      if (keyObj.asymmetricKeyType !== 'rsa') {
        throw new Error(
          'JWT_PRIVATE_KEY must be an RSA key (RS256); EC/Ed25519 keys are not supported',
        );
      }
    } else if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'JWT_PRIVATE_KEY must be set in production (refusing to start with an ephemeral signing key)',
      );
    } else {
      this.logger.warn(
        'JWT_PRIVATE_KEY is not set: generated an EPHEMERAL RSA key. All issued tokens and the JWKS reset on every restart.',
      );
      this.privateKey = crypto
        .generateKeyPairSync('rsa', { modulusLength: 2048 })
        .privateKey.export({ type: 'pkcs8', format: 'pem' })
        .toString();
    }

    const pubKeyObject = crypto.createPublicKey(
      crypto.createPrivateKey(this.privateKey),
    );
    this.publicKey = pubKeyObject
      .export({ type: 'spki', format: 'pem' })
      .toString();
    const jwkFormat = pubKeyObject.export({ format: 'jwk' }) as any;

    this.jwk = {
      ...jwkFormat,
      kid: this.keyId,
      alg: 'RS256',
      use: 'sig',
    };
  }

  /**
   * Verifies an RS256 token against our public key (signature + expiry).
   */
  verifyToken(
    token: string,
    opts: { audience?: string; typ?: string } = {},
  ): any {
    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        publicKey: this.publicKey,
        algorithms: ['RS256'],
        issuer: this.issuer,
        ...(opts.audience ? { audience: opts.audience } : {}),
      });
    } catch {
      throw new UnauthorizedException();
    }
    if (opts.typ && payload?.typ !== opts.typ) {
      throw new UnauthorizedException();
    }
    return payload;
  }

  signEndUserToken(
    payload: Record<string, any>,
    expiresInSeconds: number,
  ): string {
    return this.jwtService.sign(
      { ...payload, typ: END_USER_TYP },
      {
        privateKey: this.privateKey,
        algorithm: 'RS256',
        keyid: this.keyId,
        issuer: this.issuer,
        audience: END_USER_AUDIENCE,
        expiresIn: expiresInSeconds,
      },
    );
  }

  getJwks() {
    return {
      keys: [this.jwk],
    };
  }

  /**
   * Issues Access & Refresh token pair for a verified user
   */
  private generateAuthTokens(user: any) {
    const permissions = new Set<string>();
    const userRoleList: any[] = user.roles || (user.role ? [user.role] : []);
    userRoleList.forEach((role: any) => {
      role.permissions?.forEach((p: any) => permissions.add(p.name));
    });

    const rawRoles: string[] = userRoleList
      .map((r: any) => (typeof r === 'string' ? r : r?.name))
      .filter(Boolean);

    // Standardize strictly to the 3-Role Architecture (SUPER_ADMIN, ADMIN, MA_DEVELOPER)
    let roles: string[] = Array.from(
      new Set(
        rawRoles
          .map((r) => {
            if (
              r === 'MINI_APP_DEVELOPER' ||
              r === 'DEVELOPER' ||
              r === 'QA_TESTER' ||
              r === 'AUDITOR'
            ) {
              return 'MA_DEVELOPER';
            }
            return r;
          })
          .filter((r) => ['SUPER_ADMIN', 'ADMIN', 'MA_DEVELOPER'].includes(r)),
      ),
    );

    if (roles.length === 0) {
      roles = ['MA_DEVELOPER'];
    }

    // If permissions not explicitly loaded from DB relations, supply standard defaults
    if (permissions.size === 0) {
      if (roles.includes('SUPER_ADMIN')) {
        [
          'miniapp:create',
          'miniapp:read',
          'miniapp:update',
          'miniapp:delete',
          'miniapp:approve',
          'miniapp:reject',
          'miniapp:suspend',
          'miniapp:submit',
          'miniapp_permission:approve',
          'issue:resolve',
          'permission_proposal:read',
          'permission_proposal:review',
          'permission_proposal:approve',
          'super_app:read',
          'super_app:manage',
          'user:read',
          'user:manage',
          'role:read',
          'role:manage',
          'permission:read',
          'permission:manage',
          'organization:read',
          'organization:manage',
          'audit_log:read',
          'settings:manage',
        ].forEach((p) => permissions.add(p));
      }
      if (roles.includes('ADMIN')) {
        [
          'miniapp:create',
          'miniapp:read',
          'miniapp:update',
          'miniapp:delete',
          'miniapp:approve',
          'miniapp:reject',
          'miniapp:suspend',
          'miniapp:submit',
          'miniapp_permission:approve',
          'issue:resolve',
          'permission_proposal:read',
          'permission_proposal:review',
          'permission_proposal:approve',
          'super_app:read',
          'super_app:manage',
          'user:read',
          'user:manage',
          'role:read',
          'permission:read',
          'organization:read',
          'organization:manage',
          'audit_log:read',
          'settings:manage',
        ].forEach((p) => permissions.add(p));
      }
      if (roles.includes('MA_DEVELOPER')) {
        [
          'miniapp:create',
          'miniapp:read',
          'miniapp:update',
          'miniapp:submit',
          'permission_proposal:read',
          'permission:read',
          'super_app:read',
          'organization:read',
        ].forEach((p) => permissions.add(p));
      }
    }

    const accessPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      roles,
      permissions: Array.from(permissions),
      organizationId: user.organizationId || user.organization?.id || null,
      organization: user.organization?.name || null,
      organizationCode: user.organization?.code || null,
      typ: BACK_OFFICE_TYP,
    };

    const refreshPayload = {
      sub: user.id,
      email: user.email,
      typ: REFRESH_TYP,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      privateKey: this.privateKey,
      algorithm: 'RS256',
      keyid: this.keyId,
      issuer: this.issuer,
      expiresIn: BACK_OFFICE_ACCESS_TOKEN_TTL_SECONDS,
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      privateKey: this.privateKey,
      algorithm: 'RS256',
      keyid: this.keyId,
      issuer: this.issuer,
      expiresIn: BACK_OFFICE_REFRESH_TOKEN_TTL_SECONDS,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: BACK_OFFICE_ACCESS_TOKEN_TTL_SECONDS,
      refresh_expires_in: BACK_OFFICE_REFRESH_TOKEN_TTL_SECONDS,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles,
        permissions: Array.from(permissions),
      },
    };
  }

  /**
   * User Sign-In (Direct Database Credential Verification with Scrypt Password Check & Role Gate)
   * Note: SSO is intentionally bypassed/disabled — credentials verify strictly against the PostgreSQL DB.
   */
  async login(body: LoginDto) {
    const rawEmail =
      typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const rawPassword = typeof body?.password === 'string' ? body.password : '';

    if (!rawEmail || !rawPassword) {
      return {
        success: false as const,
        message: 'Email and password are required',
      };
    }

    const user =
      await this.accessControlService.findByEmailWithPermissions(rawEmail);

    this.logger.log(
      `[AUTH] Login attempt for: ${rawEmail}. User found: ${Boolean(user)}, hasHash: ${Boolean(user?.passwordHash)}, status: ${user?.status}, role: ${(user as any)?.role?.name || (user as any)?.roleId || 'none'}`,
    );

    if (!user) {
      return {
        success: false as const,
        message: 'Invalid credentials or user not found',
      };
    }

    // 1. Password Verification
    const SEED_DEFAULT_PASSWORD = process.env.SUPERADMIN_PASSWORD;
    const isSeedAccount = Boolean(OFFICIAL_SEEDS[rawEmail]);
    let isMatch = false;

    // Check against stored password hash (allows users to update their password later)
    if (user.passwordHash) {
      isMatch = await verifyPassword(rawPassword, user.passwordHash);
      if (!isMatch && rawPassword.trim() !== rawPassword) {
        isMatch = await verifyPassword(rawPassword.trim(), user.passwordHash);
      }
    }

    // In non-production environments only, allow sync if SUPERADMIN_PASSWORD is configured
    if (
      !isMatch &&
      isSeedAccount &&
      process.env.NODE_ENV !== 'production' &&
      SEED_DEFAULT_PASSWORD
    ) {
      const isDefaultSeedPassword =
        rawPassword === SEED_DEFAULT_PASSWORD ||
        rawPassword.trim() === SEED_DEFAULT_PASSWORD.trim();

      if (isDefaultSeedPassword) {
        isMatch = true;
        const initialHash = await hashPassword(SEED_DEFAULT_PASSWORD);
        await this.accessControlService.updatePasswordDirectly(
          user.id,
          initialHash,
        );
        user.passwordHash = initialHash;
        this.logger.log(
          `[AUTH] Authenticated with configured seed password for: ${rawEmail}`,
        );
      }
    }

    if (!isMatch) {
      this.logger.warn(`[AUTH] Password mismatch for: ${rawEmail}`);
      return { success: false as const, message: 'Invalid email or password' };
    }

    if (isSeedAccount) {
      user.status = 'ACTIVE';
    } else if (user.status === 'PENDING_EMAIL_VERIFICATION') {
      throw new UnauthorizedException(
        'Please verify your email address with the 6-digit code before signing in. Check your inbox.',
      );
    } else if (
      user.status !== 'ACTIVE' ||
      (!user.role && !(user as any).roles?.length)
    ) {
      this.logger.warn(
        `[AUTH] Approval gate blocked for: ${rawEmail} (status=${user.status}, roles=${(user as any).roles?.length || (user.role ? 1 : 0)})`,
      );
      return {
        success: false as const,
        pendingApproval: true,
        message:
          'Your account is pending Super Administrator approval. Please contact a Super Administrator to activate your account and assign permissions.',
      };
    }

    this.logger.log(`[AUTH] Authentication succeeded for: ${rawEmail}`);
    const tokens = this.generateAuthTokens(user);
    return {
      success: true as const,
      message: 'Logged in successfully',
      ...tokens,
    };
  }

  /**
   * User Self Sign-Up (Creates an account in PENDING_EMAIL_VERIFICATION status)
   * Dispatches a 6-digit OTP code to the provided email address.
   * Super Admin's review list only sees users who successfully verify their email.
   */
  async register(body: RegisterDto) {
    const email = (body.email || '').trim().toLowerCase();
    const name = (body.name || '').trim();
    const password = body.password || '';
    const organizationInput = (body.organization || '').trim();

    if (!email || !name) {
      throw new BadRequestException(
        'Name and email are required for registration',
      );
    }

    // Resolve organization ID (falls back to default authority if not provided)
    const resolvedOrg = this.organizationsService
      ? await this.organizationsService.resolveOrganization(organizationInput)
      : await resolveOrganizationDetails(organizationInput);
    const organizationId = resolvedOrg?.id || '';

    const existing =
      await this.accessControlService.findByEmailWithPermissions(email);
    const passwordHash = password ? await hashPassword(password) : undefined;

    if (existing) {
      // If user is stuck in PENDING_EMAIL_VERIFICATION, allow them to re-request code and update details
      if (existing.status === 'PENDING_EMAIL_VERIFICATION') {
        await this.accessControlService.updateUser(existing.id, {
          name,
          passwordHash,
          organizationId,
        });
        const otpResult = await this.requestOtp({
          email,
          purpose: 'EMAIL_VERIFICATION',
        });
        return {
          success: true,
          pendingEmailVerification: true,
          email,
          emailDispatched: otpResult.emailDispatched,
          message:
            'A 6-digit verification code has been dispatched to your email address.',
        };
      }
      throw new BadRequestException(
        'An account with this email already exists. Please Login.',
      );
    }

    // Self-registered accounts start in PENDING_EMAIL_VERIFICATION so they DO NOT clutter
    // the Super Admin's pending approval list with typos or unverified emails.
    await this.accessControlService.createUser({
      name,
      email,
      roleNames: ['MA_DEVELOPER'],
      isActive: false,
      status: 'PENDING_EMAIL_VERIFICATION',
      passwordHash,
      organizationId,
    });

    // Dispatch 6-digit OTP to the recipient
    const otpResult = await this.requestOtp({
      email,
      purpose: 'EMAIL_VERIFICATION',
    });

    return {
      success: true,
      pendingEmailVerification: true,
      email,
      emailDispatched: otpResult.emailDispatched,
      message:
        'Registration submitted. Please enter the 6-digit verification code sent to your email to confirm your identity.',
    };
  }

  /**
   * Token Refresh Rotation: Validates refresh token & issues new 15-min access token
   */
  async refreshToken(refreshTokenString: string) {
    if (!refreshTokenString) {
      throw new UnauthorizedException('Refresh token is required');
    }

    let payload: any;
    try {
      payload = this.verifyToken(refreshTokenString, { typ: REFRESH_TYP });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.accessControlService.findByEmailWithPermissions(
      payload.email,
    );
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'User account is deactivated or not found',
      );
    }

    const tokens = this.generateAuthTokens(user);
    return {
      success: true,
      message: 'Token refreshed successfully',
      ...tokens,
    };
  }

  /**
   * Single Sign-On (SSO) Support Architecture
   */
  // getSsoProviders() {
  //   return [
  //     { id: 'camdx', name: 'CamDX Single Sign-On', enabled: Boolean(process.env.SSO_CAMDX_CLIENT_ID) },
  //     { id: 'keycloak', name: 'Government OpenID Connect (Keycloak)', enabled: Boolean(process.env.SSO_KEYCLOAK_URL) },
  //     { id: 'oidc', name: 'Enterprise OIDC Provider', enabled: Boolean(process.env.SSO_OIDC_ISSUER) },
  //   ];
  // }

  // async handleSsoCallback(provider: string, ssoProfile: { email: string; name: string; externalId?: string }) {
  //   let user = await this.accessControlService.findByEmailWithPermissions(ssoProfile.email);
  //   if (!user) {
  //     // Auto-provision new SSO user with default MINI_APP_DEVELOPER role
  //     const newUser = await this.accessControlService.createUser({
  //       name: ssoProfile.name || ssoProfile.email.split('@')[0],
  //       email: ssoProfile.email,
  //       roleNames: ['MINI_APP_DEVELOPER'],
  //       isActive: true,
  //     });
  //     user = await this.accessControlService.findByEmailWithPermissions(newUser.email);
  //   }

  //   return this.generateAuthTokens(user);
  // }

  /**
   * Personal Access Tokens (PAT) Management for Private Registries & Scoped SDK Gateways
   * Usable by all platform roles (SUPER_ADMIN, ADMIN, MA_DEVELOPER)
   */
  async createAccessToken(
    userId: string,
    name: string,
    expirationDays = 90,
    scopes = ['sdk:read', 'packages:read'],
  ) {
    const user = await this.accessControlService.findUserById(userId);
    if (!user) throw new NotFoundException('User not found');

    const expiresInSeconds =
      expirationDays > 0 ? expirationDays * 24 * 60 * 60 : 365 * 24 * 60 * 60;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    const roleList = (user as any).roles || (user.role ? [user.role] : []);
    const roles = roleList
      .map((r: any) => (typeof r === 'string' ? r : r?.name))
      .filter(Boolean);

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      roles: roles.length > 0 ? roles : ['MINI_APP_DEVELOPER'],
      scopes,
      typ: BACK_OFFICE_TYP, // Permits authentication via general AuthGuards, NPM proxy, and Pub proxy
    };

    const rawToken = this.jwtService.sign(tokenPayload, {
      privateKey: this.privateKey,
      algorithm: 'RS256',
      keyid: this.keyId,
      issuer: this.issuer,
      expiresIn: expiresInSeconds,
    });

    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const tokenPrefix = `fsa_pat_${rawToken.substring(0, 8)}...${rawToken.substring(rawToken.length - 6)}`;

    let savedItem: any = {
      id: crypto.randomUUID(),
      name: name.trim() || 'Personal Access Token',
      tokenPrefix,
      scopes,
      expiresAt,
      createdAt: new Date(),
      isActive: true,
    };

    if (this.developerTokenRepo) {
      const entity = this.developerTokenRepo.create({
        userId: user.id,
        name: name.trim() || 'Personal Access Token',
        tokenPrefix,
        tokenHash,
        scopes,
        expiresAt,
        isActive: true,
      });
      const saved = await this.developerTokenRepo.save(entity);
      savedItem = {
        id: saved.id,
        name: saved.name,
        tokenPrefix: saved.tokenPrefix,
        scopes: saved.scopes,
        expiresAt: saved.expiresAt,
        createdAt: saved.createdAt,
        isActive: saved.isActive,
      };
    }

    return {
      success: true,
      token: rawToken,
      tokenItem: savedItem,
    };
  }

  async listAccessTokens(userId: string) {
    if (!this.developerTokenRepo) return [];
    return this.developerTokenRepo.find({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async revokeAccessToken(userId: string, tokenId: string) {
    if (!this.developerTokenRepo) return { success: true };
    const token = await this.developerTokenRepo.findOne({
      where: { id: tokenId, userId },
    });
    if (!token) throw new NotFoundException('Token not found');
    token.isActive = false;
    await this.developerTokenRepo.save(token);
    return { success: true };
  }

  // Backwards-compatible aliases for legacy callers
  async createDeveloperToken(
    userId: string,
    name: string,
    expirationDays = 90,
    scopes = ['sdk:read', 'packages:read'],
  ) {
    return this.createAccessToken(userId, name, expirationDays, scopes);
  }

  async listDeveloperTokens(userId: string) {
    return this.listAccessTokens(userId);
  }

  async revokeDeveloperToken(userId: string, tokenId: string) {
    return this.revokeAccessToken(userId, tokenId);
  }

  /**
   * User Password Change (Allows users to update their password later)
   */
  async changePassword(userId: string, body: ChangePasswordDto) {
    const user = await this.accessControlService.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const defaultSeedPassword = process.env.SUPERADMIN_PASSWORD;
    let isOldValid = false;

    if (user.passwordHash) {
      isOldValid = await verifyPassword(body.oldPassword, user.passwordHash);
      if (!isOldValid && body.oldPassword.trim() !== body.oldPassword) {
        isOldValid = await verifyPassword(
          body.oldPassword.trim(),
          user.passwordHash,
        );
      }
    }

    if (
      !isOldValid &&
      process.env.NODE_ENV !== 'production' &&
      defaultSeedPassword &&
      body.oldPassword === defaultSeedPassword
    ) {
      isOldValid = true;
    }

    if (!isOldValid) {
      throw new BadRequestException('Current password does not match.');
    }

    const newHash = await hashPassword(
      body.newPassword.trim() || body.newPassword,
    );
    await this.accessControlService.updatePasswordDirectly(user.id, newHash);
    this.logger.log(
      `[AUTH] Password successfully updated for user: ${user.email} (${user.id})`,
    );
    return { success: true, message: 'Password updated successfully' };
  }

  /**
   * Dispatches a single-use 6-digit recovery/verification code via live Resend email.
   * Enforces:
   * 1. Invalidation of all prior unused codes for this email and purpose (Enforces Single-Use).
   * 2. Cryptographically secure 6-digit generation.
   * 3. 5-minute validity window.
   */
  async requestOtp(dto: RequestOtpDto) {
    const rawEmail = (dto.email || '').trim().toLowerCase();
    const purpose: OtpPurpose = (dto.purpose as OtpPurpose) || 'PASSWORD_RESET';

    if (!rawEmail) {
      throw new BadRequestException('Email address is required');
    }

    // Verify user exists
    const user =
      await this.accessControlService.findByEmailWithPermissions(rawEmail);
    if (purpose === 'PASSWORD_RESET' && !user) {
      this.logger.warn(
        `[OTP] Password reset requested for non-existent user: ${rawEmail}`,
      );
      return {
        success: true,
        message:
          'If this email is registered, a 6-digit recovery code has been dispatched.',
        expiresInSeconds: 300,
      };
    }

    if (purpose === 'EMAIL_VERIFICATION') {
      if (!user) {
        throw new BadRequestException(
          'No registration found for this email. Please sign up first.',
        );
      }
      if (user.status !== 'PENDING_EMAIL_VERIFICATION') {
        return {
          success: true,
          alreadyVerified: true,
          message: 'This email is already verified. You may proceed to Login.',
          expiresInSeconds: 0,
        };
      }
    }

    if (!this.otpRepo) {
      throw new BadRequestException('OTP repository is not initialized');
    }

    // 1. Invalidate all previous unused OTPs for this email and purpose (Single-use enforcement)
    await this.otpRepo
      .createQueryBuilder()
      .update(AuthOtp)
      .set({ isUsed: true })
      .where('email = :email AND purpose = :purpose AND isUsed = false', {
        email: rawEmail,
        purpose,
      })
      .execute();

    // 2. Generate secure 6-digit code
    const code = Math.floor(100000 + crypto.randomInt(900000)).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const otpRecord = this.otpRepo.create({
      email: rawEmail,
      code,
      purpose,
      expiresAt,
      isUsed: false,
      attempts: 0,
    });
    await this.otpRepo.save(otpRecord);

    this.logger.log(
      `[OTP] Generated 6-digit code for ${rawEmail} (${purpose}), expires at ${expiresAt.toISOString()}`,
    );

    // 3. Dispatch Live Email via Resend
    let emailDispatched = false;
    let emailError: string | undefined;

    if (this.mailService) {
      try {
        if (purpose === 'EMAIL_VERIFICATION') {
          const backofficeBase =
            process.env.BACKOFFICE_BASE_URL ||
            process.env.WEBAPP_URL ||
            'http://localhost:3002';
          const verifyUrl = `${backofficeBase}/verify-otp?email=${encodeURIComponent(rawEmail)}`;
          await this.mailService.sendBackofficeEmailVerification(
            rawEmail,
            user?.name || 'Developer',
            code,
            verifyUrl,
            5,
          );
        } else {
          await this.mailService.sendPasswordResetOtp(
            rawEmail,
            user?.name || 'Developer',
            code,
            5,
          );
        }
        emailDispatched = true;
        this.logger.log(
          `[OTP] Successfully dispatched email via Resend to ${rawEmail}`,
        );
      } catch (err: any) {
        emailError = err.message || String(err);
        this.logger.error(
          `[OTP] Resend dispatch error for ${rawEmail}: ${emailError}`,
        );
      }
    } else {
      this.logger.warn(`[OTP] MailService is not wired into AuthService.`);
    }

    return {
      success: true,
      message: `A 6-digit recovery code was dispatched to ${rawEmail}.`,
      expiresInSeconds: 300,
      emailDispatched,
      emailError,
    };
  }

  /**
   * Validates a 6-digit OTP code.
   * Enforces:
   * 1. Must be unconsumed (isUsed = false).
   * 2. Must not be expired (expiresAt > now).
   * 3. Must not exceed attempt limits (attempts < 5).
   * 4. Single-use burn: burns the OTP immediately (isUsed = true, usedAt = now).
   * 5. Returns a short-lived signed resetToken (10 minutes).
   */
  async verifyOtp(dto: VerifyOtpDto) {
    const rawEmail = (dto.email || '').trim().toLowerCase();
    const code = (dto.code || '').trim();
    const purpose: OtpPurpose = (dto.purpose as OtpPurpose) || 'PASSWORD_RESET';

    if (!rawEmail || !code || code.length !== 6) {
      throw new BadRequestException(
        'Valid email and 6-digit code are required',
      );
    }

    if (!this.otpRepo) {
      throw new BadRequestException('OTP repository is not initialized');
    }

    const activeOtp = await this.otpRepo
      .createQueryBuilder('otp')
      .where(
        'otp.email = :email AND otp.purpose = :purpose AND otp.isUsed = false',
        {
          email: rawEmail,
          purpose,
        },
      )
      .orderBy('otp.createdAt', 'DESC')
      .getOne();

    if (!activeOtp) {
      throw new BadRequestException(
        'No active recovery code found or code has already been used. Please request a new code.',
      );
    }

    // Expiry check
    if (new Date() > activeOtp.expiresAt) {
      activeOtp.isUsed = true;
      await this.otpRepo.save(activeOtp);
      throw new BadRequestException(
        'The 5-minute validity window for this code has expired. Please request a new code.',
      );
    }

    // Attempt limit check
    if (activeOtp.attempts >= 5) {
      activeOtp.isUsed = true;
      await this.otpRepo.save(activeOtp);
      throw new BadRequestException(
        'Too many incorrect attempts. This code has been invalidated for security. Please request a new code.',
      );
    }

    // Code match check
    if (activeOtp.code !== code) {
      activeOtp.attempts += 1;
      if (activeOtp.attempts >= 5) {
        activeOtp.isUsed = true;
      }
      await this.otpRepo.save(activeOtp);
      throw new BadRequestException(
        activeOtp.isUsed
          ? 'Too many incorrect attempts. This code has been invalidated.'
          : `Incorrect verification code. ${5 - activeOtp.attempts} attempts remaining.`,
      );
    }

    // SINGLE-USE CONSUMPTION: Burn OTP immediately!
    activeOtp.isUsed = true;
    activeOtp.usedAt = new Date();
    await this.otpRepo.save(activeOtp);

    this.logger.log(
      `[OTP] Successfully consumed single-use OTP for ${rawEmail} (${purpose})`,
    );

    // For EMAIL_VERIFICATION: promote user to ACTIVE (if Admin/SuperAdmin) or PENDING_APPROVAL (if self-registered Developer)
    if (purpose === 'EMAIL_VERIFICATION') {
      const user =
        await this.accessControlService.findByEmailWithPermissions(rawEmail);
      if (user && user.status === 'PENDING_EMAIL_VERIFICATION') {
        const isSuperOrAdmin =
          user.role?.name === 'SUPER_ADMIN' ||
          user.role?.name === 'ADMIN' ||
          Boolean(OFFICIAL_SEEDS[rawEmail]);
        const nextStatus = isSuperOrAdmin ? 'ACTIVE' : 'PENDING_APPROVAL';
        await this.accessControlService.updateUserStatus(user.id, nextStatus);
        this.logger.log(
          `[AUTH] User ${rawEmail} successfully verified email. Transitioned to ${nextStatus}`,
        );
      }
      return {
        success: true,
        verified: true,
        message:
          'Email verified successfully! You may now Login to your account.',
      };
    }

    // Generate short-lived signed reset token (10 mins)
    const resetPayload = {
      sub: rawEmail,
      email: rawEmail,
      typ: 'password_reset_token',
    };
    const resetToken = this.jwtService.sign(resetPayload, {
      privateKey: this.privateKey,
      algorithm: 'RS256',
      keyid: this.keyId,
      issuer: this.issuer,
      expiresIn: 10 * 60, // 10 minutes
    });

    return {
      success: true,
      resetToken,
      message: 'Code verified successfully. You may now set your new password.',
    };
  }

  /**
   * Resets password using the verified resetToken.
   */
  async resetPassword(dto: ResetPasswordDto) {
    const { resetToken, newPassword } = dto;
    if (!resetToken || !newPassword) {
      throw new BadRequestException(
        'Reset token and new password are required',
      );
    }

    let payload: any;
    try {
      payload = this.verifyToken(resetToken, { typ: 'password_reset_token' });
    } catch {
      throw new BadRequestException(
        'Invalid or expired reset session. Please restart password recovery.',
      );
    }

    const email = payload.email || payload.sub;
    const user =
      await this.accessControlService.findByEmailWithPermissions(email);
    if (!user) {
      throw new BadRequestException('User account not found');
    }

    // Hash new password using Scrypt
    const passwordHash = await hashPassword(newPassword.trim() || newPassword);
    await this.accessControlService.updatePasswordDirectly(
      user.id,
      passwordHash,
    );

    this.logger.log(`[AUTH] Password successfully reset for: ${email}`);

    return {
      success: true,
      message: 'Your password has been changed successfully. Please Login.',
    };
  }
}
