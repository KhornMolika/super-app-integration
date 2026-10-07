export interface SecurityCheckMetadata {
  id: string;
  name: string;
  tool: string;
  icon: string;
  description: string;
  methods: ('WEBVIEW' | 'FLUTTER_PACKAGE' | 'NATIVE_SDK' | 'DEEP_LINK')[];
}

export interface StageCatalogItem {
  id: string;
  name: string;
  tool: string;
  icon: string;
  defaultTitle?: string;
  description: string;
}

export const SECURITY_CHECK_METADATA: Record<string, SecurityCheckMetadata> = {
  dependency_scan: {
    id: 'dependency_scan',
    name: 'Dependency Vulnerability Scan (SCA / CVE)',
    tool: 'Trivy / OSV Audit',
    icon: 'package',
    description: 'Scans third-party packages and dependencies for known CVE vulnerabilities.',
    methods: ['WEBVIEW', 'FLUTTER_PACKAGE', 'NATIVE_SDK'],
  },
  secret_scan: {
    id: 'secret_scan',
    name: 'Secret & API Key Leak Detection',
    tool: 'Gitleaks / TruffleHog',
    icon: 'key',
    description: 'Detects exposed private keys, JWT secrets, and hardcoded API tokens in code and configs.',
    methods: ['WEBVIEW', 'FLUTTER_PACKAGE', 'NATIVE_SDK', 'DEEP_LINK'],
  },
  sast: {
    id: 'sast',
    name: 'Static Application Security Testing (SAST)',
    tool: 'Semgrep / SonarQube / AST Guard',
    icon: 'shield',
    description: 'Analyzes source code for security flaws, unsafe memory operations, and prohibited native calls.',
    methods: ['FLUTTER_PACKAGE', 'NATIVE_SDK'],
  },
  sbom: {
    id: 'sbom',
    name: 'Software Bill of Materials (SBOM)',
    tool: 'Syft / CycloneDX 1.5',
    icon: 'clipboard-check',
    description: 'Generates cryptographic CycloneDX & SPDX SBOM manifests of all software packages and sub-dependencies.',
    methods: ['FLUTTER_PACKAGE', 'NATIVE_SDK'],
  },
  domain_tls_audit: {
    id: 'domain_tls_audit',
    name: 'Domain TLS/SSL & Transport Security',
    tool: 'testssl.sh / SSL Labs',
    icon: 'lock',
    description: 'Audits TLS 1.2/1.3 cipher suites, HTTPS certificates, HSTS headers, and SSRF routing.',
    methods: ['WEBVIEW', 'DEEP_LINK'],
  },
  csp_headers_audit: {
    id: 'csp_headers_audit',
    name: 'Security Headers & CSP Audit',
    tool: 'SecurityHeaders / ZAP Audit',
    icon: 'shield-alert',
    description: 'Verifies Content-Security-Policy, X-Frame-Options, CORS origins, and cookie security flags.',
    methods: ['WEBVIEW'],
  },
  dast_zap: {
    id: 'dast_zap',
    name: 'Dynamic Application Security Probing (DAST)',
    tool: 'OWASP ZAP DAST',
    icon: 'zap',
    description: 'Dynamic probing for cross-site scripting (XSS), CSRF, and sensitive endpoint exposure.',
    methods: ['WEBVIEW'],
  },
  malware_scan: {
    id: 'malware_scan',
    name: 'Malware & Binary Signature Scan',
    tool: 'ClamAV / YARA',
    icon: 'virus',
    description: 'Deep signature inspection of compiled binaries and assets for malicious payloads.',
    methods: ['FLUTTER_PACKAGE', 'NATIVE_SDK'],
  },
  license_compliance: {
    id: 'license_compliance',
    name: 'Open Source License Compliance',
    tool: 'FOSSA / License-Checker',
    icon: 'file-text',
    description: 'Verifies dependency licenses against platform IP guidelines and copyleft restrictions.',
    methods: ['FLUTTER_PACKAGE', 'NATIVE_SDK'],
  },
  capability_gate: {
    id: 'capability_gate',
    name: 'Host Capability Gatekeeper Audit',
    tool: 'Super App Gatekeeper',
    icon: 'shield-check',
    description: 'Verifies declared host capabilities against platform policies and app store guidelines.',
    methods: ['FLUTTER_PACKAGE', 'NATIVE_SDK', 'DEEP_LINK'],
  },
  ssrf: {
    id: 'ssrf',
    name: 'Pre-Flight & SSRF Defense',
    tool: 'DNS / IP Routing Filter',
    icon: 'globe',
    description: 'Resolves DNS and verifies routing to prevent server-side request forgery.',
    methods: ['WEBVIEW', 'DEEP_LINK'],
  },
  ingest: {
    id: 'ingest',
    name: 'Ingestion & Integrity Verification',
    tool: 'Cryptographic SHA-256 Digest',
    icon: 'package',
    description: 'Unpacks package source and verifies cryptographic checksum and manifest structure.',
    methods: ['FLUTTER_PACKAGE', 'NATIVE_SDK'],
  },
};

