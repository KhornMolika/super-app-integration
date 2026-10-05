import pptxgen from 'pptxgenjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '../..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const ASSETS_DIR = path.join(DOCS_DIR, 'assets');

const pptx = new pptxgen();

// Define Full-Bleed 16:9 Widescreen (13.333 x 7.5 inches)
pptx.defineLayout({ name: 'FSA_16X9', width: 13.333, height: 7.5 });
pptx.layout = 'FSA_16X9';

pptx.author = 'FSA Core Engineering Team';
pptx.company = 'Non-Bank Financial Services Authority (FSA)';
pptx.title = 'Super App & Mini App Integration Platform';
pptx.subject = 'Executive & Technical Architecture Presentation';

// Color Palette Constants matching presentation_slides.html
const C_BG_DARK = '070D08';
const C_BG_CARD = '0B2111';
const C_BG_CARD_GOLD = '1C1609';
const C_BG_CARD_RED = '211010';
const C_BRAND_GREEN = '58761B';
const C_ACCENT_GOLD = 'E6A71C';
const C_BRIGHT_GOLD = 'F8D161';
const C_LIGHT_GREEN = 'D4E59C';
const C_TEXT_WHITE = 'FFFFFF';
const C_TEXT_MUTED = '9EBBA3';
const C_TEXT_BODY = 'E2E8F0';
const C_BORDER_GREEN = '396344';
const C_BORDER_GOLD = '905A01';
const C_BORDER_RED = '7F1D1D';
const C_BADGE_GREEN_BG = '143D1D';
const C_BADGE_GOLD_BG = '3D2800';

const logoPath = path.join(ASSETS_DIR, 'fsa_logo.png');

// Helper to add top header & branding bar
function addSlideHeader(slide, tag, title, subtitle) {
  // Top brand bar
  if (fs.existsSync(logoPath)) {
    slide.addImage({ path: logoPath, x: 0.8, y: 0.45, w: 0.48, h: 0.48 });
  }

  slide.addText([
    { text: 'FINTECH CENTER  •  ', options: { fontSize: 10, bold: true, color: C_BRIGHT_GOLD } },
    { text: 'NON-BANK FINANCIAL SERVICES AUTHORITY (FSA)', options: { fontSize: 9.5, bold: true, color: 'D4E59C' } },
  ], {
    x: 1.38,
    y: 0.48,
    w: 8.0,
    h: 0.4,
    fontFace: 'Segoe UI',
    margin: 0,
  });

  // Category Tag
  slide.addText(tag.toUpperCase(), {
    x: 0.8,
    y: 1.15,
    w: 11.7,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: C_BRIGHT_GOLD,
    fontFace: 'Segoe UI',
    margin: 0,
  });

  // Slide Title
  slide.addText(title, {
    x: 0.8,
    y: 1.45,
    w: 11.7,
    h: 0.55,
    fontSize: 24,
    bold: true,
    color: C_TEXT_WHITE,
    fontFace: 'Segoe UI',
    margin: 0,
  });

  // Slide Subtitle
  slide.addText(subtitle, {
    x: 0.8,
    y: 2.02,
    w: 11.7,
    h: 0.35,
    fontSize: 12.5,
    color: C_TEXT_MUTED,
    fontFace: 'Segoe UI',
    margin: 0,
  });

  // Thin separator line
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0.8,
    y: 2.38,
    w: 11.733,
    h: 0.02,
    fill: { color: '1A3F22' },
    line: { color: '1A3F22', width: 0 },
  });
}

