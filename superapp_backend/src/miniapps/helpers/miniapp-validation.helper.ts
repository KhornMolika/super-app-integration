import { scanSourceOf } from '../../integrations/flutter/git-source.util';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isEmail } from 'class-validator';
import { MiniApp } from '../entities/miniapp.entity';
import { MiniAppIssue } from '../entities/miniapp-issue.entity';
import { IsUrlReachableConstraint } from '../../common/validators/is-url-reachable.validator';
import { NotificationsService, MailService } from '../../notifications';
import { CapabilitiesService } from '../../capabilities/capabilities.service';
import { CapabilityProposalsService } from '../../capability-proposals/capability-proposals.service';
import { SuperAppService } from '../../super-app/super-app.service';
import { GitIntegrationService } from '../../integrations/git/git-integration.service';
import { NexusIntegrationService } from '../../integrations/nexus/nexus-integration.service';
import { DomainVerificationService } from '../../integrations/webview/domain-verification.service';
import { JenkinsService } from '../../integrations/jenkins/jenkins.service';
import {
  LocalSecurityScannerService,
  buildDynamicValidationStages,
  getDefaultChecksForMethod,
} from '../../integrations/validation/local-security-scanner.service';

/** An app in one of these has been approved at least once: a failed check never sends it back to DRAFT. */
const POST_APPROVAL_STATUSES = new Set([
  'APPROVED',
  'APPROVED_FOR_TESTING',
  'BUILDING',
  'BUILDING_STAGE_1',
  'TESTING',
  'TEST_PASSED',
  'BUILDING_STAGE_2',
  'ACTIVE',
  'SUSPENDED',
]);

@Injectable()
export class MiniappValidationHelper {
  private readonly logger = new Logger(MiniappValidationHelper.name);

  constructor(
    @InjectRepository(MiniApp)
    private miniappRepository: Repository<MiniApp>,

    @InjectRepository(MiniAppIssue)
    private issueRepository: Repository<MiniAppIssue>,

    private mailService: MailService,
    private notificationsService: NotificationsService,
    private capabilitiesService: CapabilitiesService,
    private capabilityProposalsService: CapabilityProposalsService,
    private superAppService: SuperAppService,
    private gitService: GitIntegrationService,
    private nexusService: NexusIntegrationService,
    private domainVerificationService: DomainVerificationService,
    private jenkinsService: JenkinsService,
    private localSecurityScannerService: LocalSecurityScannerService,
  ) {}

