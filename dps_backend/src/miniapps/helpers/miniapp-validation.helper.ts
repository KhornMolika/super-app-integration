import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isEmail } from 'class-validator';
import { MiniApp } from '../entities/miniapp.entity';
import { MiniAppIssue } from '../entities/miniapp-issue.entity';
import { IsUrlReachableConstraint } from '../../common/validators/is-url-reachable.validator';
import { MailService } from '../../mail/mail.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { PermissionsService } from '../../permissions/permissions.service';
import { PermissionProposalsService } from '../../permission-proposals/permission-proposals.service';
import { SuperAppService } from '../../super-app/super-app.service';
import { GitIntegrationService } from '../../integrations/git/git-integration.service';
import { NexusIntegrationService } from '../../integrations/nexus/nexus-integration.service';
import { DomainVerificationService } from '../../integrations/webview/domain-verification.service';
import { JenkinsService } from '../../integrations/jenkins/jenkins.service';

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
    private permissionsService: PermissionsService,
    private permissionProposalsService: PermissionProposalsService,
    private superAppService: SuperAppService,
    private gitService: GitIntegrationService,
    private nexusService: NexusIntegrationService,
    private domainVerificationService: DomainVerificationService,
    private jenkinsService: JenkinsService,
  ) {}

  async validateMiniAppAsync(
    app: MiniApp,
    logActivityFn: (
      miniAppId: string,
      actorId: string,
      actionType: string,
      title: string,
      description: string,
      auditAction: string,
      oldVal?: any,
      newVal?: any
    ) => Promise<void>
  ) {
    const id = app.id;
    const errors: Record<string, string> = {};
    const urlValidator = new IsUrlReachableConstraint();
    const checks: Promise<void>[] = [];

    if (!app.ownerEmail || !isEmail(app.ownerEmail)) {
      errors.ownerEmail = 'ownerEmail must be a valid email address.';
    }
    if (app.supportEmail && !isEmail(app.supportEmail)) {
      errors.supportEmail = 'supportEmail must be a valid email address.';
    }

    if (app.logo && app.logo.trim() !== '') {
      if (app.logo.startsWith('data:image/') || app.logo.startsWith('/uploads/')) {
        // Uploaded image format is valid
      } else {
        checks.push(
          urlValidator.validate(app.logo, null as any).then((isValid) => {
            if (!isValid) errors.logo = 'logo must be a reachable and accessible URL.';
          })
        );
      }
    }

    if (app.integrationMethod === 'WEBVIEW') {
      const envVal = (process.env.ENVIRONMENT || process.env.NODE_ENV || '').toUpperCase();
      const isDev = envVal === 'DEV' || envVal === 'DEVELOPMENT' || process.env.NODE_ENV !== 'PROD';

      if (!app.integrationConfig?.productionUrl) {
        errors['integrationConfigWebView.productionUrl'] = 'productionUrl is required for WebView integration.';
      } else {
        const prodUrl = app.integrationConfig.productionUrl;
        let isValidProdUrl = true;
        let parsedUrl: URL | null = null;

        try {
          parsedUrl = new URL(prodUrl);
        } catch {
          errors['integrationConfigWebView.productionUrl'] = 'Production URL has an invalid URL format.';
          isValidProdUrl = false;
        }

        if (parsedUrl) {
          if (!isDev) {
            if (parsedUrl.protocol !== 'https:') {
              errors['integrationConfigWebView.productionUrl'] = 'Production URL must use HTTPS.';
              isValidProdUrl = false;
            } else if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
              errors['integrationConfigWebView.productionUrl'] = 'Production URL cannot be localhost in production.';
              isValidProdUrl = false;
            }
          }
        }

        if (isValidProdUrl) {
          checks.push(
            urlValidator.validate(prodUrl, null as any).then((isValid) => {
              if (!isValid) errors['integrationConfigWebView.productionUrl'] = 'productionUrl must be a reachable and accessible URL.';
            })
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
          errors['integrationConfigWebView.stagingUrl'] = 'Staging URL has an invalid URL format.';
          isValidStaging = false;
        }

        if (parsedStaging && !isDev && parsedStaging.protocol !== 'https:') {
          errors['integrationConfigWebView.stagingUrl'] = 'Staging URL must use HTTPS.';
          isValidStaging = false;
        }

        if (isValidStaging) {
          checks.push(
            urlValidator.validate(stagingUrl, null as any).then((isValid) => {
              if (!isValid) errors['integrationConfigWebView.stagingUrl'] = 'stagingUrl must be a reachable and accessible URL.';
            })
          );
        }
      }

      // Check domain verification
      const prodUrl = app.integrationConfig?.productionUrl;
      if (!app.isDomainVerified) {
        if (prodUrl && app.verificationToken && app.appId) {
          checks.push(
            this.domainVerificationService
              .verifyDomainOwnership(prodUrl, app.appId, app.verificationToken)
              .then((result) => {
                if (result.success) {
                  app.isDomainVerified = true;
                  app.domainVerifiedAt = result.verifiedAt || new Date();
                  if (result.allowedDomains && result.allowedDomains.length > 0) {
                    const currentAllowed = Array.isArray(app.integrationConfig?.allowedDomains)
                      ? app.integrationConfig.allowedDomains
                      : [];
                    app.integrationConfig = {
                      ...app.integrationConfig,
                      allowedDomains: Array.from(new Set([...currentAllowed, ...result.allowedDomains])),
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
              })
          );
        } else {
          errors['integrationConfigWebView.domainVerification'] =
            'Domain ownership has not been verified. Please host the verification token at /.well-known/superapp-miniapp-association.json and verify.';
        }
      }

      // Check allowed domains format
      if (app.integrationConfig?.allowedDomains && Array.isArray(app.integrationConfig.allowedDomains)) {
        for (const domain of app.integrationConfig.allowedDomains) {
          if (typeof domain !== 'string' || domain.includes('/') || domain.includes('://')) {
            errors['integrationConfigWebView.allowedDomains'] = `Invalid domain "${domain}". allowedDomains must only contain valid hostnames (e.g. "api.domain.com").`;
            break;
          }
        }
      }
    } else if (app.integrationMethod === 'FLUTTER_PACKAGE') {
      const flutterConfig = app.integrationConfig || {};
      const isArtifact =
        flutterConfig.sourceType === 'ARTIFACT' || (!flutterConfig.sourceType && flutterConfig.packageName);

      if (isArtifact) {
        const packageName = flutterConfig.packageName?.trim();
        if (!packageName) {
          errors['integrationConfigFlutter.packageName'] = 'Package name is required for Artifact integration.';
        } else {
          checks.push(
            this.nexusService
              .getPackageInfo(packageName)
              .then((result) => {
                if (!result.exists) {
                  errors['integrationConfigFlutter.packageName'] =
                    `Package "${packageName}" was not found in Nexus repository (pub-group). Please publish the package before submitting for review.`;
                }
              })
              .catch((err) => {
                errors['integrationConfigFlutter.packageName'] =
                  `Could not verify package "${packageName}" on Nexus: ${err.message}`;
              })
          );
        }
      } else {
        const gitUrl = flutterConfig.gitUrl?.trim();
        if (!gitUrl) {
          errors['integrationConfigFlutter.gitUrl'] = 'Git URL is required for Source Code integration.';
        } else {
          checks.push(
            this.gitService
              .validatePackage(
                gitUrl,
                flutterConfig.gitBranch || flutterConfig.ref,
                flutterConfig.gitProvider || flutterConfig.provider,
                flutterConfig.gitAccessToken || flutterConfig.token,
                flutterConfig.gitPath || flutterConfig.path
              )
              .then(async (result) => {
                if (!result.validation.isValid) {
                  errors['integrationConfigFlutter.gitUrl'] =
                    result.validation.error || `Git repository or pubspec.yaml could not be verified for ${gitUrl}.`;
                } else {
                  this.logger.log(
                    `Git repository metadata verified for ${gitUrl}. Automated security scanning and build integration will be orchestrated via Jenkins.`
                  );
                }
              })
              .catch((err) => {
                errors['integrationConfigFlutter.gitUrl'] =
                  `Could not verify Git repository "${gitUrl}": ${err.message}`;
              })
          );
        }
      }
    } else if (app.integrationMethod === 'DEEP_LINK') {
      if (!app.integrationConfig?.urlScheme) {
        errors['integrationConfigDeepLink.urlScheme'] = 'urlScheme is required for Deep Link integration.';
      }
      if (app.integrationConfig?.appStoreUrl && app.integrationConfig.appStoreUrl.trim() !== '') {
        checks.push(
          urlValidator.validate(app.integrationConfig.appStoreUrl, null as any).then((isValid) => {
            if (!isValid)
              errors['integrationConfigDeepLink.appStoreUrl'] =
                'App Store fallback URL must be a valid, reachable URL.';
          })
        );
      }
    }

    if (app.termsUrl && app.termsUrl.trim() !== '') {
      checks.push(
        urlValidator.validate(app.termsUrl, null as any).then((isValid) => {
          if (!isValid)
            errors.termsUrl = 'The Terms & Conditions URL is unreachable. Please verify the link is publicly accessible.';
        })
      );
    }

    if (app.privacyPolicyUrl && app.privacyPolicyUrl.trim() !== '') {
      checks.push(
        urlValidator.validate(app.privacyPolicyUrl, null as any).then((isValid) => {
          if (!isValid)
            errors.privacyPolicyUrl =
              'The Privacy Policy URL is unreachable. Please verify the link is publicly accessible.';
        })
      );
    }

    if (app.permissions && Array.isArray(app.permissions)) {
      for (let index = 0; index < app.permissions.length; index++) {
        const perm = app.permissions[index];
        const permKey = perm.type || 'unknown';

        if (!perm.purpose || perm.purpose.trim() === '') {
          errors[`permissions.${index}.purpose`] = `Please describe why your Mini App requires ${permKey} access.`;
        }

        // Permission Catalog & Compatibility Check
        const permissionDef = await this.permissionsService.findByKey(permKey);

        if (!permissionDef) {
          // UNKNOWN PERMISSION -> create proposal in permission_proposals
          await this.createPermissionProposal(app, permKey);
          if (perm.required) {
            errors[`permissions.${index}.unsupported`] = `The requested permission "${permKey}" is not currently supported in the platform catalog. A proposal has been created for review.`;
          }
        } else {
          // Known permission, check Super App Runtime Compatibility
          const latestCapability = await this.superAppService.findLatestCapability();
          const supportedCaps = latestCapability
            ? (Array.isArray(latestCapability.capabilities)
                ? latestCapability.capabilities
                : String(latestCapability.capabilities).split(',')
              ).map((c) => c.trim().toLowerCase())
            : ['camera', 'location', 'storage', 'microphone', 'biometrics'];

          const isSupported =
            supportedCaps.includes(permissionDef.key.toLowerCase()) ||
            supportedCaps.includes(permissionDef.name.toLowerCase());

          if (!isSupported) {
            await this.createPermissionProposal(app, permissionDef.key, permissionDef.name);
            if (perm.required) {
              errors[`permissions.${index}.unsupported`] = `The requested permission "${permissionDef.key}" is not supported by the current Super App runtime. A proposal has been created for review.`;
            }
          }
        }
      }
    }

    await Promise.all(checks);

    // Clear old issues
    await this.issueRepository.delete({ miniAppId: id });

    if (Object.keys(errors).length > 0) {
      await this.miniappRepository.update(id, {
        status: 'DRAFT',
        validationErrors: errors as any,
      });

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

      // Create a notification
      await this.notificationsService.createNotification(
        app.ownerId || '',
        'Validation Failed',
        `${app.name || 'Mini App'} has ${issues.length} validation issue(s).`,
        'ISSUE_CREATED',
        app.id
      );
      await logActivityFn(
        id,
        'system',
        'VALIDATION',
        'Validation Failed',
        `Found ${issues.length} issues`,
        'VALIDATE_MINI_APP',
        app,
        await this.miniappRepository.findOne({ where: { id } })
      );

      if (app.ownerEmail) {
        await this.mailService.sendRegistrationFailureEmail(
          app.ownerEmail,
          app.name || app.appId || 'Unknown App',
          errors
        );
      }
    } else {
      if (app.integrationMethod === 'WEBVIEW' && app.integrationConfig?.productionUrl) {
        const initialStages = {
          ssrf: { id: 'ssrf', name: '1. Pre-Flight & SSRF Defense', status: 'RUNNING', details: 'Resolving DNS & verifying IP routes...' },
          tls: { id: 'tls', name: '2. TLS & HTTPS Security', status: 'PENDING', details: 'Awaiting cipher suite verification...' },
          zap: { id: 'zap', name: '3. OWASP ZAP DAST Scan', status: 'PENDING', details: 'Awaiting XSS & CSP header audit...' },
          nuclei: { id: 'nuclei', name: '4. Exposure & Vulnerability Audit', status: 'PENDING', details: 'Awaiting CVE & endpoint check...' },
        };
        await this.miniappRepository.update(id, {
          status: 'SUBMITTED',
          validationStatus: 'RUNNING',
          validationStages: initialStages as any,
          validationErrors: null as any,
        });

        const allowedDomains = Array.isArray(app.integrationConfig.allowedDomains)
          ? app.integrationConfig.allowedDomains
          : (typeof app.integrationConfig.allowedDomains === 'string'
              ? app.integrationConfig.allowedDomains.split(',')
              : []);

        const envVal = (process.env.ENVIRONMENT || '').toUpperCase();
        const allowLocal = envVal === 'DEV' || envVal === 'DEVELOPMENT';

        this.logger.log(`Triggering Jenkins automated security scan for Mini App ${id}...`);
        this.jenkinsService
          .triggerWebViewValidation({
            miniAppId: id,
            targetUrl: app.integrationConfig.productionUrl,
            allowedDomains,
            allowLocal,
            checks: app.securityChecks || [],
          })
          .catch((err) => this.logger.error(`Jenkins trigger error: ${err.message}`));

        await this.notificationsService.createNotification(
          app.ownerId || '',
          'Validation Running',
          `${app.name || 'Mini App'} automated security scans initiated on Jenkins.`,
          'SCAN_STARTED',
          app.id
        );
        await logActivityFn(
          id,
          'system',
          'VALIDATION',
          'Validation Running',
          'Automated security scan pipeline triggered on Jenkins',
          'VALIDATE_MINI_APP',
          app,
          await this.miniappRepository.findOne({ where: { id } })
        );
      } else {
        await this.miniappRepository.update(id, {
          status: 'IN_REVIEW',
          validationErrors: null as any,
        });

        await this.notificationsService.createNotification(
          app.ownerId || '',
          'Validation Passed',
          `${app.name || 'Mini App'} has passed validation and is now ready for review.`,
          'REVIEW_STARTED',
          app.id
        );
        await logActivityFn(
          id,
          'system',
          'VALIDATION',
          'Validation Passed',
          'No issues found',
          'VALIDATE_MINI_APP',
          app,
          await this.miniappRepository.findOne({ where: { id } })
        );

        if (app.ownerEmail) {
          await this.mailService.sendRegistrationSuccessEmail(
            app.ownerEmail,
            app.name || app.appId || 'Unknown App'
          );
        }
      }
    }
  }

  async createPermissionProposal(app: MiniApp, permissionKey: string, permissionName?: string) {
    const [existing] = await this.permissionProposalsService.findPendingByKey(permissionKey);
    if (existing) {
      return existing;
    }

    const proposal = await this.permissionProposalsService.create({
      permissionKey,
      permissionName: permissionName || permissionKey,
      description: `Mini App "${app.name || app.appId}" requested permission "${permissionKey}", which is not defined in the platform catalog.`,
      miniApp: app,
    });

    await this.notificationsService.createNotification(
      app.ownerId || 'system',
      'New Permission Proposed',
      `Mini App "${app.name || app.appId}" proposed a new capability: "${permissionKey}".`,
      'PROPOSAL_CREATED',
      app.id
    );

    return proposal;
  }
}
