import os
import subprocess

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, 'slide', 'assets')
OUTPUT_IMAGE = os.path.join(OUTPUT_DIR, 'fsa_superapp_system_architecture.png')
HTML_TEMP = os.path.join(OUTPUT_DIR, 'temp_architecture_diagram.html')

CHROME_PATH = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

html_content = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FSA Super App Platform Architecture</title>
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
      width: 2560px;
      height: 1380px;
      overflow: hidden;
      background: #070B08;
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      color: #FFFFFF;
      position: relative;
      user-select: none;
      -webkit-font-smoothing: antialiased;
    }

    /* Ambient Blueprint Grid */
    .blueprint-bg {
      position: absolute;
      inset: 0;
      background-image:
        radial-gradient(circle at 15% 15%, rgba(57, 99, 68, 0.22) 0%, transparent 45%),
        radial-gradient(circle at 85% 85%, rgba(248, 209, 97, 0.12) 0%, transparent 45%),
        radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.08) 0%, transparent 50%),
        linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 100% 100%, 100% 100%, 100% 100%, 48px 48px, 48px 48px;
    }

    /* Top Brand & Title Bar */
    .arch-header {
      position: relative;
      z-index: 2;
      padding: 36px 64px 24px 64px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: linear-gradient(180deg, rgba(7, 11, 8, 0.95) 0%, rgba(7, 11, 8, 0.6) 100%);
    }

    .header-left {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .org-eyebrow {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #F8D161;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .main-title {
      font-size: 38px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #FFFFFF;
      display: flex;
      align-items: baseline;
      gap: 16px;
    }

    .subtitle {
      font-size: 16px;
      color: #9EBBA3;
      font-weight: 400;
    }

    .header-badges {
      display: flex;
      gap: 12px;
    }

    .badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 700;
      padding: 8px 16px;
      border-radius: 4px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      border: 1px solid;
    }

    .badge-gold {
      color: #F8D161;
      border-color: rgba(248, 209, 97, 0.4);
      background: rgba(248, 209, 97, 0.06);
    }

    .badge-green {
      color: #4ADE80;
      border-color: rgba(74, 222, 128, 0.4);
      background: rgba(74, 222, 128, 0.06);
    }

    .badge-sky {
      color: #38BDF8;
      border-color: rgba(56, 189, 248, 0.4);
      background: rgba(56, 189, 248, 0.06);
    }

    /* 4-Stage Main Layout Container */
    .arch-stages-container {
      position: relative;
      z-index: 2;
      padding: 32px 64px 36px 64px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 32px;
      height: 1100px;
    }

    /* Individual Stage Column */
    .stage-col {
      display: flex;
      flex-direction: column;
      background: rgba(14, 20, 16, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 24px 22px;
      position: relative;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(12px);
    }

    .stage-col.gold {
      border-top: 3px solid #F8D161;
    }

    .stage-col.green {
      border-top: 3px solid #4ADE80;
    }

    .stage-col.sky {
      border-top: 3px solid #38BDF8;
    }

    .stage-col.amber {
      border-top: 3px solid #F59E0B;
    }

    .stage-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .stage-num {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.10em;
    }

    .stage-num.gold { color: #F8D161; }
    .stage-num.green { color: #4ADE80; }
    .stage-num.sky { color: #38BDF8; }
    .stage-num.amber { color: #F59E0B; }

    .stage-title {
      font-size: 20px;
      font-weight: 700;
      color: #FFFFFF;
      letter-spacing: -0.01em;
    }

    /* Component Module Boxes Inside Stage */
    .module-stack {
      display: flex;
      flex-direction: column;
      gap: 16px;
      flex: 1;
    }

    .module-card {
      background: rgba(19, 29, 22, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 16px 18px;
      position: relative;
      transition: all 0.2s ease;
    }

    .module-card.accent-gold { border-left: 3px solid #F8D161; }
    .module-card.accent-green { border-left: 3px solid #4ADE80; }
    .module-card.accent-sky { border-left: 3px solid #38BDF8; }
    .module-card.accent-amber { border-left: 3px solid #F59E0B; }

    .module-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .module-name {
      font-size: 15.5px;
      font-weight: 700;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .module-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      font-weight: 700;
      color: #9EBBA3;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 3px 7px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
    }

    .module-desc {
      font-size: 12.5px;
      color: #CBD5E1;
      line-height: 1.45;
      margin-bottom: 10px;
    }

    .module-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .pill {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10.5px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 3px;
      background: rgba(0, 0, 0, 0.35);
      color: #9EBBA3;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .pill.gold { color: #F8D161; border-color: rgba(248, 209, 97, 0.25); }
    .pill.green { color: #4ADE80; border-color: rgba(74, 222, 128, 0.25); }
    .pill.sky { color: #38BDF8; border-color: rgba(56, 189, 248, 0.25); }

    /* Flow Connectors Between Cards */
    .connector-down {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 16px;
      color: rgba(255, 255, 255, 0.25);
    }

    .stage-footer-note {
      margin-top: auto;
      padding-top: 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #9EBBA3;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    /* Inter-Stage Directional Indicators */
    .inter-stage-arrow {
      position: absolute;
      right: -24px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      z-index: 10;
      color: #F8D161;
      opacity: 0.7;
    }

    /* Bottom Architecture Guarantees Bar */
    .arch-footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 54px;
      background: #040705;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 64px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #9EBBA3;
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
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="blueprint-bg"></div>

  <!-- Header -->
  <div class="arch-header">
    <div class="header-left">
      <div class="org-eyebrow">
        <span>FINTECH CENTER</span>
        <span>•</span>
        <span>GENERAL SECRETARIAT OF FSA</span>
        <span>•</span>
        <span>POC ARCHITECTURE BLUEPRINT</span>
      </div>
      <div class="main-title">
        End-to-End System Architecture
        <span class="subtitle">Complete 4-Phase Ingestion, Security Pipeline, QA Verification & Mobile Runtime</span>
      </div>
    </div>
    <div class="header-badges">
      <div class="badge badge-gold">ZERO REMOTE CODE</div>
      <div class="badge badge-green">12 SECURITY GATES</div>
      <div class="badge badge-sky">NEXUS CE REGISTRY</div>
      <div class="badge badge-gold">CAMDIGIKEY READY</div>
    </div>
  </div>

  <!-- 4 Architecture Stages -->
  <div class="arch-stages-container">

    <!-- ==============================================
         STAGE 1: Ingestion & Metadata Registry
         ============================================== -->
    <div class="stage-col gold">
      <div class="stage-header">
        <div>
          <div class="stage-num gold">PHASE 01</div>
          <div class="stage-title">Ingestion & Metadata</div>
        </div>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F8D161" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      </div>

      <div class="module-stack">
        <!-- Module 1: Developer / Partner -->
        <div class="module-card accent-gold">
          <div class="module-header">
            <span class="module-name">Partner / Ministry Developer</span>
            <span class="module-tag">ORIGIN</span>
          </div>
          <div class="module-desc">Submits Mini App package (.zip), source repository URL, or external deep link registration.</div>
          <div class="module-pills">
            <span class="pill gold">GitLab Hooks</span>
            <span class="pill">Deploy Keys</span>
            <span class="pill">Version SemVer</span>
          </div>
        </div>

        <div class="connector-down"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></div>

        <!-- Module 2: Next.js Backoffice BFF -->
        <div class="module-card accent-gold">
          <div class="module-header">
            <span class="module-name">Next.js 16 Backoffice BFF</span>
            <span class="module-tag">FRONTEND</span>
          </div>
          <div class="module-desc">6-step wizard, HttpOnly cookie security, multi-tenant RBAC, real-time SSRF reachability probes.</div>
          <div class="module-pills">
            <span class="pill gold">Next.js 16</span>
            <span class="pill">React Server Actions</span>
            <span class="pill">Zod Validation</span>
          </div>
        </div>

        <div class="connector-down"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></div>

        <!-- Module 3: NestJS Backend Gateway -->
        <div class="module-card accent-gold">
          <div class="module-header">
            <span class="module-name">NestJS API & RBAC Engine</span>
            <span class="module-tag">ORCHESTRATOR</span>
          </div>
          <div class="module-desc">Transaction safety, capability DAG resolution, pre-signed upload tokens, zero raw SQL execution.</div>
          <div class="module-pills">
            <span class="pill gold">NestJS Core</span>
            <span class="pill">TypeORM Safe</span>
            <span class="pill">JWT Guard</span>
          </div>
        </div>

        <div class="connector-down"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></div>

        <!-- Module 4: Storage & Database -->
        <div class="module-card accent-gold">
          <div class="module-header">
            <span class="module-name">PostgreSQL & MinIO Storage</span>
            <span class="module-tag">PERSISTENCE</span>
          </div>
          <div class="module-desc">PostgreSQL stores capability manifests & audit records; MinIO isolates quarantined submission archives.</div>
          <div class="module-pills">
            <span class="pill gold">PostgreSQL 16</span>
            <span class="pill">MinIO Buckets</span>
            <span class="pill">Immutable Log</span>
          </div>
        </div>
      </div>

      <div class="stage-footer-note">
        <span>REST & Pre-Signed URLs</span>
        <span style="color: #F8D161;">GATEWAY LAYER</span>
      </div>

      <!-- Arrow to Stage 2 -->
      <svg class="inter-stage-arrow" viewBox="0 0 24 24" fill="none" stroke="#F8D161" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>
    </div>

    <!-- ==============================================
         STAGE 2: Automated Security & Build Pipeline
         ============================================== -->
    <div class="stage-col green">
      <div class="stage-header">
        <div>
          <div class="stage-num green">PHASE 02</div>
          <div class="stage-title">Automated Security</div>
        </div>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
      </div>

      <div class="module-stack">
        <!-- Module 1: Jenkins Worker -->
        <div class="module-card accent-green">
          <div class="module-header">
            <span class="module-name">Jenkins Isolated Agent</span>
            <span class="module-tag">AIR-GAPPED WORKER</span>
          </div>
          <div class="module-desc">Dockerized ephemeral agent fetches sanitized package archives; executes pre-flight checks in isolation.</div>
          <div class="module-pills">
            <span class="pill green">Ephemeral Container</span>
            <span class="pill">Rootless CI</span>
            <span class="pill">No Host Leak</span>
          </div>
        </div>

        <div class="connector-down"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></div>

        <!-- Module 2: 12 Security Scanners -->
        <div class="module-card accent-green">
          <div class="module-header">
            <span class="module-name">12 Pre-Flight Security Gates</span>
            <span class="module-tag">ZERO-TRUST AUDIT</span>
          </div>
          <div class="module-desc">Static AST inspection, SBOM CVE check, SSRF private IP blocking, MethodChannel payload validation.</div>
          <div class="module-pills">
            <span class="pill green">Gate 01-04: Static Code</span>
            <span class="pill green">Gate 05-08: Runtime CSP</span>
            <span class="pill green">15MB Size Enforcer</span>
          </div>
        </div>

        <div class="connector-down"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></div>

        <!-- Module 3: Dynamic Code Generator -->
        <div class="module-card accent-green">
          <div class="module-header">
            <span class="module-name">Dynamic Codegen Engine</span>
            <span class="module-tag">COMPILER</span>
          </div>
          <div class="module-desc">Injects route dispatchers, Riverpod providers, and safe MethodChannel bridge handlers automatically.</div>
          <div class="module-pills">
            <span class="pill green">Zero Boilerplate</span>
            <span class="pill">Route Sanitizer</span>
            <span class="pill">ProGuard Rules</span>
          </div>
        </div>

        <div class="connector-down"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></div>

        <!-- Module 4: Sonatype Nexus Registry -->
        <div class="module-card accent-green">
          <div class="module-header">
            <span class="module-name">Sonatype Nexus Registry</span>
            <span class="module-tag">TRUSTED REPO</span>
          </div>
          <div class="module-desc">Validated packages signed and hosted in private Nexus repository (pub-hosted, maven-sdk, test builds).</div>
          <div class="module-pills">
            <span class="pill green">Nexus CE Private</span>
            <span class="pill">Signed Hashes</span>
            <span class="pill">Tamper-Proof</span>
          </div>
        </div>
      </div>

      <div class="stage-footer-note">
        <span>Deterministic Builds</span>
        <span style="color: #4ADE80;">VERIFICATION LAYER</span>
      </div>

      <!-- Arrow to Stage 3 -->
      <svg class="inter-stage-arrow" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>
    </div>

    <!-- ==============================================
         STAGE 3: Operator QA & Dual Verification
         ============================================== -->
    <div class="stage-col sky">
      <div class="stage-header">
        <div>
          <div class="stage-num sky">PHASE 03</div>
          <div class="stage-title">Dual-Environment QA</div>
        </div>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
      </div>

      <div class="module-stack">
        <!-- Module 1: Operator Dual Sign-Off -->
        <div class="module-card accent-sky">
          <div class="module-header">
            <span class="module-name">FSA Platform Auditor & QA</span>
            <span class="module-tag">GOVERNANCE</span>
          </div>
          <div class="module-desc">Mandatory dual sign-off: regulatory compliance officer and security team must approve before staging.</div>
          <div class="module-pills">
            <span class="pill sky">Dual Sign-Off</span>
            <span class="pill">Audit Trail</span>
            <span class="pill">One-Click Revoke</span>
          </div>
        </div>

        <div class="connector-down"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></div>

        <!-- Module 2: In-Browser Web Sandbox -->
        <div class="module-card accent-sky">
          <div class="module-header">
            <span class="module-name">In-Browser Web Sandbox</span>
            <span class="module-tag">ENVIRONMENT 01</span>
          </div>
          <div class="module-desc">Live desktop simulation (/superapp-sandbox); renders mini app in device frame with mocked JS Bridge.</div>
          <div class="module-pills">
            <span class="pill sky">Zero Device Setup</span>
            <span class="pill">Camera Simulator</span>
            <span class="pill">Mock Geolocation</span>
          </div>
        </div>

        <div class="connector-down"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></div>

        <!-- Module 3: Dynamic QR Code Generator -->
        <div class="module-card accent-sky">
          <div class="module-header">
            <span class="module-name">Dynamic QR Code Fastlane</span>
            <span class="module-tag">DISTRIBUTION</span>
          </div>
          <div class="module-desc">Backoffice dynamically compiles Stage 1 test build; serves single-use QR for instant over-the-air test download.</div>
          <div class="module-pills">
            <span class="pill sky">Ephemeral Tokens</span>
            <span class="pill">apk-test-builds</span>
            <span class="pill">Fast OTA</span>
          </div>
        </div>

        <div class="connector-down"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></div>

        <!-- Module 4: Physical Device Verification -->
        <div class="module-card accent-sky">
          <div class="module-header">
            <span class="module-name">Physical Mobile Device</span>
            <span class="module-tag">ENVIRONMENT 02</span>
          </div>
          <div class="module-desc">Auditor inspects real physical hardware: 60fps thermal health, native biometric auth, sensor hardware.</div>
          <div class="module-pills">
            <span class="pill sky">Hardware Biometrics</span>
            <span class="pill">60 FPS Verification</span>
            <span class="pill">GPS Sensor</span>
          </div>
        </div>
      </div>

      <div class="stage-footer-note">
        <span>Dual-Path Sign-Off</span>
        <span style="color: #38BDF8;">QA CERTIFICATION</span>
      </div>

      <!-- Arrow to Stage 4 -->
      <svg class="inter-stage-arrow" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>
    </div>

    <!-- ==============================================
         STAGE 4: Mobile Runtime & 4 Integration Tiers
         ============================================== -->
    <div class="stage-col amber">
      <div class="stage-header">
        <div>
          <div class="stage-num amber">PHASE 04</div>
          <div class="stage-title">FSA Super App Runtime</div>
        </div>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/></svg>
      </div>

      <div class="module-stack">
        <!-- Module 1: Super App Host Shell -->
        <div class="module-card accent-amber">
          <div class="module-header">
            <span class="module-name">FSA Super App Core Shell</span>
            <span class="module-tag">FLUTTER HOST</span>
          </div>
          <div class="module-desc">Production mobile host with Riverpod state management, declarative go_router, OneHub navigation.</div>
          <div class="module-pills">
            <span class="pill gold">Riverpod CodeGen</span>
            <span class="pill">MiniAppDispatcher</span>
            <span class="pill">OneHub Shell</span>
          </div>
        </div>

        <div class="connector-down"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></div>

        <!-- Module 2: 4 Flexible Integration Tiers -->
        <div class="module-card accent-amber">
          <div class="module-header">
            <span class="module-name">4 Flexible Integration Tiers</span>
            <span class="module-tag">POLYGLOT RUNTIME</span>
          </div>
          <div class="module-desc">
            <strong>Tier 1:</strong> WebView postMessage Bridge &lt;8MB<br/>
            <strong>Tier 2:</strong> Flutter Mini App 60fps Native Dart<br/>
            <strong>Tier 3:</strong> Native OEM SDK (Kotlin / Swift AAR)<br/>
            <strong>Tier 4:</strong> External OS Deep Link Handoff
          </div>
          <div class="module-pills">
            <span class="pill gold">Tier 1: Web</span>
            <span class="pill gold">Tier 2: Flutter</span>
            <span class="pill gold">Tier 3: Native</span>
            <span class="pill gold">Tier 4: DeepLink</span>
          </div>
        </div>

        <div class="connector-down"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></div>

        <!-- Module 3: Security Sandbox & JS Bridge -->
        <div class="module-card accent-amber">
          <div class="module-header">
            <span class="module-name">FSASuperApp Native Bridge</span>
            <span class="module-tag">SANDBOX ISOLATION</span>
          </div>
          <div class="module-desc">Strict MethodChannels with payload validation; enforces origin checks and prevents crash propagation.</div>
          <div class="module-pills">
            <span class="pill gold">postMessage Guard</span>
            <span class="pill">MethodChannels</span>
            <span class="pill">Crash Isolation</span>
          </div>
        </div>

        <div class="connector-down"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></div>

        <!-- Module 4: Sovereign Hardware & SSO -->
        <div class="module-card accent-amber">
          <div class="module-header">
            <span class="module-name">Sovereign Hardware & SSO</span>
            <span class="module-tag">SYSTEM CAPABILITIES</span>
          </div>
          <div class="module-desc">Native camera scanner, biometric face/fingerprint, secure enclave storage, CamDigiKey National SSO.</div>
          <div class="module-pills">
            <span class="pill gold">CamDigiKey SSO</span>
            <span class="pill">Biometric Auth</span>
            <span class="pill">Hardware Enclave</span>
          </div>
        </div>
      </div>

      <div class="stage-footer-note">
        <span>Citizen Mobile Gateway</span>
        <span style="color: #F59E0B;">PRODUCTION RUNTIME</span>
      </div>
    </div>

  </div>

  <!-- Footer Guarantees Bar -->
  <div class="arch-footer">
    <div class="footer-guarantee">
      <span class="footer-dot">•</span>
      <span><strong>ZERO DYNAMIC REMOTE CODE:</strong> All binaries pre-compiled & verified via CI/CD; zero OTA uncompiled code injection</span>
    </div>
    <div class="footer-guarantee">
      <span class="footer-dot">•</span>
      <span><strong>AIR-GAPPED SECURITY:</strong> Ephemeral Docker workers execute 12 automated scanners before Nexus release</span>
    </div>
    <div class="footer-guarantee">
      <span class="footer-dot">•</span>
      <span><strong>SOVEREIGN INTEGRATION:</strong> 4 tiers governed under unified CamDigiKey national identity & RBAC policies</span>
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
    '--window-size=2560,1380',
    f'file:///{HTML_TEMP.replace(os.sep, "/")}'
]

res = subprocess.run(cmd, capture_output=True, text=True)
print("Chrome execution return code:", res.returncode)

if os.path.exists(OUTPUT_IMAGE):
    print(f"Successfully rendered pristine architecture diagram ({os.path.getsize(OUTPUT_IMAGE):,} bytes) at: {OUTPUT_IMAGE}")
else:
    print("Error: Image was not created. Stderr:", res.stderr)
