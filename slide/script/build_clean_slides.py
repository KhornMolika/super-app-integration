import io
import os
import shutil
import pptx
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

# Theme Colors (FSA Green & Gold palette)
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

def set_run(run, text, font_size_pt=11, bold=False, color=COLOR_WHITE):
    run.text = text
    run.font.name = FONT_FAMILY
    run.font.size = Pt(font_size_pt)
    run.font.bold = bold
    run.font.color.rgb = color

def update_presentation():
    os.makedirs(os.path.join(PROJECT_ROOT, 'slide'), exist_ok=True)
    src_pptx = os.path.join(PROJECT_ROOT, 'docs', 'slide-deck', 'superapp_presentation.pptx')
    dest_pptx = os.path.join(PROJECT_ROOT, 'slide', 'superapp_presentation.pptx')
    updated_pptx = os.path.join(PROJECT_ROOT, 'slide', 'superapp_presentation_updated.pptx')
    
    with open(src_pptx, 'rb') as f:
        stream = io.BytesIO(f.read())
        
    prs = pptx.Presentation(stream)
    
    # ----------------------------------------------------
    # SLIDE 1: Title & Hero
    # ----------------------------------------------------
    slide1 = prs.slides[0]
    shape5 = slide1.shapes[5]
    tf = shape5.text_frame
    tf.clear()
    p0 = tf.paragraphs[0]
    p0.alignment = PP_ALIGN.CENTER
    r0 = p0.add_run()
    set_run(r0, "Enterprise Mobile Container & Partner Integration Gateway", font_size_pt=15.5, bold=True, color=COLOR_GOLD)
    
    p1 = tf.add_paragraph()
    p1.alignment = PP_ALIGN.CENTER
    p1.space_before = Pt(5)
    r1 = p1.add_run()
    set_run(r1, "• Unified Public Services   • Automated Security Gates   • Sovereign Zero-Touch Release", font_size_pt=11.5, bold=False, color=COLOR_SAGE)

    # ----------------------------------------------------
    # SLIDE 2: Table of Contents (Merged into 4 High-Level Topics: 1., 1.1, 1.2...)
    # ----------------------------------------------------
    slide2 = prs.slides[1]
    shapes_to_remove = []
    for s_idx in range(6, len(slide2.shapes)):
        shapes_to_remove.append(slide2.shapes[s_idx]._element)
    for el in shapes_to_remove:
        slide2.shapes._spTree.remove(el)
        
    merged_topics = [
        (
            "01",
            "1. Platform Vision & Architecture",
            "1.1", "The Challenge of Fragmentation vs. Unified Super App",
            "1.2", "4 Flexible Integration Tiers (WebView, Flutter, Native, Deep Link)",
            Inches(0.80), Inches(2.60)
        ),
        (
            "02",
            "2. Partner Portal & Developer Experience",
            "2.1", "Guided 6-Step Onboarding Wizard & Credential Governance",
            "2.2", "Live URL Reachability Probes & Standardized Disclosures",
            Inches(0.80), Inches(4.88)
        ),
        (
            "03",
            "3. Enterprise Security & CI/CD Assembly",
            "3.1", "8 Multi-Stage Automated Pre-Flight Security Gates",
            "3.2", "Jenkins CI/CD Codegen & Sonatype Nexus CE Registry",
            Inches(6.80), Inches(2.60)
        ),
        (
            "04",
            "4. QA Testing, Milestones & Strategic Roadmap",
            "4.1", "Dual-Environment QA Engine (Web Sandbox + Mobile Device)",
            "4.2", "Verified Milestones (90%) & Future Roadmap (CamDigiKey, HR)",
            Inches(6.80), Inches(4.88)
        )
    ]
    
    card_w = Inches(5.75)
    card_h = Inches(2.05)
    badge_w = Inches(0.70)
    badge_h = Inches(0.56)
    
    for badge, main_title, s1_num, s1_text, s2_num, s2_text, left, top in merged_topics:
        card = slide2.shapes.add_shape(
            pptx.enum.shapes.MSO_SHAPE.ROUNDED_RECTANGLE,
            left, top, card_w, card_h
        )
        card.fill.solid()
        card.fill.fore_color.rgb = COLOR_CARD_FILL
        card.line.color.rgb = COLOR_CARD_LINE
        card.line.width = Pt(1.5)
        
        badge_shape = slide2.shapes.add_shape(
            pptx.enum.shapes.MSO_SHAPE.ROUNDED_RECTANGLE,
            left + Inches(0.18), top + Inches(0.20), badge_w, badge_h
        )
        badge_shape.fill.solid()
        badge_shape.fill.fore_color.rgb = COLOR_BADGE_FILL
        badge_shape.line.color.rgb = COLOR_BADGE_LINE
        badge_shape.line.width = Pt(1)
        
        tf_b = badge_shape.text_frame
        tf_b.margin_top = Inches(0.08)
        tf_b.margin_bottom = Inches(0.08)
        tf_b.margin_left = Inches(0.05)
        tf_b.margin_right = Inches(0.05)
        p_b = tf_b.paragraphs[0]
        p_b.alignment = PP_ALIGN.CENTER
        r_b = p_b.add_run()
        set_run(r_b, badge, font_size_pt=15.0, bold=True, color=COLOR_GOLD)
        
        tx_box = slide2.shapes.add_textbox(left + Inches(1.02), top + Inches(0.14), Inches(4.55), Inches(1.78))
        tf = tx_box.text_frame
        tf.word_wrap = True
        tf.margin_top = Inches(0.02)
        tf.margin_left = Inches(0.05)
        tf.margin_right = Inches(0.05)
        tf.margin_bottom = Inches(0.02)
        
        p0 = tf.paragraphs[0]
        p0.space_after = Pt(7)
        r0 = p0.add_run()
        set_run(r0, main_title, font_size_pt=13.0, bold=True, color=COLOR_WHITE)
        
        p1 = tf.add_paragraph()
        p1.space_after = Pt(4)
        r1_num = p1.add_run()
        set_run(r1_num, f"{s1_num}  ", font_size_pt=10.5, bold=True, color=COLOR_GOLD)
        r1_txt = p1.add_run()
        set_run(r1_txt, s1_text, font_size_pt=10.0, bold=False, color=COLOR_SAGE)
        
        p2 = tf.add_paragraph()
        p2.space_after = Pt(0)
        r2_num = p2.add_run()
        set_run(r2_num, f"{s2_num}  ", font_size_pt=10.5, bold=True, color=COLOR_GOLD)
        r2_txt = p2.add_run()
        set_run(r2_txt, s2_text, font_size_pt=10.0, bold=False, color=COLOR_SAGE)

    # ----------------------------------------------------
    # ALIGN SECTION TAGS / EYEBROWS ON SUBSEQUENT SLIDES
    # ----------------------------------------------------
    slide_tags = [
        (2, 2, "1.1 STRATEGIC VISION"),
        (3, 2, "1.2 4 FLEXIBLE INTEGRATION TIERS"),
        (4, 2, "2.1 PARTNER SELF-SERVICE PORTAL"),
        (5, 2, "3.1 8 MULTI-LAYERED SECURITY GATES"),
        (6, 2, "3.2 CI/CD CODEGEN & NEXUS REGISTRY"),
        (7, 2, "4.1 DUAL-ENVIRONMENT TESTING & QA"),
        (8, 2, "4.2 CURRENT OPERATIONAL MILESTONES"),
        (9, 2, "4.3 STRATEGIC ROADMAP: NEXT INTEGRATIONS")
    ]
    for s_idx, shape_idx, new_tag in slide_tags:
        slide = prs.slides[s_idx]
        sp = slide.shapes[shape_idx]
        if sp.has_text_frame and len(sp.text_frame.paragraphs) > 0:
            sp.text_frame.clear()
            p = sp.text_frame.paragraphs[0]
            r = p.add_run()
            set_run(r, new_tag, font_size_pt=11.0, bold=True, color=COLOR_GOLD)

    # ----------------------------------------------------
    # SLIDE 3: The Challenge & The Solution
    # ----------------------------------------------------
    slide3 = prs.slides[2]
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

    # ----------------------------------------------------
    # SLIDE 4: 4 Flexible Integration Tiers
    # ----------------------------------------------------
    slide4 = prs.slides[3]
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
        sp = slide4.shapes[b_idx]
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

    # ----------------------------------------------------
    # SLIDE 5: Partner Self-Service & Developer Portal
    # ----------------------------------------------------
    slide5 = prs.slides[4]
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
        sp = slide5.shapes[s_idx]
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

    # ----------------------------------------------------
    # SLIDE 6: 8 Automated Security Scanners & Gates
    # ----------------------------------------------------
    slide6 = prs.slides[5]
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
        sp = slide6.shapes[s_idx]
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

    # ----------------------------------------------------
    # SLIDE 7: Security Scan Flow / Automated Assembly
    # ----------------------------------------------------
    slide7 = prs.slides[6]
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
        bg_card = slide7.shapes.add_shape(
            pptx.enum.shapes.MSO_SHAPE.ROUNDED_RECTANGLE,
            left_pos, card_top, card_width, card_height
        )
        bg_card.fill.solid()
        bg_card.fill.fore_color.rgb = RGBColor(10, 28, 14)
        bg_card.line.color.rgb = RGBColor(180, 115, 1) if color == COLOR_GOLD else RGBColor(57, 99, 68)
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

    # ----------------------------------------------------
    # SLIDE 8: Dual-Environment Testing & QA Engine
    # ----------------------------------------------------
    slide8 = prs.slides[7]
    sp_web = slide8.shapes[8]
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
    
    sp_mob = slide8.shapes[9]
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

    # ----------------------------------------------------
    # SLIDE 9: Current Milestones & Operational Status
    # ----------------------------------------------------
    slide9 = prs.slides[8]
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
        sp = slide9.shapes[s_idx]
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

    # ----------------------------------------------------
    # SLIDE 10: Strategic Roadmap / Next Integrations
    # ----------------------------------------------------
    slide10 = prs.slides[9]
    shapes_to_remove = []
    for s_idx in [0, 1, 8, 9, 10, 11]:
        shapes_to_remove.append(slide10.shapes[s_idx]._element)
    for el in shapes_to_remove:
        slide10.shapes._spTree.remove(el)
    
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
        card = slide10.shapes.add_shape(
            pptx.enum.shapes.MSO_SHAPE.ROUNDED_RECTANGLE,
            left_pos, card_top, card_width, card_height
        )
        card.fill.solid()
        card.fill.fore_color.rgb = RGBColor(10, 28, 14)
        card.line.color.rgb = RGBColor(180, 115, 1) if color == COLOR_GOLD else RGBColor(57, 99, 68)
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

    # ----------------------------------------------------
    # SLIDE 11: Demo Slide
    # ----------------------------------------------------
    slide11 = prs.slides[10]
    demo_box = slide11.shapes.add_shape(
        pptx.enum.shapes.MSO_SHAPE.ROUNDED_RECTANGLE,
        Inches(2.50), Inches(4.15), Inches(8.33), Inches(1.35)
    )
    demo_box.fill.solid()
    demo_box.fill.fore_color.rgb = RGBColor(10, 28, 14)
    demo_box.line.color.rgb = RGBColor(57, 99, 68)
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

    # ----------------------------------------------------
    # SLIDE 12: Q&A / Conclusion Slide
    # ----------------------------------------------------
    slide12 = prs.slides[11]
    sp12 = slide12.shapes[5]
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

    # Save to memory buffer
    out_stream = io.BytesIO()
    prs.save(out_stream)
    out_data = out_stream.getvalue()
    
    # Save to updated_pptx
    with open(updated_pptx, 'wb') as f:
        f.write(out_data)
    print(f"Saved to: {updated_pptx}")
    
    # Try overwrite dest_pptx
    try:
        with open(dest_pptx, 'wb') as f:
            f.write(out_data)
        print(f"Also overwritten: {dest_pptx}")
    except PermissionError:
        print(f"Note: {dest_pptx} is currently locked by PowerPoint. Saved to {updated_pptx}!")

if __name__ == '__main__':
    update_presentation()
