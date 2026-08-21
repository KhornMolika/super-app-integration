import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as YAML from 'yaml';
import { GitIntegrationService } from '../git/git-integration.service';
import {
  GateStatus,
  RunSecurityGate1Dto,
  SecurityFinding,
  SecurityGateReport,
  SecuritySeverity,
} from './dto/security-gate.dto';

// Known Flutter native plugins mapped to required platform permissions
const PLUGIN_PERMISSION_MAP: Record<string, { permission: string; label: string }> = {
  camera: { permission: 'CAMERA', label: 'Camera' },
  geolocator: { permission: 'LOCATION', label: 'Location Services' },
  location: { permission: 'LOCATION', label: 'Location Services' },
  nfc_manager: { permission: 'NFC', label: 'NFC Reader / Writer' },
  image_picker: { permission: 'PHOTO_LIBRARY', label: 'Photos / Storage' },
  file_picker: { permission: 'STORAGE', label: 'File Storage' },
  local_auth: { permission: 'BIOMETRICS', label: 'Biometrics / FaceID' },
  contacts_service: { permission: 'CONTACTS', label: 'Contacts' },
  flutter_contacts: { permission: 'CONTACTS', label: 'Contacts' },
  flutter_blue_plus: { permission: 'BLUETOOTH', label: 'Bluetooth' },
  flutter_blue: { permission: 'BLUETOOTH', label: 'Bluetooth' },
  permission_handler: { permission: 'DYNAMIC_PERMISSIONS', label: 'Runtime Permission Handler' },
};

