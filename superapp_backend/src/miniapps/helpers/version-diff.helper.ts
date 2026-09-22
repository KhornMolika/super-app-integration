export interface VersionDiffResult {
  miniAppId: string;
  appName: string;
  appId: string;
  baseVersion: {
    version: string;
    type: 'PRODUCTION' | 'TEST' | 'LIVE';
    status: string;
    releasedAt?: string;
  };
  targetVersion: {
    version: string;
    type: 'REVISION' | 'TEST' | 'PRODUCTION';
    status: string;
    submittedAt?: string;
    changelog?: string;
    justification?: string;
  };
  hasChanges: boolean;
  isHighRiskChange: boolean;
  differences: {
    metadata: {
      name?: { base: string; target: string; changed: boolean };
      shortDescription?: { base: string; target: string; changed: boolean };
      fullDescription?: { base: string; target: string; changed: boolean };
      category?: { base: string; target: string; changed: boolean };
      logo?: { base: string; target: string; changed: boolean };
      supportEmail?: { base: string; target: string; changed: boolean };
      teamName?: { base: string; target: string; changed: boolean };
      privacyPolicyUrl?: { base: string; target: string; changed: boolean };
      termsUrl?: { base: string; target: string; changed: boolean };
    };
    integration: {
      method: { base: string; target: string; changed: boolean };
      productionUrl?: { base: string; target: string; changed: boolean };
      stagingUrl?: { base: string; target: string; changed: boolean };
      urlScheme?: { base: string; target: string; changed: boolean };
      allowedDomains: {
        added: string[];
        removed: string[];
        unchanged: string[];
      };
      flutterPackageName?: { base: string; target: string; changed: boolean };
      flutterVersionConstraint?: { base: string; target: string; changed: boolean };
    };
    permissions: {
      added: Array<{ type: string; purpose?: string; riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' }>;
      removed: Array<{ type: string; purpose?: string }>;
      modified: Array<{ type: string; oldPurpose?: string; newPurpose?: string }>;
      unchanged: Array<{ type: string; purpose?: string }>;
    };
    security: {
      scoreDiff: { base: number; target: number; delta: number };
      domainVerification: { base: boolean; target: boolean; changed: boolean };
      validationStatus: { base: string; target: string };
    };
    artifacts?: {
      apkSizeDiff?: { base: string; target: string };
      checksums?: { base: string; target: string };
    };
  };
}

const HIGH_RISK_PERMISSIONS = new Set([
  'CAMERA',
  'LOCATION',
  'BIOMETRIC_AUTH',
  'PAYMENT_GATEWAY',
  'CONTACTS',
  'MICROPHONE',
  'STORAGE_WRITE',
  'BLUETOOTH',
  'NFC',
]);

const MEDIUM_RISK_PERMISSIONS = new Set([
  'STORAGE_READ',
  'NETWORK_STATE',
  'DEVICE_INFO',
  'NOTIFICATIONS',
  'SECURE_STORAGE',
]);

export class VersionDiffHelper {
  static getPermissionRiskLevel(permType: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    const upper = (permType || '').toUpperCase().trim();
    if (HIGH_RISK_PERMISSIONS.has(upper)) return 'HIGH';
    if (MEDIUM_RISK_PERMISSIONS.has(upper)) return 'MEDIUM';
    return 'LOW';
  }

  static isSecurityImpactingField(field: string): boolean {
    const securityFields = [
      'permissions',
      'integrationMethod',
      'integrationConfig',
      'securityChecks',
      'productionUrl',
      'stagingUrl',
      'allowedDomains',
      'urlScheme',
      'versionConstraint',
      'packageName',
    ];
    return securityFields.some((f) => field.toLowerCase().includes(f.toLowerCase()));
  }

  static hasSecurityChanges(base: any, target: any): boolean {
    // 1. Permissions check
    const basePerms: any[] = Array.isArray(base.permissions) ? base.permissions : [];
    const targetPerms: any[] = Array.isArray(target.permissions) ? target.permissions : [];
    const basePermTypes = new Set(basePerms.map((p) => (typeof p === 'string' ? p : p.type)));
    const targetPermTypes = new Set(targetPerms.map((p) => (typeof p === 'string' ? p : p.type)));

    if (basePermTypes.size !== targetPermTypes.size) return true;
    for (const p of targetPermTypes) {
      if (!basePermTypes.has(p)) return true;
    }

    // 2. Integration method check
    if (base.integrationMethod !== target.integrationMethod) return true;

    // 3. Integration config check
    const baseConfig = base.integrationConfig || {};
    const targetConfig =
      target.integrationConfig ||
      target.integrationConfigWebView ||
      target.integrationConfigFlutter ||
      target.integrationConfigDeepLink ||
      {};

    if (baseConfig.productionUrl !== targetConfig.productionUrl && targetConfig.productionUrl !== undefined) return true;
    if (baseConfig.stagingUrl !== targetConfig.stagingUrl && targetConfig.stagingUrl !== undefined) return true;
    if (baseConfig.urlScheme !== targetConfig.urlScheme && targetConfig.urlScheme !== undefined) return true;
    if (baseConfig.packageName !== targetConfig.packageName && targetConfig.packageName !== undefined) return true;
    if (baseConfig.versionConstraint !== targetConfig.versionConstraint && targetConfig.versionConstraint !== undefined) return true;

    // Allowed domains check
    const baseDomains: string[] = Array.isArray(baseConfig.allowedDomains)
      ? baseConfig.allowedDomains
      : typeof baseConfig.allowedDomains === 'string'
      ? baseConfig.allowedDomains.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];
    const targetDomains: string[] = Array.isArray(targetConfig.allowedDomains)
      ? targetConfig.allowedDomains
      : typeof targetConfig.allowedDomains === 'string'
      ? targetConfig.allowedDomains.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];

    if (baseDomains.length !== targetDomains.length) return true;
    for (const d of targetDomains) {
      if (!baseDomains.includes(d)) return true;
    }

    return false;
  }

  static computeDiff(baseApp: any, targetRev: any): VersionDiffResult {
    const baseConfig = baseApp.integrationConfig || {};
    const targetConfig =
      targetRev.integrationConfig ||
      targetRev.integrationConfigWebView ||
      targetRev.integrationConfigFlutter ||
      targetRev.integrationConfigDeepLink ||
      {};

    // Metadata Diff
    const metadataDiff: any = {};
    const metaFields = [
      'name',
      'shortDescription',
      'fullDescription',
      'category',
      'logo',
      'supportEmail',
      'teamName',
      'privacyPolicyUrl',
      'termsUrl',
    ];

    for (const field of metaFields) {
      const baseVal = baseApp[field] || '';
      const targetVal = targetRev[field] !== undefined ? targetRev[field] || '' : baseVal;
      if (baseVal !== targetVal) {
        metadataDiff[field] = {
          base: baseVal,
          target: targetVal,
          changed: true,
        };
      }
    }

    // Integration Diff
    const integrationDiff: any = {
      method: {
        base: baseApp.integrationMethod || 'WEBVIEW',
        target: targetRev.integrationMethod || baseApp.integrationMethod || 'WEBVIEW',
        changed: (targetRev.integrationMethod && targetRev.integrationMethod !== baseApp.integrationMethod) || false,
      },
      allowedDomains: {
        added: [],
        removed: [],
        unchanged: [],
      },
    };

    if (baseConfig.productionUrl !== targetConfig.productionUrl && targetConfig.productionUrl !== undefined) {
      integrationDiff.productionUrl = {
        base: baseConfig.productionUrl || '',
        target: targetConfig.productionUrl || '',
        changed: true,
      };
    }

    if (baseConfig.stagingUrl !== targetConfig.stagingUrl && targetConfig.stagingUrl !== undefined) {
      integrationDiff.stagingUrl = {
        base: baseConfig.stagingUrl || '',
        target: targetConfig.stagingUrl || '',
        changed: true,
      };
    }

    if (baseConfig.urlScheme !== targetConfig.urlScheme && targetConfig.urlScheme !== undefined) {
      integrationDiff.urlScheme = {
        base: baseConfig.urlScheme || '',
        target: targetConfig.urlScheme || '',
        changed: true,
      };
    }

    if (baseConfig.packageName !== targetConfig.packageName && targetConfig.packageName !== undefined) {
      integrationDiff.flutterPackageName = {
        base: baseConfig.packageName || '',
        target: targetConfig.packageName || '',
        changed: true,
      };
    }

    if (baseConfig.versionConstraint !== targetConfig.versionConstraint && targetConfig.versionConstraint !== undefined) {
      integrationDiff.flutterVersionConstraint = {
        base: baseConfig.versionConstraint || '',
        target: targetConfig.versionConstraint || '',
        changed: true,
      };
    }

    // Allowed Domains Diff
    const normalizeDomains = (domains: any): string[] => {
      if (Array.isArray(domains)) return domains.map((d) => d.trim()).filter(Boolean);
      if (typeof domains === 'string') return domains.split(',').map((d) => d.trim()).filter(Boolean);
      return [];
    };

    const baseDomains = normalizeDomains(baseConfig.allowedDomains);
    const targetDomains = normalizeDomains(
      targetConfig.allowedDomains !== undefined ? targetConfig.allowedDomains : baseConfig.allowedDomains,
    );

    for (const td of targetDomains) {
      if (!baseDomains.includes(td)) {
        integrationDiff.allowedDomains.added.push(td);
      } else {
        integrationDiff.allowedDomains.unchanged.push(td);
      }
    }
    for (const bd of baseDomains) {
      if (!targetDomains.includes(bd)) {
        integrationDiff.allowedDomains.removed.push(bd);
      }
    }

    // Permissions Diff
    const basePerms: any[] = Array.isArray(baseApp.permissions) ? baseApp.permissions : [];
    const targetPerms: any[] = Array.isArray(targetRev.permissions) ? targetRev.permissions : basePerms;

    const baseMap = new Map<string, any>(basePerms.map((p) => [typeof p === 'string' ? p : p.type, p]));
    const targetMap = new Map<string, any>(targetPerms.map((p) => [typeof p === 'string' ? p : p.type, p]));

    const permissionsDiff: any = {
      added: [],
      removed: [],
      modified: [],
      unchanged: [],
    };

    let isHighRisk = false;

    for (const [pType, pObj] of targetMap.entries()) {
      const risk = this.getPermissionRiskLevel(pType);
      if (risk === 'HIGH') isHighRisk = true;

      if (!baseMap.has(pType)) {
        permissionsDiff.added.push({
          type: pType,
          purpose: typeof pObj === 'object' ? pObj.purpose : '',
          riskLevel: risk,
        });
      } else {
        const oldP = baseMap.get(pType);
        const oldPurpose = typeof oldP === 'object' ? oldP.purpose : '';
        const newPurpose = typeof pObj === 'object' ? pObj.purpose : '';
        if (oldPurpose !== newPurpose) {
          permissionsDiff.modified.push({
            type: pType,
            oldPurpose,
            newPurpose,
          });
        } else {
          permissionsDiff.unchanged.push({
            type: pType,
            purpose: newPurpose,
          });
        }
      }
    }

    for (const [pType, pObj] of baseMap.entries()) {
      if (!targetMap.has(pType)) {
        permissionsDiff.removed.push({
          type: pType,
          purpose: typeof pObj === 'object' ? pObj.purpose : '',
        });
      }
    }

    if (integrationDiff.allowedDomains.added.length > 0) {
      isHighRisk = true;
    }

    // Security Diff
    const baseScore = baseApp.validationReport?.score ?? 100;
    const targetScore = targetRev.validationReport?.score ?? targetRev.score ?? baseScore;

    const securityDiff = {
      scoreDiff: {
        base: baseScore,
        target: targetScore,
        delta: targetScore - baseScore,
      },
      domainVerification: {
        base: Boolean(baseApp.isDomainVerified),
        target: Boolean(targetRev.isDomainVerified !== undefined ? targetRev.isDomainVerified : baseApp.isDomainVerified),
        changed: targetRev.isDomainVerified !== undefined && targetRev.isDomainVerified !== baseApp.isDomainVerified,
      },
      validationStatus: {
        base: baseApp.validationStatus || 'PASSED',
        target: targetRev.validationStatus || 'PENDING',
      },
    };

    const hasChanges =
      Object.keys(metadataDiff).length > 0 ||
      integrationDiff.method.changed ||
      Boolean(integrationDiff.productionUrl?.changed) ||
      Boolean(integrationDiff.stagingUrl?.changed) ||
      Boolean(integrationDiff.urlScheme?.changed) ||
      Boolean(integrationDiff.flutterPackageName?.changed) ||
      Boolean(integrationDiff.flutterVersionConstraint?.changed) ||
      integrationDiff.allowedDomains.added.length > 0 ||
      integrationDiff.allowedDomains.removed.length > 0 ||
      permissionsDiff.added.length > 0 ||
      permissionsDiff.removed.length > 0 ||
      permissionsDiff.modified.length > 0;

    const baseVersionStr = baseApp.currentReleaseVersion || '1.0.0';
    const targetVersionStr = targetRev.version || targetRev.draftVersion || (hasChanges ? 'v1.1.0-draft' : baseVersionStr);

    return {
      miniAppId: baseApp.id,
      appName: baseApp.name,
      appId: baseApp.appId,
      baseVersion: {
        version: baseVersionStr,
        type: baseApp.status === 'ACTIVE' ? 'PRODUCTION' : 'LIVE',
        status: baseApp.status,
        releasedAt: baseApp.createdAt?.toISOString ? baseApp.createdAt.toISOString() : baseApp.createdAt,
      },
      targetVersion: {
        version: targetVersionStr,
        type: targetRev.revisionStatus ? 'REVISION' : 'PRODUCTION',
        status: targetRev.revisionStatus || 'IN_REVIEW',
        submittedAt: targetRev.submittedAt || new Date().toISOString(),
        changelog: targetRev.changelog || 'Feature updates and improvements',
        justification: targetRev.justification || 'Updated configuration for platform integration',
      },
      hasChanges,
      isHighRiskChange: isHighRisk,
      differences: {
        metadata: metadataDiff,
        integration: integrationDiff,
        permissions: permissionsDiff,
        security: securityDiff,
      },
    };
  }
}
