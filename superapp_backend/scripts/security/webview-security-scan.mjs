#!/usr/bin/env node

/**
 * Super App WebView Automated Security & Method Validation Scanner
 * 
 * Executes 4 deterministic security audits:
 * 1. SSRF & DNS Rebinding Protection
 * 2. HTTPS & TLS Configuration Audit
 * 3. Open Redirect & Allowed Domains Enforcement
 * 4. Security Headers & Content-Security-Policy (CSP) Audit
 */

import dns from 'dns/promises';
import tls from 'tls';
import fs from 'fs';
import path from 'path';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    url: '',
    allowedDomains: [],
    allowLocal: false,
    outputFile: '',
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
      options.url = args[++i];
    } else if (args[i] === '--allowed-domains' && args[i + 1]) {
      options.allowedDomains = args[++i].split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
    } else if (args[i] === '--allow-local') {
      options.allowLocal = true;
    } else if (args[i] === '--output' && args[i + 1]) {
      options.outputFile = args[++i];
    }
  }

  return options;
}

function isPrivateOrRestrictedIp(ip) {
  if (ip.startsWith('127.') || ip === '0.0.0.0') return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('169.254.')) return true; // Link-local / Cloud Metadata
  if (ip.startsWith('192.168.')) return true;

  if (ip.startsWith('172.')) {
    const parts = ip.split('.').map(Number);
    if (parts.length >= 2 && parts[1] >= 16 && parts[1] <= 31) {
      return true;
    }
  }

  if (ip === '::1' || ip.toLowerCase().startsWith('fe80:') || ip.toLowerCase().startsWith('fc00:') || ip.toLowerCase().startsWith('fd00:')) {
    return true;
  }

  return false;
}