// -------------------------------------------------------------
// SLIDE 1: Title / Hero Slide
// -------------------------------------------------------------
{
  const s1 = pptx.addSlide();
  s1.background = { color: C_BG_DARK };

  // Background glow cards
  s1.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 1.0,
    y: 0.8,
    w: 11.333,
    h: 5.9,
    fill: { color: '0A1C0E' },
    line: { color: '295133', width: 1.5 },
  });

  // Official FSA Logo
  if (fs.existsSync(logoPath)) {
    s1.addImage({ path: logoPath, x: 5.866, y: 1.3, w: 1.6, h: 1.6 });
  }

  // Tag Badge
  s1.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 4.666,
    y: 3.15,
    w: 4.0,
    h: 0.42,
    fill: { color: C_BADGE_GOLD_BG },
    line: { color: C_BORDER_GOLD, width: 1 },
  });

  s1.addText('DIGITAL PUBLIC SERVICE PLATFORM', {
    x: 4.666,
    y: 3.15,
    w: 4.0,
    h: 0.42,
    align: 'center',
    fontSize: 11.5,
    bold: true,
    color: C_BRIGHT_GOLD,
    fontFace: 'Segoe UI',
    margin: 0,
  });

  // Main Title
  s1.addText('Super App & Mini App Platform', {
    x: 1.5,
    y: 3.75,
    w: 10.333,
    h: 0.85,
    align: 'center',
    fontSize: 34,
    bold: true,
    color: C_TEXT_WHITE,
    fontFace: 'Segoe UI',
  });

  // Subtitle / Mission statement
  s1.addText(
    'A unified, enterprise-grade mobile container and partner integration gateway powering secure digital public services.',
    {
      x: 2.0,
      y: 4.65,
      w: 9.333,
      h: 0.65,
      align: 'center',
      fontSize: 14.5,
      color: 'D1DCCE',
      fontFace: 'Segoe UI',
    }
  );

  // Author / Authority Footer
  s1.addText(
    'Non-Bank Financial Services Authority (FSA)  •  Core Engineering Team',
    {
      x: 1.5,
      y: 5.75,
      w: 10.333,
      h: 0.45,
      align: 'center',
      fontSize: 13,
      bold: true,
      color: C_LIGHT_GREEN,
      fontFace: 'Segoe UI',
    }
  );
}

// -------------------------------------------------------------
// SLIDE 2: Table of Contents / Executive Agenda
// -------------------------------------------------------------
{
  const s2 = pptx.addSlide();
  s2.background = { color: C_BG_DARK };
  addSlideHeader(s2, 'AGENDA', 'Table of Contents', 'Comprehensive overview of architecture, security checkpoints, and operational milestones.');

  const agendaItems = [
    { num: '01', title: 'Strategic Vision', desc: 'The Challenge of Fragmentation vs. Unified Super App Ecosystem' },
    { num: '02', title: '4 Flexible Integration Tiers', desc: 'WebView, Flutter Package, Native SDK, Deep Link Schemes' },
    { num: '03', title: 'Partner Self-Service Portal', desc: 'Backoffice Onboarding Wizard & Real-time Probes' },
    { num: '04', title: '8 Multi-Layered Security Gates', desc: 'Automated Security Scanners Orchestrated by CI/CD Pipeline' },
    { num: '05', title: 'Automated Assembly & Nexus CE', desc: 'Release Builds, Dynamic Codegen & Mainline Git Isolation' },
    { num: '06', title: 'Dual-Environment Testing Engine', desc: 'Flutter Web Sandbox + Physical Android Device Verification' },
    { num: '07', title: 'Current Operational Milestones', desc: 'Working Prototypes, Production Readiness & Architecture Integrity' },
    { num: '08', title: 'Future Strategic Roadmap', desc: 'CamDigiKey SSO, HR Enterprise Mini App, SA Capability Generator' },
  ];

  agendaItems.forEach((item, idx) => {
    const col = idx < 4 ? 0 : 1;
    const row = idx % 4;
    const x = 0.8 + col * 5.95;
    const y = 2.6 + row * 1.12;

    // Card background
    s2.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x,
      y,
      w: 5.78,
      h: 0.98,
      fill: { color: C_BG_CARD },
      line: { color: C_BORDER_GREEN, width: 1.2 },
    });

    // Number badge
    s2.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.18,
      y: y + 0.22,
      w: 0.65,
      h: 0.54,
      fill: { color: C_BADGE_GOLD_BG },
      line: { color: C_BORDER_GOLD, width: 1 },
    });

    s2.addText(item.num, {
      x: x + 0.18,
      y: y + 0.22,
      w: 0.65,
      h: 0.54,
      align: 'center',
      fontSize: 14,
      bold: true,
      color: C_BRIGHT_GOLD,
      fontFace: 'Segoe UI',
      margin: 0,
    });

    // Title + Desc
    s2.addText(
      [
        { text: item.title + '\n', options: { fontSize: 13, bold: true, color: C_TEXT_WHITE } },
        { text: item.desc, options: { fontSize: 10.5, color: C_TEXT_MUTED } },
      ],
      {
        x: x + 0.98,
        y: y + 0.14,
        w: 4.65,
        h: 0.72,
        fontFace: 'Segoe UI',
        margin: 0,
      }
    );
  });
}

