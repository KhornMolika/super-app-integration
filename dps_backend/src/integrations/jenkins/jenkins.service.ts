import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JenkinsService {
  private readonly logger = new Logger(JenkinsService.name);
  private readonly jenkinsUrl: string;
  private readonly jenkinsUser: string;
  private readonly jenkinsApiToken: string;
  private readonly callbackBaseUrl: string;
  private readonly superAppRepoUrl: string;
  private readonly superAppBranch: string;
  private readonly sandboxBaseHref: string;
  private readonly sandboxBuildMode: string;
  private readonly jenkinsNexusUrl: string;

  /** Public API URL baked into the mobile app build (Flutter --dart-define=API_BASE_URL). */
  private readonly mobileApiBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.mobileApiBaseUrl = (
      this.configService.get<string>('MOBILE_API_BASE_URL') || ''
    ).trim();
    this.jenkinsUrl = this.configService
      .get<string>('JENKINS_URL', 'http://localhost:8085')
      .replace(/\/$/, '');
    this.jenkinsUser = this.configService.get<string>('JENKINS_USER') || '';
    this.jenkinsApiToken =
      this.configService.get<string>('JENKINS_API_TOKEN') ||
      this.configService.get<string>('JENKINS_PASSWORD') ||
      '';
    this.callbackBaseUrl = this.configService
      .get<string>('CALLBACK_BASE_URL', 'http://host.docker.internal:3000')
      .replace(/\/$/, '');

    this.superAppRepoUrl = this.configService.get<string>(
      'SUPERAPP_GIT_REPO_URL',
      'https://git.fintechcenterfsa.com/frontend/super-app.git',
    );
    this.superAppBranch = this.configService.get<string>(
      'SUPERAPP_GIT_BRANCH',
      'main',
    );
    this.sandboxBaseHref = this.configService.get<string>(
      'SUPERAPP_SANDBOX_BASE_HREF',
      '/superapp-sandbox/',
    );
    this.sandboxBuildMode = this.configService.get<string>(
      'SUPERAPP_SANDBOX_BUILD_MODE',
      'release',
    );
    this.jenkinsNexusUrl = this.configService.get<string>(
      'JENKINS_NEXUS_URL',
      'http://host.docker.internal:8081',
    );
  }

  private getAuthHeader(): string | null {
    const user =
      this.configService.get<string>('JENKINS_USER') ||
      process.env.JENKINS_USER ||
      this.jenkinsUser;
    const token =
      this.configService.get<string>('JENKINS_API_TOKEN') ||
      this.configService.get<string>('JENKINS_PASSWORD') ||
      process.env.JENKINS_API_TOKEN ||
      this.jenkinsApiToken;
    if (user && token) {
      const credentials = Buffer.from(`${user}:${token}`).toString('base64');
      return `Basic ${credentials}`;
    }
    return null;
  }

  /**
   * Fetches a CSRF Crumb from Jenkins if required
   */
  private async getCrumb(): Promise<{
    headerName: string;
    crumb: string;
    cookie?: string;
  } | null> {
    try {
      const headers: Record<string, string> = {};
      const authHeader = this.getAuthHeader();
      if (authHeader) headers['Authorization'] = authHeader;

      const res = await fetch(`${this.jenkinsUrl}/crumbIssuer/api/json`, {
        headers,
      });
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
      this.logger.debug(
        `Crumb issuer check skipped or unavailable: ${e.message}`,
      );
      return null;
    }
  }

  /**
   * Universal parameterized pipeline trigger for all Mini App integration methods
   * (WEBVIEW, FLUTTER_PACKAGE, NATIVE_SDK, DEEP_LINK)
   */
  async triggerMiniAppValidation(options: {
    miniAppId: string;
    integrationMethod: 'WEBVIEW' | 'FLUTTER_PACKAGE' | 'NATIVE_SDK' | 'DEEP_LINK';
    checks?: string[];
    targetUrl?: string;
    urlScheme?: string;
    appStoreUrl?: string;
    allowedDomains?: string[];
    packageName?: string;
    version?: string;
    integrationType?: 'ARTIFACT' | 'SOURCE_CODE';
    sourceStoragePath?: string;
    repoUrl?: string;
    commitSha?: string;
    gitProvider?: string;
    allowedCapabilities?: string[];
    requiredCapabilities?: string[];
    allowLocal?: boolean;
    isPrivateRepo?: boolean;
    gitAuthMethod?: string;
    gitAccessToken?: string;
    deployKey?: string;
  }): Promise<{ success: boolean; message: string }> {
    const jobName = 'miniapp-validation';
    const callbackUrl = `${this.callbackBaseUrl}/api/integrations/validation/callback`;
    const allowedDomainsStr = (options.allowedDomains || []).join(',');
    const allowedCapsStr = (options.allowedCapabilities || ['camera', 'geolocator', 'local_auth']).join(',');
    const requiredCapsStr = (options.requiredCapabilities || []).join(',');
    const checksStr = (options.checks || []).join(',');
    const allowLocalStr = options.allowLocal ? 'true' : 'false';

    const params = new URLSearchParams({
      MINIAPP_ID: options.miniAppId,
      INTEGRATION_METHOD: options.integrationMethod,
      CHECKS: checksStr,
      TARGET_URL: options.targetUrl || '',
      URL_SCHEME: options.urlScheme || '',
      APP_STORE_URL: options.appStoreUrl || '',
      ALLOWED_DOMAINS: allowedDomainsStr,
      PACKAGE_NAME: options.packageName || '',
      VERSION: options.version || '1.0.0',
      INTEGRATION_TYPE: options.integrationType || 'ARTIFACT',
      SOURCE_STORAGE_PATH: options.sourceStoragePath || '',
      REPO_URL: options.repoUrl || '',
      COMMIT_SHA: options.commitSha || 'main',
      GIT_PROVIDER: options.gitProvider || 'GITHUB',
      ALLOWED_CAPABILITIES: allowedCapsStr,
      REQUIRED_CAPABILITIES: requiredCapsStr,
      IS_PRIVATE_REPO: options.isPrivateRepo ? 'true' : 'false',
      GIT_AUTH_METHOD: options.gitAuthMethod || (options.isPrivateRepo ? 'deploy_key' : 'none'),
      GIT_ACCESS_TOKEN: options.gitAccessToken || '',
      GIT_DEPLOY_KEY: options.deployKey || '',
      CALLBACK_URL: callbackUrl,
      ALLOW_LOCAL: allowLocalStr,
    });

    const triggerUrl = `${this.jenkinsUrl}/job/${jobName}/buildWithParameters?${params.toString()}`;
    this.logger.log(`Triggering Jenkins miniapp-validation pipeline (${options.integrationMethod}): ${triggerUrl}`);

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
        this.logger.log(
          `Jenkins job "${jobName}" triggered successfully for ${options.integrationMethod} Mini App ${options.miniAppId}`,
        );
        return {
          success: true,
          message: 'Jenkins miniapp-validation pipeline triggered successfully',
        };
      }

      const responseBody = await response.text();
      this.logger.warn(
        `Jenkins trigger returned HTTP ${response.status}: ${responseBody.substring(0, 300)}`,
      );
      return {
        success: false,
        message: `Jenkins returned HTTP ${response.status}: ${responseBody.substring(0, 150)}`,
      };
    } catch (err: any) {
      this.logger.error(`Failed to trigger Jenkins miniapp-validation pipeline: ${err.message}`);
      return {
        success: false,
        message: `Could not connect to Jenkins: ${err.message}`,
      };
    }
  }

  /**
   * Triggers the miniapp-validation parameterized pipeline in Jenkins for WebViews
   */
  async triggerWebViewValidation(options: {
    miniAppId: string;
    targetUrl: string;
    allowedDomains?: string[];
    allowLocal?: boolean;
    checks?: string[];
  }): Promise<{ success: boolean; message: string }> {
    return this.triggerMiniAppValidation({
      miniAppId: options.miniAppId,
      integrationMethod: 'WEBVIEW',
      targetUrl: options.targetUrl,
      allowedDomains: options.allowedDomains,
      allowLocal: options.allowLocal,
      checks: options.checks,
    });
  }

  /**
   * Triggers the miniapp-validation parameterized pipeline in Jenkins for Flutter Packages
   */
  async triggerPackageValidation(options: {
    miniAppId: string;
    packageName?: string;
    version?: string;
    integrationType?: 'ARTIFACT' | 'SOURCE_CODE';
    sourceStoragePath?: string;
    repoUrl?: string;
    commitSha?: string;
    gitProvider?: string;
    allowedCapabilities?: string[];
    requiredCapabilities?: string[];
    checks?: string[];
    isPrivateRepo?: boolean;
    gitAuthMethod?: string;
    gitAccessToken?: string;
    deployKey?: string;
  }): Promise<{ success: boolean; message: string }> {
    return this.triggerMiniAppValidation({
      miniAppId: options.miniAppId,
      integrationMethod: 'FLUTTER_PACKAGE',
      packageName: options.packageName,
      version: options.version,
      integrationType: options.integrationType,
      sourceStoragePath: options.sourceStoragePath,
      repoUrl: options.repoUrl,
      commitSha: options.commitSha,
      gitProvider: options.gitProvider,
      allowedCapabilities: options.allowedCapabilities,
      requiredCapabilities: options.requiredCapabilities,
      checks: options.checks,
      isPrivateRepo: options.isPrivateRepo,
      gitAuthMethod: options.gitAuthMethod,
      gitAccessToken: options.gitAccessToken,
      deployKey: options.deployKey,
    });
  }

  /**
   * Triggers the superapp-test-build parameterized pipeline in Jenkins
   */
  async triggerSuperAppBuild(options: {
    appName?: string;
    releaseVersion: string;
    buildType?: string;
    nexusUrl?: string;
    /** GitLab merge request number of the native-SDK codegen MR (digits only), for release notes. */
    codegenMrIid?: string;
    /** Overrides MOBILE_API_BASE_URL: backend URL the built app talks to. */
    apiBaseUrl?: string;
  }): Promise<{ success: boolean; message: string }> {
    const jobName = 'superapp-test-build';
    const callbackUrl = `${this.callbackBaseUrl}/api/release-assembly/build-callback`;
    const buildType = options.buildType || 'debug';
    const appName = options.appName || 'superapp';
    const nexusUrl = options.nexusUrl || this.jenkinsNexusUrl;

    const params = new URLSearchParams({
      APP_NAME: appName,
      RELEASE_VERSION: options.releaseVersion,
      BUILD_TYPE: buildType,
      CALLBACK_URL: callbackUrl,
      NEXUS_URL: nexusUrl,
    });
    // Backend URL baked into the app. Release builds must be https (the app refuses cleartext).
    const apiBaseUrl = (options.apiBaseUrl ?? this.mobileApiBaseUrl).trim();
    if (apiBaseUrl) {
      const ok =
        /^https?:\/\/[A-Za-z0-9._:-]+(?:\/[A-Za-z0-9._~%/-]*)?$/.test(
          apiBaseUrl,
        ) &&
        (buildType !== 'release' || apiBaseUrl.startsWith('https://'));
      if (ok) params.set('API_BASE_URL', apiBaseUrl.replace(/\/+$/, ''));
      else {
        this.logger.warn(
          `Ignoring invalid MOBILE_API_BASE_URL for a ${buildType} build (must be http(s) URL; https for release)`,
        );
      }
    } else if (buildType === 'release') {
      this.logger.warn(
        'MOBILE_API_BASE_URL is not set: the release app build will refuse to talk to the backend',
      );
    }
    // Only sent when known; the Jenkinsfile defaults it to '' and accepts digits only.
    if (options.codegenMrIid && /^\d{1,9}$/.test(options.codegenMrIid)) {
      params.set('CODEGEN_MR_IID', options.codegenMrIid);
    }

    const triggerUrl = `${this.jenkinsUrl}/job/${jobName}/buildWithParameters?${params.toString()}`;
    this.logger.log(
      `Triggering Jenkins Super App build pipeline: ${triggerUrl}`,
    );

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
        this.logger.log(
          `Jenkins job "${jobName}" triggered successfully for release ${options.releaseVersion}`,
        );
        return {
          success: true,
          message: 'Super App build pipeline triggered successfully',
        };
      }

      const responseBody = await response.text();
      this.logger.warn(
        `Jenkins trigger returned HTTP ${response.status}: ${responseBody.substring(0, 300)}`,
      );
      return {
        success: false,
        message: `Jenkins returned HTTP ${response.status}: ${responseBody.substring(0, 150)}`,
      };
    } catch (err: any) {
      this.logger.error(`Failed to trigger Jenkins build: ${err.message}`);
      return {
        success: false,
        message: `Could not connect to Jenkins: ${err.message}`,
      };
    }
  }

  /**
   * Triggers the superapp-sandbox-build parameterized pipeline in Jenkins
   */
  async triggerSuperAppSandboxBuild(options?: {
    branch?: string;
    baseHref?: string;
    buildMode?: string;
    publishToNexus?: boolean;
    repoUrl?: string;
    nexusUrl?: string;
  }): Promise<{ success: boolean; message: string }> {
    const jobName = 'superapp-sandbox-build';
    const callbackUrl = `${this.callbackBaseUrl}/api/release-assembly/build-callback`;
    const branch = options?.branch || this.superAppBranch;
    const baseHref = options?.baseHref || this.sandboxBaseHref;
    const buildMode = options?.buildMode || this.sandboxBuildMode;
    const publishToNexus = options?.publishToNexus ? 'true' : 'false';
    const repoUrl = options?.repoUrl || this.superAppRepoUrl;
    const nexusUrl = options?.nexusUrl || this.jenkinsNexusUrl;

    const params = new URLSearchParams({
      REPO_URL: repoUrl,
      BRANCH: branch,
      BASE_HREF: baseHref,
      BUILD_MODE: buildMode,
      CALLBACK_URL: callbackUrl,
      NEXUS_URL: nexusUrl,
      PUBLISH_TO_NEXUS: publishToNexus,
    });

    const triggerUrl = `${this.jenkinsUrl}/job/${jobName}/buildWithParameters?${params.toString()}`;
    this.logger.log(
      `Triggering Jenkins Super App Web Sandbox pipeline: ${triggerUrl}`,
    );

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
        this.logger.log(
          `Jenkins job "${jobName}" triggered successfully for branch ${branch}`,
        );
        return {
          success: true,
          message: 'Super App Web Sandbox pipeline triggered successfully',
        };
      }

      const responseBody = await response.text();
      this.logger.warn(
        `Jenkins sandbox trigger returned HTTP ${response.status}: ${responseBody.substring(0, 300)}`,
      );
      return {
        success: false,
        message: `Jenkins returned HTTP ${response.status}: ${responseBody.substring(0, 150)}`,
      };
    } catch (err: any) {
      this.logger.error(
        `Failed to trigger Jenkins sandbox build: ${err.message}`,
      );
      return {
        success: false,
        message: `Could not connect to Jenkins: ${err.message}`,
      };
    }
  }
}
