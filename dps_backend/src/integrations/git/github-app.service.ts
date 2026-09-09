import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class GitHubAppService {
  private readonly logger = new Logger(GitHubAppService.name);

  constructor(private readonly configService: ConfigService) {}

  private getAppId(): string | undefined {
    return this.configService.get<string>('GITHUB_APP_ID');
  }

  private getPrivateKey(): string | undefined {
    const rawKey = this.configService.get<string>('GITHUB_APP_PRIVATE_KEY');
    if (!rawKey) return undefined;
    if (rawKey.startsWith('-----BEGIN')) {
      return rawKey;
    }
    // Base64 encoded PEM key support
    try {
      return Buffer.from(rawKey, 'base64').toString('utf8');
    } catch {
      return rawKey;
    }
  }

  isAppConfigured(): boolean {
    return Boolean(this.getAppId() && this.getPrivateKey());
  }

  /**
   * Generates a GitHub App JWT valid for 10 minutes (standard GitHub App max)
   */
  generateAppJwt(): string {
    const appId = this.getAppId();
    const privateKey = this.getPrivateKey();
    if (!appId || !privateKey) {
      throw new Error('GitHub App ID or Private Key is not configured.');
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60, // 1 minute in the past for clock drift
      exp: now + 600, // 10 minutes expiration
      iss: appId,
    };

    const header = { alg: 'RS256', typ: 'JWT' };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
      'base64url',
    );
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(dataToSign);
    const signature = signer.sign(privateKey, 'base64url');

    return `${dataToSign}.${signature}`;
  }

  /**
   * Obtains a short-lived installation access token for a repository or installation
   */
  async getInstallationAccessToken(installationId?: string): Promise<string> {
    const baseApi =
      this.configService.get<string>('GITHUB_BASE_URL') ||
      'https://api.github.com';
    const fallbackToken = this.configService.get<string>('GITHUB_TOKEN');

    if (!this.isAppConfigured()) {
      if (fallbackToken) return fallbackToken;
      throw new Error(
        'GitHub App is not configured and no fallback GITHUB_TOKEN provided.',
      );
    }

    const appJwt = this.generateAppJwt();

    let targetInstallationId = installationId;
    if (!targetInstallationId) {
      // Fetch first installation
      const instRes = await fetch(`${baseApi}/app/installations`, {
        headers: {
          Authorization: `Bearer ${appJwt}`,
          Accept: 'application/vnd.github+json',
        },
      });
      if (!instRes.ok) {
        throw new Error(
          `Failed to fetch GitHub App installations: ${instRes.statusText}`,
        );
      }
      const installations = (await instRes.json()) as any[];
      if (!installations || installations.length === 0) {
        if (fallbackToken) return fallbackToken;
        throw new Error('No installations found for this GitHub App.');
      }
      targetInstallationId = String(installations[0].id);
    }

    const res = await fetch(
      `${baseApi}/app/installations/${targetInstallationId}/access_tokens`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${appJwt}`,
          Accept: 'application/vnd.github+json',
        },
      },
    );

    if (!res.ok) {
      if (fallbackToken) return fallbackToken;
      throw new Error(`Failed to create installation token: ${res.statusText}`);
    }

    const data = await res.json();
    return data.token;
  }
}