export const STAGE_CATALOG: Record<string, StageCatalogItem> = {
  ingest: {
    id: 'ingest',
    name: 'Ingestion & Integrity Verification',
    tool: 'Cryptographic SHA-256 Digest',
    icon: 'package',
    defaultTitle: 'Source Unpack & SHA-256 Digest',
    description: 'Unpacks package source and verifies cryptographic checksum and manifest structure.',
  },
  ssrf: {
    id: 'ssrf',
    name: 'Pre-Flight & SSRF Defense',
    tool: 'DNS / IP Routing Filter',
    icon: 'globe',
    defaultTitle: 'DNS & IP Routing Audit',
    description: 'Resolves DNS and verifies routing to prevent server-side request forgery.',
  },
  dependency_scan: {
    id: 'dependency_scan',
    name: 'Dependency Vulnerability Scan (SCA / CVE)',
    tool: 'Trivy / OSV Audit',
    icon: 'package',
    defaultTitle: 'Dependency Vulnerability (CVE) Audit',
    description: 'Scans third-party packages and dependencies for known CVE vulnerabilities.',
  },
  secret_scan: {
    id: 'secret_scan',
    name: 'Secret & API Key Leak Detection',
    tool: 'Gitleaks / TruffleHog',
    icon: 'key',
    defaultTitle: 'Gitleaks & API Key Scan',
    description: 'Detects exposed private keys, JWT secrets, and hardcoded API tokens in code and configs.',
  },
  sast: {
    id: 'sast',
    name: 'Static Application Security Testing (SAST)',
    tool: 'Semgrep / SonarQube / AST Guard',
    icon: 'shield',
    defaultTitle: 'Dart AST & Sandbox Guard',
    description: 'Analyzes source code for security flaws, unsafe memory operations, and prohibited native calls.',
  },
  sbom: {
    id: 'sbom',
    name: 'Software Bill of Materials (SBOM)',
    tool: 'Syft / CycloneDX 1.5',
    icon: 'clipboard-check',
    defaultTitle: 'CycloneDX & SPDX Manifest Generation',
    description: 'Generates cryptographic CycloneDX 1.5 & SPDX SBOM manifests of all components and licenses.',
  },
  domain_tls_audit: {
    id: 'domain_tls_audit',
    name: 'Domain TLS/SSL & Transport Security',
    tool: 'testssl.sh / SSL Labs',
    icon: 'lock',
    defaultTitle: 'SSL/TLS Cipher Suite Audit',
    description: 'Audits TLS 1.2/1.3 cipher suites, HTTPS certificates, HSTS headers, and SSRF routing.',
  },
  csp_headers_audit: {
    id: 'csp_headers_audit',
    name: 'Security Headers & CSP Audit',
    tool: 'SecurityHeaders / ZAP Audit',
    icon: 'shield-alert',
    defaultTitle: 'Security Headers & CSP Audit',
    description: 'Verifies Content-Security-Policy, X-Frame-Options, CORS origins, and cookie security flags.',
  },
  dast_zap: {
    id: 'dast_zap',
    name: 'Dynamic Application Security Probing (DAST)',
    tool: 'OWASP ZAP DAST',
    icon: 'zap',
    defaultTitle: 'DAST, XSS & CSP Audit',
    description: 'Dynamic probing for cross-site scripting (XSS), CSRF, and sensitive endpoint exposure.',
  },
  malware_scan: {
    id: 'malware_scan',
    name: 'Malware & Binary Signature Scan',
    tool: 'ClamAV / YARA',
    icon: 'virus',
    defaultTitle: 'Malware & Binary Signature Heuristics',
    description: 'Deep signature inspection of compiled binaries and assets for malicious payloads.',
  },
  license_compliance: {
    id: 'license_compliance',
    name: 'Open Source License Compliance',
    tool: 'FOSSA / License-Checker',
    icon: 'file-text',
    defaultTitle: 'License IP & Copyleft Compliance',
    description: 'Verifies dependency licenses against platform IP guidelines and copyleft restrictions.',
  },
  capability_gate: {
    id: 'capability_gate',
    name: 'Host Capability Gatekeeper Audit',
    tool: 'Super App Gatekeeper',
    icon: 'shield-check',
    defaultTitle: 'Super App Capability Boundary Verification',
    description: 'Verifies declared host capabilities against platform policies and app store guidelines.',
  },
  // Aliases for backwards compatibility
  secrets: {
    id: 'secrets',
    name: 'Secret & API Key Leak Detection',
    tool: 'Gitleaks / TruffleHog',
    icon: 'key',
    defaultTitle: 'Gitleaks & API Key Scan',
    description: 'Detects exposed private keys, JWT secrets, and hardcoded API tokens.',
  },
  malware_sast: {
    id: 'malware_sast',
    name: 'Malware & Static Code Analysis (SAST)',
    tool: 'Dart AST & Sandbox Guard',
    icon: 'shield',
    defaultTitle: 'Dart AST & Sandbox Guard',
    description: 'Analyzes source code for security flaws and prohibited native calls.',
  },
  sca: {
    id: 'sca',
    name: 'Software Composition Analysis (SCA)',
    tool: 'Dependency Vulnerability (CVE) Audit',
    icon: 'package',
    defaultTitle: 'Dependency Vulnerability (CVE) Audit',
    description: 'Scans third-party packages for known CVE vulnerabilities.',
  },
  tls: {
    id: 'tls',
    name: 'TLS & HTTPS Security',
    tool: 'SSL/TLS Cipher Suite Audit',
    icon: 'lock',
    defaultTitle: 'SSL/TLS Cipher Suite Audit',
    description: 'Audits TLS 1.2/1.3 cipher suites and HTTPS encryption.',
  },
  zap: {
    id: 'zap',
    name: 'OWASP ZAP DAST Scan',
    tool: 'OWASP ZAP DAST',
    icon: 'zap',
    defaultTitle: 'DAST, XSS & CSP Audit',
    description: 'Dynamic probing for cross-site scripting and security headers.',
  },
  nuclei: {
    id: 'nuclei',
    name: 'Exposure & Vulnerability Audit',
    tool: 'Secret & CVE Exposure Check',
    icon: 'search',
    defaultTitle: 'Secret & CVE Exposure Check',
    description: 'Probes for exposed endpoints, secrets, and CVE vulnerabilities.',
  },
};

