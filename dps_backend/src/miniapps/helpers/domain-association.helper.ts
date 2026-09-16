import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniApp } from '../entities/miniapp.entity';
import { DomainVerificationService } from '../../integrations/webview/domain-verification.service';

@Injectable()
export class DomainAssociationHelper {
  private readonly logger = new Logger(DomainAssociationHelper.name);

  constructor(
    @InjectRepository(MiniApp)
    private miniappRepository: Repository<MiniApp>,
    private domainVerificationService: DomainVerificationService,
  ) {}

  async verifyDomain(app: MiniApp, overrideUrl?: string) {
    if (!app) throw new BadRequestException('App not found');
    if (app.integrationMethod !== 'WEBVIEW') {
      throw new BadRequestException(
        'Domain verification is only applicable to WebView mini-apps',
      );
    }

    const prodUrl = overrideUrl || app.integrationConfig?.productionUrl;
    if (!prodUrl) {
      throw new BadRequestException(
        'No productionUrl found in integrationConfig',
      );
    }

    if (!app.verificationToken) {
      app.verificationToken =
        this.domainVerificationService.generateVerificationToken();
      await this.miniappRepository.save(app);
    }

    const result = await this.domainVerificationService.verifyDomainOwnership(
      prodUrl,
      app.appId,
      app.verificationToken,
    );

    if (result.success) {
      app.isDomainVerified = true;
      app.domainVerifiedAt = result.verifiedAt || new Date();

      if (result.allowedDomains && result.allowedDomains.length > 0) {
        const currentAllowed = Array.isArray(
          app.integrationConfig?.allowedDomains,
        )
          ? app.integrationConfig.allowedDomains
          : [];
        app.integrationConfig = {
          ...(app.integrationConfig || {}),
          allowedDomains: Array.from(
            new Set([...currentAllowed, ...result.allowedDomains]),
          ),
        };
      }

      if (result.permissions && result.permissions.length > 0) {
        const currentPerms = Array.isArray(app.permissions)
          ? app.permissions
          : [];
        const newPerms = [...currentPerms];
        for (const p of result.permissions) {
          const permType = typeof p === 'string' ? p : (p as any)?.type;
          const permPurpose =
            typeof p === 'string' ? undefined : (p as any)?.purpose;
          if (!permType) continue;
          const exists = newPerms.some(
            (existing) =>
              (existing.type || existing)?.toLowerCase() ===
              permType.toLowerCase(),
          );
          if (!exists) {
            newPerms.push({
              type: permType,
              purpose:
                permPurpose ||
                `Required by ${app.name} as declared in domain association file`,
              termsUrl: app.termsUrl || 'https://privacy.example.com',
            });
          }
        }
        app.permissions = newPerms;
      }

      await this.miniappRepository.save(app);

      return {
        verified: true,
        message: result.message,
        domainVerifiedAt: app.domainVerifiedAt,
        allowedDomains: app.integrationConfig?.allowedDomains,
        permissions: app.permissions,
      };
    } else {
      return {
        verified: false,
        message: result.message,
        validationErrors: {
          'integrationConfigWebView.domainVerification': result.message,
        },
      };
    }
  }

  async verifyDomainStandalone(
    prodUrl: string,
    appId: string,
    verificationToken: string,
  ) {
    const result = await this.domainVerificationService.verifyDomainOwnership(
      prodUrl,
      appId,
      verificationToken,
    );

    if (result.success) {
      return {
        verified: true,
        message: result.message,
        domainVerifiedAt: result.verifiedAt || new Date(),
        allowedDomains: result.allowedDomains || [],
        permissions: result.permissions || [],
      };
    } else {
      return {
        verified: false,
        message: result.message,
        validationErrors: {
          'integrationConfigWebView.domainVerification': result.message,
        },
      };
    }
  }

  generateVerificationToken(): string {
    return this.domainVerificationService.generateVerificationToken();
  }
}
