/**
 * Diagnostic Error Classifier
 *
 * Parses raw Jenkins CI build errors, Nexus registry errors, and Flutter compilation
 * outputs into structured diagnostic reports with clear accountability:
 * - PLATFORM_INFRASTRUCTURE (DevOps / Admin responsibility: Nexus, Jenkins, Network, Disk, OOM)
 * - MINIAPP_DEVELOPER (Partner developer responsibility: Dart syntax, pubspec conflict, missing imports)
 * - NEEDS_TRIAGE (Ambiguous exits requiring manual log review)
 */

export type AccountabilityType = 'PLATFORM_INFRASTRUCTURE' | 'MINIAPP_DEVELOPER' | 'NEEDS_TRIAGE';

export interface DiagnosticClassification {
  accountability: AccountabilityType;
  accountabilityLabel: string;
  accountabilityRole: string; // 'Platform Team / DevOps' or 'MiniApp Developer'
  category: string;
  summary: string;
  remedy: string;
  rawError: string;
  isInfrastructure: boolean;
  isDeveloperDefect: boolean;
}

export function classifyDiagnosticError(rawError?: string | null): DiagnosticClassification {
  const err = (rawError || '').trim();

  // 1. Sonatype Nexus HTTP 429 (Too many failed login attempts / rate limit)
  if (/HTTP\s*429|Too many failed login attempts|rate limit/i.test(err)) {
    return {
      accountability: 'PLATFORM_INFRASTRUCTURE',
      accountabilityLabel: 'Platform Infrastructure Issue',
      accountabilityRole: 'Platform Team / DevOps',
      category: 'Nexus Registry Throttled (HTTP 429)',
      summary:
        'Sonatype Nexus package registry blocked requests because anti-brute-force rate limiting was triggered by repeated login attempts.',
      remedy:
        'DevOps / Admin must pause requests for 60–90 seconds to allow the Nexus lockout window to expire, and verify that NEXUS_ADMIN_PASSWORD in Kubernetes secrets matches Nexus.',
      rawError: err,
      isInfrastructure: true,
      isDeveloperDefect: false,
    };
  }

  // 2. Nexus HTTP 401 / 403 (Unauthorized / Forbidden)
  if (/HTTP\s*(401|403)|Unauthorized|Forbidden|refused.*HTTP 40[13]/i.test(err)) {
    return {
      accountability: 'PLATFORM_INFRASTRUCTURE',
      accountabilityLabel: 'Platform Infrastructure Issue',
      accountabilityRole: 'Platform Team / DevOps',
      category: 'Nexus Authentication / Authorization Failure',
      summary:
        'Sonatype Nexus rejected credentials or denied access permissions when uploading or resolving package artifacts.',
      remedy:
        'DevOps must verify NEXUS_ADMIN_USER and NEXUS_ADMIN_PASSWORD in the Kubernetes cluster secrets, and ensure the repository permissions allow write access.',
      rawError: err,
      isInfrastructure: true,
      isDeveloperDefect: false,
    };
  }

  // 3. Nexus or Registry Service Outage (502, 503, 504, ECONNREFUSED)
  if (/HTTP\s*(500|502|503|504)|ECONNREFUSED|ECONNRESET|ETIMEDOUT|Nexus could not be reached|not available on this server/i.test(err)) {
    return {
      accountability: 'PLATFORM_INFRASTRUCTURE',
      accountabilityLabel: 'Platform Infrastructure Issue',
      accountabilityRole: 'Platform Team / DevOps',
      category: 'Service Unreachable / Outage',
      summary:
        'The backend or Jenkins CI runner was unable to connect to the internal Sonatype Nexus registry or MinIO storage.',
      remedy:
        'DevOps must inspect super-app-nexus-svc and MinIO service health in Kubernetes to ensure pods are running and accepting connections.',
      rawError: err,
      isInfrastructure: true,
      isDeveloperDefect: false,
    };
  }

  // 4. Gradle Distribution Download / Mirror Failure
  if (/Could not download Gradle|services\.gradle\.org|gradle-9\.1\.0.*not in Nexus/i.test(err)) {
    return {
      accountability: 'PLATFORM_INFRASTRUCTURE',
      accountabilityLabel: 'Platform Infrastructure Issue',
      accountabilityRole: 'Platform Team / DevOps',
      category: 'Build Toolchain Mirror Failure',
      summary:
        'The Jenkins build runner could not download Gradle 9.1.0 distribution from the internal Nexus mirror or services.gradle.org.',
      remedy:
        'Admin must mirror Gradle 9.1.0 into Nexus superapp-artifacts/gradle/ using scripts/mirror-gradle-to-nexus.ps1.',
      rawError: err,
      isInfrastructure: true,
      isDeveloperDefect: false,
    };
  }

  // 5. CI Runner Resource Limits / Out Of Memory / Timeout
  if (/timed out after|OutOfMemoryError|No space left on device|DOCKER_DAEMON|Cannot allocate memory/i.test(err)) {
    return {
      accountability: 'PLATFORM_INFRASTRUCTURE',
      accountabilityLabel: 'Platform Infrastructure Issue',
      accountabilityRole: 'Platform Team / DevOps',
      category: 'CI Runner Resource Exhaustion',
      summary:
        'The Jenkins build container ran out of memory, exceeded disk capacity, or hit the pipeline execution timeout.',
      remedy:
        'DevOps must increase memory limits (e.g. Gradle heap) and disk storage allocations on the Jenkins worker nodes.',
      rawError: err,
      isInfrastructure: true,
      isDeveloperDefect: false,
    };
  }

  // 6. MiniApp Dart Code Compilation Failure (Syntax, undefined names, type errors)
  if (/Error: Undefined name|Target .* failed:|Dart Error|syntax error|compilation error|NoSuchMethodError|Error:.*\.dart/i.test(err)) {
    return {
      accountability: 'MINIAPP_DEVELOPER',
      accountabilityLabel: 'MiniApp Code Defect',
      accountabilityRole: 'MiniApp Developer',
      category: 'Dart Compilation / Syntax Error',
      summary:
        'The MiniApp source code contains syntax errors, missing type declarations, or unresolved identifiers.',
      remedy:
        'The MiniApp developer must run `flutter analyze` locally, resolve all errors in the mini app repository, and submit a new revision.',
      rawError: err,
      isInfrastructure: false,
      isDeveloperDefect: true,
    };
  }

  // 7. MiniApp Dependency Conflict / Pubspec Solving Failure
  if (/Because .* depends on|pub get failed|version solving failed|unresolvable package|does not exist in pub/i.test(err)) {
    return {
      accountability: 'MINIAPP_DEVELOPER',
      accountabilityLabel: 'MiniApp Code Defect',
      accountabilityRole: 'MiniApp Developer',
      category: 'Package Dependency Conflict (pubspec.yaml)',
      summary:
        'Flutter pub package resolver failed because the MiniApp specifies dependencies incompatible with other mini apps or the host shell.',
      remedy:
        'The MiniApp developer must update `pubspec.yaml` dependency version constraints to match the SuperApp SDK baseline.',
      rawError: err,
      isInfrastructure: false,
      isDeveloperDefect: true,
    };
  }

  // 8. Generic Script Exit Code 1 (Needs Triage)
  if (/script returned exit code 1/i.test(err)) {
    return {
      accountability: 'NEEDS_TRIAGE',
      accountabilityLabel: 'Build Failure (Needs Log Review)',
      accountabilityRole: 'Platform Team & MiniApp Developer',
      category: 'Fastlane Compilation Script Exit (Code 1)',
      summary:
        'The Fastlane/Flutter compiler script exited with code 1. The compiler output was not piped into the failure summary.',
      remedy:
        'Review the Jenkins console logs to locate the specific compiler error, or check if Nexus package resolution was throttled.',
      rawError: err,
      isInfrastructure: false,
      isDeveloperDefect: false,
    };
  }

  // 9. Default Fallback
  return {
    accountability: 'NEEDS_TRIAGE',
    accountabilityLabel: 'Build Failure Detected',
    accountabilityRole: 'Engineering Team',
    category: 'CI/CD Pipeline Failure',
    summary: err || 'An unexpected error occurred during the compilation or packaging pipeline.',
    remedy: 'Inspect the detailed build logs in Jenkins or the Activity Log tab to diagnose the root cause.',
    rawError: err,
    isInfrastructure: false,
    isDeveloperDefect: false,
  };
}