export function getDefaultChecksForMethod(method: string): string[] {
  const norm = (method || 'WEBVIEW').toUpperCase();
  if (norm === 'FLUTTER_PACKAGE' || norm === 'NATIVE_SDK') {
    return ['secret_scan', 'sast', 'dependency_scan', 'capability_gate', 'sbom', 'license_compliance'];
  }
  if (norm === 'DEEP_LINK') {
    return ['scheme_audit', 'store_url_audit', 'capability_gate'];
  }
  return ['domain_tls_audit', 'csp_headers_audit', 'dast_zap'];
}

export function buildDynamicValidationStages(
  method: string,
  userSelectedChecks?: string[],
): Record<string, any> {
  const norm = (method || 'WEBVIEW').toUpperCase();

  const METHOD_PIPELINE_STAGES: Record<string, string[]> = {
    WEBVIEW: ['ssrf', 'domain_tls_audit', 'csp_headers_audit', 'dast_zap'],
    FLUTTER_PACKAGE: ['ingest', 'secret_scan', 'sast', 'dependency_scan', 'capability_gate', 'sbom', 'license_compliance'],
    NATIVE_SDK: ['ingest', 'secret_scan', 'sast', 'capability_gate', 'malware_scan', 'license_compliance'],
    DEEP_LINK: ['scheme_audit', 'store_url_audit', 'capability_gate'],
  };

  const pipelineSequence = METHOD_PIPELINE_STAGES[norm] || METHOD_PIPELINE_STAGES.WEBVIEW;
  const rawChecks =
    userSelectedChecks && userSelectedChecks.length > 0
      ? userSelectedChecks
      : pipelineSequence;

  const baseKey = pipelineSequence[0];
  const userSet = new Set([...rawChecks, baseKey]);
  const stageKeys = pipelineSequence.filter((k) => userSet.has(k));

  const stages: Record<string, any> = {};
  stageKeys.forEach((key, idx) => {
    const meta = SECURITY_CHECK_METADATA[key] || STAGE_CATALOG[key] || {
      id: key,
      name: key.replace(/_/g, ' ').toUpperCase(),
      tool: 'Security Engine',
      icon: 'shield',
      description: 'Automated security scan stage.',
    };

    stages[key] = {
      id: key,
      order: idx + 1,
      name: `${idx + 1}. ${meta.name}`,
      tool: meta.tool,
      icon: meta.icon,
      status: idx === 0 ? 'RUNNING' : 'PENDING',
      details: idx === 0 ? `Initiating ${meta.name}...` : `Awaiting ${meta.name}...`,
      updatedAt: new Date().toISOString(),
    };
  });

  return stages;
}