async function runScan() {
  const opts = parseArgs();
  if (!opts.url) {
    console.error('Usage: node webview-security-scan.mjs --url <URL> [--allowed-domains <d1,d2>] [--allow-local] [--output <report.json>]');
    process.exit(1);
  }

  let targetUrl;
  try {
    targetUrl = new URL(opts.url);
  } catch (err) {
    console.error(`Invalid URL provided: ${opts.url}`);
    process.exit(1);
  }

  const hostname = targetUrl.hostname.toLowerCase();
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const allowLocal = opts.allowLocal || isLocalhost;

  // Add target hostname to allowed domains by default
  const allowedDomainsSet = new Set([hostname, ...opts.allowedDomains]);

  const findings = [];
  const checks = {
    ssrfProtection: { passed: false, details: '' },
    tlsConfiguration: { passed: false, details: '' },
    redirectPolicy: { passed: false, details: '' },
    securityHeaders: { passed: false, details: '' },
  };

  console.log(`[WebView Scanner] Initiating scan for: ${targetUrl.href}`);

  // =========================================================================
  // CHECK 1: SSRF & DNS Rebinding Protection
  // =========================================================================
  console.log('[WebView Scanner] 1. Checking SSRF & DNS resolution...');
  try {
    const ips = [];
    try {
      const addresses = await dns.lookup(hostname, { all: true });
      for (const a of addresses) {
        if (a.address) ips.push(a.address);
      }
    } catch {
      try {
        const v4 = await dns.resolve4(hostname);
        ips.push(...v4);
      } catch {}
      try {
        const v6 = await dns.resolve6(hostname);
        ips.push(...v6);
      } catch {}
    }

    if (ips.length === 0 && !isLocalhost) {
      findings.push({
        id: 'SEC-SSRF-NO-DNS',
        severity: 'HIGH',
        category: 'SSRF',
        title: 'DNS Resolution Failed',
        description: `Could not resolve hostname "${hostname}" to any IP address.`,
        recommendation: 'Verify the domain name is registered and publicly resolvable via authoritative DNS.',
      });
    } else {
      let ssrfViolation = false;
      for (const ip of ips) {
        if (isPrivateOrRestrictedIp(ip) && !allowLocal) {
          ssrfViolation = true;
          findings.push({
            id: 'SEC-SSRF-RESTRICTED-IP',
            severity: 'CRITICAL',
            category: 'SSRF',
            title: 'SSRF Violation: Restricted IP Address',
            description: `Hostname "${hostname}" resolves to internal/restricted IP ${ip}.`,
            recommendation: 'Ensure public Mini App endpoints do not point to RFC 1918 private subnets or cloud metadata services.',
          });
        }
      }

      if (!ssrfViolation) {
        checks.ssrfProtection.passed = true;
        checks.ssrfProtection.details = `Hostname resolved safely to [${ips.join(', ')}]. No private subnets detected.`;
      }
    }
  } catch (err) {
    if (!allowLocal) {
      findings.push({
        id: 'SEC-SSRF-ERROR',
        severity: 'MEDIUM',
        category: 'SSRF',
        title: 'DNS Lookup Error',
        description: `Error resolving DNS: ${err.message}`,
        recommendation: 'Check domain connectivity and name resolution.',
      });
    } else {
      checks.ssrfProtection.passed = true;
      checks.ssrfProtection.details = 'Localhost test environment permitted.';
    }
  }

  // =========================================================================
  // CHECK 2: HTTPS & TLS Configuration Audit
  // =========================================================================
  console.log('[WebView Scanner] 2. Auditing HTTPS & TLS cipher configuration...');
  if (targetUrl.protocol !== 'https:' && !allowLocal) {
    findings.push({
      id: 'SEC-TLS-PLAIN-HTTP',
      severity: 'CRITICAL',
      category: 'TLS',
      title: 'Insecure Plain HTTP Protocol',
      description: 'WebView Mini Apps are required to use HTTPS to prevent man-in-the-middle attacks.',
      recommendation: 'Serve the Mini App exclusively over HTTPS with a valid TLS certificate.',
    });
  } else if (targetUrl.protocol === 'https:') {
    await new Promise((resolve) => {
      const port = targetUrl.port || 443;
      const socket = tls.connect(
        {
          host: hostname,
          port: Number(port),
          servername: hostname,
          rejectUnauthorized: !allowLocal,
          timeout: 7000,
        },
        () => {
          const cert = socket.getPeerCertificate();
          const protocol = socket.getProtocol();

          if (protocol && (protocol === 'TLSv1' || protocol === 'TLSv1.1')) {
            findings.push({
              id: 'SEC-TLS-OUTDATED-PROTOCOL',
              severity: 'HIGH',
              category: 'TLS',
              title: 'Deprecated TLS Protocol Version',
              description: `Endpoint negotiated deprecated protocol ${protocol}. Minimum required is TLSv1.2.`,
              recommendation: 'Upgrade web server configuration to support TLSv1.2 and TLSv1.3 only.',
            });
          }

          if (cert && cert.valid_to) {
            const expiryDate = new Date(cert.valid_to);
            const daysLeft = Math.round((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

            if (daysLeft < 0) {
              findings.push({
                id: 'SEC-TLS-CERT-EXPIRED',
                severity: 'CRITICAL',
                category: 'TLS',
                title: 'TLS Certificate Expired',
                description: `Certificate expired on ${expiryDate.toISOString()}.`,
                recommendation: 'Renew the TLS certificate immediately.',
              });
            } else if (daysLeft < 14) {
              findings.push({
                id: 'SEC-TLS-CERT-EXPIRING-SOON',
                severity: 'MEDIUM',
                category: 'TLS',
                title: 'TLS Certificate Expiring Soon',
                description: `Certificate will expire in ${daysLeft} days (${expiryDate.toISOString()}).`,
                recommendation: 'Schedule automatic certificate renewal before expiration.',
              });
            }
          }

          checks.tlsConfiguration.passed = !findings.some(f => f.category === 'TLS' && (f.severity === 'CRITICAL' || f.severity === 'HIGH'));
          checks.tlsConfiguration.details = `Negotiated ${protocol || 'TLS'}. Certificate valid until ${cert?.valid_to || 'N/A'}.`;
          socket.end();
          resolve();
        }
      );

      socket.on('error', (err) => {
        if (!allowLocal) {
          findings.push({
            id: 'SEC-TLS-CONNECTION-FAILED',
            severity: 'HIGH',
            category: 'TLS',
            title: 'TLS Handshake Failed',
            description: `TLS connection failed: ${err.message}`,
            recommendation: 'Ensure the host has a valid, trusted SSL/TLS certificate installed.',
          });
        } else {
          checks.tlsConfiguration.passed = true;
          checks.tlsConfiguration.details = 'Local bypass allowed for development test.';
        }
        resolve();
      });

      socket.on('timeout', () => {
        socket.destroy();
        findings.push({
          id: 'SEC-TLS-TIMEOUT',
          severity: 'MEDIUM',
          category: 'TLS',
          title: 'TLS Handshake Timeout',
          description: 'Connection timed out during TLS handshake.',
          recommendation: 'Check server responsiveness and firewall rules.',
        });
        resolve();
      });
    });
  } else {
    checks.tlsConfiguration.passed = true;
    checks.tlsConfiguration.details = 'Localhost HTTP permitted in local development mode.';
  }

  // =========================================================================
  // CHECK 3 & 4: Open Redirects, Security Headers & CSP
  // =========================================================================
  console.log('[WebView Scanner] 3. Testing navigation hops and security headers...');
  try {
    let currentUrl = targetUrl.href;
    let hops = 0;
    let finalResponse = null;
    const maxHops = 5;

    while (hops < maxHops) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'User-Agent': 'SuperApp-Security-Scanner/2.0 (Headless WebView Validator)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      finalResponse = res;

      // Handle redirect
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) break;

        const resolvedLocation = new URL(location, currentUrl);
        const redirectHost = resolvedLocation.hostname.toLowerCase();

        if (!allowedDomainsSet.has(redirectHost) && !isLocalhost) {
          findings.push({
            id: 'SEC-REDIRECT-UNAUTHORIZED-DOMAIN',
            severity: 'HIGH',
            category: 'REDIRECT',
            title: 'Open Redirect to Unauthorized Domain',
            description: `Redirect hop #${hops + 1} navigated to "${redirectHost}", which is not in the allowedDomains whitelist [${Array.from(allowedDomainsSet).join(', ')}].`,
            recommendation: 'Add all permitted redirect destination domains to the allowedDomains configuration or restrict server-side redirects.',
          });
        }

        currentUrl = resolvedLocation.href;
        hops++;
      } else {
        break;
      }
    }

    checks.redirectPolicy.passed = !findings.some(f => f.category === 'REDIRECT');
    checks.redirectPolicy.details = `Followed ${hops} redirect hop(s). All destinations verified against allowlist.`;

    // Audit Headers
    if (finalResponse) {
      const headers = finalResponse.headers;
      const csp = headers.get('content-security-policy');
      const nosniff = headers.get('x-content-type-options');
      const hsts = headers.get('strict-transport-security');
      const frameOptions = headers.get('x-frame-options');

      if (!csp && !frameOptions) {
        findings.push({
          id: 'SEC-HEADER-NO-FRAME-CONTROL',
          severity: 'MEDIUM',
          category: 'HEADERS',
          title: 'Missing Framing Controls (Clickjacking Protection)',
          description: 'Neither Content-Security-Policy (frame-ancestors) nor X-Frame-Options header was detected.',
          recommendation: 'Configure Content-Security-Policy: frame-ancestors to permit only the official Super App host shell.',
        });
      }

      if (!nosniff || nosniff.toLowerCase() !== 'nosniff') {
        findings.push({
          id: 'SEC-HEADER-NO-SNIFF',
          severity: 'LOW',
          category: 'HEADERS',
          title: 'Missing X-Content-Type-Options Header',
          description: 'The X-Content-Type-Options: nosniff header prevents MIME type sniffing exploits.',
          recommendation: 'Add "X-Content-Type-Options: nosniff" to web server response headers.',
        });
      }

      if (!hsts && targetUrl.protocol === 'https:' && !allowLocal) {
        findings.push({
          id: 'SEC-HEADER-NO-HSTS',
          severity: 'LOW',
          category: 'HEADERS',
          title: 'Missing Strict-Transport-Security (HSTS) Header',
          description: 'HSTS ensures browsers and WebViews never degrade connections to insecure plain HTTP.',
          recommendation: 'Add "Strict-Transport-Security: max-age=31536000; includeSubDomains" header.',
        });
      }

      checks.securityHeaders.passed = !findings.some(f => f.category === 'HEADERS' && (f.severity === 'HIGH' || f.severity === 'CRITICAL'));
      checks.securityHeaders.details = `CSP: ${csp ? 'Present' : 'Missing'}, X-Frame-Options: ${frameOptions || 'Missing'}, HSTS: ${hsts ? 'Present' : 'Missing'}.`;
    }
  } catch (err) {
    if (!allowLocal) {
      findings.push({
        id: 'SEC-HTTP-CONNECT-FAILED',
        severity: 'HIGH',
        category: 'HTTP',
        title: 'HTTP Probe Failed',
        description: `Failed to probe endpoint: ${err.message}`,
        recommendation: 'Verify the web server is running and accessible from the CI agent.',
      });
    }
  }

  // Calculate overall score & status
  let score = 100;
  for (const f of findings) {
    if (f.severity === 'CRITICAL') score -= 40;
    else if (f.severity === 'HIGH') score -= 25;
    else if (f.severity === 'MEDIUM') score -= 10;
    else if (f.severity === 'LOW') score -= 5;
  }
  score = Math.max(0, Math.min(100, score));

  const hasBlockingIssues = findings.some(f => f.severity === 'CRITICAL' || f.severity === 'HIGH');
  const status = hasBlockingIssues ? 'FAILED' : 'PASSED';

  const report = {
    timestamp: new Date().toISOString(),
    targetUrl: targetUrl.href,
    allowedDomains: Array.from(allowedDomainsSet),
    status,
    score,
    checks,
    findings,
  };

  console.log(`\n[WebView Scanner] Scan Finished. Status: ${status} (Score: ${score}/100)`);
  console.log(`[WebView Scanner] Total findings: ${findings.length}`);
  for (const f of findings) {
    console.log(`  - [${f.severity}] ${f.id}: ${f.title}`);
  }

  if (opts.outputFile) {
    const outPath = path.resolve(opts.outputFile);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`[WebView Scanner] Report saved to: ${outPath}`);
  }

  if (hasBlockingIssues) {
    process.exit(2);
  }
}

runScan().catch(err => {
  console.error('[WebView Scanner] Fatal unhandled error:', err);
  process.exit(1);
});
