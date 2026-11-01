import os
import io
import pptx
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))

LOGO_PATH = os.path.join(PROJECT_ROOT, 'slide', 'assets', 'fsa_logo.png')
ARCH_IMG_PATH = os.path.join(PROJECT_ROOT, 'slide', 'assets', 'fsa_superapp_system_architecture.png')
FLOWCHART_PATH = os.path.join(PROJECT_ROOT, 'slide', 'assets', 'executive_flowchart_security_scan.jpg')
WIZARD_PATH = os.path.join(PROJECT_ROOT, 'slide', 'assets', 'backoffice_wizard.png')
SANDBOX_PATH = os.path.join(PROJECT_ROOT, 'slide', 'assets', 'superapp_sandbox_preview.png')
MOBILE_PATH = os.path.join(PROJECT_ROOT, 'slide', 'assets', 'mobile_preview.png')

# Clean Executive Colors (No murky green fills, no chunky borders)
COLOR_BG_DARK = RGBColor(8, 12, 9)          # #080C09 Deep obsidian
COLOR_GOLD = RGBColor(248, 209, 97)          # #F8D161 Sovereign Gold
COLOR_WHITE = RGBColor(255, 255, 255)        # #FFFFFF Pure White
COLOR_SAGE = RGBColor(158, 187, 163)         # #9EBBA3 Muted Sage
COLOR_MUTED = RGBColor(203, 213, 225)        # #CBD5E1 Muted Slate
COLOR_LINE = RGBColor(40, 55, 44)            # Hairline divider
COLOR_GOLD_LINE = RGBColor(160, 125, 40)     # Hairline gold divider
COLOR_RED_TITLE = RGBColor(248, 113, 113)    # #F87171 Red accent
COLOR_RED_BODY = RGBColor(252, 165, 165)     # #FCA5A5 Red body
COLOR_GREEN_PASS = RGBColor(74, 222, 128)    # #4ADE80 Green Pass

FONT_DISPLAY = "Segoe UI"
FONT_MONO = "Consolas"

def set_run(run, text, font_size_pt=11, bold=False, color=COLOR_WHITE, mono=False):
    run.text = text
    run.font.name = FONT_MONO if mono else FONT_DISPLAY
    run.font.size = Pt(font_size_pt)
    run.font.bold = bold
    run.font.color.rgb = color

def create_header(slide, eyebrow_text, title_text, subtitle_text):
    # 1. Official FSA Logo
    if os.path.exists(LOGO_PATH):
        slide.shapes.add_picture(LOGO_PATH, Inches(0.80), Inches(0.42), Inches(0.46), Inches(0.46))

    # 2. Organization Bar
    tx_top = slide.shapes.add_textbox(Inches(1.36), Inches(0.45), Inches(9.00), Inches(0.35))
    tf_top = tx_top.text_frame
    tf_top.margin_left = tf_top.margin_right = tf_top.margin_top = tf_top.margin_bottom = 0
    p_top = tf_top.paragraphs[0]
    r_top = p_top.add_run()
    set_run(r_top, "FINTECH CENTER  •  GENERAL SECRETARIAT OF FSA", font_size_pt=10.0, bold=True, color=COLOR_GOLD, mono=True)

    # 3. Eyebrow
    tx_eye = slide.shapes.add_textbox(Inches(0.80), Inches(1.10), Inches(11.50), Inches(0.28))
    tf_eye = tx_eye.text_frame
    tf_eye.margin_left = tf_eye.margin_right = tf_eye.margin_top = tf_eye.margin_bottom = 0
    p_eye = tf_eye.paragraphs[0]
    r_eye = p_eye.add_run()
    set_run(r_eye, eyebrow_text, font_size_pt=11.0, bold=True, color=COLOR_GOLD, mono=True)

    # 4. Title
    tx_title = slide.shapes.add_textbox(Inches(0.80), Inches(1.36), Inches(11.50), Inches(0.55))
    tf_title = tx_title.text_frame
    tf_title.margin_left = tf_title.margin_right = tf_title.margin_top = tf_title.margin_bottom = 0
    p_title = tf_title.paragraphs[0]
    r_title = p_title.add_run()
    set_run(r_title, title_text, font_size_pt=24.0, bold=True, color=COLOR_WHITE)

    # 5. Subtitle
    tx_sub = slide.shapes.add_textbox(Inches(0.80), Inches(1.95), Inches(11.50), Inches(0.40))
    tf_sub = tx_sub.text_frame
    tf_sub.margin_left = tf_sub.margin_right = tf_sub.margin_top = tf_sub.margin_bottom = 0
    p_sub = tf_sub.paragraphs[0]
    r_sub = p_sub.add_run()
    set_run(r_sub, subtitle_text, font_size_pt=12.5, bold=False, color=COLOR_SAGE)

    # 6. Hairline separator rule
    line = slide.shapes.add_shape(pptx.enum.shapes.MSO_SHAPE.RECTANGLE, Inches(0.80), Inches(2.40), Inches(11.73), Pt(0.75))
    line.fill.solid()
    line.fill.fore_color.rgb = COLOR_LINE
    line.line.fill.background()

def add_hairline(slide, left, top, width, color=COLOR_LINE, height_pt=0.75):
    line = slide.shapes.add_shape(pptx.enum.shapes.MSO_SHAPE.RECTANGLE, left, top, width, Pt(height_pt))
    line.fill.solid()
    line.fill.fore_color.rgb = color
    line.line.fill.background()
    return line