  async validateMiniAppAsync(
    app: MiniApp,
    logActivityFn?: (
      miniAppId: string,
      actorId: string,
      actionType: string,
      title: string,
      description: string,
      auditAction: string,
      oldVal?: any,
      newVal?: any,
    ) => Promise<void>,
  ) {
    const id = app.id;
    const errors: Record<string, string> = {};
    const urlValidator = new IsUrlReachableConstraint();
    const checks: Promise<void>[] = [];

    const ownerEmail =
      (app as any).ownerEmail || app.supportEmail || app.owner?.email;
    if (!ownerEmail || !isEmail(ownerEmail)) {
      errors.ownerEmail = 'ownerEmail must be a valid email address.';
    }
    if (app.supportEmail && !isEmail(app.supportEmail)) {
      errors.supportEmail = 'supportEmail must be a valid email address.';
    }

    if (app.logo && app.logo.trim() !== '') {
      if (
        app.logo.startsWith('data:image/') ||
        app.logo.startsWith('data:') ||
        app.logo.startsWith('/uploads/') ||
        app.logo.startsWith('/fsa-logo') ||
        app.logo.includes('superapp-storage') ||
        app.logo.includes('mini-app-assets') ||
        app.logo.includes('mini-app-logos') ||
        app.logo.includes('minio') ||
        app.logo.includes(':9000')
      ) {
        // Uploaded or internal storage image format is valid
      } else {
        checks.push(
          urlValidator.validate(app.logo, null as any).then((isValid) => {
            if (!isValid)
              errors.logo = 'logo must be a reachable and accessible URL.';
          }),
        );
      }
    }

    if (app.integrationMethod === 'WEBVIEW') {
      const envVal = (
        process.env.ENVIRONMENT ||
        process.env.NODE_ENV ||
        ''
      ).toUpperCase();
      const isDev =
        envVal !== 'PROD' &&
        (envVal === 'DEV' || process.env.NODE_ENV !== 'PROD');

      if (!app.integrationConfig?.productionUrl) {
        errors['integrationConfigWebView.productionUrl'] =
          'productionUrl is required for WebView integration.';
      } else {
        const prodUrl = app.integrationConfig.productionUrl;
        let isValidProdUrl = true;
        let parsedUrl: URL | null = null;

        try {
          parsedUrl = new URL(prodUrl);
        } catch {
          errors['integrationConfigWebView.productionUrl'] =
            'Production URL has an invalid URL format.';
          isValidProdUrl = false;
        }

        if (parsedUrl) {
          if (!isDev) {
            if (parsedUrl.protocol !== 'https:') {
              errors['integrationConfigWebView.productionUrl'] =
                'Production URL must use HTTPS in PROD mode.';
              isValidProdUrl = false;
            } else if (
              parsedUrl.hostname === 'localhost' ||
              parsedUrl.hostname === '127.0.0.1'
            ) {
              errors['integrationConfigWebView.productionUrl'] =
                'Production URL cannot be localhost in PROD mode.';
              isValidProdUrl = false;
            }
          }
        }

        if (isValidProdUrl) {
          checks.push(
            urlValidator.validate(prodUrl, null as any).then((isValid) => {
              if (!isValid)
                errors['integrationConfigWebView.productionUrl'] =
                  'productionUrl must be a reachable and accessible URL.';
            }),
          );
        }
      }

      // Check stagingUrl format and reachability if provided
      if (app.integrationConfig?.stagingUrl) {
        const stagingUrl = app.integrationConfig.stagingUrl;
        let isValidStaging = true;
        let parsedStaging: URL | null = null;

        try {
          parsedStaging = new URL(stagingUrl);
        } catch {
          errors['integrationConfigWebView.stagingUrl'] =
            'Staging URL has an invalid URL format.';
          isValidStaging = false;
        }

        if (parsedStaging && !isDev && parsedStaging.protocol !== 'https:') {
          errors['integrationConfigWebView.stagingUrl'] =
            'Staging URL must use HTTPS.';
          isValidStaging = false;
        }

        if (isValidStaging) {
          checks.push(
            urlValidator.validate(stagingUrl, null as any).then((isValid) => {
              if (!isValid)
                errors['integrationConfigWebView.stagingUrl'] =
                  'stagingUrl must be a reachable and accessible URL.';
            }),
          );
        }
      }

      // Check domain verification
      const prodUrl = app.integrationConfig?.productionUrl;
      if (!app.isDomainVerified && !isDev) {
        if (prodUrl && app.verificationToken && app.appId) {
          checks.push(
            this.domainVerificationService
              .verifyDomainOwnership(prodUrl, app.appId, app.verificationToken)
              .then((result) => {
                if (result.success) {
                  app.isDomainVerified = true;
                  app.domainVerifiedAt = result.verifiedAt || new Date();
                  if (
                    result.allowedDomains &&
                    result.allowedDomains.length > 0
                  ) {
                    const currentAllowed = Array.isArray(
                      app.integrationConfig?.allowedDomains,
                    )
                      ? app.integrationConfig.allowedDomains
                      : [];
                    app.integrationConfig = {
                      ...app.integrationConfig,
                      allowedDomains: Array.from(
                        new Set([...currentAllowed, ...result.allowedDomains]),
                      ),
                    };
                  }
                } else {
                  errors['integrationConfigWebView.domainVerification'] =
                    result.message ||
                    'Domain ownership has not been verified. Please host the verification token at /.well-known/superapp-miniapp-association.json and verify.';
                }
              })
              .catch(() => {
                errors['integrationConfigWebView.domainVerification'] =
                  'Domain ownership has not been verified. Please host the verification token at /.well-known/superapp-miniapp-association.json and verify.';
              }),
          );
        } else {
          errors['integrationConfigWebView.domainVerification'] =
            'Domain ownership has not been verified. Please host the verification token at /.well-known/superapp-miniapp-association.json and verify.';
        }
      }

      // Check allowed domains format
      if (
        app.integrationConfig?.allowedDomains &&
        Array.isArray(app.integrationConfig.allowedDomains)
      ) {
        for (const domain of app.integrationConfig.allowedDomains) {
          if (
            typeof domain !== 'string' ||
            domain.includes('/') ||
            domain.includes('://')
          ) {
            errors['integrationConfigWebView.allowedDomains'] =
              `Invalid domain "${domain}". allowedDomains must only contain valid hostnames (e.g. "api.domain.com").`;
            break;
          }
        }
      }
    } else if (app.integrationMethod === 'FLUTTER_PACKAGE') {
      const flutterConfig = app.integrationConfig || {};
      // Same rule as the Backoffice form (isFlutterArtifact): Git only with a Git URL
      const isArtifact =
        flutterConfig.sourceType === 'ARTIFACT' ||
        (!flutterConfig.sourceType && !String(flutterConfig.gitUrl || '').trim());

      if (isArtifact) {
        const packageName = flutterConfig.packageName?.trim();
        // Only a stored archive counts: inspecting a file in the form fills its
        // checksum without storing it, and the scan reads the archive from MinIO
        const hasPackageArchive = Boolean(
          flutterConfig.packageStoragePath ||
          flutterConfig.minioKey ||
          flutterConfig.packageUrl,
        );

        if (!hasPackageArchive) {
          // Required: the archive is what gets security-scanned and published to Nexus
          errors['integrationConfigFlutter.archiveFile'] =
            'Attach the package archive (.zip or .tar.gz). It is required for a Flutter package: it is security-scanned and published to Nexus for you.';
        }
        if (!packageName) {
          errors['integrationConfigFlutter.packageName'] =
            'Package name is required for Artifact integration.';
        } else if (!hasPackageArchive) {
          // reported above
        } else {
          this.logger.log(
            `Package archive detected for "${packageName}" (Storage: ${flutterConfig.packageStoragePath || 'quarantine'}). CI validation pipeline will verify and publish to Nexus on review approval.`,
          );
        }
      } else {
        const gitUrl = flutterConfig.gitUrl?.trim();
        if (!gitUrl) {
          errors['integrationConfigFlutter.gitUrl'] =
            'Git URL is required for Source Code integration.';
        } else if (
          flutterConfig.isPrivateRepo &&
          flutterConfig.authMethod === 'token' &&
          !flutterConfig.gitAccessToken &&
          !flutterConfig.token
        ) {
          errors['integrationConfigFlutter.gitAccessToken'] =
            'Access Token is required for Private repository with Token authentication.';
        } else {
          const isDeployKey =
            Boolean(
              flutterConfig.isPrivateRepo &&
              flutterConfig.authMethod !== 'token',
            ) || gitUrl.startsWith('git@');

          checks.push(
            this.gitService
              .validatePackage(
                gitUrl,
                flutterConfig.gitBranch || flutterConfig.ref,
                flutterConfig.gitProvider || flutterConfig.provider,
                flutterConfig.gitAccessToken || flutterConfig.token,
                flutterConfig.gitPath || flutterConfig.path,
              )
              .then(async (result) => {
                if (!result.validation.isValid) {
                  if (isDeployKey) {
                    this.logger.log(
                      `Private Git repository configured with Deploy Key for ${gitUrl}. Full package verification will be orchestrated via Jenkins runner.`,
                    );
                  } else {
                    const is404NotFound =
                      result.validation.error
                        ?.toLowerCase()
                        .includes('not found') ||
                      result.validation.error?.includes('404');
                    if (is404NotFound) {
                      errors['integrationConfigFlutter.gitUrl'] =
                        `File 'pubspec.yaml' not found or repository '${gitUrl}' is private. If this repository is private, please select '🔒 Private Repository' and configure an SSH Deploy Key or Access Token.`;
                    } else {
                      errors['integrationConfigFlutter.gitUrl'] =
                        result.validation.error ||
                        `Git repository or pubspec.yaml could not be verified for ${gitUrl}.`;
                    }
                  }
                } else {
                  this.logger.log(
                    `Git repository metadata verified for ${gitUrl}. Automated security scanning and build integration will be orchestrated via Jenkins.`,
                  );
                }
              })
              .catch((err) => {
                if (isDeployKey) {
                  this.logger.log(
                    `Private Git repository with Deploy Key for ${gitUrl}: REST check skipped (${err.message}). Jenkins runner will verify with deploy key.`,
                  );
                } else {
                  const is404NotFound =
                    err.message?.toLowerCase().includes('not found') ||
                    err.message?.includes('404');
                  if (is404NotFound) {
                    errors['integrationConfigFlutter.gitUrl'] =
                      `Repository '${gitUrl}' was not found or is private. If this repository is private, please select '🔒 Private Repository' and configure an SSH Deploy Key or Access Token.`;
                  } else {
                    errors['integrationConfigFlutter.gitUrl'] =
                      `Could not verify Git repository "${gitUrl}": ${err.message}`;
                  }
                }
              }),
          );
        }
      }
    } else if (app.integrationMethod === 'DEEP_LINK') {
      if (!app.integrationConfig?.urlScheme) {
        errors['integrationConfigDeepLink.urlScheme'] =
          'URL scheme is required for Deep Link integration.';
      }
      if (
        app.integrationConfig?.appStoreUrl &&
        app.integrationConfig.appStoreUrl.trim() !== ''
      ) {
        checks.push(
          urlValidator
            .validate(app.integrationConfig.appStoreUrl, null as any)
            .then((isValid) => {
              if (!isValid)
                errors['integrationConfigDeepLink.appStoreUrl'] =
                  'App Store fallback URL must be a valid, reachable URL.';
            }),
        );
      }
    }

    const termsUrl = app.legal?.termsUrl || (app as any).termsUrl;
    if (termsUrl && termsUrl.trim() !== '') {
      checks.push(
        urlValidator.validate(termsUrl, null as any).then((isValid) => {
          if (!isValid)
            errors.termsUrl =
              'The Terms & Conditions URL is unreachable. Please verify the link is publicly accessible.';
        }),
      );
    }

    const privacyPolicyUrl =
      app.legal?.privacyPolicyUrl || (app as any).privacyPolicyUrl;
    if (privacyPolicyUrl && privacyPolicyUrl.trim() !== '') {
      checks.push(
        urlValidator.validate(privacyPolicyUrl, null as any).then((isValid) => {
          if (!isValid)
            errors.privacyPolicyUrl =
              'The Privacy Policy URL is unreachable. Please verify the link is publicly accessible.';
        }),
      );
    }

    const rawCapabilities =
      (app as any).capabilities || (app as any).permissions;
    if (rawCapabilities && Array.isArray(rawCapabilities)) {
      for (let index = 0; index < rawCapabilities.length; index++) {
        const perm = rawCapabilities[index];
        const permKey = perm.type || 'unknown';

        if (!perm.purpose || perm.purpose.trim() === '') {
          errors[`permissions.${index}.purpose`] =
            `Please describe why your MiniApp requires ${permKey} access.`;
        }

        // Permission Catalog & Compatibility Check
        const permissionDef = await this.capabilitiesService.findByKey(permKey);

        if (!permissionDef) {
          // UNKNOWN PERMISSION -> create proposal in permission_proposals
          if (perm.required !== false) {
            errors[`permissions.${index}.capability`] =
              `Required capability "${permKey}" is not recognized by the SuperApp platform. Please mark it as optional or submit a capability proposal.`;
          }
          await this.createPermissionProposal(app, permKey);
        } else {
          // Known permission, check SuperApp Runtime Compatibility
          const realCaps = await this.capabilitiesService.getCapabilities();
          const supportedCaps = realCaps.map((c) => c.key.toLowerCase());

          const isSupported =
            supportedCaps.includes(permissionDef.key.toLowerCase()) ||
            supportedCaps.includes(permissionDef.name.toLowerCase());

          if (!isSupported) {
            if (perm.required !== false) {
              errors[`permissions.${index}.capability`] =
                `Required capability "${permKey}" is not supported by the current SuperApp host shell. Please either mark it as optional or wait for shell support.`;
            } else {
              this.logger.log(
                `MiniApp "${app.name}" declares optional unsupported capability "${permKey}" - permitted in degraded runtime mode.`,
              );
            }

            await this.createPermissionProposal(
              app,
              permissionDef.key,
              permissionDef.name,
            );
          }
        }
      }
    }

    await Promise.all(checks);

    // Clear old issues
    await this.issueRepository.delete({ miniAppId: id });

    // Past approval only. availabilityStatus is not a signal: it defaults to TESTING on
    // every new row, which made a brand-new app look live, so a failed check left it
    // IN_REVIEW (no scan, nothing to fix) instead of returning it to DRAFT.
    const isLive =
      POST_APPROVAL_STATUSES.has(String(app.lifecycleStatus || '').toUpperCase()) ||
      app.availabilityStatus === 'PRODUCTION' ||
      Boolean(app.pendingRevision);

    if (Object.keys(errors).length > 0) {
      try {
        const updatePayload: any = {
          validationErrors: errors as any,
          validationStatus: 'FAILED',
        };
        if (!isLive) {
          updatePayload.lifecycleStatus = 'DRAFT';
        } else if (app.pendingRevision) {
          updatePayload.pendingRevision = {
            ...app.pendingRevision,
            validationStatus: 'FAILED',
            validationErrors: errors,
          };
        }
        await this.miniappRepository.update(id, updatePayload);
      } catch (updErr: any) {
        this.logger.warn(
          `Could not update validationErrors directly: ${updErr.message}`,
        );
        app.validationStatus = 'FAILED';
        if (!isLive) app.lifecycleStatus = 'DRAFT' as any;
        await this.miniappRepository.save(app);
      }

      // Create persistent issues
      const issues = Object.entries(errors).map(([key, value]) => {
        return this.issueRepository.create({
          miniAppId: id,
          type: 'VALIDATION_ERROR',
          severity: 'HIGH',
          description: value,
          status: 'OPEN',
          metadata: { field: key },
        });
      });
      await this.issueRepository.save(issues);

      // Create a notification with full issue details
      const issuesList = Object.values(errors)
        .map((msg) => `• ${msg}`)
        .join('\n');
      const notificationMessage = issuesList;

      await this.notificationsService.createNotification(
        app.ownerId || '',
        'Validation Failed',
        notificationMessage,
        'VALIDATION_FAILED',
        app.id,
        { errors, issueCount: issues.length, score: 0 },
      );
      if (logActivityFn) {
        await logActivityFn(
          id,
          'system',
          'VALIDATION',
          'Validation Failed',
          `Found ${issues.length} issues`,
          'VALIDATE_MINI_APP',
          app,
          await this.miniappRepository.findOne({ where: { id } }),
        );
      }

      const failEmail =
        (app as any).ownerEmail || app.supportEmail || app.owner?.email;
      if (failEmail) {
        await this.mailService.sendRegistrationFailureEmail(
          failEmail,
          app.name || app.appId || 'Unknown App',
          errors,
        );
      }
    } else {
      const method = (app.integrationMethod || 'WEBVIEW') as
        'WEBVIEW' | 'FLUTTER_PACKAGE' | 'NATIVE_SDK' | 'DEEP_LINK';
      const initialStages = buildDynamicValidationStages(
        method,
        app.securityChecks,
      );

      const updatePayload: any = {
        validationStatus: 'RUNNING',
        validationStages: initialStages as any,
        validationErrors: null as any,
      };
      if (!isLive) {
        updatePayload.lifecycleStatus = 'SUBMITTED';
      } else if (app.pendingRevision) {
        updatePayload.pendingRevision = {
          ...app.pendingRevision,
          validationStatus: 'RUNNING',
          validationStages: initialStages,
        };
      }
      await this.miniappRepository.update(id, updatePayload);

      const envVal = (process.env.ENVIRONMENT || '').toUpperCase();
      const allowLocal = envVal === 'DEV';
      const cfg = app.integrationConfig || {};

      const declaredPerms = Array.isArray(
        (app as any).capabilities || (app as any).permissions,
      )
        ? ((app as any).capabilities || (app as any).permissions)
            .map((p: any) =>
              typeof p === 'string' ? p : p.name || p.id || p.type,
            )
            .filter(Boolean)
        : [];
      const requiredPerms = declaredPerms;

      // SuperApp Host Supported Capabilities whitelist
      const allowedCaps = [
        'camera',
        'geolocator',
        'location',
        'local_auth',
        'biometrics',
      ];
      const requiredCaps = requiredPerms;

      const allowedDomains = Array.isArray(cfg.allowedDomains)
        ? cfg.allowedDomains
        : typeof cfg.allowedDomains === 'string'
          ? cfg.allowedDomains.split(',')
          : [];

      // Archive in MinIO or Git repository at the locked commit (same as the build)
      const { integrationType, sourceStoragePath, repoUrl, commitSha, gitProvider } =
        scanSourceOf(cfg);
      const packageName = cfg.packageName || cfg.name || app.name;
      const packageVersion = cfg.packageVersion || cfg.version || '1.0.0';

      this.logger.log(
        `Triggering universal Jenkins security scan for ${method} MiniApp ${id}...`,
      );

      this.jenkinsService
        .triggerMiniAppValidation({
          miniAppId: id,
          integrationMethod: method,
          targetUrl: cfg.productionUrl || cfg.url,
          urlScheme: cfg.urlScheme,
          appStoreUrl: cfg.appStoreUrl,
          allowedDomains,
          allowLocal,
          packageName,
          version: packageVersion,
          integrationType,
          sourceStoragePath,
          repoUrl,
          commitSha,
          gitProvider,
          allowedCapabilities: allowedCaps,
          requiredCapabilities: requiredCaps,
          checks: app.securityChecks || getDefaultChecksForMethod(method),
          isPrivateRepo: cfg.isPrivateRepo === true,
          gitAuthMethod:
            cfg.authMethod || (cfg.isPrivateRepo ? 'deploy_key' : 'none'),
          gitAccessToken: cfg.gitAccessToken || cfg.token || '',
          deployKey:
            cfg.deployKey ||
            (cfg.authMethod === 'deploy_key' ||
            (cfg.isPrivateRepo && !cfg.gitAccessToken)
              ? this.gitService.getDeployPrivateKey()
              : ''),
        })
        .then(async (res) => {
          if (!res?.success) {
            const reason =
              res?.message || 'Jenkins returned an unsuccessful status';
            this.logger.warn(
              `Jenkins unavailable (${reason}). Falling back to local security scanner for ${method}.`,
            );
            await this.localSecurityScannerService.scanMiniApp(id, method, {
              fallbackReason: reason,
              securityChecks: app.securityChecks,
            });
          } else {
            // Watchdog poller for Jenkins validation pipeline in case of Groovy/runner crash or abort
            this.monitorJenkinsValidation(id, method);
          }
        })
        .catch(async (err) => {
          const reason = `Jenkins connection failed: ${err.message}`;
          this.logger.error(
            `Jenkins trigger error: ${err.message}. Falling back to local security scanner for ${method}.`,
          );
          await this.localSecurityScannerService.scanMiniApp(id, method, {
            fallbackReason: reason,
            securityChecks: app.securityChecks,
          });
        });

      await this.notificationsService.createNotification(
        app.ownerId || '',
        'Validation Running',
        `${app.name || 'MiniApp'} automated security scans initiated on Jenkins (${method}).`,
        'SCAN_STARTED',
        app.id,
      );
      if (logActivityFn) {
        await logActivityFn(
          id,
          'system',
          'VALIDATION',
          'Validation Running',
          `Automated ${method} validation pipeline triggered on Jenkins`,
          'VALIDATE_MINI_APP',
          app,
          await this.miniappRepository.findOne({ where: { id } }),
        );
      }
    }
  }