// -------------------------------------------------------------
// SLIDE 3: Strategic Vision
// -------------------------------------------------------------
{
  const s3 = pptx.addSlide();
  s3.background = { color: C_BG_DARK };
  addSlideHeader(s3, 'STRATEGIC VISION', 'The Challenge & The Solution', 'Transforming fragmented citizen applications into a unified digital public service ecosystem.');

  // Left Card: The Problem
  s3.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.8,
    y: 2.6,
    w: 5.75,
    h: 4.45,
    fill: { color: C_BG_CARD_RED },
    line: { color: C_BORDER_RED, width: 1.5 },
  });

  s3.addText('⚠️  The Fragmented Dilemma', {
    x: 1.1,
    y: 2.85,
    w: 5.15,
    h: 0.45,
    fontSize: 17,
    bold: true,
    color: 'FCA5A5',
    fontFace: 'Segoe UI',
  });

  const painPoints = [
    'Citizens forced to download dozens of separate standalone government and financial applications.',
    'Inconsistent authentication, variable security postures, and fragmented citizen profiles across services.',
    'Slow partner onboarding with high engineering costs, duplicated infrastructure, and tedious release reviews.',
    'Heavy maintenance burden for government authorities with unstandardized mobile deployment pipelines.',
  ];

  painPoints.forEach((pt, i) => {
    s3.addText(`✕  ${pt}`, {
      x: 1.1,
      y: 3.45 + i * 0.85,
      w: 5.15,
      h: 0.78,
      fontSize: 12,
      color: 'FEE2E2',
      fontFace: 'Segoe UI',
    });
  });

  // Right Card: The Solution
  s3.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 6.78,
    y: 2.6,
    w: 5.75,
    h: 4.45,
    fill: { color: C_BG_CARD },
    line: { color: C_BORDER_GOLD, width: 1.5 },
  });

  s3.addText('✨  The Unified Super App Solution', {
    x: 7.08,
    y: 2.85,
    w: 5.15,
    h: 0.45,
    fontSize: 17,
    bold: true,
    color: C_BRIGHT_GOLD,
    fontFace: 'Segoe UI',
  });

  const solutions = [
    'One App for All Services: High-performance Flutter container hosting dynamic on-demand Mini Apps.',
    'Automated Security Gates: Strict network isolation, domain verification, and 8-stage SAST/DAST compliance.',
    'Self-Service Backoffice: Instant registration wizard, live reachability checks, and version governance.',
    'Zero Mobile Git Mutation: Codegen and Nexus artifact hosting ensure sovereign, clean continuous deployment.',
  ];

  solutions.forEach((sol, i) => {
    s3.addText(`✓  ${sol}`, {
      x: 7.08,
      y: 3.45 + i * 0.85,
      w: 5.15,
      h: 0.78,
      fontSize: 12,
      color: C_TEXT_WHITE,
      fontFace: 'Segoe UI',
    });
  });
}

