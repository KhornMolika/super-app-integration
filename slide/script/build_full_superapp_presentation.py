import io
import os
import shutil
import pptx
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

# FSA Brand Palette
COLOR_WHITE = RGBColor(255, 255, 255)
COLOR_GOLD = RGBColor(248, 209, 97)       # #F8D161
COLOR_GOLD_DARK = RGBColor(230, 167, 28)  # #E6A71C
COLOR_GREEN = RGBColor(212, 229, 156)     # #D4E59C
COLOR_SAGE = RGBColor(158, 187, 163)      # #9EBBA3
COLOR_MUTED = RGBColor(203, 213, 225)     # #CBD5E1
COLOR_RED_TITLE = RGBColor(252, 165, 165) # #FCA5A5
COLOR_RED_BODY = RGBColor(254, 226, 226)  # #FEE2E2
COLOR_GREEN_PASS = RGBColor(74, 222, 128) # #4ADE80

COLOR_CARD_FILL = RGBColor(11, 33, 17)    # #0B2111
COLOR_CARD_LINE = RGBColor(57, 99, 68)    # #396344
COLOR_BADGE_FILL = RGBColor(61, 40, 0)    # #3D2800
COLOR_BADGE_LINE = RGBColor(144, 90, 1)   # #905A01

FONT_FAMILY = "Segoe UI"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))
LOGO_PATH = os.path.join(PROJECT_ROOT, 'slide', 'assets', 'fsa_logo.png')

def set_run(run, text, font_size_pt=11, bold=False, color=COLOR_WHITE):
    run.text = text
    run.font.name = FONT_FAMILY
    run.font.size = Pt(font_size_pt)
    run.font.bold = bold
    run.font.color.rgb = color

def add_standard_header(slide, tag_text, title_text, subtitle_text):
    # 1. Logo
    slide.shapes.add_picture(LOGO_PATH, Inches(0.80), Inches(0.45), Inches(0.48), Inches(0.48))

    # 2. Top Organization Text
    tx_top = slide.shapes.add_textbox(Inches(1.38), Inches(0.48), Inches(8.00), Inches(0.40))
    p_top = tx_top.text_frame.paragraphs[0]
    r_top = p_top.add_run()
    set_run(r_top, "FINTECH CENTER  •  NON-BANK FINANCIAL SERVICES AUTHORITY (FSA)", font_size_pt=10, bold=True, color=COLOR_GOLD)

    # 3. Eyebrow Tag
    tx_tag = slide.shapes.add_textbox(Inches(0.80), Inches(1.15), Inches(11.70), Inches(0.30))
    p_tag = tx_tag.text_frame.paragraphs[0]
    r_tag = p_tag.add_run()
    set_run(r_tag, tag_text, font_size_pt=11, bold=True, color=COLOR_GOLD)

    # 4. Slide Title
    tx_title = slide.shapes.add_textbox(Inches(0.80), Inches(1.45), Inches(11.70), Inches(0.55))
    p_title = tx_title.text_frame.paragraphs[0]
    r_title = p_title.add_run()
    set_run(r_title, title_text, font_size_pt=24, bold=True, color=COLOR_WHITE)

    # 5. Slide Subtitle
    tx_sub = slide.shapes.add_textbox(Inches(0.80), Inches(2.02), Inches(11.70), Inches(0.35))
    p_sub = tx_sub.text_frame.paragraphs[0]
    r_sub = p_sub.add_run()
    set_run(r_sub, subtitle_text, font_size_pt=12.5, bold=False, color=COLOR_SAGE)

    # 6. Green Divider Line
    line = slide.shapes.add_shape(
        pptx.enum.shapes.MSO_SHAPE.RECTANGLE,
        Inches(0.80), Inches(2.38), Inches(11.73), Inches(0.02)
    )
    line.fill.solid()
    line.fill.fore_color.rgb = COLOR_CARD_LINE
    line.line.color.rgb = COLOR_CARD_LINE