def build_presentation():
    # Blank widescreen presentation (16:9, 13.333 x 7.5 inches)
    prs = pptx.Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    def apply_bg(slide):
        bg = slide.shapes.add_shape(pptx.enum.shapes.MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = COLOR_BG_DARK
        bg.line.fill.background()

    # ========================================================
    # SLIDE 01: Hero / Title
    # ========================================================
    s1 = prs.slides.add_slide(blank_layout)
    apply_bg(s1)

    if os.path.exists(LOGO_PATH):
        s1.shapes.add_picture(LOGO_PATH, Inches(1.00), Inches(1.50), Inches(1.10), Inches(1.10))

    tx1 = s1.shapes.add_textbox(Inches(1.00), Inches(2.90), Inches(11.33), Inches(3.60))
    tf1 = tx1.text_frame
    tf1.word_wrap = True
    tf1.margin_left = tf1.margin_right = tf1.margin_top = tf1.margin_bottom = 0

    p_org = tf1.paragraphs[0]
    p_org.space_after = Pt(12)
    r_org = p_org.add_run()
    set_run(r_org, "FINTECH CENTER OF GENERAL SECRETARIAT OF FSA", font_size_pt=13.0, bold=True, color=COLOR_GOLD, mono=True)

    p_title = tf1.add_paragraph()
    p_title.space_after = Pt(12)
    r_title = p_title.add_run()
    set_run(r_title, "Super App & Mini App Platform", font_size_pt=44.0, bold=True, color=COLOR_WHITE)

    p_sub = tf1.add_paragraph()
    p_sub.space_after = Pt(28)
    r_sub = p_sub.add_run()
    set_run(r_sub, "Unified Mobile Architecture, Multi-Tier Partner Integration & Automated Security Framework", font_size_pt=16.0, color=COLOR_SAGE)

    p_pil = tf1.add_paragraph()
    p_pil.space_after = Pt(8)
    r_pil = p_pil.add_run()
    set_run(r_pil, "ZERO-TRUST ARCHITECTURE   •   4 INTEGRATION TIERS   •   AUTOMATED CI/CD   •   NATIONAL SSO READY", font_size_pt=12.0, bold=True, color=COLOR_GOLD, mono=True)

    p_meta = tf1.add_paragraph()
    r_meta = p_meta.add_run()
    set_run(r_meta, "Non-Bank Financial Services Authority (FSA)  •  Core Engineering Architecture Review", font_size_pt=11.0, color=COLOR_MUTED)

    add_hairline(s1, Inches(1.00), Inches(5.60), Inches(11.33), COLOR_LINE, 1.0)

    # ========================================================
    # SLIDE 02: Table of Contents (Open 2x2, Zero Containers)
    # ========================================================
    s2 = prs.slides.add_slide(blank_layout)
    apply_bg(s2)
    create_header(s2, "AGENDA", "Executive Table of Contents", "Four foundational strategic domains governing platform architecture, integration, security, and roadmap.")

    agenda_items = [
        ("01", "1. Platform Vision & System Architecture", [
            ("1.1", "Strategic Vision (The Dilemma vs. Unified Solution)"),
            ("1.2", "End-to-End System Architecture (4-Phase Integration Pipeline)")
        ], Inches(0.80), Inches(2.70)),
        ("02", "2. Core Features & 4 Integration Tiers", [
            ("2.1", "4 Flexible Integration Tiers (WebView, Flutter, Native, Deep Link)"),
            ("2.2", "Platform Core Features (Size Cleaner, Codegen, Dynamic RBAC)")
        ], Inches(0.80), Inches(4.90)),
        ("03", "3. Partner Portal & Enterprise Security", [
            ("3.1", "Partner Self-Service Backoffice & 6-Step Wizard"),
            ("3.2", "Automated Security Pipeline (8 Pre-Flight Gates & 12 Scanners)")
        ], Inches(6.80), Inches(2.70)),
        ("04", "4. CI/CD Assembly, QA & Strategic Roadmap", [
            ("4.1", "Jenkins Codegen Assembly, Nexus Registry & Dual QA Engine"),
            ("4.2", "Operational Milestones & Strategic Roadmap (CamDigiKey, HR)")
        ], Inches(6.80), Inches(4.90))
    ]

    for num, title, subs, left, top in agenda_items:
        tx = s2.shapes.add_textbox(left, top, Inches(5.70), Inches(1.90))
        tf = tx.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0

        p0 = tf.paragraphs[0]
        p0.space_after = Pt(10)
        r_num = p0.add_run()
        set_run(r_num, f"{num}   ", font_size_pt=20.0, bold=True, color=COLOR_GOLD, mono=True)
        r_t = p0.add_run()
        set_run(r_t, title, font_size_pt=15.0, bold=True, color=COLOR_WHITE)

        for s_num, s_txt in subs:
            p = tf.add_paragraph()
            p.space_after = Pt(5)
            r_dot = p.add_run()
            set_run(r_dot, "       •  ", font_size_pt=11.5, bold=True, color=COLOR_GOLD)
            r_snum = p.add_run()
            set_run(r_snum, f"{s_num}  ", font_size_pt=11.5, bold=True, color=COLOR_GOLD, mono=True)
            r_stxt = p.add_run()
            set_run(r_stxt, s_txt, font_size_pt=11.5, color=COLOR_SAGE)

        add_hairline(s2, left, top + Inches(1.85), Inches(5.60), COLOR_LINE, 0.75)

    # ========================================================
    # SLIDE 03: 1.1 Strategic Vision (Open Columns, Bullet Dots)
    # ========================================================
    s3 = prs.slides.add_slide(blank_layout)
    apply_bg(s3)
    create_header(s3, "1.1 STRATEGIC VISION", "Operational Dilemma vs. Unified Solution", "Transforming fragmented citizen applications into a unified, secure digital public service gateway.")

    # Left: Challenges
    add_hairline(s3, Inches(0.80), Inches(2.65), Inches(5.65), COLOR_RED_TITLE, 2.0)
    tx_chal = s3.shapes.add_textbox(Inches(0.80), Inches(2.78), Inches(5.65), Inches(4.30))
    tf_chal = tx_chal.text_frame
    tf_chal.word_wrap = True
    tf_chal.margin_left = tf_chal.margin_right = tf_chal.margin_top = tf_chal.margin_bottom = 0

    p_c_head = tf_chal.paragraphs[0]
    p_c_head.space_after = Pt(14)
    r_c_head = p_c_head.add_run()
    set_run(r_c_head, "Operational Challenges & Fragmentation", font_size_pt=16.0, bold=True, color=COLOR_RED_TITLE)
    r_c_tag = p_c_head.add_run()
    set_run(r_c_tag, "   [CRITICAL RISKS]", font_size_pt=10.5, bold=True, color=COLOR_RED_TITLE, mono=True)

    challenges = [
        ("Severe Citizen App Fatigue", "Citizens must download dozens of separate standalone government apps for individual ministry services."),
        ("Fragmented Security & Identity", "Inconsistent authentication standards, variable security postures, and scattered citizen profiles."),
        ("High Partner Onboarding Overhead", "Slow integration cycles with manual code reviews, duplicated infrastructure, and high dev costs."),
        ("Decentralized Governance Void", "No centralized control to enforce regulatory compliance, inspect dependencies, or revoke versions.")
    ]
    for pt, pd in challenges:
        p1 = tf_chal.add_paragraph()
        p1.space_before = Pt(8)
        p1.space_after = Pt(2)
        r1 = p1.add_run()
        set_run(r1, f"•  {pt}", font_size_pt=12.5, bold=True, color=COLOR_RED_BODY)
        p2 = tf_chal.add_paragraph()
        r2 = p2.add_run()
        set_run(r2, f"    {pd}", font_size_pt=11.0, color=COLOR_SAGE)

    # Right: Solution
    add_hairline(s3, Inches(6.88), Inches(2.65), Inches(5.65), COLOR_GOLD, 2.0)
    tx_sol = s3.shapes.add_textbox(Inches(6.88), Inches(2.78), Inches(5.65), Inches(4.30))
    tf_sol = tx_sol.text_frame
    tf_sol.word_wrap = True
    tf_sol.margin_left = tf_sol.margin_right = tf_sol.margin_top = tf_sol.margin_bottom = 0

    p_s_head = tf_sol.paragraphs[0]
    p_s_head.space_after = Pt(14)
    r_s_head = p_s_head.add_run()
    set_run(r_s_head, "Unified Super App Architecture", font_size_pt=16.0, bold=True, color=COLOR_GOLD)
    r_s_tag = p_s_head.add_run()
    set_run(r_s_tag, "   [ENTERPRISE SOLUTION]", font_size_pt=10.5, bold=True, color=COLOR_GOLD, mono=True)

    solutions = [
        ("Single Citizen Digital Portal", "Consolidates all public and financial services into one authoritative, state-level mobile gateway."),
        ("Bank-Grade Zero-Trust Security", "Centralized CamDigiKey national SSO, automated SAST vulnerability scanning, and strict sandbox isolation."),
        ("Automated Self-Service Onboarding", "6-step developer portal with live reachability probes, automated manifest validation, and dynamic routing."),
        ("Centralized Regulatory Governance", "Immediate capability revocation, multi-tenant RBAC permissions, and end-to-end immutable audit logging.")
    ]
    for pt, pd in solutions:
        p1 = tf_sol.add_paragraph()
        p1.space_before = Pt(8)
        p1.space_after = Pt(2)
        r1 = p1.add_run()
        set_run(r1, f"•  {pt}", font_size_pt=12.5, bold=True, color=COLOR_WHITE)
        p2 = tf_sol.add_paragraph()
        r2 = p2.add_run()
        set_run(r2, f"    {pd}", font_size_pt=11.0, color=COLOR_SAGE)

    # ========================================================
    # SLIDE 04: 1.2 System Architecture (Tech Stacks & Communication)
    # ========================================================
    s4 = prs.slides.add_slide(blank_layout)
    apply_bg(s4)
    create_header(s4, "1.2 SYSTEM ARCHITECTURE & PROTOCOLS", "Technology Stacks & Communication Architecture", "Decoupled technical topology showing exact technologies, ports, data flows, and inter-service communication channels.")

    # Left: Architecture Diagram Image at Native Aspect Ratio
    if os.path.exists(ARCH_IMG_PATH):
        # Image is 2600 x 1440 -> 1.805:1
        # Height = Inches(4.55) -> Width = 4.55 * 1.805 = Inches(8.21)
        s4.shapes.add_picture(ARCH_IMG_PATH, Inches(0.80), Inches(2.60), height=Inches(4.55))

    # Right: Communication & Tech Breakdown
    add_hairline(s4, Inches(9.30), Inches(2.60), Inches(3.23), COLOR_GOLD, 2.0)
    tx_arch = s4.shapes.add_textbox(Inches(9.30), Inches(2.72), Inches(3.23), Inches(4.40))
    tf_arch = tx_arch.text_frame
    tf_arch.word_wrap = True
    tf_arch.margin_left = tf_arch.margin_right = tf_arch.margin_top = tf_arch.margin_bottom = 0

    p_a_head = tf_arch.paragraphs[0]
    p_a_head.space_after = Pt(10)
    r_a_head = p_a_head.add_run()
    set_run(r_a_head, "Inter-Service Communication", font_size_pt=14.0, bold=True, color=COLOR_GOLD)

    arch_points = [
        ("Portal to Backend (BFF)", "Next.js 16 Server Actions call NestJS 11 REST API via Bearer JWT; real-time build progress via Socket.IO WebSocket."),
        ("Backend to Data & Storage", "NestJS connects to PostgreSQL 15 over TCP 5432 (TypeORM QueryBuilder) and MinIO over S3 API (Port 9000)."),
        ("Automated CI/CD Security", "Jenkins triggers rootless Docker DinD (Port 2376), executes 12 scanners (OWASP ZAP 8090, Trivy), publishes to Nexus CE 8081."),
        ("Super App Sandboxed IPC", "Flutter host binds WebView via window.postMessage, Native SDK via MethodChannels, and CamDigiKey SSO via OIDC PKCE.")
    ]
    for pt, pd in arch_points:
        p1 = tf_arch.add_paragraph()
        p1.space_before = Pt(7)
        p1.space_after = Pt(1)
        r1 = p1.add_run()
        set_run(r1, f"•  {pt}", font_size_pt=11.0, bold=True, color=COLOR_WHITE)
        p2 = tf_arch.add_paragraph()
        r2 = p2.add_run()
        set_run(r2, f"    {pd}", font_size_pt=9.5, color=COLOR_SAGE)

    p_t = tf_arch.add_paragraph()
    p_t.space_before = Pt(12)
    r_t = p_t.add_run()
    set_run(r_t, "[PROVEN FULL-STACK POC ARCHITECTURE]", font_size_pt=9.5, bold=True, color=COLOR_GREEN_PASS, mono=True)

    # ========================================================
    # SLIDE 05: 2.1 4 Flexible Integration Tiers (Open Columns)
    # ========================================================
    s5 = prs.slides.add_slide(blank_layout)
    apply_bg(s5)
    create_header(s5, "2.1 INTEGRATION TIERS", "4 Flexible Partner Integration Tiers", "Supporting existing web applications, high-performance Flutter modules, native OEM SDKs, and external ecosystem apps.")

    tiers = [
        ("TIER 01", "WebView Mini App", [
            ("Zero App Rebuild", "Instantly embed existing web applications with zero mobile compilation required."),
            ("JS Bridge Isolation", "Restricted JavaScript bridge communicates over monitored postMessage channels."),
            ("Automated Auth", "Direct JWT session token injection via secure headers and CamDigiKey handoff.")
        ], "HTML5 / React / Vue • <8MB", Inches(0.80)),
        ("TIER 02", "Flutter Mini App", [
            ("60 FPS Native UI", "Delivers fluid 60fps animations with Flutter Riverpod state architecture."),
            ("Native Channel Bridge", "Direct MethodChannel access to host camera, biometric auth, and secure storage."),
            ("Decoupled Routes", "Dynamic route registry allows independent module versioning and testing.")
        ], "Dart / Riverpod • Hot Launch", Inches(3.80)),
        ("TIER 03", "Native Mobile SDK", [
            ("Direct OEM Modules", "Integrates iOS Swift and Android Kotlin frameworks for intensive processing."),
            ("Hardware Access", "Low-level hardware access for NFC chip reading, secure element, and Bluetooth."),
            ("Execution Guards", "Strict in-flight execution guards prevent crashes from propagating to host.")
        ], "Kotlin / Swift • NFC & Secure Enclave", Inches(6.80)),
        ("TIER 04", "External Deep Link", [
            ("App-to-App Handoff", "Cryptographic single sign-on handoff to external bank and agency applications."),
            ("Zero Binary Footprint", "Adds zero megabytes to the core Super App package size."),
            ("Verified Return URL", "Cryptographically signed return callbacks verify transaction results.")
        ], "Custom URL Schemes • App Links", Inches(9.80))
    ]

    for t_num, t_title, pts, t_spec, left in tiers:
        add_hairline(s5, left, Inches(2.65), Inches(2.70), COLOR_GOLD, 2.0)
        tx = s5.shapes.add_textbox(left, Inches(2.78), Inches(2.70), Inches(4.40))
        tf = tx.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0

        p0 = tf.paragraphs[0]
        p0.space_after = Pt(2)
        r0 = p0.add_run()
        set_run(r0, t_num, font_size_pt=10.5, bold=True, color=COLOR_GOLD, mono=True)

        p1 = tf.add_paragraph()
        p1.space_after = Pt(12)
        r1 = p1.add_run()
        set_run(r1, t_title, font_size_pt=14.0, bold=True, color=COLOR_WHITE)

        for pt, pd in pts:
            pm = tf.add_paragraph()
            pm.space_before = Pt(6)
            pm.space_after = Pt(1)
            rm = pm.add_run()
            set_run(rm, f"•  {pt}", font_size_pt=11.0, bold=True, color=COLOR_WHITE)
            ps = tf.add_paragraph()
            rs = ps.add_run()
            set_run(rs, f"    {pd}", font_size_pt=10.0, color=COLOR_SAGE)

        ptch = tf.add_paragraph()
        ptch.space_before = Pt(16)
        rtch = ptch.add_run()
        set_run(rtch, t_spec, font_size_pt=9.5, bold=True, color=COLOR_GOLD, mono=True)

    # ========================================================
    # SLIDE 06: 2.2 Core Platform Features (Open 3x2 Grid)
    # ========================================================
    s6 = prs.slides.add_slide(blank_layout)
    apply_bg(s6)
    create_header(s6, "2.2 PLATFORM CAPABILITIES", "Core Platform Features & Architecture", "Engineered for high-volume citizen services, automated governance, and enterprise-grade performance.")

    features = [
        ("Smart Size & Asset Cleaner", [
            ("Binary Symbol Stripping", "Strips unused symbols, duplicate assets, and debug metadata from release builds."),
            ("Strict Size Enforcer", "Blocks builds exceeding 15MB to ensure rapid citizen mobile app downloads.")
        ], Inches(0.80), Inches(2.65)),
        ("Dynamic Code Generator", [
            ("Automated Routing", "Generates Riverpod providers, route tables, and bridge wrappers dynamically."),
            ("Zero Human Error", "Eliminates manual integration boilerplate and prevents route collision issues.")
        ], Inches(4.80), Inches(2.65)),
        ("Multi-Tenant Backoffice RBAC", [
            ("Role-Based Isolation", "Strict separation between FSA regulatory auditors, QA staff, and ministry developers."),
            ("Audit Tracking", "Logs every permission update, approval decision, and status modification.")
        ], Inches(8.80), Inches(2.65)),
        ("Live Web Sandbox Emulator", [
            ("In-Browser Device Frame", "Instant desktop simulation of mobile viewports, touch gestures, and bridge APIs."),
            ("Hardware Mocking", "Mocks camera feeds, GPS coordinates, and auth tokens without physical devices.")
        ], Inches(0.80), Inches(4.85)),
        ("Pre-Flight Security Scanner", [
            ("8 Automated Gates", "Scans AST code, third-party SBOM packages, and SSRF network endpoints automatically."),
            ("Immediate Quarantine", "Quarantines non-compliant commits before reaching staging and release builds.")
        ], Inches(4.80), Inches(4.85)),
        ("Git Multi-Branch & Nexus Sync", [
            ("Webhook Pipeline", "Tracks dev, staging, and production branches with automated webhook builds."),
            ("Nexus Enterprise Registry", "Stores version-pinned, tamper-evident packages in private Nexus registry.")
        ], Inches(8.80), Inches(4.85))
    ]

    for f_title, pts, left, top in features:
        add_hairline(s6, left, top, Inches(3.70), COLOR_LINE, 1.0)
        tx = s6.shapes.add_textbox(left, top + Inches(0.12), Inches(3.70), Inches(1.90))
        tf = tx.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0

        p0 = tf.paragraphs[0]
        p0.space_after = Pt(8)
        r0 = p0.add_run()
        set_run(r0, f_title, font_size_pt=13.5, bold=True, color=COLOR_GOLD)

        for pt, pd in pts:
            pm = tf.add_paragraph()
            pm.space_after = Pt(1)
            rm = pm.add_run()
            set_run(rm, f"•  {pt}: ", font_size_pt=10.5, bold=True, color=COLOR_WHITE)
            rs = pm.add_run()
            set_run(rs, pd, font_size_pt=10.0, color=COLOR_SAGE)

    # ========================================================
    # SLIDE 07: 3.1 Partner Portal (Native Aspect Image)
    # ========================================================
    s7 = prs.slides.add_slide(blank_layout)
    apply_bg(s7)
    create_header(s7, "3.1 PARTNER ONBOARDING", "Partner Self-Service Portal & 6-Step Wizard", "Accelerating partner onboarding from months to minutes while enforcing strict architectural and security requirements.")

    # Left: 6 Steps
    add_hairline(s7, Inches(0.80), Inches(2.65), Inches(5.40), COLOR_GOLD, 2.0)
    tx_w = s7.shapes.add_textbox(Inches(0.80), Inches(2.78), Inches(5.40), Inches(4.40))
    tf_w = tx_w.text_frame
    tf_w.word_wrap = True
    tf_w.margin_left = tf_w.margin_right = tf_w.margin_top = tf_w.margin_bottom = 0

    p_w = tf_w.paragraphs[0]
    p_w.space_after = Pt(12)
    r_w = p_w.add_run()
    set_run(r_w, "Structured 6-Step Developer Flow", font_size_pt=15.0, bold=True, color=COLOR_GOLD)

    steps = [
        ("01", "Metadata Registration", "Application name, ministry category, localized descriptions, and official icons."),
        ("02", "Integration Tier Selection", "Select architectural tier: WebView, Flutter Module, Native SDK, or Deep Link."),
        ("03", "Repository & Branch Sync", "Configure GitLab/GitHub repository URL, deployment branch, and webhook credentials."),
        ("04", "Capability & Permission Grants", "Request explicit access to native Camera, Location, Storage, and CamDigiKey SSO."),
        ("05", "Endpoint Reachability Probes", "Automated SSRF validation and DNS health probing of partner server endpoints."),
        ("06", "Policy Disclosure & Sign-Off", "Digital legal acceptance of FSA platform guidelines, queuing the submission for review.")
    ]
    for s_num, s_title, s_desc in steps:
        p = tf_w.add_paragraph()
        p.space_after = Pt(1)
        r_n = p.add_run()
        set_run(r_n, f"•  {s_num}  {s_title}: ", font_size_pt=11.0, bold=True, color=COLOR_WHITE)
        r_d = p.add_run()
        set_run(r_d, s_desc, font_size_pt=10.0, color=COLOR_SAGE)

    # Right: Screenshot at True Proportional Dimensions (Full View)
    if os.path.exists(WIZARD_PATH):
        # 2561 x 1398 -> aspect ratio 1.832:1
        img_w = Inches(6.15)
        # Supply ONLY width so python-pptx calculates exact height maintaining aspect ratio
        s7.shapes.add_picture(WIZARD_PATH, Inches(6.45), Inches(2.80), width=img_w)

    # ========================================================
    # SLIDE 08: 3.2 8 Multi-Layered Security Gates
    # ========================================================
    s8 = prs.slides.add_slide(blank_layout)
    apply_bg(s8)
    create_header(s8, "3.2 ENTERPRISE SECURITY", "Multi-Layered Security Pipeline: 8 Pre-Flight Gates", "Continuous automated vulnerability scanning and policy enforcement protecting the super app ecosystem before release.")

    # Left: Gates 1-4
    add_hairline(s8, Inches(0.80), Inches(2.65), Inches(5.60), COLOR_GOLD, 2.0)
    tx_g1 = s8.shapes.add_textbox(Inches(0.80), Inches(2.78), Inches(5.60), Inches(4.40))
    tf_g1 = tx_g1.text_frame
    tf_g1.word_wrap = True
    tf_g1.margin_left = tf_g1.margin_right = tf_g1.margin_top = tf_g1.margin_bottom = 0

    p_g1 = tf_g1.paragraphs[0]
    p_g1.space_after = Pt(12)
    r_g1 = p_g1.add_run()
    set_run(r_g1, "Static Code & Network Scanners   [GATES 01-04]", font_size_pt=14.0, bold=True, color=COLOR_GOLD)

    gates_left = [
        ("Gate 01: SSRF & Network Endpoint Probe", "Validates endpoint reachability, blocks private RFC1918 subnets, and enforces HTTPS."),
        ("Gate 02: Static AST Code Analysis", "Scans source code for unauthorized APIs, hardcoded credentials, and unsafe eval()."),
        ("Gate 03: SBOM & Dependency CVE Audit", "Audits all third-party libraries against national vulnerability registries and copyleft licenses."),
        ("Gate 04: Capability & Manifest Alignment", "Ensures declared mini app permissions strictly match iOS Info.plist & Android manifest entries.")
    ]
    for g_title, g_desc in gates_left:
        p_name = tf_g1.add_paragraph()
        p_name.space_before = Pt(8)
        p_name.space_after = Pt(1)
        r_name = p_name.add_run()
        set_run(r_name, f"•  {g_title} ", font_size_pt=11.5, bold=True, color=COLOR_WHITE)
        r_p = p_name.add_run()
        set_run(r_p, "[PASS]", font_size_pt=10.0, bold=True, color=COLOR_GREEN_PASS, mono=True)
        p_desc = tf_g1.add_paragraph()
        r_desc = p_desc.add_run()
        set_run(r_desc, f"    {g_desc}", font_size_pt=10.0, color=COLOR_SAGE)

    # Right: Gates 5-8
    add_hairline(s8, Inches(6.80), Inches(2.65), Inches(5.60), COLOR_GOLD, 2.0)
    tx_g2 = s8.shapes.add_textbox(Inches(6.80), Inches(2.78), Inches(5.60), Inches(4.40))
    tf_g2 = tx_g2.text_frame
    tf_g2.word_wrap = True
    tf_g2.margin_left = tf_g2.margin_right = tf_g2.margin_top = tf_g2.margin_bottom = 0

    p_g2 = tf_g2.paragraphs[0]
    p_g2.space_after = Pt(12)
    r_g2 = p_g2.add_run()
    set_run(r_g2, "Runtime & Isolation Governance   [GATES 05-08]", font_size_pt=14.0, bold=True, color=COLOR_GOLD)

    gates_right = [
        ("Gate 05: Cryptographic Token Isolation", "Enforces HttpOnly SameSite=Strict cookies; strictly prohibits tokens in localStorage."),
        ("Gate 06: Native MethodChannel Guard", "Validates payload schemas on all Flutter method channels to block injection attacks."),
        ("Gate 07: Content Security Policy Enforcement", "Restricts WebView origins, script sources, and forbids framing by unauthorized domains."),
        ("Gate 08: Immutable Regulatory Audit Log", "Records SHA-256 binary hash, operator approval, and gate logs in tamper-evident database.")
    ]
    for g_title, g_desc in gates_right:
        p_name = tf_g2.add_paragraph()
        p_name.space_before = Pt(8)
        p_name.space_after = Pt(1)
        r_name = p_name.add_run()
        set_run(r_name, f"•  {g_title} ", font_size_pt=11.5, bold=True, color=COLOR_WHITE)
        r_p = p_name.add_run()
        set_run(r_p, "[PASS]", font_size_pt=10.0, bold=True, color=COLOR_GREEN_PASS, mono=True)
        p_desc = tf_g2.add_paragraph()
        r_desc = p_desc.add_run()
        set_run(r_desc, f"    {g_desc}", font_size_pt=10.0, color=COLOR_SAGE)

    # ========================================================
    # SLIDE 09: 4.1 CI/CD (Proportional Flowchart on Left, Takeaways Right)
    # ========================================================
    s9 = prs.slides.add_slide(blank_layout)
    apply_bg(s9)
    create_header(s9, "4.1 CI/CD & NEXUS REGISTRY", "CI/CD Codegen Assembly & Nexus Registry", "Automating compilation, code generation, and package release in an air-gapped, verifiable DevOps pipeline.")

    # Flowchart at exact 16:9 native aspect ratio on Left
    if os.path.exists(FLOWCHART_PATH):
        # 1376 x 768 -> aspect ratio 1.792
        flow_w = Inches(6.20)
        s9.shapes.add_picture(FLOWCHART_PATH, Inches(0.80), Inches(2.70), width=flow_w)

    # 3 Takeaway Cards Stacked Vertically on Right
    add_hairline(s9, Inches(7.30), Inches(2.65), Inches(5.23), COLOR_GOLD, 2.0)
    tx_flow = s9.shapes.add_textbox(Inches(7.30), Inches(2.78), Inches(5.23), Inches(4.30))
    tf_flow = tx_flow.text_frame
    tf_flow.word_wrap = True
    tf_flow.margin_left = tf_flow.margin_right = tf_flow.margin_top = tf_flow.margin_bottom = 0

    takeaways = [
        ("Zero Remote Code Loading", "Strict regulatory policy: zero remote uncompiled Dart/JS loading over the air. All executable code is inspected, compiled, and pinned at build time."),
        ("Nexus Enterprise Registry", "Release bundles are versioned, signed, and hosted within a private Nexus CE repository, guaranteeing package authenticity and tamper evidence."),
        ("Automated Jenkins CI/CD", "Dynamic code generation, symbol obfuscation, ProGuard/R8 shrinking, and signed APK/AAB release generation without manual developer intervention.")
    ]
    for idx, (t_title, t_desc) in enumerate(takeaways):
        p_t = tf_flow.paragraphs[0] if idx == 0 else tf_flow.add_paragraph()
        if idx > 0:
            p_t.space_before = Pt(14)
        p_t.space_after = Pt(2)
        r_t = p_t.add_run()
        set_run(r_t, f"•  {t_title}", font_size_pt=13.0, bold=True, color=COLOR_WHITE)

        p_d = tf_flow.add_paragraph()
        r_d = p_d.add_run()
        set_run(r_d, f"    {t_desc}", font_size_pt=10.5, color=COLOR_SAGE)

    # ========================================================
    # SLIDE 10: 4.2 Dual-Environment QA (Both Images Show FULL Native)
    # ========================================================
    s10 = prs.slides.add_slide(blank_layout)
    apply_bg(s10)
    create_header(s10, "4.2 DUAL-ENVIRONMENT QA", "Dual-Environment Testing & QA Verification", "Combining browser-based emulator agility with physical device hardware verification for zero-defect releases.")

    # Left: Web Sandbox (Desktop 16:9 Landscape)
    add_hairline(s10, Inches(0.80), Inches(2.65), Inches(5.60), COLOR_GOLD, 1.5)
    tx_qa1 = s10.shapes.add_textbox(Inches(0.80), Inches(2.78), Inches(5.60), Inches(0.80))
    tf_qa1 = tx_qa1.text_frame
    tf_qa1.word_wrap = True
    tf_qa1.margin_left = tf_qa1.margin_right = tf_qa1.margin_top = tf_qa1.margin_bottom = 0
    p_q1 = tf_qa1.paragraphs[0]
    p_q1.space_after = Pt(2)
    r_q1 = p_q1.add_run()
    set_run(r_q1, "Environment 1: In-Browser Web Sandbox Preview", font_size_pt=13.5, bold=True, color=COLOR_WHITE)
    p_q1_s = tf_qa1.add_paragraph()
    r_q1_s = p_q1_s.add_run()
    set_run(r_q1_s, "QA teams inspect UI layouts, touch response, and mock bridge APIs directly in Chrome/Edge without physical phones.", font_size_pt=10.5, color=COLOR_SAGE)

    if os.path.exists(SANDBOX_PATH):
        # 2559 x 1396 -> aspect ratio 1.833
        # Specify ONLY width=Inches(5.60) so it computes true height (3.05 inches) without squishing!
        s10.shapes.add_picture(SANDBOX_PATH, Inches(0.80), Inches(3.70), width=Inches(5.60))

    # Right: Physical Device Verification (Phone Portrait at True Aspect Ratio + Checklist)
    add_hairline(s10, Inches(6.80), Inches(2.65), Inches(5.73), COLOR_GOLD, 1.5)
    tx_qa2 = s10.shapes.add_textbox(Inches(6.80), Inches(2.78), Inches(5.73), Inches(0.80))
    tf_qa2 = tx_qa2.text_frame
    tf_qa2.word_wrap = True
    tf_qa2.margin_left = tf_qa2.margin_right = tf_qa2.margin_top = tf_qa2.margin_bottom = 0
    p_q2 = tf_qa2.paragraphs[0]
    p_q2.space_after = Pt(2)
    r_q2 = p_q2.add_run()
    set_run(r_q2, "Environment 2: Physical Device Verification", font_size_pt=13.5, bold=True, color=COLOR_WHITE)
    p_q2_s = tf_qa2.add_paragraph()
    r_q2_s = p_q2_s.add_run()
    set_run(r_q2_s, "Auditors scan dynamic backoffice QR codes to test live biometric scanning and physical performance.", font_size_pt=10.5, color=COLOR_SAGE)

    # Place Phone Image at its exact vertical aspect ratio (height=3.40 in -> width=1.60 in)
    if os.path.exists(MOBILE_PATH):
        s10.shapes.add_picture(MOBILE_PATH, Inches(6.80), Inches(3.70), height=Inches(3.35))

    # Next to phone: Checklist points
    tx_phone_pts = s10.shapes.add_textbox(Inches(8.65), Inches(3.75), Inches(3.88), Inches(3.30))
    tf_phone = tx_phone_pts.text_frame
    tf_phone.word_wrap = True
    tf_phone.margin_left = tf_phone.margin_right = tf_phone.margin_top = tf_phone.margin_bottom = 0

    phone_features = [
        ("Dynamic QR Code Install", "Instant over-the-air test builds on actual hardware."),
        ("Live Biometric Auth", "Tests real fingerprint & face scanners with host bridge."),
        ("Camera & GPS Sensors", "Validates hardware capture and geo-fencing policies."),
        ("Fluid 60fps Experience", "Verifies frame rates, thermal profiles and battery health.")
    ]
    for idx, (p_title, p_desc) in enumerate(phone_features):
        p_pt = tf_phone.paragraphs[0] if idx == 0 else tf_phone.add_paragraph()
        if idx > 0:
            p_pt.space_before = Pt(8)
        p_pt.space_after = Pt(1)
        r_pt = p_pt.add_run()
        set_run(r_pt, f"•  {p_title}", font_size_pt=11.0, bold=True, color=COLOR_WHITE)
        p_pd = tf_phone.add_paragraph()
        r_pd = p_pd.add_run()
        set_run(r_pd, f"    {p_desc}", font_size_pt=9.5, color=COLOR_SAGE)

    # ========================================================
    # SLIDE 11: 4.3 Operational Milestones
    # ========================================================
    s11 = prs.slides.add_slide(blank_layout)
    apply_bg(s11)
    create_header(s11, "4.3 OPERATIONAL STATUS", "Current Platform Milestones & Verification", "Proven technical capabilities operating end-to-end across backend microservices, backoffice portal, and mobile runtime.")

    milestones = [
        ("4 Tiers Fully Verified", "100% OPERATIONAL", [
            ("Comprehensive Verification", "WebView, Flutter Mini App, Native Android SDK, and Deep Link schemes have all completed end-to-end integration testing."),
            ("Bridge Protocol Stability", "JavaScript bridge postMessage and native Flutter MethodChannels operating with sub-millisecond response latency.")
        ], Inches(0.80)),
        ("8-Gate Security Pipeline", "ZERO-TRUST ACTIVE", [
            ("Automated Pre-Flight Audits", "AST code parser, SSRF network probe, and SBOM vulnerability checks fully integrated into backoffice submission queue."),
            ("Zero Hardcoded Capabilities", "Dynamic capability registry synchronized with native iOS Info.plist and AndroidManifest files.")
        ], Inches(4.80)),
        ("Production Stack Ready", "TIER-1 ARCHITECTURE", [
            ("Modular Enterprise Core", "Next.js 16 Backoffice BFF, NestJS Microservices, TypeORM transaction safety, and PostgreSQL containerized."),
            ("Scale-Ready Foundation", "Built according to national regulatory standards to support dozens of ministry mini apps concurrently.")
        ], Inches(8.80))
    ]

    for m_title, m_tag, pts, left in milestones:
        add_hairline(s11, left, Inches(2.65), Inches(3.70), COLOR_GREEN_PASS, 2.0)
        tx = s11.shapes.add_textbox(left, Inches(2.78), Inches(3.70), Inches(4.30))
        tf = tx.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0

        p0 = tf.paragraphs[0]
        p0.space_after = Pt(2)
        r0 = p0.add_run()
        set_run(r0, m_tag, font_size_pt=10.5, bold=True, color=COLOR_GREEN_PASS, mono=True)

        p1 = tf.add_paragraph()
        p1.space_after = Pt(12)
        r1 = p1.add_run()
        set_run(r1, m_title, font_size_pt=16.0, bold=True, color=COLOR_WHITE)

        for pt, pd in pts:
            pm = tf.add_paragraph()
            pm.space_before = Pt(8)
            pm.space_after = Pt(2)
            rm = pm.add_run()
            set_run(rm, f"•  {pt}", font_size_pt=12.0, bold=True, color=COLOR_WHITE)
            ps = tf.add_paragraph()
            rs = ps.add_run()
            set_run(rs, f"    {pd}", font_size_pt=10.5, color=COLOR_SAGE)

    # ========================================================
    # SLIDE 12: 4.4 Strategic Roadmap
    # ========================================================
    s12 = prs.slides.add_slide(blank_layout)
    apply_bg(s12)
    create_header(s12, "4.4 STRATEGIC ROADMAP", "Next Integrations & Strategic Roadmap", "Expanding ecosystem capabilities with national identity, enterprise administration, and automated synchronization.")

    horizons = [
        ("HORIZON 01  •  Q1 2027", "CamDigiKey National SSO", [
            ("Single Digital Citizen Identity", "Seamless integration with Cambodia's national identity authentication system for instant login across all mini apps."),
            ("Biometric Authorization", "Enables citizens to digitally sign financial and administrative documents using verified cryptographic keys.")
        ], Inches(0.80)),
        ("HORIZON 02  •  Q2 2027", "Flagship Enterprise HR App", [
            ("First Internal Ministry Mini App", "Flagship showcase featuring employee profile management, digital attendance tracking, and leave workflow approval."),
            ("Flutter Riverpod Blueprint", "Establishes the gold-standard architectural template for all subsequent enterprise ministry applications.")
        ], Inches(4.80)),
        ("HORIZON 03  •  Q3 2027", "Automated Capability Sync", [
            ("Automated Manifest Discovery", "CI/CD crawler automatically discovers new native iOS/Android capabilities from mobile core and updates the backoffice registry."),
            ("Zero Hardcoded Configuration", "Maintains total zero-hardcode compliance by dynamically generating permission selectors and bridge adapters.")
        ], Inches(8.80))
    ]

    for h_tag, h_title, pts, left in horizons:
        add_hairline(s12, left, Inches(2.65), Inches(3.70), COLOR_GOLD, 2.0)
        tx = s12.shapes.add_textbox(left, Inches(2.78), Inches(3.70), Inches(4.30))
        tf = tx.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0

        p0 = tf.paragraphs[0]
        p0.space_after = Pt(2)
        r0 = p0.add_run()
        set_run(r0, h_tag, font_size_pt=10.5, bold=True, color=COLOR_GOLD, mono=True)

        p1 = tf.add_paragraph()
        p1.space_after = Pt(12)
        r1 = p1.add_run()
        set_run(r1, h_title, font_size_pt=15.0, bold=True, color=COLOR_WHITE)

        for pt, pd in pts:
            pm = tf.add_paragraph()
            pm.space_before = Pt(8)
            pm.space_after = Pt(2)
            rm = pm.add_run()
            set_run(rm, f"•  {pt}", font_size_pt=12.0, bold=True, color=COLOR_WHITE)
            ps = tf.add_paragraph()
            rs = ps.add_run()
            set_run(rs, f"    {pd}", font_size_pt=10.5, color=COLOR_SAGE)

    # ========================================================
    # SLIDE 13: Live Demonstration
    # ========================================================
    s13 = prs.slides.add_slide(blank_layout)
    apply_bg(s13)
    create_header(s13, "SYSTEM DEMO", "Live Platform Demonstration", "Walkthrough of the partner onboarding wizard, automated pre-flight security scan, and live mobile execution.")

    demos = [
        ("STAGE 01", "1. Partner Onboarding", [
            ("Rapid Configuration", "Registering a new ministry service, configuring GitLab repository hooks, and requesting camera and location permissions."),
            ("Live Probing", "Observing real-time SSRF and DNS endpoint validation before saving the partner profile.")
        ], Inches(0.80)),
        ("STAGE 02", "2. Pre-Flight Security", [
            ("Instant Vulnerability Scan", "Executing the 8 security scanners against the partner codebase and generating the executive compliance report."),
            ("Operator Sign-Off", "Regulatory review in the live web sandbox emulator and promoting the build to staging.")
        ], Inches(4.80)),
        ("STAGE 03", "3. Mobile Runtime", [
            ("Seamless Launch", "Scanning the dynamic QR code on a physical mobile device and launching the Flutter mini app with zero perceptible latency."),
            ("Native Bridge Execution", "Testing real camera scanning, biometric authorization, and secure session management.")
        ], Inches(8.80))
    ]

    for d_tag, d_title, pts, left in demos:
        add_hairline(s13, left, Inches(2.65), Inches(3.70), COLOR_GOLD, 2.0)
        tx = s13.shapes.add_textbox(left, Inches(2.78), Inches(3.70), Inches(4.30))
        tf = tx.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0

        p0 = tf.paragraphs[0]
        p0.space_after = Pt(2)
        r0 = p0.add_run()
        set_run(r0, d_tag, font_size_pt=10.5, bold=True, color=COLOR_GOLD, mono=True)

        p1 = tf.add_paragraph()
        p1.space_after = Pt(12)
        r1 = p1.add_run()
        set_run(r1, d_title, font_size_pt=15.0, bold=True, color=COLOR_WHITE)

        for pt, pd in pts:
            pm = tf.add_paragraph()
            pm.space_before = Pt(8)
            pm.space_after = Pt(2)
            rm = pm.add_run()
            set_run(rm, f"•  {pt}", font_size_pt=12.0, bold=True, color=COLOR_WHITE)
            ps = tf.add_paragraph()
            rs = ps.add_run()
            set_run(rs, f"    {pd}", font_size_pt=10.5, color=COLOR_SAGE)

    # ========================================================
    # SLIDE 14: Q&A / Conclusion (Open Executive Layout)
    # ========================================================
    s14 = prs.slides.add_slide(blank_layout)
    apply_bg(s14)

    if os.path.exists(LOGO_PATH):
        s14.shapes.add_picture(LOGO_PATH, Inches(1.00), Inches(1.50), Inches(1.10), Inches(1.10))

    tx14 = s14.shapes.add_textbox(Inches(1.00), Inches(2.90), Inches(11.33), Inches(3.80))
    tf14 = tx14.text_frame
    tf14.word_wrap = True
    tf14.margin_left = tf14.margin_right = tf14.margin_top = tf14.margin_bottom = 0

    p_c_org = tf14.paragraphs[0]
    p_c_org.space_after = Pt(12)
    r_c_org = p_c_org.add_run()
    set_run(r_c_org, "FINTECH CENTER OF GENERAL SECRETARIAT OF FSA", font_size_pt=13.0, bold=True, color=COLOR_GOLD, mono=True)

    p_c_tit = tf14.add_paragraph()
    p_c_tit.space_after = Pt(12)
    r_c_tit = p_c_tit.add_run()
    set_run(r_c_tit, "Super App & Mini App Platform", font_size_pt=42.0, bold=True, color=COLOR_WHITE)

    p_c_sub = tf14.add_paragraph()
    p_c_sub.space_after = Pt(28)
    r_c_sub = p_c_sub.add_run()
    set_run(r_c_sub, "Open for Strategic Guidance, Architectural Questions & Executive Direction", font_size_pt=16.0, color=COLOR_SAGE)

    p_c_pil = tf14.add_paragraph()
    p_c_pil.space_after = Pt(8)
    r_c_pil = p_c_pil.add_run()
    set_run(r_c_pil, "SOVEREIGN SECURITY   •   ARCHITECTURAL AGILITY   •   REGULATORY GOVERNANCE", font_size_pt=13.0, bold=True, color=COLOR_GOLD, mono=True)

    p_c_close = tf14.add_paragraph()
    r_c_close = p_c_close.add_run()
    set_run(r_c_close, "Non-Bank Financial Services Authority (FSA)  •  Core Engineering POC", font_size_pt=11.0, color=COLOR_MUTED)

    add_hairline(s14, Inches(1.00), Inches(5.60), Inches(11.33), COLOR_LINE, 1.0)

    # Save to buffer
    out_stream = io.BytesIO()
    prs.save(out_stream)
    out_data = out_stream.getvalue()

    paths = [
        os.path.join(PROJECT_ROOT, 'slide', 'superapp_presentation.pptx'),
        os.path.join(PROJECT_ROOT, 'docs', 'slide-deck', 'superapp_presentation.pptx')
    ]

    for p in paths:
        try:
            with open(p, 'wb') as f:
                f.write(out_data)
            print(f"Successfully generated clean 14-slide master presentation at: {p}")
        except PermissionError:
            print(f"Warning: Could not write to {p} (locked by an open application).")

if __name__ == '__main__':
    build_presentation()