// -------------------------------------------------------------
// SLIDE 4: 4 Flexible Integration Tiers
// -------------------------------------------------------------
{
  const s4 = pptx.addSlide();
  s4.background = { color: C_BG_DARK };
  addSlideHeader(s4, 'ARCHITECTURE', '4 Flexible Integration Tiers', 'Supporting any partner technology stack with zero manual host application modification.');

  const tiers = [
    {
      num: '1',
      title: 'WebView Mini Apps (H5 / Web)',
      badge: 'INSTANT WEB DEPLOY',
      badgeBg: C_BADGE_GREEN_BG,
      badgeColor: '86EFAC',
      desc: 'Interactive responsive web applications running in a sandboxed Web container with bidirectional SuperAppJSBridge and native hardware capability access (camera, location, storage).',
      bg: C_BG_CARD,
      border: C_BORDER_GREEN,
      titleColor: C_LIGHT_GREEN,
    },
    {
      num: '2',
      title: 'Flutter Package (Git / Nexus)',
      badge: 'HIGH PERFORMANCE',
      badgeBg: C_BADGE_GOLD_BG,
      badgeColor: 'FDE047',
      desc: 'High-performance in-app micro-apps integrated via Git repository source OR hosted Dart Pub artifacts from Sonatype Nexus CE with offline caching and native 120 FPS transitions.',
      bg: C_BG_CARD_GOLD,
      border: C_BORDER_GOLD,
      titleColor: C_BRIGHT_GOLD,
    },
    {
      num: '3',
      title: 'Native SDK Frameworks (.aar / .xcframework)',
      badge: 'ENTERPRISE BINARY',
      badgeBg: C_BADGE_GOLD_BG,
      badgeColor: 'FDE047',
      desc: 'Platform-specific binary modules integrated automatically via Native SDK Codegen and Universal Native Launcher without manual mobile codebase edits.',
      bg: C_BG_CARD_GOLD,
      border: C_BORDER_GOLD,
      titleColor: C_BRIGHT_GOLD,
    },
    {
      num: '4',
      title: 'Deep Link & App Links (OS Scheme)',
      badge: 'EXTERNAL ECOSYSTEM',
      badgeBg: C_BADGE_GREEN_BG,
      badgeColor: '86EFAC',
      desc: 'Seamless OS-level URL scheme delegation (e.g. cambodia-tax://) to external standalone applications with automated App Store / Play Store fallback routing.',
      bg: C_BG_CARD,
      border: C_BORDER_GREEN,
      titleColor: C_LIGHT_GREEN,
    },
  ];

  tiers.forEach((tier, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.8 + col * 5.95;
    const y = 2.6 + row * 2.22;

    s4.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x,
      y,
      w: 5.78,
      h: 2.05,
      fill: { color: tier.bg },
      line: { color: tier.border, width: 1.2 },
    });

    // Title
    s4.addText(tier.title, {
      x: x + 0.25,
      y: y + 0.18,
      w: 3.6,
      h: 0.45,
      fontSize: 13.5,
      bold: true,
      color: tier.titleColor,
      fontFace: 'Segoe UI',
    });

    // Badge Shape
    s4.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x + 3.9,
      y: y + 0.18,
      w: 1.65,
      h: 0.32,
      fill: { color: tier.badgeBg },
      line: { color: tier.border, width: 1 },
    });

    s4.addText(tier.badge, {
      x: x + 3.9,
      y: y + 0.18,
      w: 1.65,
      h: 0.32,
      fontSize: 8.5,
      bold: true,
      color: tier.badgeColor,
      align: 'center',
      fontFace: 'Segoe UI',
      margin: 0,
    });

    // Desc
    s4.addText(tier.desc, {
      x: x + 0.25,
      y: y + 0.72,
      w: 5.28,
      h: 1.15,
      fontSize: 11.5,
      color: C_TEXT_BODY,
      fontFace: 'Segoe UI',
    });
  });
}