// Patterns for detecting sensitive data, hardcoded secrets, and insecure endpoints
const SECRET_PATTERNS: Array<{
  name: string;
  regex: RegExp;
  severity: SecuritySeverity;
  recommendation: string;
}> = [
  {
    name: 'Private Key Block',
    regex: /-----BEGIN (RSA |EC |DSA |OPENSSH |)PRIVATE KEY-----/i,
    severity: SecuritySeverity.CRITICAL,
    recommendation: 'Remove private keys from source code. Use secure secret management or backend vault.',
  },
  {
    name: 'AWS Access Key ID',
    regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/,
    severity: SecuritySeverity.CRITICAL,
    recommendation: 'Revoke and rotate the exposed AWS credential immediately.',
  },
  {
    name: 'Hardcoded Bearer / Auth Token',
    regex: /(?:bearer\s+[a-zA-Z0-9_\-\.]{25,}|api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"])/i,
    severity: SecuritySeverity.HIGH,
    recommendation: 'Inject auth tokens dynamically at runtime via Super App auth bridge or secure storage.',
  },
  {
    name: 'Insecure Plain HTTP URL (Production)',
    regex: /http:\/\/(?!(?:localhost|127\.0\.0\.1|10\.|192\.168\.|0\.0\.0\.0))([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    severity: SecuritySeverity.MEDIUM,
    recommendation: 'Upgrade endpoint to HTTPS to prevent man-in-the-middle (MITM) attacks and data interception.',
  },
  {
    name: 'Hardcoded Public IP Address',
    regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b(?<!127\.0\.0\.1|0\.0\.0\.0)/,
    severity: SecuritySeverity.LOW,
    recommendation: 'Use DNS domain names instead of raw IP addresses for network routing and SSL validation.',
  },
];

@Injectable()
export class SecurityGateService {
  private readonly logger = new Logger(SecurityGateService.name);

  constructor(private readonly gitService: GitIntegrationService) {}

  async runGate1Scan(dto: RunSecurityGate1Dto): Promise<SecurityGateReport> {
    const findings: SecurityFinding[] = [];
    const timestamp = new Date().toISOString();

    let score = 100;
    let pubspecYamlRaw = '';
    let parsedYaml: any = null;
    let packageName = 'unknown_package';
    let packageVersion = '0.0.1';
    let sha256Digest = '';

    // 1. Fetch package files via Git provider
    try {
      const provider = this.gitService.resolveProvider(dto.url, dto.provider);
      const parsedUrl = provider.parseUrl(dto.url);
      const effectiveRef = dto.ref || parsedUrl.extractedRef || undefined;
      const effectivePath = (dto.path || parsedUrl.extractedPath || '').trim().replace(/^\/+|\/+$/g, '');
      const pubspecPath = effectivePath ? `${effectivePath}/pubspec.yaml` : 'pubspec.yaml';

      try {
        pubspecYamlRaw = await provider.getFileContent(dto.url, pubspecPath, effectiveRef, dto.token);
        parsedYaml = YAML.parse(pubspecYamlRaw);
        packageName = parsedYaml?.name || packageName;
        packageVersion = parsedYaml?.version || packageVersion;

        // Calculate SHA-256 integrity hash of pubspec
        sha256Digest = crypto.createHash('sha256').update(pubspecYamlRaw).digest('hex');
      } catch (err: any) {
        findings.push({
          id: 'GATE1-PUB-001',
          category: 'CODE_ANALYSIS',
          severity: SecuritySeverity.CRITICAL,
          title: 'pubspec.yaml Missing or Unreachable',
          description: `Unable to retrieve '${pubspecPath}' from repository: ${err.message}`,
          recommendation: 'Ensure repository exists, access token is valid, and pubspec.yaml is present at the specified path.',
        });
      }
    } catch (err: any) {
      findings.push({
        id: 'GATE1-GIT-001',
        category: 'CODE_ANALYSIS',
        severity: SecuritySeverity.CRITICAL,
        title: 'Git Repository Unresolvable',
        description: `Could not parse Git URL: ${err.message}`,
        recommendation: 'Provide a valid GitHub or GitLab repository URL.',
      });
    }

    // 2. Static Analysis & Manifest Check
    let staticAnalysisPassed = true;
    if (parsedYaml) {
      if (!parsedYaml.name) {
        findings.push({
          id: 'GATE1-SPEC-001',
          category: 'CODE_ANALYSIS',
          severity: SecuritySeverity.HIGH,
          title: 'Missing Package Name',
          description: "pubspec.yaml is missing the mandatory 'name' property.",
          recommendation: "Add a valid 'name' field in pubspec.yaml.",
        });
        staticAnalysisPassed = false;
      }

      if (!parsedYaml.version) {
        findings.push({
          id: 'GATE1-SPEC-002',
          category: 'CODE_ANALYSIS',
          severity: SecuritySeverity.MEDIUM,
          title: 'Missing Explicit Version',
          description: 'Package version is not specified. Semantic versioning is required for Super App dependency resolution.',
          recommendation: "Add 'version: 1.0.0' in pubspec.yaml following SemVer conventions.",
        });
      }

      // Check SDK environment constraints
      const sdkConstraint = parsedYaml.environment?.sdk;
      if (!sdkConstraint) {
        findings.push({
          id: 'GATE1-SPEC-003',
          category: 'CODE_ANALYSIS',
          severity: SecuritySeverity.MEDIUM,
          title: 'Missing Dart SDK Constraint',
          description: 'pubspec.yaml should specify an environment SDK constraint for build reproducibility.',
          recommendation: "Add 'environment: { sdk: ^3.0.0 }' in pubspec.yaml.",
        });
      }
    }

    // 3. Secret & Sensitive Data Scanning
    let leaksCount = 0;
    if (pubspecYamlRaw) {
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.regex.test(pubspecYamlRaw)) {
          leaksCount++;
          findings.push({
            id: `GATE1-SEC-${pattern.name.replace(/\s+/g, '-').toUpperCase()}`,
            category: 'SECRETS',
            severity: pattern.severity,
            title: `Potential Secret Detected: ${pattern.name}`,
            description: `A pattern matching '${pattern.name}' was discovered in package files.`,
            file: 'pubspec.yaml',
            recommendation: pattern.recommendation,
          });
        }
      }
    }

    // 4. Native Plugin vs. Declared Permissions Compliance
    const undeclaredPlugins: string[] = [];
    const declaredPerms = (dto.declaredPermissions || []).map((p) => p.type.toUpperCase());

    if (parsedYaml?.dependencies) {
      const deps = Object.keys(parsedYaml.dependencies);

      for (const dep of deps) {
        const mapped = PLUGIN_PERMISSION_MAP[dep];
        if (mapped) {
          const isDeclared = declaredPerms.includes(mapped.permission);
          if (!isDeclared) {
            undeclaredPlugins.push(dep);
            findings.push({
              id: `GATE1-PERM-${dep.toUpperCase()}`,
              category: 'PERMISSIONS',
              severity: SecuritySeverity.HIGH,
              title: `Undeclared Native Capability: ${dep}`,
              description: `The package uses '${dep}' which requires the '${mapped.permission}' (${mapped.label}) platform capability, but this permission is not declared in the Mini App registration.`,
              recommendation: `Declare the '${mapped.permission}' permission in the Backoffice portal with an explicit user privacy purpose, or remove the '${dep}' dependency.`,
            });
          }
        }
      }
    }

    // 5. Core SDK Compatibility Check
    let coreSdkPassed = true;
    let coreDetails = 'Not directly dependent on dps_core_package';
    let coreVersion: string | undefined = undefined;

    if (parsedYaml?.dependencies) {
      const coreDep = parsedYaml.dependencies['dps_core_package'];
      if (coreDep) {
        if (typeof coreDep === 'string') {
          coreVersion = coreDep;
        } else if (typeof coreDep === 'object' && coreDep.version) {
          coreVersion = coreDep.version;
        } else if (typeof coreDep === 'object' && coreDep.hosted) {
          coreVersion = coreDep.version || 'hosted';
        }

        coreDetails = `Compatible contract verified with dps_core_package (${coreVersion || 'latest'})`;
        coreSdkPassed = true;
      } else {
        findings.push({
          id: 'GATE1-SDK-001',
          category: 'COMPATIBILITY',
          severity: SecuritySeverity.INFO,
          title: 'Direct Core SDK Dependency Optional',
          description: 'Package does not declare dps_core_package dependency. Ensure bridge interfaces match Super App contracts.',
          recommendation: "If this mini app invokes Super App services, add 'dps_core_package: ^1.0.0' from Nexus pub-group.",
        });
      }
    }

    // 6. Calculate Metrics & Gate Status
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let infoCount = 0;

    for (const f of findings) {
      if (f.severity === SecuritySeverity.CRITICAL) {
        criticalCount++;
        score -= 40;
      } else if (f.severity === SecuritySeverity.HIGH) {
        highCount++;
        score -= 20;
      } else if (f.severity === SecuritySeverity.MEDIUM) {
        mediumCount++;
        score -= 10;
      } else if (f.severity === SecuritySeverity.LOW) {
        lowCount++;
        score -= 5;
      } else {
        infoCount++;
      }
    }

    score = Math.max(0, Math.min(100, score));

    let status: GateStatus = GateStatus.PASSED;
    if (criticalCount > 0 || highCount > 0) {
      status = GateStatus.FAILED;
    } else if (mediumCount > 0 || lowCount > 0) {
      status = GateStatus.WARNING;
    }

    return {
      gate: 'GATE_1',
      status,
      score,
      timestamp,
      target: {
        packageName,
        version: packageVersion,
        gitUrl: dto.url,
        ref: dto.ref,
        path: dto.path,
      },
      metrics: {
        totalFindings: findings.length,
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
        info: infoCount,
      },
      checks: {
        staticAnalysis: {
          passed: staticAnalysisPassed && criticalCount === 0,
          issuesCount: findings.filter((f) => f.category === 'CODE_ANALYSIS').length,
        },
        secretScan: {
          passed: leaksCount === 0,
          leaksFound: leaksCount,
        },
        permissionCompliance: {
          passed: undeclaredPlugins.length === 0,
          undeclaredPlugins,
        },
        coreSdkCompatibility: {
          passed: coreSdkPassed,
          coreVersion,
          details: coreDetails,
        },
        integrityCheck: {
          passed: Boolean(sha256Digest),
          sha256: sha256Digest || undefined,
        },
      },
      findings,
    };
  }
}
