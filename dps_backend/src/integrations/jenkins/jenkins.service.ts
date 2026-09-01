import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JenkinsService {
  private readonly logger = new Logger(JenkinsService.name);
  private readonly jenkinsUrl: string;
  private readonly jenkinsUser: string;
  private readonly jenkinsApiToken: string;
  private readonly callbackBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.jenkinsUrl = this.configService.get<string>('JENKINS_URL', 'http://localhost:8085').replace(/\/$/, '');
    this.jenkinsUser = this.configService.get<string>('JENKINS_USER', 'admin');
    this.jenkinsApiToken = this.configService.get<string>('JENKINS_API_TOKEN', '115ed206119433c7d3804cf23865c3255a');
    this.callbackBaseUrl = this.configService.get<string>('CALLBACK_BASE_URL', 'http://host.docker.internal:3000').replace(/\/$/, '');
  }

  private getAuthHeader(): string | null {
    if (this.jenkinsUser && this.jenkinsApiToken) {
      const credentials = Buffer.from(`${this.jenkinsUser}:${this.jenkinsApiToken}`).toString('base64');
      return `Basic ${credentials}`;
    }
    return null;
  }

  /**
   * Fetches a CSRF Crumb from Jenkins if required
   */
  private async getCrumb(): Promise<{ headerName: string; crumb: string; cookie?: string } | null> {
    try {
      const headers: Record<string, string> = {};
      const authHeader = this.getAuthHeader();
      if (authHeader) headers['Authorization'] = authHeader;

      const res = await fetch(`${this.jenkinsUrl}/crumbIssuer/api/json`, { headers });
      if (!res.ok) {
        return null;
      }
      const data = await res.json();
      const cookie = res.headers.get('set-cookie')?.split(';')[0];
      return {
        headerName: data.crumbRequestField || 'Jenkins-Crumb',
        crumb: data.crumb,
        cookie,
      };
    } catch (e: any) {
      this.logger.debug(`Crumb issuer check skipped or unavailable: ${e.message}`);
      return null;
    }
  }

  /**
   * Triggers the webview-validation parameterized pipeline in Jenkins
   */
  async triggerWebViewValidation(options: {
    miniAppId: string;
    targetUrl: string;
    allowedDomains?: string[];
    allowLocal?: boolean;
  }): Promise<{ success: boolean; message: string }> {
    const jobName = 'webview-validation';
    const callbackUrl = `${this.callbackBaseUrl}/api/integrations/validation/callback`;
    const allowedDomainsStr = (options.allowedDomains || []).join(',');
    const allowLocalStr = options.allowLocal ? 'true' : 'false';

    const params = new URLSearchParams({
      MINIAPP_ID: options.miniAppId,
      TARGET_URL: options.targetUrl,
      ALLOWED_DOMAINS: allowedDomainsStr,
      CALLBACK_URL: callbackUrl,
      ALLOW_LOCAL: allowLocalStr,
    });

    const triggerUrl = `${this.jenkinsUrl}/job/${jobName}/buildWithParameters?${params.toString()}`;
    this.logger.log(`Triggering Jenkins pipeline: ${triggerUrl}`);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      const authHeader = this.getAuthHeader();
      if (authHeader) {
        headers['Authorization'] = authHeader;
      }

      // If crumb is available, include it
      const crumbData = await this.getCrumb();
      if (crumbData) {
        headers[crumbData.headerName] = crumbData.crumb;
        if (crumbData.cookie) {
          headers['Cookie'] = crumbData.cookie;
        }
      }

      const response = await fetch(triggerUrl, {
        method: 'POST',
        headers,
      });

      if (response.status === 201 || response.status === 200) {
        this.logger.log(`Jenkins job "${jobName}" triggered successfully for Mini App ${options.miniAppId}`);
        return { success: true, message: 'Jenkins pipeline triggered successfully' };
      }

      const responseBody = await response.text();
      this.logger.warn(`Jenkins trigger returned HTTP ${response.status}: ${responseBody.substring(0, 300)}`);
      return {
        success: false,
        message: `Jenkins returned HTTP ${response.status}: ${responseBody.substring(0, 150)}`,
      };
    } catch (err: any) {
      this.logger.error(`Failed to trigger Jenkins pipeline: ${err.message}`);
      return { success: false, message: `Could not connect to Jenkins: ${err.message}` };
    }
  }

  /**
   * Triggers the superapp-build parameterized pipeline in Jenkins
   */
  async triggerSuperAppBuild(options: {
    appName?: string;
    releaseVersion: string;
    buildType?: string;
  }): Promise<{ success: boolean; message: string }> {
    const jobName = 'superapp-build';
    const callbackUrl = `${this.callbackBaseUrl}/api/release-assembly/build-callback`;
    const buildType = options.buildType || 'debug';
    const appName = options.appName || 'superapp';

    const params = new URLSearchParams({
      APP_NAME: appName,
      RELEASE_VERSION: options.releaseVersion,
      BUILD_TYPE: buildType,
      CALLBACK_URL: callbackUrl,
      NEXUS_URL: 'http://host.docker.internal:8081',
    });

    const triggerUrl = `${this.jenkinsUrl}/job/${jobName}/buildWithParameters?${params.toString()}`;
    this.logger.log(`Triggering Jenkins Super App build pipeline: ${triggerUrl}`);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      const authHeader = this.getAuthHeader();
      if (authHeader) {
        headers['Authorization'] = authHeader;
      }

      const crumbData = await this.getCrumb();
      if (crumbData) {
        headers[crumbData.headerName] = crumbData.crumb;
        if (crumbData.cookie) {
          headers['Cookie'] = crumbData.cookie;
        }
      }

      const response = await fetch(triggerUrl, {
        method: 'POST',
        headers,
      });

      if (response.status === 201 || response.status === 200) {
        this.logger.log(`Jenkins job "${jobName}" triggered successfully for release ${options.releaseVersion}`);
        return { success: true, message: 'Super App build pipeline triggered successfully' };
      }

      const responseBody = await response.text();
      this.logger.warn(`Jenkins trigger returned HTTP ${response.status}: ${responseBody.substring(0, 300)}`);
      return {
        success: false,
        message: `Jenkins returned HTTP ${response.status}: ${responseBody.substring(0, 150)}`,
      };
    } catch (err: any) {
      this.logger.error(`Failed to trigger Jenkins build: ${err.message}`);
      return { success: false, message: `Could not connect to Jenkins: ${err.message}` };
    }
  }
}