// -------------------------------------------------------------
// SLIDE 5: Partner Self-Service & Onboarding
// -------------------------------------------------------------
{
  const s5 = pptx.addSlide();
  s5.background = { color: C_BG_DARK };
  addSlideHeader(s5, 'DEVELOPER EXPERIENCE', 'Partner Self-Service & Developer Portal', 'Next.js Backoffice Admin Portal with live URL reachability, capability proposals, and regulatory vetting.');

  // Left column text
  const features = [
    {
      icon: '📋',
      title: '6-Step Onboarding Wizard',
      desc: 'Guided step-by-step registration capturing app metadata, identity branding logos, technical integration endpoints, and ownership credentials.',
      color: C_TEXT_WHITE,
    },
    {
      icon: '⚡',
      title: 'Live URL Reachability Probes',
      desc: 'Real-time debounced HTTP & TCP probes verifying production URLs, privacy policy endpoints, and store fallbacks during data entry.',
      color: C_BRIGHT_GOLD,
    },
    {
      icon: '🛡️',
      title: 'Flexible Policy Disclosures',
      desc: 'Supports live HTTPS regulatory URLs or self-contained offline Markdown policy documents with built-in compliance templates.',
      color: C_LIGHT_GREEN,
    },
  ];

  features.forEach((feat, i) => {
    const y = 2.6 + i * 1.5;

    s5.addText(`${feat.icon}  ${feat.title}`, {
      x: 0.8,
      y: y,
      w: 5.2,
      h: 0.35,
      fontSize: 14.5,
      bold: true,
      color: feat.color,
      fontFace: 'Segoe UI',
    });

    s5.addText(feat.desc, {
      x: 0.8,
      y: y + 0.4,
      w: 5.2,
      h: 0.95,
      fontSize: 11.5,
      color: C_TEXT_MUTED,
      fontFace: 'Segoe UI',
    });
  });

  // Right column: Screenshot
  const wizardImg = path.join(ASSETS_DIR, 'backoffice_wizard.png');
  if (fs.existsSync(wizardImg)) {
    s5.addImage({
      path: wizardImg,
      x: 6.3,
      y: 2.6,
      w: 6.233,
      h: 4.45,
      line: { color: C_BORDER_GREEN, width: 1.5 },
    });
  }
}

// -------------------------------------------------------------
// SLIDE 6: 8 Automated Security Gates
// -------------------------------------------------------------
{
  const s6 = pptx.addSlide();
  s6.background = { color: C_BG_DARK };
  addSlideHeader(s6, 'ENTERPRISE SECURITY • STRICT', '8 Automated Security Scanners & Gates', 'Multi-layered validation pipeline executed automatically by Jenkins CI/CD on every package submission.');

  const scanners = [
    { num: '01', name: 'Cryptographic SHA-256 Digest', desc: 'Package unpack & checksum integrity validation' },
    { num: '02', name: 'Gitleaks Secret Scanner', desc: 'Detects exposed private keys & API credentials' },
    { num: '03', name: 'Semgrep & AST Guard (SAST)', desc: 'Static code analysis & native API permission rules' },
    { num: '04', name: 'Trivy & OSV Database (SCA/CVE)', desc: 'Dependency vulnerability & CVE database matching' },
    { num: '05', name: 'Super App Gatekeeper', desc: 'Least-privilege permission capability sandbox audit' },
    { num: '06', name: 'Syft CycloneDX (SBOM)', desc: 'Signed software bill of materials manifests' },
    { num: '07', name: 'License Compliance Scanner', desc: 'Copyleft & proprietary IP restriction validation' },
    { num: '08', name: 'ClamAV & YARA Malware Scan', desc: 'Deep binary heuristics & signature quarantine' },
  ];

  scanners.forEach((sc, i) => {
    const y = 2.6 + i * 0.55;
    s6.addText(
      [
        { text: `${sc.num}. ${sc.name}  `, options: { bold: true, color: i % 2 === 0 ? C_LIGHT_GREEN : C_BRIGHT_GOLD, fontSize: 11 } },
        { text: `— ${sc.desc} `, options: { color: C_TEXT_MUTED, fontSize: 10 } },
        { text: '[PASS ✓]', options: { bold: true, color: '4ADE80', fontSize: 10 } },
      ],
      {
        x: 0.8,
        y: y,
        w: 5.6,
        h: 0.48,
        fontFace: 'Segoe UI',
        margin: 0,
      }
    );
  });

  // Right column: Security Report Screenshot
  const secImg = path.join(ASSETS_DIR, 'backoffice_security.png');
  if (fs.existsSync(secImg)) {
    s6.addImage({
      path: secImg,
      x: 6.6,
      y: 2.6,
      w: 5.933,
      h: 4.45,
      line: { color: C_BORDER_GOLD, width: 1.5 },
    });
  }
}

