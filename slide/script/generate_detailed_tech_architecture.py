import os
import subprocess

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, 'slide', 'assets')
OUTPUT_IMAGE = os.path.join(OUTPUT_DIR, 'fsa_superapp_system_architecture.png')
HTML_TEMP = os.path.join(OUTPUT_DIR, 'temp_detailed_architecture.html')

CHROME_PATH = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

html_content = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FSA Super App Technical Architecture & Communication Protocols</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: 2600px;
      height: 1440px;
      overflow: hidden;
      background: #060907;
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      color: #FFFFFF;
      position: relative;
      user-select: none;
      -webkit-font-smoothing: antialiased;
    }

    /* Ambient Circuit & Blueprint Grid */
    .blueprint-bg {
      position: absolute;
      inset: 0;
      background-image:
        radial-gradient(circle at 10% 20%, rgba(57, 99, 68, 0.25) 0%, transparent 45%),
        radial-gradient(circle at 90% 20%, rgba(248, 209, 97, 0.14) 0%, transparent 45%),
        radial-gradient(circle at 50% 85%, rgba(56, 189, 248, 0.12) 0%, transparent 50%),
        linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 100% 100%, 100% 100%, 100% 100%, 40px 40px, 40px 40px;
    }

    /* Top Brand & Header Bar */
    .arch-header {
      position: relative;
      z-index: 10;
      padding: 30px 60px 20px 60px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: linear-gradient(180deg, rgba(6, 9, 7, 0.98) 0%, rgba(6, 9, 7, 0.75) 100%);
    }

    .org-eyebrow {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13.5px;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #F8D161;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
    }

    .main-title {
      font-size: 34px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #FFFFFF;
      display: flex;
      align-items: baseline;
      gap: 16px;
    }

    .subtitle {
      font-size: 15.5px;
      color: #9EBBA3;
      font-weight: 400;
    }

    .tech-legend {
      display: flex;
      gap: 12px;
    }

    .leg-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
      border: 1px solid;
    }

    .leg-badge.http { color: #38BDF8; border-color: rgba(56, 189, 248, 0.35); background: rgba(56, 189, 248, 0.08); }
    .leg-badge.ws { color: #F8D161; border-color: rgba(248, 209, 97, 0.35); background: rgba(248, 209, 97, 0.08); }
    .leg-badge.ipc { color: #4ADE80; border-color: rgba(74, 222, 128, 0.35); background: rgba(74, 222, 128, 0.08); }
    .leg-badge.s3 { color: #EC4899; border-color: rgba(236, 72, 153, 0.35); background: rgba(236, 72, 153, 0.08); }

    /* Main Grid: 4 Technical Domains */
    .arch-grid {
      position: relative;
      z-index: 10;
      padding: 24px 60px 24px 60px;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 28px;
      height: 1250px;
    }

    /* Column Container */
    .arch-col {
      display: flex;
      flex-direction: column;
      background: rgba(11, 17, 13, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(12px);
      position: relative;
    }

    .arch-col.gold { border-top: 3px solid #F8D161; }
    .arch-col.blue { border-top: 3px solid #38BDF8; }
    .arch-col.green { border-top: 3px solid #4ADE80; }
    .arch-col.purple { border-top: 3px solid #A855F7; }

    .col-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .col-layer {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: 0.10em;
    }

    .col-layer.gold { color: #F8D161; }
    .col-layer.blue { color: #38BDF8; }
    .col-layer.green { color: #4ADE80; }
    .col-layer.purple { color: #A855F7; }

    .col-title {
      font-size: 18px;
      font-weight: 700;
      color: #FFFFFF;
      letter-spacing: -0.01em;
    }

    /* Component Card */
    .tech-card {
      background: rgba(16, 24, 19, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 14px 16px;
      position: relative;
      margin-bottom: 12px;
    }

    .tech-card:last-child {
      margin-bottom: 0;
    }

    .tech-card.gold-edge { border-left: 3px solid #F8D161; }
    .tech-card.blue-edge { border-left: 3px solid #38BDF8; }
    .tech-card.green-edge { border-left: 3px solid #4ADE80; }
    .tech-card.purple-edge { border-left: 3px solid #A855F7; }
    .tech-card.pink-edge { border-left: 3px solid #EC4899; }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .card-name {
      font-size: 14.5px;
      font-weight: 700;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .card-port {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 3px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #CBD5E1;
    }

    .card-tech-stack {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 600;
      color: #F8D161;
      margin-bottom: 6px;
    }

    .card-desc {
      font-size: 12px;
      color: #CBD5E1;
      line-height: 1.4;
      margin-bottom: 8px;
    }

    .protocol-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .proto-chip {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      font-weight: 600;
      padding: 3px 7px;
      border-radius: 3px;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      gap: 4px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .proto-chip.http { color: #38BDF8; border-color: rgba(56, 189, 248, 0.25); }
    .proto-chip.ws { color: #F8D161; border-color: rgba(248, 209, 97, 0.25); }
    .proto-chip.sql { color: #4ADE80; border-color: rgba(74, 222, 128, 0.25); }
    .proto-chip.s3 { color: #EC4899; border-color: rgba(236, 72, 153, 0.25); }
    .proto-chip.ipc { color: #A855F7; border-color: rgba(168, 85, 247, 0.25); }

    /* Communication Flow Banner Between Modules */
    .comm-flow-box {
      margin: 8px 0;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.45);
      border-radius: 6px;
      border: 1px dashed rgba(255, 255, 255, 0.15);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10.5px;
    }

    .comm-label {
      color: #9EBBA3;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .comm-protocol {
      font-weight: 700;
      color: #F8D161;
    }

    /* Inter-Column Connector Arrows */
    .cross-arrow {
      position: absolute;
      right: -20px;
      top: 45%;
      transform: translateY(-50%);
      width: 14px;
      height: 14px;
      z-index: 20;
      color: #F8D161;
      opacity: 0.8;
    }

    /* Bottom Architecture Guarantees Bar */
    .arch-footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 48px;
      background: #030604;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 60px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      color: #9EBBA3;
      z-index: 10;
    }

    .footer-guarantee {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .footer-guarantee strong {
      color: #FFFFFF;
    }

    .footer-dot {
      color: #F8D161;
      font-size: 15px;
    }
  </style>
</head>
<body>
  <div class="blueprint-bg"></div>

  <!-- Header Bar -->
  <div class="arch-header">
    <div>
      <div class="org-eyebrow">
        <span>FINTECH CENTER</span>
        <span>•</span>
        <span>GENERAL SECRETARIAT OF FSA</span>
        <span>•</span>
        <span>TECHNICAL SYSTEM ARCHITECTURE & COMMUNICATION BLUEPRINT</span>
      </div>
      <div class="main-title">
        Technology Stacks & Communication Protocols
        <span class="subtitle">Complete Interaction Topology: BFF Portal, Microservices, CI/CD Engine & Mobile Runtime</span>
      </div>
    </div>
    <div class="tech-legend">
      <div class="leg-badge http">HTTPS / REST JSON</div>
      <div class="leg-badge ws">WSS / SOCKET.IO</div>
      <div class="leg-badge s3">S3 OBJECT API</div>
      <div class="leg-badge ipc">METHODCHANNEL IPC</div>
    </div>
  </div>

  <!-- 4-Column Technical Architecture Grid -->
  <div class="arch-grid">

    <!-- ==============================================
         COLUMN 1: BACKOFFICE BFF & CLIENT PORTAL
         ============================================== -->
    <div class="arch-col gold">
      <div class="col-header">
        <div>
          <div class="col-layer gold">LAYER 01</div>
          <div class="col-title">Portal & BFF Layer</div>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F8D161" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
      </div>

      <!-- Component 1: Partner Browser -->
      <div class="tech-card gold-edge">
        <div class="card-top">
          <span class="card-name">Ministry Partner & SA Admin</span>
          <span class="card-port">CLIENT</span>
        </div>
        <div class="card-tech-stack">Modern Browser (Chrome / Edge / Safari)</div>
        <div class="card-desc">Partner developers configure mini app metadata, request native capabilities, accept terms, and inspect scan findings.</div>
        <div class="protocol-chips">
          <span class="proto-chip http">HTTPS / TLS 1.3</span>
          <span class="proto-chip ws">SameSite=Strict</span>
          <span class="proto-chip">No Token in Storage</span>
        </div>
      </div>

      <!-- Comm Flow 1 -> 2 -->
      <div class="comm-flow-box">
        <span class="comm-label"><span>↕</span> Browser ➔ BFF Server Actions</span>
        <span class="comm-protocol">HttpOnly Cookie Auth</span>
      </div>

      <!-- Component 2: Next.js 16 BFF -->
      <div class="tech-card gold-edge">
        <div class="card-top">
          <span class="card-name">FSA Backoffice Portal BFF</span>
          <span class="card-port">PORT 3002</span>
        </div>
        <div class="card-tech-stack">Next.js 16.3 • React 19 • Tailwind CSS v4</div>
        <div class="card-desc">Backend-for-Frontend orchestrating 6-step wizard, SSRF pre-flight validation, and role-based access control.</div>
        <div class="protocol-chips">
          <span class="proto-chip http">Server Actions</span>
          <span class="proto-chip ws">Socket.IO Client</span>
          <span class="proto-chip">Zod Validator</span>
        </div>
      </div>

      <!-- Comm Flow 2 -> 3 -->
      <div class="comm-flow-box">
        <span class="comm-label"><span>↕</span> Web Sandbox IFrame Protocol</span>
        <span class="comm-protocol">window.postMessage</span>
      </div>

      <!-- Component 3: Web Sandbox Device Frame -->
      <div class="tech-card gold-edge">
        <div class="card-top">
          <span class="card-name">Web Sandbox Device Emulator</span>
          <span class="card-port">/superapp-sandbox</span>
        </div>
        <div class="card-tech-stack">Flutter Web Runtime • Mock JS Bridge</div>
        <div class="card-desc">In-browser device container rendering live mini apps; stubs camera feed, GPS location, and authorization headers.</div>
        <div class="protocol-chips">
          <span class="proto-chip ipc">postMessage Bridge</span>
          <span class="proto-chip">Origin Whitelist</span>
          <span class="proto-chip">Mock Native APIs</span>
        </div>
      </div>

      <!-- Arrow to Col 2 -->
      <svg class="cross-arrow" viewBox="0 0 24 24" fill="none" stroke="#F8D161" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>
    </div>

    <!-- ==============================================
         COLUMN 2: NESTJS CORE BACKEND & PERSISTENCE
         ============================================== -->
    <div class="arch-col blue">
      <div class="col-header">
        <div>
          <div class="col-layer blue">LAYER 02</div>
          <div class="col-title">Core Backend & Data</div>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
      </div>

      <!-- Component 1: NestJS API Gateway -->
      <div class="tech-card blue-edge">
        <div class="card-top">
          <span class="card-name">NestJS API & Workflow Engine</span>
          <span class="card-port">PORT 3001</span>
        </div>
        <div class="card-tech-stack">NestJS 11 • Node.js • Express • RxJS</div>
        <div class="card-desc">Business orchestrator: RBAC guards, lifecycle state machine, SSH key generator, capability DAG resolver.</div>
        <div class="protocol-chips">
          <span class="proto-chip http">REST JSON / DTO</span>
          <span class="proto-chip ws">Socket.IO Server</span>
          <span class="proto-chip">JWT Bearer</span>
          <span class="proto-chip">No God Service</span>
        </div>
      </div>

      <!-- Comm Flow Backend -> Database -->
      <div class="comm-flow-box">
        <span class="comm-label"><span>↕</span> TypeORM QueryBuilder ➔ DB</span>
        <span class="comm-protocol">TCP 5432 / Zero Raw SQL</span>
      </div>

      <!-- Component 2: PostgreSQL Database -->
      <div class="tech-card blue-edge">
        <div class="card-top">
          <span class="card-name">PostgreSQL Metadata Registry</span>
          <span class="card-port">PORT 5432</span>
        </div>
        <div class="card-tech-stack">PostgreSQL 15 • TypeORM Migrations</div>
        <div class="card-desc">Stores mini app versions, capability declarations, scan findings, operator approval records, and audit logs.</div>
        <div class="protocol-chips">
          <span class="proto-chip sql">ACID Transactions</span>
          <span class="proto-chip sql">Foreign Key Constraints</span>
          <span class="proto-chip">Immutable Logs</span>
        </div>
      </div>

      <!-- Comm Flow Backend -> MinIO -->
      <div class="comm-flow-box">
        <span class="comm-label"><span>↕</span> S3 Client ➔ Object Storage</span>
        <span class="comm-protocol">S3 API / TCP 9000</span>
      </div>

      <!-- Component 3: MinIO Object Storage -->
      <div class="tech-card pink-edge">
        <div class="card-top">
          <span class="card-name">MinIO Object Storage</span>
          <span class="card-port">PORT 9000 / 9001</span>
        </div>
        <div class="card-tech-stack">MinIO AIStor S3 • Bucketmc Client</div>
        <div class="card-desc">Durable object storage partitioned into package-submissions (.zip), sdk-submissions (.aar), and mini-app-assets.</div>
        <div class="protocol-chips">
          <span class="proto-chip s3">Pre-Signed URLs</span>
          <span class="proto-chip s3">Quarantine Bucket</span>
          <span class="proto-chip">Private Access</span>
        </div>
      </div>

      <!-- Arrow to Col 3 -->
      <svg class="cross-arrow" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>
    </div>

    <!-- ==============================================
         COLUMN 3: DEVOPS CI/CD & SECURITY PIPELINE
         ============================================== -->
    <div class="arch-col green">
      <div class="col-header">
        <div>
          <div class="col-layer green">LAYER 03</div>
          <div class="col-title">DevOps & Security</div>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
      </div>

      <!-- Component 1: Jenkins Controller -->
      <div class="tech-card green-edge">
        <div class="card-top">
          <span class="card-name">Jenkins CI/CD Controller</span>
          <span class="card-port">PORT 8085</span>
        </div>
        <div class="card-tech-stack">Jenkins LTS JDK-21 • Docker Pipeline</div>
        <div class="card-desc">Orchestrates automated security audits, dynamic route codegen, ProGuard optimization, and APK compilation.</div>
        <div class="protocol-chips">
          <span class="proto-chip http">REST Webhook Callback</span>
          <span class="proto-chip">HMAC Token Auth</span>
          <span class="proto-chip">pnpm Scripts</span>
        </div>
      </div>

      <!-- Comm Flow Jenkins -> DinD -->
      <div class="comm-flow-box">
        <span class="comm-label"><span>↕</span> Docker Daemon IPC</span>
        <span class="comm-protocol">TCP 2376 TLS / Ephemeral</span>
      </div>

      <!-- Component 2: 12 Automated Security Scanners -->
      <div class="tech-card green-edge">
        <div class="card-top">
          <span class="card-name">12 Pre-Flight Security Scanners</span>
          <span class="card-port">PORTS 8090, CLI</span>
        </div>
        <div class="card-tech-stack">OWASP ZAP • testssl.sh • Nuclei • AST Parser</div>
        <div class="card-desc">Gates 1-4: Static AST, SBOM CVE, SSRF probe, Manifest match. Gates 5-8: Cookie HttpOnly, MethodChannels, CSP, Audit hash.</div>
        <div class="protocol-chips">
          <span class="proto-chip">AST Code Analyzer</span>
          <span class="proto-chip">Trivy CVE Audit</span>
          <span class="proto-chip">15MB Size Guard</span>
        </div>
      </div>

      <!-- Comm Flow Jenkins -> Nexus -->
      <div class="comm-flow-box">
        <span class="comm-label"><span>↕</span> Package Publish & Hosted Cache</span>
        <span class="comm-protocol">Nexus REST / TCP 8081</span>
      </div>

      <!-- Component 3: Sonatype Nexus CE Registry -->
      <div class="tech-card green-edge">
        <div class="card-top">
          <span class="card-name">Sonatype Nexus 3 CE Registry</span>
          <span class="card-port">PORT 8081</span>
        </div>
        <div class="card-tech-stack">Sonatype Nexus 3 • 9 Repositories</div>
        <div class="card-desc">Sole trusted artifact repository: pub-hosted & pub-group (Dart), maven-sdk-hosted (AAR), apk-test-builds (OTA debug).</div>
        <div class="protocol-chips">
          <span class="proto-chip">pub-group Registry</span>
          <span class="proto-chip">maven-sdk-hosted</span>
          <span class="proto-chip">Signed Hashes</span>
        </div>
      </div>

      <!-- Arrow to Col 4 -->
      <svg class="cross-arrow" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>
    </div>

    <!-- ==============================================
         COLUMN 4: FLUTTER SUPER APP & MOBILE RUNTIME
         ============================================== -->
    <div class="arch-col purple">
      <div class="col-header">
        <div>
          <div class="col-layer purple">LAYER 04</div>
          <div class="col-title">Flutter Mobile Runtime</div>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A855F7" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
      </div>

      <!-- Component 1: Flutter Host Shell -->
      <div class="tech-card purple-edge">
        <div class="card-top">
          <span class="card-name">FSA Super App Core Shell</span>
          <span class="card-port">ANDROID / IOS</span>
        </div>
        <div class="card-tech-stack">Flutter 3.x • Dart 3 • Riverpod CodeGen</div>
        <div class="card-desc">Production host client with declarative go_router, MiniAppDispatcher, Dio client with JWT interceptor & SSL pinning.</div>
        <div class="protocol-chips">
          <span class="proto-chip http">Dio HTTPS / SSL Pinning</span>
          <span class="proto-chip">Riverpod State</span>
          <span class="proto-chip">OneHub Shell</span>
        </div>
      </div>

      <!-- Comm Flow Super App -> Mini Apps -->
      <div class="comm-flow-box">
        <span class="comm-label"><span>↕</span> 4-Tier Integration Bridges</span>
        <span class="comm-protocol">Sandboxed Polyglot IPC</span>
      </div>

      <!-- Component 2: 4 Integration Tiers -->
      <div class="tech-card purple-edge">
        <div class="card-top">
          <span class="card-name">4 Sandboxed Integration Tiers</span>
          <span class="card-port">ISOLATION</span>
        </div>
        <div class="card-tech-stack">WebView • Flutter Dart • Native OEM • DeepLink</div>
        <div class="card-desc">
          <strong>Tier 1:</strong> webview_flutter via JavascriptChannel & postMessage<br/>
          <strong>Tier 2:</strong> Flutter module via in-process Riverpod routes<br/>
          <strong>Tier 3:</strong> Kotlin/Swift via Flutter MethodChannel IPC<br/>
          <strong>Tier 4:</strong> OS Custom URL schemes (fsa://) & App Links
        </div>
        <div class="protocol-chips">
          <span class="proto-chip ipc">MethodChannels</span>
          <span class="proto-chip ipc">JavascriptChannel</span>
          <span class="proto-chip">App Links / Schemes</span>
        </div>
      </div>

      <!-- Comm Flow Mini App -> Native Hardware & CamDigiKey -->
      <div class="comm-flow-box">
        <span class="comm-label"><span>↕</span> Hardware Bridge & National SSO</span>
        <span class="comm-protocol">OIDC PKCE / Biometrics</span>
      </div>

      <!-- Component 3: Hardware Capabilities & CamDigiKey -->
      <div class="tech-card purple-edge">
        <div class="card-top">
          <span class="card-name">Sovereign Hardware & CamDigiKey</span>
          <span class="card-port">SYSTEM HW</span>
        </div>
        <div class="card-tech-stack">local_auth • camera • nfc_manager • OIDC</div>
        <div class="card-desc">Native camera scanner, biometric face/fingerprint authorization, NFC smart cards, and CamDigiKey National SSO.</div>
        <div class="protocol-chips">
          <span class="proto-chip">CamDigiKey OIDC</span>
          <span class="proto-chip">Hardware Keystore</span>
          <span class="proto-chip">Biometric Crypto</span>
        </div>
      </div>

    </div>

  </div>

  <!-- Bottom Architecture Guarantees Bar -->
  <div class="arch-footer">
    <div class="footer-guarantee">
      <span class="footer-dot">•</span>
      <span><strong>BACKEND COMMUNICATION:</strong> NestJS ➔ PostgreSQL via TypeORM TCP 5432; MinIO via S3 API TCP 9000; Jenkins via REST Webhooks 8085</span>
    </div>
    <div class="footer-guarantee">
      <span class="footer-dot">•</span>
      <span><strong>SANDBOX COMMUNICATION:</strong> WebView mini apps via window.postMessage; Native SDKs via MethodChannels; Zero dynamic code OTA</span>
    </div>
    <div class="footer-guarantee">
      <span class="footer-dot">•</span>
      <span><strong>SECURITY GOVERNANCE:</strong> BFF HttpOnly cookies, 12 automated CI/CD scanners, Nexus CE signed registry, CamDigiKey National SSO</span>
    </div>
  </div>

</body>
</html>'''

with open(HTML_TEMP, 'w', encoding='utf-8') as f:
    f.write(html_content)

print(f"Generated HTML template at: {HTML_TEMP}")

# Render to high-definition PNG via headless Chrome
cmd = [
    CHROME_PATH,
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    f'--screenshot={OUTPUT_IMAGE}',
    '--window-size=2600,1440',
    f'file:///{HTML_TEMP.replace(os.sep, "/")}'
]

res = subprocess.run(cmd, capture_output=True, text=True)
print("Chrome execution return code:", res.returncode)

if os.path.exists(OUTPUT_IMAGE):
    print(f"Successfully rendered pristine architecture diagram ({os.path.getsize(OUTPUT_IMAGE):,} bytes) at: {OUTPUT_IMAGE}")
else:
    print("Error: Image was not created. Stderr:", res.stderr)

# Clean up temporary HTML
if os.path.exists(HTML_TEMP):
    os.remove(HTML_TEMP)