  async createPermissionProposal(
    app: MiniApp,
    permissionKey: string,
    permissionName?: string,
  ) {
    const cleanKey = permissionKey
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, '_');
    const [existing] =
      await this.capabilityProposalsService.findPendingByKey(cleanKey);
    if (existing) {
      return existing;
    }

    const proposal = await this.capabilityProposalsService.create({
      permissionKey: cleanKey,
      permissionName: permissionName || cleanKey,
      description: `Capability proposal for "${cleanKey}" requested by MiniApp "${app.name || app.appId}".`,
      miniApp: app,
      metadata: {
        miniAppName: app.name,
        miniAppId: app.appId || app.id,
        category: app.tagline || (app as any).category,
        requestedSource: 'MINIAPP_REGISTRATION',
      },
    });

    await this.notificationsService.createNotification(
      app.ownerId || 'system',
      'New Capability Proposed',
      `MiniApp "${app.name || app.appId}" proposed a new capability: "${cleanKey}". Ready for review & injection.`,
      'PROPOSAL_CREATED',
      app.id,
    );

    return proposal;
  }

  /**
   * Watchdog poller for Jenkins validation pipelines (WebView, Flutter Package, Native SDK, Deep Link).
   * Detects early Jenkins crashes, Groovy compilation failures, or pipeline aborts.
   */
  private monitorJenkinsValidation(miniAppId: string, integrationMethod: string) {
    const methodJobMap: Record<string, string> = {
      WEBVIEW: 'miniapp-validation-webview',
      FLUTTER_PACKAGE: 'miniapp-validation-flutter-package',
      NATIVE_SDK: 'miniapp-validation-native-sdk',
      DEEP_LINK: 'miniapp-validation-deep-link',
    };
    const targetJob = methodJobMap[integrationMethod] || 'miniapp-validation';

    let polls = 0;
    const maxPolls = 120; // 120 * 3s = 6 minutes
    // After Jenkins finishes, its last callback can take a moment to land
    const resultGracePolls = 10; // 30s
    let finishedPolls = 0;
    let lastConsole = '';
    const interval = setInterval(async () => {
      polls++;
      try {
        const app = await this.miniappRepository.findOne({ where: { id: miniAppId } });
        if (!app || app.validationStatus !== 'RUNNING' || polls >= maxPolls) {
          clearInterval(interval);
          if (app && app.validationStatus === 'RUNNING' && polls >= maxPolls) {
            await this.markValidationFailed(
              miniAppId,
              finishedPolls > 0
                ? this.lostResultMessage(lastConsole)
                : 'Validation pipeline timed out after 6 minutes waiting for Jenkins CI.',
            );
          }
          return;
        }

        const jStatus = await this.jenkinsService.getJobBuildStatus(targetJob);
        // The job's last build may be another app's scan (or ours is still queued)
        if (jStatus.available && jStatus.miniAppId && jStatus.miniAppId !== miniAppId) return;
        if (jStatus.available && !jStatus.building && jStatus.result !== 'FAILURE' && jStatus.result !== 'ABORTED') {
          // Finished without failing, yet the app is still RUNNING: the results
          // did not reach us. Wait briefly, then say why instead of spinning forever.
          finishedPolls++;
          lastConsole = jStatus.consoleText || '';
          if (finishedPolls >= resultGracePolls) {
            clearInterval(interval);
            this.logger.warn(`Jenkins scan for ${integrationMethod} app ${miniAppId} finished but its results never arrived.`);
            await this.markValidationFailed(miniAppId, this.lostResultMessage(lastConsole));
          }
          return;
        }
        if (jStatus.available && !jStatus.building) {
          clearInterval(interval);
          if (jStatus.result === 'FAILURE' || jStatus.result === 'ABORTED') {
            const errorLine =
              jStatus.consoleText
                ?.split('\n')
                .map((l) => l.trim())
                .filter(
                  (l) =>
                    l.includes('FAILURE') ||
                    l.includes('ERROR') ||
                    l.includes('Exception') ||
                    l.includes('failed') ||
                    l.includes('unexpected char'),
                )
                .slice(-3)
                .join(' | ') ||
              `Jenkins validation pipeline finished with ${jStatus.result || 'FAILURE'}.`;

            this.logger.warn(
              `Jenkins validation failure detected by watchdog for ${integrationMethod} app ${miniAppId}: ${errorLine}`,
            );
            await this.markValidationFailed(miniAppId, errorLine);
          }
        }
      } catch (err: any) {
        this.logger.debug(`Jenkins validation watchdog poll error: ${err.message}`);
      }
    }, 3000);
  }

  /** Why a finished Jenkins scan left no result, from its console. */
  private lostResultMessage(consoleText: string): string {
    if (/status:?\s*401\b/i.test(consoleText)) {
      return (
        'The scan finished on Jenkins, but the backend refused its results (HTTP 401: callback token). ' +
        'Check that RELEASE_CALLBACK_TOKEN is set on the backend and that the Jenkins job declares the ' +
        'CALLBACK_TOKEN parameter (run "pnpm sync:jenkins --prod"), then scan again.'
      );
    }
    return (
      'The scan finished on Jenkins, but its results never reached the backend. ' +
      'Check that Jenkins can reach CALLBACK_BASE_URL, then scan again.'
    );
  }

  /**
   * Transitions an active validation to FAILED if Jenkins pipeline crashed or failed.
   */
  private async markValidationFailed(miniAppId: string, errorMessage: string) {
    const app = await this.miniappRepository.findOne({ where: { id: miniAppId } });
    if (!app || app.validationStatus !== 'RUNNING') return;

    const stages: Record<string, any> = { ...(app.validationStages || {}) };
    let hadRunning = false;
    for (const k of Object.keys(stages)) {
      if (stages[k]?.status === 'RUNNING') {
        stages[k] = {
          ...stages[k],
          status: 'FAILED',
          details: errorMessage,
          updatedAt: new Date().toISOString(),
        };
        hadRunning = true;
      }
    }
    if (!hadRunning && Object.keys(stages).length > 0) {
      const firstKey = Object.keys(stages)[0];
      stages[firstKey] = {
        ...stages[firstKey],
        status: 'FAILED',
        details: errorMessage,
        updatedAt: new Date().toISOString(),
      };
    }

    app.validationStatus = 'FAILED';
    app.validationStages = stages;
    app.validationReport = {
      score: 0,
      status: 'FAILED',
      method: app.integrationMethod || 'FLUTTER_PACKAGE',
      completedAt: new Date().toISOString(),
      findings: [
        {
          id: 'JENKINS_PIPELINE_ERROR',
          severity: 'CRITICAL',
          title: 'Jenkins Pipeline Execution Failed',
          description: errorMessage,
          recommendation: 'Check the Jenkins build console logs and re-run the security scan.',
        },
      ],
    };

    await this.miniappRepository.save(app);

    this.notificationsService.emitStageUpdate({
      miniAppId: app.id,
      stages: app.validationStages,
      validationStatus: 'FAILED',
    });

    if (app.ownerId) {
      await this.notificationsService.createNotification(
        app.ownerId,
        'Security Validation Failed',
        `Automated security scan for "${app.name}" failed: ${errorMessage}`,
        'SCAN_FAILED',
        app.id,
      );
    }
  }
}
