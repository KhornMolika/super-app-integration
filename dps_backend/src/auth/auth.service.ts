import { Injectable, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService implements OnModuleInit {
  private privateKey!: string;
  private publicKey!: string;
  private jwk: any;

  constructor(private jwtService: JwtService) {}

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

  login(user: any) {
    const payload = { sub: user.id, email: user.email, name: user.name, role: user.role };
    return {
      access_token: this.jwtService.sign(payload, {
        privateKey: this.privateKey,
        algorithm: 'RS256',
        keyid: 'dps-poc-key-1'
      }),
      expires_in: 3600
    };
  }
}
