import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GitLabOAuthService {
  private readonly logger = new Logger(GitLabOAuthService.name);

  constructor(private readonly configService: ConfigService) {}

  private getClientId(): string | undefined {
    return this.configService.get<string>('GITLAB_OAUTH_CLIENT_ID');
  }

  private getClientSecret(): string | undefined {
    return this.configService.get<string>('GITLAB_OAUTH_CLIENT_SECRET');
  }

  private getRedirectUri(): string {
    return this.configService.get<string>('GITLAB_OAUTH_REDIRECT_URI') || 'http://localhost:3000/api/integrations/git/gitlab/callback';
  }

  private getBaseUrl(): string {
    return this.configService.get<string>('GITLAB_BASE_URL') || 'https://gitlab.com';
  }

  isOAuthConfigured(): boolean {
    return Boolean(this.getClientId() && this.getClientSecret());
  }

  getAuthorizationUrl(state?: string): string {
    const clientId = this.getClientId();
    if (!clientId) {
      throw new Error('GitLab OAuth Client ID is not configured.');
    }
    const redirectUri = encodeURIComponent(this.getRedirectUri());
    const scope = encodeURIComponent('read_api read_repository');
    let url = `${this.getBaseUrl().replace(/\/+$/, '')}/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    if (state) {
      url += `&state=${encodeURIComponent(state)}`;
    }
    return url;
  }

  async exchangeCodeForToken(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();
    if (!clientId || !clientSecret) {
      throw new Error('GitLab OAuth credentials are not configured.');
    }

    const tokenUrl = `${this.getBaseUrl().replace(/\/+$/, '')}/oauth/token`;
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.getRedirectUri(),
      }),
    });

    if (!res.ok) {
      throw new Error(`GitLab OAuth token exchange failed (${res.status}): ${await res.text()}`);
    }

    const data = (await res.json()) as any;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }
}