// -------------------------------------------------------------
// SLIDE 7: CI/CD Pipeline & Nexus CE Repository
// -------------------------------------------------------------
{
  const s7 = pptx.addSlide();
  s7.background = { color: C_BG_DARK };
  addSlideHeader(s7, 'AUTOMATED ASSEMBLY', 'CI/CD Pipeline, Codegen & Nexus CE', 'Release-mode compilation with Jenkins, Sonatype Nexus Repository CE, and automated SDK codegen.');

  const stages = [
    {
      tag: 'STAGE 1: TEST BUILDS',
      title: 'Automated Test Compilation',
      desc: 'Compiles signed test release APKs uploaded automatically to Nexus apk-test-builds and live syncs with Flutter Web Sandbox for real-time stakeholder testing.',
      bg: C_BG_CARD,
      border: C_BORDER_GREEN,
      tagColor: C_LIGHT_GREEN,
    },
    {
      tag: 'STAGE 2: PRODUCTION',
      title: 'Hardened Release Assembly',
      desc: 'Produces hardened production APKs with ProGuard minification, cryptographic release signing, and direct upload to Nexus apk-releases repository.',
      bg: C_BG_CARD_GOLD,
      border: C_BORDER_GOLD,
      tagColor: C_BRIGHT_GOLD,
    },
    {
      tag: 'SONATYPE NEXUS CE',
      title: 'Artifact & Package Vault',
      desc: 'Hosts private Dart pub packages (dart-pub-hosted) and raw release binary repositories with cryptographic checksum verification and zero external leaks.',
      bg: C_BG_CARD,
      border: '396344',
      tagColor: C_LIGHT_GREEN,
    },
  ];

  stages.forEach((st, i) => {
    const x = 0.8 + i * 3.98;
    s7.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x,
      y: 2.6,
      w: 3.78,
      h: 3.0,
      fill: { color: st.bg },
      line: { color: st.border, width: 1.2 },
    });

    s7.addText(st.tag, {
      x: x + 0.2,
      y: 2.8,
      w: 3.38,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: st.tagColor,
      fontFace: 'Segoe UI',
    });

    s7.addText(st.title, {
      x: x + 0.2,
      y: 3.15,
      w: 3.38,
      h: 0.45,
      fontSize: 14,
      bold: true,
      color: C_TEXT_WHITE,
      fontFace: 'Segoe UI',
    });

    s7.addText(st.desc, {
      x: x + 0.2,
      y: 3.65,
      w: 3.38,
      h: 1.75,
      fontSize: 11.5,
      color: C_TEXT_BODY,
      fontFace: 'Segoe UI',
    });
  });

  // Bottom Banner: Native SDK Codegen & Zero Mobile Git Mutation
  s7.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.8,
    y: 5.8,
    w: 11.733,
    h: 1.25,
    fill: { color: C_BG_CARD_GOLD },
    line: { color: C_BORDER_GOLD, width: 1.2 },
  });

  s7.addText(
    [
      { text: '⚡ Automated Native SDK Codegen & Zero Mobile Git Mutation: ', options: { bold: true, color: C_BRIGHT_GOLD, fontSize: 12 } },
      { text: 'NativeSdkCodegenService dynamically generates launcher glue code and injects Gradle/CocoaPods dependencies in isolated runners during Jenkins build cycles, guaranteeing the host mobile Git repository remains 100% clean and sovereign.', options: { color: C_TEXT_BODY, fontSize: 11.5 } },
    ],
    {
      x: 1.05,
      y: 5.92,
      w: 11.233,
      h: 1.0,
      fontFace: 'Segoe UI',
    }
  );
}

