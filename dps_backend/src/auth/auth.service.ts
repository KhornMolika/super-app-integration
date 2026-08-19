import { Injectable, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { AccessControlService } from '../access-control/access-control.service';

@Injectable()
export class AuthService implements OnModuleInit {
  private privateKey!: string;
  private publicKey!: string;
  private jwk: any;

  constructor(
    private jwtService: JwtService,
    private accessControlService: AccessControlService
  ) {}

  onModuleInit() {
    // Generate RSA key pair for signing JWTs
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    this.privateKey = privateKey;
    this.publicKey = publicKey;

    // Convert public key to JWK format
    const pubKeyObject = crypto.createPublicKey(this.publicKey);
    const jwkFormat = pubKeyObject.export({ format: 'jwk' }) as any;
    
    // Add kid (key ID) and alg (algorithm)
    this.jwk = {
      ...jwkFormat,
      kid: 'dps-poc-key-1',
      alg: 'RS256',
      use: 'sig'
    };
  }

  getJwks() {
    return {
      keys: [this.jwk]
    };
  }

  async login(body: any) {
    // Find user in DB
    const user = await this.accessControlService.findByEmailWithPermissions(body.email);

    if (!user) {
      return { success: false, message: 'Invalid credentials' };
    }

    // Extract all permissions from roles
    const permissions = new Set<string>();
    user.roles.forEach(role => {
      role.permissions.forEach(p => permissions.add(p.name));
    });

    const payload = { 
      sub: user.id, 
      email: user.email, 
      name: user.name, 
      roles: user.roles.map(r => r.name),
      permissions: Array.from(permissions)
    };

    return {
      success: true,
      message: 'Logged in successfully',
      access_token: this.jwtService.sign(payload, {
        privateKey: this.privateKey,
        algorithm: 'RS256',
        keyid: 'dps-poc-key-1'
      }),
      expires_in: 3600,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: payload.roles,
        permissions: payload.permissions
      }
    };
  }
}
