import {
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { AccessControlService } from '../access-control/access-control.service';

export const END_USER_TYP = 'end_user';
export const BACK_OFFICE_TYP = 'back_office';
export const END_USER_AUDIENCE = 'super-app-mobile';
export const BACK_OFFICE_TOKEN_TTL_SECONDS = 3600;

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
  ) {}

  private get issuer(): string {
    return process.env.JWT_ISSUER || 'super-app-backend';
  }

  onModuleInit() {
    this.keyId = process.env.JWT_KEY_ID || 'dps-key-1';
    const configured = process.env.JWT_PRIVATE_KEY;

    if (configured && configured.trim()) {
      // Accept both real multi-line PEM and the single-line "\n"-escaped form.
      this.privateKey = configured.replace(/\\n/g, '\n').trim();
      let keyObj: crypto.KeyObject;
      try {
        keyObj = crypto.createPrivateKey(this.privateKey);
      } catch {
        // Deliberately no underlying error text: it could echo key material.
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
   * Optionally enforces audience and `typ` claim. Throws UnauthorizedException.
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

  async login(body: any) {
    // Find user in DB
    const user = await this.accessControlService.findByEmailWithPermissions(
      body.email,
    );

    if (!user) {
      return { success: false, message: 'Invalid credentials' };
    }

    // Extract all permissions from roles
    const permissions = new Set<string>();
    user.roles.forEach((role) => {
      role.permissions.forEach((p) => permissions.add(p.name));
    });

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles.map((r) => r.name),
      permissions: Array.from(permissions),
      typ: BACK_OFFICE_TYP,
    };

    return {
      success: true,
      message: 'Logged in successfully',
      access_token: this.jwtService.sign(payload, {
        privateKey: this.privateKey,
        algorithm: 'RS256',
        keyid: this.keyId,
        issuer: this.issuer,
        expiresIn: BACK_OFFICE_TOKEN_TTL_SECONDS,
      }),
      expires_in: BACK_OFFICE_TOKEN_TTL_SECONDS,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: payload.roles,
        permissions: payload.permissions,
      },
    };
  }
}