// -------------------------------------------------------------
// SLIDE 8: Dual-Environment Testing & QA Engine
// -------------------------------------------------------------
{
  const s8 = pptx.addSlide();
  s8.background = { color: C_BG_DARK };
  addSlideHeader(s8, 'TESTING & VERIFICATION', 'Dual-Environment Testing & QA Engine', 'Instant in-browser Flutter Web simulation combined with physical Android device verification.');

  // Left: Web Sandbox Screenshot
  const sandboxImg = path.join(ASSETS_DIR, 'superapp_sandbox_preview.png');
  if (fs.existsSync(sandboxImg)) {
    s8.addImage({
      path: sandboxImg,
      x: 0.8,
      y: 2.6,
      w: 7.6,
      h: 4.45,
      line: { color: C_BORDER_GREEN, width: 1.5 },
    });
  }

  // Right: Mobile SuperApp Screenshot
  const mobileImg = path.join(ASSETS_DIR, 'mobile_superapp.jpg');
  if (fs.existsSync(mobileImg)) {
    s8.addImage({
      path: mobileImg,
      x: 8.7,
      y: 2.6,
      w: 3.833,
      h: 4.45,
      line: { color: C_BORDER_GOLD, width: 1.5 },
    });
  }
}

// -------------------------------------------------------------
// SLIDE 9: Operational Milestones & Executive Dashboard
// -------------------------------------------------------------
{
  const s9 = pptx.addSlide();
  s9.background = { color: C_BG_DARK };
  addSlideHeader(s9, 'STATUS & ACHIEVEMENTS', 'Current Milestones & Operational Status', 'Working prototype and governance infrastructure fully validated end-to-end.');

  // Left column metrics
  const metrics = [
    {
      stat: '4 Tiers Verified (100%)',
      desc: 'WebView Mini App, Flutter Package, Native SDK, and Deep Link validated end-to-end with live sample services.',
      color: C_LIGHT_GREEN,
    },
    {
      stat: '2-Stage Automated CI/CD',
      desc: 'Jenkins compilation pipelines & Sonatype Nexus CE repository operational with automated release packaging.',
      color: C_BRIGHT_GOLD,
    },
    {
      stat: 'Production Infrastructure',
      desc: 'Consolidated database schema, real-time Socket.IO notifications, and high-reliability Docker containers published.',
      color: C_LIGHT_GREEN,
    },
  ];

  metrics.forEach((m, i) => {
    const y = 2.6 + i * 1.5;

    s9.addText(m.stat, {
      x: 0.8,
      y: y,
      w: 5.2,
      h: 0.35,
      fontSize: 16,
      bold: true,
      color: m.color,
      fontFace: 'Segoe UI',
    });

    s9.addText(m.desc, {
      x: 0.8,
      y: y + 0.4,
      w: 5.2,
      h: 0.95,
      fontSize: 12,
      color: C_TEXT_MUTED,
      fontFace: 'Segoe UI',
    });
  });

  // Right column: Dashboard Screenshot
  const dashImg = path.join(ASSETS_DIR, 'backoffice_dashboard.png');
  if (fs.existsSync(dashImg)) {
    s9.addImage({
      path: dashImg,
      x: 6.3,
      y: 2.6,
      w: 6.233,
      h: 4.45,
      line: { color: C_BORDER_GOLD, width: 1.5 },
    });
  }
}

