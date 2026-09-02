import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as dns from 'dns';

export interface DomainVerificationResult {
  success: boolean;
  message: string;
  verifiedAt?: Date;
  allowedDomains?: string[];
  permissions?: string[];
  details?: Record<string, any>;
}

@Injectable()
export class DomainVerificationService {
  private readonly logger = new Logger(DomainVerificationService.name);

  /**
   * Generates a cryptographically strong, non-secret public domain association token.
   */
  generateVerificationToken(): string {
    return `tok_live_${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * Validates if an IP address belongs to RFC 1918, loopback, or cloud metadata ranges.
   */
  isPrivateOrRestrictedIp(ip: string): boolean {
    // IPv4 checks
    if (ip.startsWith('127.') || ip === '0.0.0.0') return true;
    if (ip.startsWith('10.')) return true;
    if (ip.startsWith('169.254.')) return true; // Link-local / Cloud Metadata (169.254.169.254)
    if (ip.startsWith('192.168.')) return true;

    // 172.16.0.0 - 172.31.255.255
    if (ip.startsWith('172.')) {
      const parts = ip.split('.').map(Number);
      if (parts.length >= 2 && parts[1] >= 16 && parts[1] <= 31) {
        return true;
      }
    }

    // IPv6 checks
    if (ip === '::1' || ip.toLowerCase().startsWith('fe80:') || ip.toLowerCase().startsWith('fc00:') || ip.toLowerCase().startsWith('fd00:')) {
      return true;
    }

    return false;
  }

  /**
   * Verifies domain ownership via https://<domain>/.well-known/superapp-miniapp-association.json
   */
  async verifyDomainOwnership(
    productionUrl: string,
    expectedAppId: string,
    expectedToken: string
  ): Promise<DomainVerificationResult> {
    if (!productionUrl) {
      return { success: false, message: 'Production URL is required for domain verification.' };
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(productionUrl);
    } catch {
      return { success: false, message: 'Invalid URL format provided.' };
    }

    const envVal = (process.env.ENVIRONMENT || process.env.NODE_ENV || '').toUpperCase();
    const isDev = envVal === 'DEV' || envVal === 'DEVELOPMENT' || process.env.NODE_ENV !== 'PROD';
    const isLocalhost = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';

    // In production, enforce HTTPS strictly. In DEV mode, allow HTTP.
    if (!isDev && !isLocalhost) {
      if (parsedUrl.protocol !== 'https:') {
        return { success: false, message: 'Domain verification requires an HTTPS URL in production.' };
      }
    }

    // 1. SSRF Protection: In production, assert no private/internal IPs
    if (!isDev && !isLocalhost) {
      try {
        const addresses = await dns.promises.lookup(parsedUrl.hostname, { all: true });
        for (const addr of addresses) {
          if (this.isPrivateOrRestrictedIp(addr.address)) {
            this.logger.warn(`SSRF Block: Domain ${parsedUrl.hostname} resolves to restricted IP ${addr.address}`);
            return {
              success: false,
              message: `Domain ${parsedUrl.hostname} resolves to restricted address ${addr.address} (SSRF protection enforced).`,
            };
          }
        }
      } catch (err: any) {
        return {
          success: false,
          message: `DNS resolution failed for hostname "${parsedUrl.hostname}": ${err.message || err}`,
        };
      }
    }

    // 2. Fetch the association file
    const associationUrl = `${parsedUrl.origin}/.well-known/superapp-miniapp-association.json`;
    this.logger.log(`Fetching domain association verification from: ${associationUrl}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(associationUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'SuperApp-Domain-Verifier/2.0',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          message: `Failed to fetch association file (HTTP ${response.status} from ${associationUrl}). Please ensure the file is public and accessible.`,
        };
      }

      let payload: any;
      try {
        payload = await response.json();
      } catch {
        return {
          success: false,
          message: `The association endpoint ${associationUrl} did not return valid JSON.`,
        };
      }

      // 3. Check appId
      if (!payload.appId || payload.appId !== expectedAppId) {
        return {
          success: false,
          message: `appId mismatch in association file: Expected "${expectedAppId}", found "${payload.appId || 'none'}".`,
          details: { receivedAppId: payload.appId },
        };
      }

      // 4. Check verificationToken
      if (!payload.verificationToken || payload.verificationToken !== expectedToken) {
        return {
          success: false,
          message: `verificationToken mismatch in association file: Expected "${expectedToken}", found "${payload.verificationToken || 'none'}".`,
        };
      }

      const allowedList = Array.isArray(payload.allowedDomains) && payload.allowedDomains.length > 0
        ? payload.allowedDomains
        : [parsedUrl.hostname];

      const otherDomains = allowedList.filter((d: string) => d !== parsedUrl.hostname);
      const messageDetails = otherDomains.length > 0
        ? `Domain ownership verified successfully for ${parsedUrl.hostname} (Whitelisted: ${otherDomains.join(', ')}).`
        : `Domain ownership verified successfully for ${parsedUrl.hostname}.`;

      const detectedPerms = Array.isArray(payload.permissions)
        ? payload.permissions
        : (Array.isArray(payload.requestedPermissions) ? payload.requestedPermissions : []);

      return {
        success: true,
        message: messageDetails,
        verifiedAt: new Date(),
        allowedDomains: allowedList,
        permissions: detectedPerms,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Error connecting to ${associationUrl}: ${err.message || String(err)}`,
      };
    }
  }
}