def generate_presentation():
    src_pptx = os.path.join(PROJECT_ROOT, 'slide', 'superapp_presentation.pptx')
    with open(src_pptx, 'rb') as f:
        stream = io.BytesIO(f.read())
    prs = pptx.Presentation(stream)

    # ====================================================
    # SLIDE 1: Title & Hero
    # ====================================================
    slide1 = prs.slides[0]
    shape5 = slide1.shapes[5]
    tf1 = shape5.text_frame
    tf1.clear()
    p0 = tf1.paragraphs[0]
    p0.alignment = PP_ALIGN.CENTER
    r0 = p0.add_run()
    set_run(r0, "Enterprise Mobile Container & Partner Integration Gateway", font_size_pt=15.5, bold=True, color=COLOR_GOLD)
    
    p1 = tf1.add_paragraph()
    p1.alignment = PP_ALIGN.CENTER
    p1.space_before = Pt(5)
    r1 = p1.add_run()
    set_run(r1, "• Unified Public Services   • Automated Security Gates   • Sovereign Zero-Touch Release", font_size_pt=11.5, bold=False, color=COLOR_SAGE)

    # ====================================================
    # SLIDE 2: Table of Contents (Hierarchical 4 Topics)
    # ====================================================
    slide2 = prs.slides[1]
    shapes_to_remove = []
    for s_idx in range(6, len(slide2.shapes)):
        shapes_to_remove.append(slide2.shapes[s_idx]._element)
    for el in shapes_to_remove:
        slide2.shapes._spTree.remove(el)

    merged_topics = [
        (
            "01",
            "1. Platform Vision & System Architecture",
            "1.1", "Strategic Vision (The Dilemma & Unified Solution)",
            "1.2", "End-to-End System Architecture (4-Phase Integration Pipeline)",
            Inches(0.85), Inches(2.55)
        ),
        (
            "02",
            "2. Core Features & 4 Integration Tiers",
            "2.1", "4 Flexible Integration Tiers (WebView, Flutter, Native, Deep Link)",
            "2.2", "Platform Core Features (Size Cleaner, Codegen, Dynamic RBAC)",
            Inches(0.85), Inches(4.85)
        ),
        (
            "03",
            "3. Partner Portal & Enterprise Security",
            "3.1", "Partner Self-Service Backoffice & 6-Step Wizard",
            "3.2", "Automated Security Pipeline (8 Pre-Flight Gates & 12 Scanners)",
            Inches(6.85), Inches(2.55)
        ),
        (
            "04",
            "4. CI/CD Assembly, QA & Strategic Roadmap",
            "4.1", "Jenkins Codegen Assembly, Nexus Registry & Dual QA Engine",
            "4.2", "Operational Milestones & Strategic Roadmap (CamDigiKey, HR)",
            Inches(6.85), Inches(4.85)
        )
    ]

    for badge, main_title, s1_num, s1_text, s2_num, s2_text, left, top in merged_topics:
        # Open Clean Editorial Block - ZERO CONTAINERS, ZERO NESTED SHAPES
        tx_box = slide2.shapes.add_textbox(left, top, Inches(5.60), Inches(1.95))
        tf = tx_box.text_frame
        tf.word_wrap = True
        tf.margin_top = Inches(0)
        tf.margin_left = Inches(0)
        tf.margin_right = Inches(0)
        tf.margin_bottom = Inches(0)

        # Topic Header with Large Gold Number (NO enclosing box)
        p0 = tf.paragraphs[0]
        p0.space_after = Pt(10)
        r_num = p0.add_run()
        set_run(r_num, f"{badge}  ", font_size_pt=18.0, bold=True, color=COLOR_GOLD)
        r_title = p0.add_run()
        set_run(r_title, main_title, font_size_pt=15.0, bold=True, color=COLOR_WHITE)

        # Sub 1
        p1 = tf.add_paragraph()
        p1.space_after = Pt(6)
        r1_indent = p1.add_run()
        set_run(r1_indent, "      ", font_size_pt=11.5)
        r1_num = p1.add_run()
        set_run(r1_num, f"{s1_num}  ", font_size_pt=11.5, bold=True, color=COLOR_GOLD)
        r1_txt = p1.add_run()
        set_run(r1_txt, s1_text, font_size_pt=11.0, bold=False, color=COLOR_SAGE)

        # Sub 2
        p2 = tf.add_paragraph()
        p2.space_after = Pt(4)
        r2_indent = p2.add_run()
        set_run(r2_indent, "      ", font_size_pt=11.5)
        r2_num = p2.add_run()
        set_run(r2_num, f"{s2_num}  ", font_size_pt=11.5, bold=True, color=COLOR_GOLD)
        r2_txt = p2.add_run()
        set_run(r2_txt, s2_text, font_size_pt=11.0, bold=False, color=COLOR_SAGE)

        # Delicate thin hairline separator rule below each section (NO container box)
        line = slide2.shapes.add_shape(
            pptx.enum.shapes.MSO_SHAPE.RECTANGLE,
            left, top + Inches(1.82), Inches(5.50), Pt(0.75)
        )
        line.fill.solid()
        line.fill.fore_color.rgb = pptx.dml.color.RGBColor(45, 60, 48)
        line.line.fill.background()

    # ====================================================
    # SLIDE 3: 1.1 Strategic Vision: The Challenge & The Solution
    # ====================================================
    slide3 = prs.slides[2]
    # Update Tag
    slide3.shapes[2].text_frame.clear()
    p_tag3 = slide3.shapes[2].text_frame.paragraphs[0]
    r_tag3 = p_tag3.add_run()
    set_run(r_tag3, "1.1 STRATEGIC VISION", font_size_pt=11.0, bold=True, color=COLOR_GOLD)

    challenges = [
        (8,  "Severe App Fatigue", "Citizens must download dozens of separate standalone government apps"),
        (9,  "Fragmented Security & Identity", "Inconsistent authentication standards and variable privacy compliance"),
        (10, "High Onboarding Overhead", "Manual code reviews, slow releases and duplicated engineering infrastructure"),
        (11, "Heavy Maintenance Burden", "Unstandardized deployment pipelines across multiple public authorities")
    ]
    for s_idx, main_title, sub_desc in challenges:
        sp = slide3.shapes[s_idx]
        tf = sp.text_frame
        tf.clear()
        p0 = tf.paragraphs[0]
        p0.space_after = Pt(2)
        r0 = p0.add_run()
        set_run(r0, f"[RISK]  {main_title}", font_size_pt=12.5, bold=True, color=COLOR_RED_TITLE)
        p1 = tf.add_paragraph()
        r1 = p1.add_run()
        set_run(r1, f"    • {sub_desc}", font_size_pt=10.5, bold=False, color=COLOR_RED_BODY)

    solutions = [
        (14, "Unified Single Container", "High-performance Flutter host dynamically serving on-demand Mini Apps"),
        (15, "Automated Security Pipeline", "Strict network isolation, domain vetting & 8-stage SAST/DAST gates"),
        (16, "Self-Service Backoffice", "Guided 6-step registration, live reachability probes & version governance"),
        (17, "Zero Host Git Mutation", "Dynamic codegen & private Sonatype Nexus CE artifact repository")
    ]
    for s_idx, main_title, sub_desc in solutions:
        sp = slide3.shapes[s_idx]
        tf = sp.text_frame
        tf.clear()
        p0 = tf.paragraphs[0]
        p0.space_after = Pt(2)
        r0 = p0.add_run()
        set_run(r0, f"[SOLUTION]  {main_title}", font_size_pt=12.5, bold=True, color=COLOR_GOLD)
        p1 = tf.add_paragraph()
        r1 = p1.add_run()
        set_run(r1, f"    • {sub_desc}", font_size_pt=10.5, bold=False, color=COLOR_WHITE)

    # ====================================================
    # NEW SLIDE A: 1.2 End-to-End System Architecture
    # ====================================================
    slide_arch = prs.slides.add_slide(prs.slide_layouts[0])
    add_standard_header(
        slide_arch,
        "1.2 SYSTEM ARCHITECTURE",
        "End-to-End Platform Architecture",
        "Decoupled multi-tier infrastructure governing partner ingestion, automated validation, and mobile runtime."
    )

    arch_phases = [
        (
            "Phase 1: Ingestion & Gateway",
            "Developer Portal & API",
            [
                ("Next.js 16 Backoffice", "Guided 6-step wizard with live reachability probes"),
                ("NestJS API Gateway", "JWT auth, RBAC engine & PostgreSQL metadata"),
                ("MinIO Object Storage", "Zero-waste in-memory cleaner (<850KB) & partitioned buckets")
            ],
            COLOR_GOLD,
            Inches(0.80)
        ),
        (
            "Phase 2: Automated Validation",
            "Security & Registry",
            [
                ("Ephemeral CI Agents", "Isolated containerized security scanning workers"),
                ("12 Security Engines", "SHA-256, Gitleaks, SAST, SCA, SBOM & Malware"),
                ("Sonatype Nexus CE", "Private trusted registry (pub-hosted, maven-sdk, cocoapods)")
            ],
            COLOR_GREEN,
            Inches(3.79)
        ),
        (
            "Phase 3: Review & QA Sandbox",
            "Admin Review & Testing",
            [
                ("SA Admin Sign-Off", "Audits reports & approves sensitive change revisions"),
                ("Two-Stage Build", "Compiles lightweight arm64-v8a Stage 1 test APK"),
                ("Dual QA Testing", "In-browser Web Sandbox & physical Android QR install")
            ],
            COLOR_GOLD,
            Inches(6.78)
        ),
        (
            "Phase 4: Mobile Super App",
            "Flutter Client Runtime",
            [
                ("Unified Shell Container", "OneHub UI & Riverpod feature-first architecture"),
                ("FSASuperApp JS Bridge", "Controlled biometric, camera & GPS capability access"),
                ("Strict Sandbox Isolation", "Domain allowlisting, TLS strictness & rejection protocol")
            ],
            COLOR_GREEN,
            Inches(9.77)
        )
    ]

    card_phase_w = Inches(2.76)
    card_phase_h = Inches(4.35)
    card_phase_top = Inches(2.65)

    for p_title, p_badge, points, col_color, left_pos in arch_phases:
        card = slide_arch.shapes.add_shape(
            pptx.enum.shapes.MSO_SHAPE.ROUNDED_RECTANGLE,
            left_pos, card_phase_top, card_phase_w, card_phase_h
        )
        card.fill.solid()
        card.fill.fore_color.rgb = COLOR_CARD_FILL
        card.line.color.rgb = COLOR_BADGE_LINE if col_color == COLOR_GOLD else COLOR_CARD_LINE
        card.line.width = Pt(1.5)

        tf = card.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.14)
        tf.margin_right = Inches(0.14)
        tf.margin_top = Inches(0.18)
        tf.margin_bottom = Inches(0.14)

        # Header title
        p_head = tf.paragraphs[0]
        p_head.space_after = Pt(2)
        r_head = p_head.add_run()
        set_run(r_head, p_title, font_size_pt=12.0, bold=True, color=col_color)

        # Subtitle badge
        p_sub = tf.add_paragraph()
        p_sub.space_after = Pt(12)
        r_sub = p_sub.add_run()
        set_run(r_sub, f"[{p_badge}]", font_size_pt=9.0, bold=True, color=COLOR_SAGE)

        for m_t, s_d in points:
            p_m = tf.add_paragraph()
            p_m.space_before = Pt(8)
            p_m.space_after = Pt(2)
            r_m = p_m.add_run()
            set_run(r_m, f"• {m_t}", font_size_pt=10.5, bold=True, color=COLOR_WHITE)

            p_s = tf.add_paragraph()
            p_s.space_after = Pt(2)
            r_s = p_s.add_run()
            set_run(r_s, f"   – {s_d}", font_size_pt=9.0, bold=False, color=COLOR_MUTED)

    # ====================================================
    # SLIDE 4 -> 2.1 4 Flexible Integration Tiers
    # ====================================================
    slide_tiers = prs.slides[3]
    slide_tiers.shapes[2].text_frame.clear()
    p_tag4 = slide_tiers.shapes[2].text_frame.paragraphs[0]
    r_tag4 = p_tag4.add_run()
    set_run(r_tag4, "2.1 4 FLEXIBLE INTEGRATION TIERS", font_size_pt=11.0, bold=True, color=COLOR_GOLD)

    tiers = [
        (10, [
            ("Sandboxed Web Container", "Runs interactive responsive web apps with zero host modification"),
            ("SuperAppJSBridge", "Controlled, bidirectional access to camera, location & storage APIs")
        ]),
        (15, [
            ("Native In-App Performance", "Fluid 120 FPS transitions with offline caching and shared memory state"),
            ("Dual Distribution Models", "Direct Git repository source OR hosted Dart Pub packages from Nexus CE")
        ]),
        (20, [
            ("Compiled Binary Modules", "Direct support for enterprise Android .aar and iOS .xcframework bundles"),
            ("Automated Native Codegen", "Platform channels and launchers generated automatically without manual edits")
        ]),
        (25, [
            ("OS Scheme Handoff", "Direct URL scheme routing (e.g. cambodia-tax://) to standalone applications"),
            ("Automated Store Fallback", "Intelligent fallback routing to Google Play Store & Apple App Store")
        ])
    ]
    for b_idx, points in tiers:
        sp = slide_tiers.shapes[b_idx]
        tf = sp.text_frame
        tf.clear()
        for p_i, (m_title, s_point) in enumerate(points):
            p_head = tf.paragraphs[0] if p_i == 0 else tf.add_paragraph()
            p_head.space_after = Pt(1)
            if p_i > 0:
                p_head.space_before = Pt(4)
            r_head = p_head.add_run()
            set_run(r_head, f"• {m_title}", font_size_pt=11.5, bold=True, color=COLOR_GOLD)
            p_sub = tf.add_paragraph()
            p_sub.space_after = Pt(0)
            r_sub = p_sub.add_run()
            set_run(r_sub, f"   – {s_point}", font_size_pt=10.0, bold=False, color=COLOR_MUTED)

    # ====================================================
    # NEW SLIDE B: 2.2 Platform Core Features
    # ====================================================
    slide_features = prs.slides.add_slide(prs.slide_layouts[0])
    add_standard_header(
        slide_features,
        "2.2 PLATFORM CAPABILITIES",
        "Core Platform Features",
        "Six foundational architectural capabilities powering a secure, sovereign Mini App ecosystem."
    )

    core_features = [
        # (title, [ (main, sub), ... ], color, left, top)
        (
            "1. 4 Integration Tiers",
            [
                ("Multi-Stack Support", "WebView, Flutter package, Native SDK & Deep Link"),
                ("Zero Host Mutation", "Extends app dynamically without editing core Git")
            ],
            COLOR_GOLD, Inches(0.80), Inches(2.65)
        ),
        (
            "2. Two-Tier Size Cleaner",
            [
                ("99.7% Size Reduction", "Strips build caches, shrinking 300+MB zips to <850KB"),
                ("10x Faster CI", "Scans pure sanitized source in isolated workers")
            ],
            COLOR_GREEN, Inches(4.84), Inches(2.65)
        ),
        (
            "3. 12-Engine Security Pipeline",
            [
                ("Dual Profiles", "8 Package (SAST/SBOM) + 4 Web (SSRF/DAST) scanners"),
                ("Capability Gatekeeper", "Enforces strict native hardware API boundary allowlists")
            ],
            COLOR_GOLD, Inches(8.88), Inches(2.65)
        ),
        (
            "4. Two-Stage Mobile Builds",
            [
                ("Stage 1 Fast QA", "Lightweight arm64-v8a APK (25-35MB) for Web/QR testing"),
                ("Stage 2 Official Prod", "Signed release APK/AAB bundling TEST_PASSED apps")
            ],
            COLOR_GREEN, Inches(0.80), Inches(4.90)
        ),
        (
            "5. Capability Codegen Engine",
            [
                ("Marker Injection", "Auto-generates Android/iOS platform channels & glue code"),
                ("Automated GitLab MRs", "Cuts feature branches with pinned audited plugins")
            ],
            COLOR_GOLD, Inches(4.84), Inches(4.90)
        ),
        (
            "6. Backoffice & RBAC Matrix",
            [
                ("4-Role Governance", "SUPER_ADMIN, SA Admin, MA Developer & Developer"),
                ("Revision Review Modal", "Side-by-side JSON diffs for sensitive parameter changes")
            ],
            COLOR_GREEN, Inches(8.88), Inches(4.90)
        )
    ]

    card_feat_w = Inches(3.65)
    card_feat_h = Inches(2.05)

    for f_title, f_points, f_col, f_left, f_top in core_features:
        card = slide_features.shapes.add_shape(
            pptx.enum.shapes.MSO_SHAPE.ROUNDED_RECTANGLE,
            f_left, f_top, card_feat_w, card_feat_h
        )
        card.fill.solid()
        card.fill.fore_color.rgb = COLOR_CARD_FILL
        card.line.color.rgb = COLOR_BADGE_LINE if f_col == COLOR_GOLD else COLOR_CARD_LINE
        card.line.width = Pt(1.5)

        tf = card.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.18)
        tf.margin_right = Inches(0.18)
        tf.margin_top = Inches(0.16)
        tf.margin_bottom = Inches(0.14)

        p0 = tf.paragraphs[0]
        p0.space_after = Pt(4)
        r0 = p0.add_run()
        set_run(r0, f_title, font_size_pt=12.5, bold=True, color=f_col)

        for m_t, s_d in f_points:
            p_m = tf.add_paragraph()
            p_m.space_before = Pt(3)
            p_m.space_after = Pt(1)
            r_m = p_m.add_run()
            set_run(r_m, f"• {m_t}: ", font_size_pt=9.5, bold=True, color=COLOR_WHITE)
            r_s = p_m.add_run()
            set_run(r_s, s_d, font_size_pt=9.0, bold=False, color=COLOR_MUTED)

    # ====================================================
    # SLIDE 5: 3.1 Partner Self-Service & Developer Portal
    # ====================================================
    slide_portal = prs.slides[4]
    slide_portal.shapes[2].text_frame.clear()
    p_tag5 = slide_portal.shapes[2].text_frame.paragraphs[0]
    r_tag5 = p_tag5.add_run()
    set_run(r_tag5, "3.1 PARTNER SELF-SERVICE PORTAL", font_size_pt=11.0, bold=True, color=COLOR_GOLD)

    portal_points = [
        (7, [
            ("Guided Registration Wizard", "Step-by-step metadata, branding identity & ownership capture"),
            ("Endpoint Governance", "Standardized declaration of production APIs and callback routes")
        ]),
        (9, [
            ("Real-Time Reachability Probes", "Debounced HTTP & TCP socket probes directly during data entry"),
            ("Zero Broken Endpoints", "Pre-validates live privacy policy links and store fallbacks")
        ]),
        (11, [
            ("Flexible Disclosures", "Live HTTPS regulatory URLs or self-contained offline Markdown"),
            ("Compliance Standards", "Built-in legal disclosure templates for accelerated approval")
        ])
    ]
    for s_idx, pts in portal_points:
        sp = slide_portal.shapes[s_idx]
        tf = sp.text_frame
        tf.clear()
        for p_i, (m_title, s_point) in enumerate(pts):
            p_head = tf.paragraphs[0] if p_i == 0 else tf.add_paragraph()
            p_head.space_after = Pt(1)
            if p_i > 0:
                p_head.space_before = Pt(4)
            r_head = p_head.add_run()
            set_run(r_head, f"• {m_title}", font_size_pt=10.5, bold=True, color=COLOR_WHITE)
            p_sub = tf.add_paragraph()
            r_sub = p_sub.add_run()
            set_run(r_sub, f"   – {s_point}", font_size_pt=9.5, bold=False, color=COLOR_SAGE)

    # ====================================================
    # SLIDE 6: 3.2 8 Automated Security Scanners & Gates
    # ====================================================
    slide_sec = prs.slides[5]
    slide_sec.shapes[2].text_frame.clear()
    p_tag6 = slide_sec.shapes[2].text_frame.paragraphs[0]
    r_tag6 = p_tag6.add_run()
    set_run(r_tag6, "3.2 8 MULTI-LAYERED SECURITY GATES", font_size_pt=11.0, bold=True, color=COLOR_GOLD)

    gates = [
        (6,  "01. Cryptographic SHA-256", "Package checksum & tamper verification"),
        (7,  "02. Gitleaks Secret Detector", "Scans for leaked API keys, tokens & certs"),
        (8,  "03. Semgrep & AST Guard (SAST)", "Static AST inspection for unsafe native calls"),
        (9,  "04. Trivy & OSV Database (SCA)", "Third-party CVE audit against national database"),
        (10, "05. Super App Gatekeeper", "Strict camera, location & biometric boundaries"),
        (11, "06. Syft CycloneDX (SBOM)", "Signed dependency manifest generation"),
        (12, "07. License Compliance Scanner", "Detection of restricted copyleft/GPL licenses"),
        (13, "08. ClamAV & YARA Malware Scan", "Signature & heuristic binary threat scan")
    ]
    for s_idx, title, sub_desc in gates:
        sp = slide_sec.shapes[s_idx]
        tf = sp.text_frame
        tf.margin_top = Inches(0.02)
        tf.margin_bottom = Inches(0.02)
        tf.margin_left = Inches(0.05)
        tf.margin_right = Inches(0.05)
        tf.clear()
        p0 = tf.paragraphs[0]
        p0.space_after = Pt(1)
        r0 = p0.add_run()
        set_run(r0, f"{title} ", font_size_pt=11.0, bold=True, color=COLOR_GOLD if s_idx % 2 == 1 else COLOR_GREEN)
        r_pass = p0.add_run()
        set_run(r_pass, "[PASS]", font_size_pt=9.5, bold=True, color=COLOR_GREEN_PASS)
        p1 = tf.add_paragraph()
        r1 = p1.add_run()
        set_run(r1, f"   – {sub_desc}", font_size_pt=9.0, bold=False, color=COLOR_SAGE)

    # ====================================================
    # SLIDE 7: 4.1 CI/CD Codegen & Nexus CE Registry
    # ====================================================
    slide_flow = prs.slides[6]
    slide_flow.shapes[2].text_frame.clear()
    p_tag7 = slide_flow.shapes[2].text_frame.paragraphs[0]
    r_tag7 = p_tag7.add_run()
    set_run(r_tag7, "4.1 CI/CD CODEGEN & NEXUS REGISTRY", font_size_pt=11.0, bold=True, color=COLOR_GOLD)

    card_width = Inches(3.65)
    card_height = Inches(1.65)
    card_top = Inches(5.35)

    flow_cards = [
        (Inches(0.80), "1. Dynamic Codegen Engine", [
            ("Automated Glue-Code", "Generates platform channels & launchers dynamically"),
            ("Sovereign Host Repository", "Core Flutter Super App codebase remains untouched")
        ], COLOR_GOLD),
        (Inches(4.84), "2. Private Nexus CE Registry", [
            ("Secure Artifact Storage", "Internal proxy for Dart packages & compiled binaries"),
            ("Release Immutability", "Cryptographically signed releases prevent tampering")
        ], COLOR_GREEN),
        (Inches(8.88), "3. Two-Stage Build Assembly", [
            ("Stage 1: Web Sandbox QA", "Instant test container assembly for browser verification"),
            ("Stage 2: Production APK", "Signed, ProGuard-minified builds ready for store release")
        ], COLOR_GOLD)
    ]
    for left_pos, title, subs, color in flow_cards:
        bg_card = slide_flow.shapes.add_shape(
            pptx.enum.shapes.MSO_SHAPE.ROUNDED_RECTANGLE,
            left_pos, card_top, card_width, card_height
        )
        bg_card.fill.solid()
        bg_card.fill.fore_color.rgb = COLOR_CARD_FILL
        bg_card.line.color.rgb = COLOR_BADGE_LINE if color == COLOR_GOLD else COLOR_CARD_LINE
        bg_card.line.width = Pt(1.2)

        tf = bg_card.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.15)
        tf.margin_top = Inches(0.10)
        tf.margin_right = Inches(0.15)
        tf.margin_bottom = Inches(0.10)

        p0 = tf.paragraphs[0]
        p0.space_after = Pt(4)
        r0 = p0.add_run()
        set_run(r0, title, font_size_pt=11.5, bold=True, color=color)

        for m_t, s_d in subs:
            p_m = tf.add_paragraph()
            p_m.space_after = Pt(0)
            p_m.space_before = Pt(2)
            r_m = p_m.add_run()
            set_run(r_m, f"• {m_t}: ", font_size_pt=9.5, bold=True, color=COLOR_WHITE)
            r_s = p_m.add_run()
            set_run(r_s, s_d, font_size_pt=9.0, bold=False, color=COLOR_MUTED)

    # ====================================================
    # SLIDE 8: 4.2 Dual-Environment Testing & QA Engine
    # ====================================================
    slide_qa = prs.slides[7]
    slide_qa.shapes[2].text_frame.clear()
    p_tag8 = slide_qa.shapes[2].text_frame.paragraphs[0]
    r_tag8 = p_tag8.add_run()
    set_run(r_tag8, "4.2 DUAL-ENVIRONMENT TESTING & QA", font_size_pt=11.0, bold=True, color=COLOR_GOLD)

    sp_web = slide_qa.shapes[8]
    sp_web.left = Inches(0.80)
    sp_web.width = Inches(7.04)
    tf_web = sp_web.text_frame
    tf_web.clear()
    p0 = tf_web.paragraphs[0]
    p0.space_after = Pt(2)
    r0 = p0.add_run()
    set_run(r0, "1. In-Browser Web Sandbox Preview", font_size_pt=12.5, bold=True, color=COLOR_GOLD)
    p1 = tf_web.add_paragraph()
    r1 = p1.add_run()
    set_run(r1, "• Real-time Flutter Web canvas with bidirectional JSBridge inspector", font_size_pt=10.0, bold=False, color=COLOR_SAGE)

    sp_mob = slide_qa.shapes[9]
    sp_mob.left = Inches(8.50)
    sp_mob.width = Inches(4.00)
    tf_mob = sp_mob.text_frame
    tf_mob.clear()
    p0 = tf_mob.paragraphs[0]
    p0.space_after = Pt(2)
    r0 = p0.add_run()
    set_run(r0, "2. Physical Mobile QA", font_size_pt=12.5, bold=True, color=COLOR_GREEN)
    p1 = tf_mob.add_paragraph()
    r1 = p1.add_run()
    set_run(r1, "• Dynamic QR code for instant install on real Android devices", font_size_pt=10.0, bold=False, color=COLOR_SAGE)

    # ====================================================
    # SLIDE 9: 4.3 Current Milestones & Operational Status
    # ====================================================
    slide_miles = prs.slides[8]
    slide_miles.shapes[2].text_frame.clear()
    p_tag9 = slide_miles.shapes[2].text_frame.paragraphs[0]
    r_tag9 = p_tag9.add_run()
    set_run(r_tag9, "4.3 CURRENT OPERATIONAL MILESTONES", font_size_pt=11.0, bold=True, color=COLOR_GOLD)

    milestone_points = [
        (7, [
            ("Full Integration Matrix", "WebView, Flutter, Native SDK & Deep Link verified end-to-end"),
            ("Sample Apps Validated", "Live tests with Trust Regulator, E-Tax and Lotus Spa services")
        ]),
        (9, [
            ("Automated Pipeline", "Jenkins orchestrates test sandboxes & production release APKs"),
            ("Nexus CE Operational", "Private, immutable artifact storage for scanned Dart packages")
        ]),
        (11, [
            ("Unified Backend Stack", "NestJS modular API, PostgreSQL schema & TypeORM transactions"),
            ("High-Reliability Infra", "Dockerized services, MinIO object storage & Socket.IO real-time")
        ])
    ]
    for s_idx, pts in milestone_points:
        sp = slide_miles.shapes[s_idx]
        tf = sp.text_frame
        tf.clear()
        for p_i, (m_title, s_point) in enumerate(pts):
            p_head = tf.paragraphs[0] if p_i == 0 else tf.add_paragraph()
            p_head.space_after = Pt(1)
            if p_i > 0:
                p_head.space_before = Pt(4)
            r_head = p_head.add_run()
            set_run(r_head, f"• {m_title}", font_size_pt=10.5, bold=True, color=COLOR_WHITE)
            p_sub = tf.add_paragraph()
            r_sub = p_sub.add_run()
            set_run(r_sub, f"   – {s_point}", font_size_pt=9.5, bold=False, color=COLOR_SAGE)

    # ====================================================
    # SLIDE 10: 4.4 Strategic Roadmap: Next Integrations
    # ====================================================
    slide_road = prs.slides[9]
    slide_road.shapes[4].text_frame.clear()
    p_tag10 = slide_road.shapes[4].text_frame.paragraphs[0]
    r_tag10 = p_tag10.add_run()
    set_run(r_tag10, "4.4 STRATEGIC ROADMAP: NEXT INTEGRATIONS", font_size_pt=11.0, bold=True, color=COLOR_GOLD)

    shapes_to_rm = []
    for s_idx in [0, 1, 8, 9, 10, 11]:
        shapes_to_rm.append(slide_road.shapes[s_idx]._element)
    for el in shapes_to_rm:
        slide_road.shapes._spTree.remove(el)

    card_width = Inches(3.65)
    card_height = Inches(4.35)
    card_top = Inches(2.65)

    roadmap_cards = [
        (Inches(0.80), "01. CamDigiKey Integration", [
            ("National Citizen SSO", "Unified single sign-on across all ecosystem digital public services"),
            ("Biometric & eKYC", "Instant citizen profile verification without repetitive credential entry"),
            ("Identity Delegation", "Seamless authentication handoff to all on-demand Mini Apps")
        ], COLOR_GOLD),
        (Inches(4.84), "02. HR Enterprise Mini App", [
            ("Biometric Check-In", "Geo-fenced mobile staff attendance tracking with real-time verification"),
            ("Staff Self-Service", "Direct digital leave requests, approvals and payslip downloads"),
            ("Internal Flagship", "Demonstrates deep enterprise security and native Flutter performance")
        ], COLOR_GREEN),
        (Inches(8.88), "03. Capability Synchronizer", [
            ("Automated Scaffolding", "1-click generation of Flutter platform channels & JSBridge stubs"),
            ("Standardized Contracts", "Guarantees zero architectural drift between host and partner apps"),
            ("Rapid Onboarding", "Cuts new partner integration cycle from several weeks down to hours")
        ], COLOR_GOLD)
    ]

    for left_pos, title, pts, color in roadmap_cards:
        card = slide_road.shapes.add_shape(
            pptx.enum.shapes.MSO_SHAPE.ROUNDED_RECTANGLE,
            left_pos, card_top, card_width, card_height
        )
        card.fill.solid()
        card.fill.fore_color.rgb = COLOR_CARD_FILL
        card.line.color.rgb = COLOR_BADGE_LINE if color == COLOR_GOLD else COLOR_CARD_LINE
        card.line.width = Pt(1.5)

        tf = card.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.20)
        tf.margin_top = Inches(0.25)
        tf.margin_right = Inches(0.20)

        p0 = tf.paragraphs[0]
        p0.space_after = Pt(14)
        r0 = p0.add_run()
        set_run(r0, title, font_size_pt=14.0, bold=True, color=color)

        for m_title, s_desc in pts:
            p_m = tf.add_paragraph()
            p_m.space_after = Pt(2)
            p_m.space_before = Pt(8)
            r_m = p_m.add_run()
            set_run(r_m, f"• {m_title}", font_size_pt=11.5, bold=True, color=COLOR_WHITE)
            p_s = tf.add_paragraph()
            p_s.space_after = Pt(2)
            r_s = p_s.add_run()
            set_run(r_s, f"   – {s_desc}", font_size_pt=10.0, bold=False, color=COLOR_SAGE)

    # ====================================================
    # SLIDE 11: DEMO Slide
    # ====================================================
    slide_demo = prs.slides[10]
    demo_box = slide_demo.shapes.add_shape(
        pptx.enum.shapes.MSO_SHAPE.ROUNDED_RECTANGLE,
        Inches(2.50), Inches(4.15), Inches(8.33), Inches(1.35)
    )
    demo_box.fill.solid()
    demo_box.fill.fore_color.rgb = COLOR_CARD_FILL
    demo_box.line.color.rgb = COLOR_CARD_LINE
    demo_box.line.width = Pt(1)

    tf_demo = demo_box.text_frame
    tf_demo.word_wrap = True
    tf_demo.margin_top = Inches(0.15)
    p0 = tf_demo.paragraphs[0]
    p0.alignment = PP_ALIGN.CENTER
    r0 = p0.add_run()
    set_run(r0, "1. Partner Backoffice Wizard   •   2. In-Browser Web Sandbox QA", font_size_pt=12.5, bold=True, color=COLOR_GOLD)
    p1 = tf_demo.add_paragraph()
    p1.alignment = PP_ALIGN.CENTER
    p1.space_before = Pt(6)
    r1 = p1.add_run()
    set_run(r1, "3. Physical Android QR Launch   •   4. Automated 8-Gate Security Pipeline", font_size_pt=12.5, bold=True, color=COLOR_GREEN)

    # ====================================================
    # SLIDE 12: Q&A / CONCLUSION Slide
    # ====================================================
    slide_end = prs.slides[11]
    sp12 = slide_end.shapes[5]
    tf12 = sp12.text_frame
    tf12.clear()
    p0 = tf12.paragraphs[0]
    p0.alignment = PP_ALIGN.CENTER
    r0 = p0.add_run()
    set_run(r0, "A Scalable, Sovereign Foundation for National Digital Public Services", font_size_pt=15.0, bold=True, color=COLOR_GOLD)
    p1 = tf12.add_paragraph()
    p1.alignment = PP_ALIGN.CENTER
    p1.space_before = Pt(4)
    r1 = p1.add_run()
    set_run(r1, "• Unified Container Architecture   • 8 Automated Security Gates   • 4 Flexible Integration Tiers", font_size_pt=11.5, bold=False, color=COLOR_SAGE)

    # ====================================================
    # REORDER SLIDES TO FINAL 14-SLIDE PRESENTATION FLOW
    # ====================================================
    # Currently:
    # 0: Hero
    # 1: Agenda
    # 2: 1.1 Strategic Vision
    # 3: 2.1 4 Integration Tiers
    # 4: 3.1 Partner Portal
    # 5: 3.2 8 Security Gates
    # 6: 4.1 CI/CD Codegen & Nexus
    # 7: 4.2 Dual QA Testing
    # 8: 4.3 Milestones
    # 9: 4.4 Roadmap
    # 10: Demo
    # 11: Conclusion
    # 12: slide_arch (New Slide A)
    # 13: slide_features (New Slide B)

    sldIdLst = prs.slides._sldIdLst

    # Insert slide_arch at index 3 (becomes Slide 4, right after 1.1 Strategic Vision)
    elem_arch = sldIdLst[12]
    sldIdLst.insert(3, elem_arch)

    # Now slide_features is at index 13.
    # Insert slide_features at index 5 (becomes Slide 6, right after 2.1 4 Integration Tiers)
    elem_features = sldIdLst[13]
    sldIdLst.insert(5, elem_features)

    print(f"Total slides in presentation: {len(prs.slides)}")

    # ====================================================
    # SAVE PRESENTATION
    # ====================================================
    out_stream = io.BytesIO()
    prs.save(out_stream)
    out_data = out_stream.getvalue()

    dest_updated = os.path.join(PROJECT_ROOT, 'slide', 'superapp_presentation_updated.pptx')
    try:
        with open(dest_updated, 'wb') as f:
            f.write(out_data)
        print(f"Saved complete 14-slide master presentation to: {dest_updated}")
    except PermissionError:
        print(f"Note: {dest_updated} is currently open in PowerPoint.")

    dest_main = os.path.join(PROJECT_ROOT, 'slide', 'superapp_presentation.pptx')
    try:
        with open(dest_main, 'wb') as f:
            f.write(out_data)
        print(f"Also successfully overwritten main presentation: {dest_main}")
    except PermissionError:
        print(f"Note: {dest_main} is currently open in PowerPoint.")

if __name__ == '__main__':
    generate_presentation()