// -------------------------------------------------------------
// SLIDE 10: Future Strategic Roadmap
// -------------------------------------------------------------
{
  const s10 = pptx.addSlide();
  s10.background = { color: C_BG_DARK };
  addSlideHeader(s10, 'STRATEGIC ROADMAP', 'Future Roadmap & Next Steps', 'Upcoming high-impact integrations and enterprise ecosystem expansion.');

  const roadmap = [
    {
      icon: '🆔',
      title: 'CamDigiKey Integration',
      bullets: [
        'National citizen Single Sign-On (SSO) standard.',
        'Biometric authentication & eKYC verification.',
        'Delegated identity tokens for authorized Mini Apps.',
        'Zero-trust cryptographic citizen token validation.',
      ],
      bg: C_BG_CARD_GOLD,
      border: C_BORDER_GOLD,
      titleColor: C_BRIGHT_GOLD,
    },
    {
      icon: '🏢',
      title: 'HR Enterprise Mini App',
      bullets: [
        'Geo-fenced & biometric staff check-in system.',
        'Digital leave requests & automated approval workflows.',
        'Secure digital payslip viewing portal.',
        'Flagship high-security internal enterprise showcase.',
      ],
      bg: C_BG_CARD,
      border: C_BORDER_GREEN,
      titleColor: C_LIGHT_GREEN,
    },
    {
      icon: '⚙️',
      title: 'SA Capability Generator',
      bullets: [
        'Automated capability stub & JS bridge generator.',
        'Standardized platform channel code synthesis.',
        '1-click partner SDK boilerplate generation.',
        'Interactive capability playground inside Backoffice.',
      ],
      bg: C_BG_CARD_GOLD,
      border: C_BORDER_GOLD,
      titleColor: C_BRIGHT_GOLD,
    },
  ];

  roadmap.forEach((rm, i) => {
    const x = 0.8 + i * 3.98;
    s10.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x,
      y: 2.6,
      w: 3.78,
      h: 4.45,
      fill: { color: rm.bg },
      line: { color: rm.border, width: 1.2 },
    });

    s10.addText(`${rm.icon}  ${rm.title}`, {
      x: x + 0.25,
      y: 2.85,
      w: 3.28,
      h: 0.45,
      fontSize: 14.5,
      bold: true,
      color: rm.titleColor,
      fontFace: 'Segoe UI',
    });

    rm.bullets.forEach((b, j) => {
      s10.addText(`•  ${b}`, {
        x: x + 0.25,
        y: 3.5 + j * 0.8,
        w: 3.28,
        h: 0.72,
        fontSize: 11.5,
        color: C_TEXT_BODY,
        fontFace: 'Segoe UI',
      });
    });
  });
}

// -------------------------------------------------------------
// SLIDE 11: Thank You & Q&A
// -------------------------------------------------------------
{
  const s11 = pptx.addSlide();
  s11.background = { color: C_BG_DARK };

  // Background card
  s11.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 1.0,
    y: 0.8,
    w: 11.333,
    h: 5.9,
    fill: { color: '0A1C0E' },
    line: { color: '295133', width: 1.5 },
  });

  // FSA Logo
  if (fs.existsSync(logoPath)) {
    s11.addImage({ path: logoPath, x: 5.866, y: 1.4, w: 1.6, h: 1.6 });
  }

  // Tag Badge
  s11.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 4.866,
    y: 3.2,
    w: 3.6,
    h: 0.42,
    fill: { color: C_BADGE_GOLD_BG },
    line: { color: C_BORDER_GOLD, width: 1 },
  });

  s11.addText('🤝  Q&A  /  THANK YOU', {
    x: 4.866,
    y: 3.2,
    w: 3.6,
    h: 0.42,
    align: 'center',
    fontSize: 12,
    bold: true,
    color: C_BRIGHT_GOLD,
    fontFace: 'Segoe UI',
    margin: 0,
  });

  // Thank You Headline
  s11.addText('Thank You!', {
    x: 1.5,
    y: 3.8,
    w: 10.333,
    h: 0.85,
    align: 'center',
    fontSize: 36,
    bold: true,
    color: C_TEXT_WHITE,
    fontFace: 'Segoe UI',
  });

  // Closing summary
  s11.addText(
    'Empowering national-scale digital public services and partner ecosystems through a unified, secure Super App platform.',
    {
      x: 2.0,
      y: 4.7,
      w: 9.333,
      h: 0.65,
      align: 'center',
      fontSize: 14.5,
      color: 'D1DCCE',
      fontFace: 'Segoe UI',
    }
  );

  // Footer metadata
  s11.addText(
    'Non-Bank Financial Services Authority (FSA)  •  Core Engineering Team',
    {
      x: 1.5,
      y: 5.75,
      w: 10.333,
      h: 0.45,
      align: 'center',
      fontSize: 13,
      bold: true,
      color: C_LIGHT_GREEN,
      fontFace: 'Segoe UI',
    }
  );
}

// -------------------------------------------------------------
// Export Presentation
// -------------------------------------------------------------
const outputSuperApp = path.join(DOCS_DIR, 'superapp_presentation.pptx');

console.log('Writing PowerPoint file via pptxgenjs...');
await pptx.writeFile({ fileName: outputSuperApp });
console.log(`Saved: ${outputSuperApp}`);
