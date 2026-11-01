import os

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUTPUT_PATH = os.path.join(PROJECT_ROOT, 'slide', 'index.html')

def svg(name, color="currentColor", size=20, extra_class=""):
    icons = {
        "shield-check": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
        "alert-triangle": '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
        "layers": '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
        "cpu": '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>',
        "smartphone": '<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
        "globe": '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
        "key": '<path d="m21 2-2 2m-1.5 1.5L14 9l-2-2-4 4 2 2-3 3 1.5 1.5L7 19l-4 4-2-2 4-4 1.5 1.5 1.5-1.5 2 2 3-3-2-2 3.5-3.5L21 2z"/>',
        "arrow-right": '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
        "arrow-left": '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
        "maximize": '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
        "list": '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    }
    body = icons.get(name, '<circle cx="12" cy="12" r="10"/>')
    cls = f"svg-icon {extra_class}".strip()
    return f'<svg class="{cls}" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{body}</svg>'

html_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FSA Super App & Mini App Platform — Executive Presentation</title>

  <!-- Typography: Plus Jakarta Sans & JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

  <style>
    /* ===========================================
       CLEAN EXECUTIVE COLOR PALETTE
       Strictly Un-nested / Open / Bullet Dots / No Emojis
       =========================================== */
    :root {{
      --bg-dark: #080C09;
      --bg-surface: #0E1410;
      --border-line: rgba(255, 255, 255, 0.10);
      --border-accent: rgba(248, 209, 97, 0.35);

      --gold: #F8D161;
      --gold-deep: #E6A71C;
      --green-pass: #4ADE80;
      --red-accent: #F87171;

      --text-main: #FFFFFF;
      --text-muted: #CBD5E1;
      --text-sage: #9EBBA3;

      --font-display: 'Plus Jakarta Sans', -apple-system, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;

      --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
      --duration-normal: 0.5s;
    }}

    *, *::before, *::after {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    html, body {{
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      background: #000000;
      color: var(--text-main);
      font-family: var(--font-display);
      user-select: none;
      -webkit-font-smoothing: antialiased;
    }}

    .deck-viewport {{
      position: fixed;
      inset: 0;
      overflow: hidden;
      background: #000000;
      display: flex;
      align-items: center;
      justify-content: center;
    }}

    .deck-stage {{
      position: absolute;
      left: 0;
      top: 0;
      width: 1920px;
      height: 1080px;
      overflow: hidden;
      transform-origin: 0 0;
      background: var(--bg-dark);
      background-image:
        radial-gradient(circle at 10% 10%, rgba(57, 99, 68, 0.18) 0%, transparent 40%),
        radial-gradient(circle at 90% 90%, rgba(248, 209, 97, 0.08) 0%, transparent 40%),
        linear-gradient(rgba(255, 255, 255, 0.012) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.012) 1px, transparent 1px);
      background-size: 100% 100%, 100% 100%, 64px 64px, 64px 64px;
    }}

    .slide {{
      position: absolute;
      inset: 0;
      width: 1920px;
      height: 1080px;
      padding: 60px 96px 76px 96px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      visibility: hidden;
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--duration-normal) var(--ease-out-expo),
                  visibility var(--duration-normal) var(--ease-out-expo);
    }}

    .slide.active {{
      visibility: visible;
      opacity: 1;
      pointer-events: auto;
      z-index: 1;
    }}

    .reveal {{
      opacity: 0;
      transform: translateY(16px);
      transition: opacity var(--duration-normal) var(--ease-out-expo),
                  transform var(--duration-normal) var(--ease-out-expo);
    }}

    .slide.active .reveal {{
      opacity: 1;
      transform: translateY(0);
    }}

    .reveal:nth-child(1) {{ transition-delay: 0.05s; }}
    .reveal:nth-child(2) {{ transition-delay: 0.10s; }}
    .reveal:nth-child(3) {{ transition-delay: 0.15s; }}
    .reveal:nth-child(4) {{ transition-delay: 0.20s; }}

    /* Header */
    .slide-header {{
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 32px;
      position: relative;
    }}

    .org-bar {{
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
    }}

    .org-logo {{
      width: 40px;
      height: 40px;
      object-fit: contain;
    }}

    .org-title {{
      font-size: 13.5px;
      font-weight: 700;
      color: var(--gold);
      letter-spacing: 0.10em;
      text-transform: uppercase;
      font-family: var(--font-mono);
    }}

    .slide-eyebrow {{
      font-family: var(--font-mono);
      font-size: 13px;
      font-weight: 700;
      color: var(--gold);
      letter-spacing: 0.10em;
      text-transform: uppercase;
    }}

    .slide-title {{
      font-size: 42px;
      font-weight: 800;
      color: var(--text-main);
      letter-spacing: -0.025em;
      line-height: 1.12;
    }}

    .slide-subtitle {{
      font-size: 18.5px;
      font-weight: 400;
      color: var(--text-sage);
      line-height: 1.4;
      max-width: 1500px;
    }}

    .slide-divider {{
      width: 100%;
      height: 1px;
      background: linear-gradient(90deg, rgba(248, 209, 97, 0.6) 0%, rgba(255, 255, 255, 0.1) 60%, transparent 100%);
      margin-top: 14px;
    }}

    /* Layout Grids */
    .content-area {{
      flex: 1;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }}

    .open-grid-2 {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 64px;
      height: 100%;
    }}

    .open-grid-3 {{
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 48px;
      height: 100%;
    }}

    .open-grid-4 {{
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 36px;
      height: 100%;
    }}

    .open-grid-3x2 {{
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(2, 1fr);
      gap: 36px 48px;
      height: 100%;
    }}

    .open-col {{
      display: flex;
      flex-direction: column;
      border-top: 2px solid var(--border-line);
      padding-top: 20px;
    }}

    .open-col.gold {{ border-top-color: var(--gold); }}
    .open-col.red {{ border-top-color: var(--red-accent); }}
    .open-col.emerald {{ border-top-color: var(--green-pass); }}

    .col-header {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }}

    .col-title-group {{
      display: flex;
      align-items: center;
      gap: 12px;
    }}

    .col-title {{
      font-size: 20px;
      font-weight: 700;
      color: #FFFFFF;
      letter-spacing: -0.01em;
    }}

    .col-title.gold {{ color: var(--gold); }}
    .col-title.red {{ color: var(--red-accent); }}

    .clean-tag {{
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.10em;
      text-transform: uppercase;
      color: var(--text-sage);
    }}

    .clean-tag.gold {{ color: var(--gold); }}
    .clean-tag.red {{ color: var(--red-accent); }}
    .clean-tag.pass {{ color: var(--green-pass); }}

    /* Slide Symbol Dot (MANDATORY: NO DASHES) */
    .clean-point {{
      margin-bottom: 18px;
    }}

    .clean-point:last-child {{
      margin-bottom: 0;
    }}

    .point-head-clean {{
      font-size: 16.5px;
      font-weight: 700;
      color: #FFFFFF;
      margin-bottom: 4px;
      display: flex;
      align-items: baseline;
      gap: 10px;
    }}

    .point-head-clean.red {{ color: #FCA5A5; }}
    .point-head-clean.gold {{ color: var(--gold); }}

    .point-dot {{
      color: var(--gold);
      font-size: 18px;
      line-height: 1;
    }}

    .point-dot.red {{ color: var(--red-accent); }}
    .point-dot.emerald {{ color: var(--green-pass); }}

    .point-desc-clean {{
      font-size: 14.5px;
      color: var(--text-sage);
      line-height: 1.48;
      padding-left: 20px;
    }}

    /* Table of Contents Clean Grid */
    .agenda-clean-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 36px 64px;
      height: 100%;
      padding-top: 10px;
    }}

    .agenda-clean-item {{
      display: flex;
      flex-direction: column;
      border-bottom: 1px solid var(--border-line);
      padding-bottom: 24px;
      cursor: pointer;
      transition: border-bottom-color 0.2s;
    }}

    .agenda-clean-item:hover {{
      border-bottom-color: var(--gold);
    }}

    .agenda-clean-header {{
      display: flex;
      align-items: baseline;
      gap: 16px;
      margin-bottom: 14px;
    }}

    .agenda-clean-num {{
      font-family: var(--font-mono);
      font-size: 36px;
      font-weight: 800;
      color: var(--gold);
      line-height: 1;
    }}

    .agenda-clean-title {{
      font-size: 22px;
      font-weight: 700;
      color: #FFFFFF;
      letter-spacing: -0.01em;
    }}

    .agenda-clean-sublist {{
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-left: 54px;
    }}

    .agenda-clean-sub {{
      display: flex;
      align-items: baseline;
      gap: 12px;
      font-size: 15.5px;
      color: var(--text-sage);
      padding: 3px 0;
      transition: color 0.2s, transform 0.2s;
    }}

    .agenda-clean-sub:hover {{
      color: #FFFFFF;
      transform: translateX(4px);
    }}

    .sub-dot-clean {{
      color: var(--gold);
      font-size: 15px;
      line-height: 1;
    }}

    .sub-num-clean {{
      font-family: var(--font-mono);
      font-size: 14px;
      font-weight: 700;
      color: var(--gold);
      min-width: 26px;
    }}

    /* Media Frames: Show FULL Native Aspect Ratio Without Distortion */
    .full-image-frame {{
      width: 100%;
      height: auto;
      max-height: 520px;
      object-fit: contain;
      border: 1px solid var(--border-line);
      border-radius: 6px;
      background: #040605;
      display: block;
    }}

    .phone-full-frame {{
      height: 380px;
      width: auto;
      aspect-ratio: 604 / 1285;
      object-fit: contain;
      border: 1px solid var(--border-line);
      border-radius: 18px;
      background: #040605;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.7);
    }}

    /* Gate List */
    .gate-row-clean {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid var(--border-line);
    }}

    .gate-row-clean:last-child {{
      border-bottom: none;
    }}

    .gate-text-clean {{
      display: flex;
      flex-direction: column;
      gap: 2px;
    }}

    .gate-name-clean {{
      font-size: 15.5px;
      font-weight: 700;
      color: #FFFFFF;
      display: flex;
      align-items: baseline;
      gap: 8px;
    }}

    .gate-desc-clean {{
      font-size: 13.5px;
      color: var(--text-sage);
      padding-left: 18px;
    }}

    .gate-badge-clean {{
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 800;
      color: var(--green-pass);
      letter-spacing: 0.08em;
      margin-left: 16px;
      flex-shrink: 0;
    }}

    /* Presentation Controls */
    .deck-controls {{
      position: fixed;
      bottom: 22px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 14px;
      background: rgba(14, 20, 16, 0.90);
      border: 1px solid var(--border-accent);
      backdrop-filter: blur(12px);
      padding: 6px 18px;
      border-radius: 30px;
      z-index: 1000;
    }}

    .deck-btn {{
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px 8px;
      border-radius: 50%;
      transition: color 0.2s;
    }}

    .deck-btn:hover {{
      color: var(--gold);
    }}

    .slide-counter {{
      font-family: var(--font-mono);
      font-size: 14px;
      font-weight: 700;
      color: var(--gold);
      min-width: 65px;
      text-align: center;
    }}

    .progress-bar {{
      position: fixed;
      bottom: 0;
      left: 0;
      height: 2px;
      background: linear-gradient(90deg, #8C5801, var(--gold));
      width: 0%;
      transition: width 0.3s var(--ease-out-expo);
      z-index: 1001;
    }}
  </style>
</head>
<body>

  <div class="deck-viewport">
    <main class="deck-stage" id="deckStage">

      <!-- ==========================================
           SLIDE 01: Hero & Title
           ========================================== -->
      <section class="slide active" id="slide-1">
        <div style="display: flex; flex-direction: column; justify-content: center; height: 100%; max-width: 1400px; margin: 0 auto; text-align: left;">
          <div class="reveal">
            <div class="org-bar" style="margin-bottom: 24px;">
              <img src="assets/fsa_logo.png" alt="FSA Logo" class="org-logo" style="width: 56px; height: 56px;">
              <div>
                <div class="org-title" style="font-size: 16px;">Fintech Center of General Secretariat of FSA</div>
                <div style="font-family: var(--font-mono); font-size: 12px; color: var(--text-sage);">Non-Bank Financial Services Authority</div>
              </div>
            </div>

            <div class="slide-eyebrow" style="margin-bottom: 16px; font-size: 14px;">NATIONAL REGULATORY FINTECH INITIATIVE</div>
            <h1 class="slide-title" style="font-size: 64px; line-height: 1.08; margin-bottom: 20px;">Super App & Mini App Platform</h1>
            <p class="slide-subtitle" style="font-size: 22px; max-width: 1100px; margin-bottom: 40px; color: var(--text-muted);">
              Unified Mobile Architecture, Multi-Tier Partner Integration & Automated Pre-Flight Security Framework for Digital Public Services.
            </p>

            <div style="display: flex; gap: 32px; border-top: 1px solid var(--border-line); padding-top: 28px; margin-top: 10px;">
              <div style="display: flex; align-items: center; gap: 10px; font-size: 15px; color: #FFFFFF;">
                {svg("shield-check", "#F8D161", 20)}
                <span>Zero-Trust Architecture</span>
              </div>
              <div style="display: flex; align-items: center; gap: 10px; font-size: 15px; color: #FFFFFF;">
                {svg("layers", "#F8D161", 20)}
                <span>4 Integration Tiers</span>
              </div>
              <div style="display: flex; align-items: center; gap: 10px; font-size: 15px; color: #FFFFFF;">
                {svg("cpu", "#F8D161", 20)}
                <span>Automated CI/CD Codegen</span>
              </div>
              <div style="display: flex; align-items: center; gap: 10px; font-size: 15px; color: #FFFFFF;">
                {svg("key", "#F8D161", 20)}
                <span>National SSO Ready</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ==========================================
           SLIDE 02: Table of Contents (Open 2x2, Bullet Dots)
           ========================================== -->
      <section class="slide" id="slide-2">
        <div class="slide-header">
          <div class="org-bar">
            <img src="assets/fsa_logo.png" alt="FSA Logo" class="org-logo">
            <span class="org-title">Fintech Center  •  General Secretariat of FSA</span>
          </div>
          <div class="slide-eyebrow">AGENDA</div>
          <h2 class="slide-title">Executive Table of Contents</h2>
          <p class="slide-subtitle">Four core strategic domains governing architecture, integration tiers, security gates, and operational roadmap.</p>
          <div class="slide-divider"></div>
        </div>

        <div class="content-area">
          <div class="agenda-clean-grid">
            <!-- 01 -->
            <div class="agenda-clean-item reveal" onclick="window.deck.goToSlide(2)">
              <div class="agenda-clean-header">
                <span class="agenda-clean-num">01</span>
                <h3 class="agenda-clean-title">1. Platform Vision & System Architecture</h3>
              </div>
              <div class="agenda-clean-sublist">
                <div class="agenda-clean-sub" onclick="event.stopPropagation(); window.deck.goToSlide(2)">
                  <span class="sub-dot-clean">•</span>
                  <span class="sub-num-clean">1.1</span>
                  <span>Strategic Vision (The Dilemma vs. Unified Solution)</span>
                </div>
                <div class="agenda-clean-sub" onclick="event.stopPropagation(); window.deck.goToSlide(3)">
                  <span class="sub-dot-clean">•</span>
                  <span class="sub-num-clean">1.2</span>
                  <span>End-to-End System Architecture (4-Phase Integration Pipeline)</span>
                </div>
              </div>
            </div>

            <!-- 02 -->
            <div class="agenda-clean-item reveal" onclick="window.deck.goToSlide(4)">
              <div class="agenda-clean-header">
                <span class="agenda-clean-num">02</span>
                <h3 class="agenda-clean-title">2. Core Features & 4 Integration Tiers</h3>
              </div>
              <div class="agenda-clean-sublist">
                <div class="agenda-clean-sub" onclick="event.stopPropagation(); window.deck.goToSlide(4)">
                  <span class="sub-dot-clean">•</span>
                  <span class="sub-num-clean">2.1</span>
                  <span>4 Flexible Integration Tiers (WebView, Flutter, Native, Deep Link)</span>
                </div>
                <div class="agenda-clean-sub" onclick="event.stopPropagation(); window.deck.goToSlide(5)">
                  <span class="sub-dot-clean">•</span>
                  <span class="sub-num-clean">2.2</span>
                  <span>Platform Core Features (Size Cleaner, Codegen, Dynamic RBAC)</span>
                </div>
              </div>
            </div>

            <!-- 03 -->
            <div class="agenda-clean-item reveal" onclick="window.deck.goToSlide(6)">
              <div class="agenda-clean-header">
                <span class="agenda-clean-num">03</span>
                <h3 class="agenda-clean-title">3. Partner Portal & Enterprise Security</h3>
              </div>
              <div class="agenda-clean-sublist">
                <div class="agenda-clean-sub" onclick="event.stopPropagation(); window.deck.goToSlide(6)">
                  <span class="sub-dot-clean">•</span>
                  <span class="sub-num-clean">3.1</span>
                  <span>Partner Self-Service Backoffice & 6-Step Wizard</span>
                </div>
                <div class="agenda-clean-sub" onclick="event.stopPropagation(); window.deck.goToSlide(7)">
                  <span class="sub-dot-clean">•</span>
                  <span class="sub-num-clean">3.2</span>
                  <span>Automated Security Pipeline (8 Pre-Flight Gates & 12 Scanners)</span>
                </div>
              </div>
            </div>

            <!-- 04 -->
            <div class="agenda-clean-item reveal" onclick="window.deck.goToSlide(8)">
              <div class="agenda-clean-header">
                <span class="agenda-clean-num">04</span>
                <h3 class="agenda-clean-title">4. CI/CD Assembly, QA & Strategic Roadmap</h3>
              </div>
              <div class="agenda-clean-sublist">
                <div class="agenda-clean-sub" onclick="event.stopPropagation(); window.deck.goToSlide(8)">
                  <span class="sub-dot-clean">•</span>
                  <span class="sub-num-clean">4.1</span>
                  <span>Jenkins Codegen Assembly, Nexus Registry & Dual QA Engine</span>
                </div>
                <div class="agenda-clean-sub" onclick="event.stopPropagation(); window.deck.goToSlide(10)">
                  <span class="sub-dot-clean">•</span>
                  <span class="sub-num-clean">4.2</span>
                  <span>Operational Milestones & Strategic Roadmap (CamDigiKey, HR)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ==========================================
           SLIDE 03: 1.1 Strategic Vision (Bullet Dots)
           ========================================== -->
      <section class="slide" id="slide-3">
        <div class="slide-header">
          <div class="org-bar">
            <img src="assets/fsa_logo.png" alt="FSA Logo" class="org-logo">
            <span class="org-title">Fintech Center  •  General Secretariat of FSA</span>
          </div>
          <div class="slide-eyebrow">1.1 STRATEGIC VISION</div>
          <h2 class="slide-title">Operational Dilemma vs. Unified Solution</h2>
          <p class="slide-subtitle">Transforming fragmented citizen applications into a unified, secure digital public service ecosystem.</p>
          <div class="slide-divider"></div>
        </div>

        <div class="content-area">
          <div class="open-grid-2">
            <!-- Left: Challenges -->
            <div class="open-col red reveal">
              <div class="col-header">
                <div class="col-title-group">
                  {svg("alert-triangle", "#F87171", 22)}
                  <h3 class="col-title red">Operational Challenges & Fragmentation</h3>
                </div>
                <span class="clean-tag red">CRITICAL RISKS</span>
              </div>

              <div class="clean-point">
                <div class="point-head-clean red">
                  <span class="point-dot red">•</span>
                  <span>Severe Citizen App Fatigue</span>
                </div>
                <div class="point-desc-clean">Citizens are forced to download dozens of separate standalone government and financial apps for individual ministry services.</div>
              </div>

              <div class="clean-point">
                <div class="point-head-clean red">
                  <span class="point-dot red">•</span>
                  <span>Fragmented Security & Identity</span>
                </div>
                <div class="point-desc-clean">Inconsistent authentication standards, variable security postures, unvetted third-party SDKs, and scattered citizen profiles.</div>
              </div>

              <div class="clean-point">
                <div class="point-head-clean red">
                  <span class="point-dot red">•</span>
                  <span>High Partner Onboarding Overhead</span>
                </div>
                <div class="point-desc-clean">Slow integration cycles with manual code reviews, duplicated infrastructure, and high engineering costs per ministry.</div>
              </div>

              <div class="clean-point">
                <div class="point-head-clean red">
                  <span class="point-dot red">•</span>
                  <span>Decentralized Governance Void</span>
                </div>
                <div class="point-desc-clean">No centralized control to enforce regulatory compliance, inspect dependencies, or revoke compromised mobile versions instantly.</div>
              </div>
            </div>

            <!-- Right: Solution -->
            <div class="open-col gold reveal">
              <div class="col-header">
                <div class="col-title-group">
                  {svg("shield-check", "#F8D161", 22)}
                  <h3 class="col-title gold">Unified Super App Architecture</h3>
                </div>
                <span class="clean-tag gold">REGULATORY SOLUTION</span>
              </div>

              <div class="clean-point">
                <div class="point-head-clean gold">
                  <span class="point-dot emerald">•</span>
                  <span>Single Citizen Digital Portal</span>
                </div>
                <div class="point-desc-clean">Consolidates all public and financial services into one authoritative, state-level mobile gateway with unified identity.</div>
              </div>

              <div class="clean-point">
                <div class="point-head-clean gold">
                  <span class="point-dot emerald">•</span>
                  <span>Bank-Grade Zero-Trust Security</span>
                </div>
                <div class="point-desc-clean">Centralized CamDigiKey national SSO, automated SAST vulnerability scanning, and strict sandboxed JavaScript runtime boundaries.</div>
              </div>

              <div class="clean-point">
                <div class="point-head-clean gold">
                  <span class="point-dot emerald">•</span>
                  <span>Automated Self-Service Onboarding</span>
                </div>
                <div class="point-desc-clean">6-step developer portal with live reachability probes, automated manifest validation, and dynamic route code generation.</div>
              </div>

              <div class="clean-point">
                <div class="point-head-clean gold">
                  <span class="point-dot emerald">•</span>
                  <span>Centralized Regulatory Governance</span>
                </div>
                <div class="point-desc-clean">Immediate capability revocation, multi-tenant RBAC permissions, and end-to-end immutable audit logging for full compliance.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ==========================================
           SLIDE 04: 1.2 System Architecture
           ========================================== -->
      <section class="slide" id="slide-4">
        <div class="slide-header">
          <div class="org-bar">
            <img src="assets/fsa_logo.png" alt="FSA Logo" class="org-logo">
            <span class="org-title">Fintech Center  •  General Secretariat of FSA</span>
          </div>
          <div class="slide-eyebrow">1.2 SYSTEM ARCHITECTURE & PROTOCOLS</div>
          <h2 class="slide-title">Technology Stacks & Communication Architecture</h2>
          <p class="slide-subtitle">Decoupled technical topology showing exact technologies, ports, data flows, and inter-service communication channels.</p>
          <div class="slide-divider"></div>
        </div>

        <div class="content-area">
          <div style="display: flex; gap: 40px; align-items: center; height: 100%;">
            <div class="reveal" style="flex: 2.3; height: 100%; display: flex; align-items: center;">
              <img src="assets/fsa_superapp_system_architecture.png" alt="FSA Super App Platform Architecture Blueprint" class="full-image-frame" style="max-height: 520px; width: 100%; object-fit: contain;">
            </div>

            <div class="open-col gold reveal" style="flex: 0.95; height: 100%; border-top-color: var(--gold); padding-top: 14px;">
              <div class="col-header" style="margin-bottom: 12px;">
                <h3 class="col-title">Inter-Service Communication</h3>
                <span class="clean-tag gold">PROTOCOLS</span>
              </div>

              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Portal to Backend (BFF)</span></div>
                <div class="point-desc-clean">Next.js 16 Server Actions call NestJS 11 REST API via Bearer JWT; real-time build progress via Socket.IO WebSocket.</div>
              </div>

              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Backend to Data & Storage</span></div>
                <div class="point-desc-clean">NestJS connects to PostgreSQL 15 over TCP 5432 (TypeORM QueryBuilder) and MinIO over S3 API (Port 9000).</div>
              </div>

              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Automated CI/CD Security</span></div>
                <div class="point-desc-clean">Jenkins triggers rootless Docker DinD (Port 2376), executes 12 scanners (OWASP ZAP 8090, Trivy), publishes to Nexus CE 8081.</div>
              </div>

              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Super App Sandboxed IPC</span></div>
                <div class="point-desc-clean">Flutter host binds WebView via window.postMessage, Native SDK via MethodChannels, and CamDigiKey SSO via OIDC PKCE.</div>
              </div>

              <div style="font-family: var(--font-mono); font-size: 11px; color: var(--green-pass); margin-top: auto; padding-top: 14px;">
                [ PROVEN FULL-STACK POC ARCHITECTURE ]
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ==========================================
           SLIDE 05: 2.1 4 Flexible Integration Tiers
           ========================================== -->
      <section class="slide" id="slide-5">
        <div class="slide-header">
          <div class="org-bar">
            <img src="assets/fsa_logo.png" alt="FSA Logo" class="org-logo">
            <span class="org-title">Fintech Center  •  General Secretariat of FSA</span>
          </div>
          <div class="slide-eyebrow">2.1 INTEGRATION TIERS</div>
          <h2 class="slide-title">4 Flexible Partner Integration Tiers</h2>
          <p class="slide-subtitle">Supporting existing web applications, high-performance Flutter modules, native OEM SDKs, and external ecosystem apps.</p>
          <div class="slide-divider"></div>
        </div>

        <div class="content-area">
          <div class="open-grid-4">
            <div class="open-col gold reveal">
              <div class="col-header">
                <h3 class="col-title">WebView</h3>
                <span class="clean-tag gold">TIER 01</span>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Zero App Rebuild</span></div>
                <div class="point-desc-clean">Instantly embed existing web applications with zero mobile compilation required.</div>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>JS Bridge Isolation</span></div>
                <div class="point-desc-clean">Restricted JavaScript bridge communicates over monitored postMessage channels.</div>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Automated Auth</span></div>
                <div class="point-desc-clean">Direct JWT session token injection via secure headers and CamDigiKey handoff.</div>
              </div>
              <div style="font-family: var(--font-mono); font-size: 11.5px; color: var(--text-sage); margin-top: auto; padding-top: 14px;">HTML5 / React / Vue • &lt;8MB Memory</div>
            </div>

            <div class="open-col gold reveal">
              <div class="col-header">
                <h3 class="col-title">Flutter Mini App</h3>
                <span class="clean-tag gold">TIER 02</span>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>60 FPS Native UI</span></div>
                <div class="point-desc-clean">Delivers fluid 60fps animations with Flutter Riverpod state architecture.</div>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Native Channel Bridge</span></div>
                <div class="point-desc-clean">Direct MethodChannel access to host camera, biometric auth, and secure storage.</div>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Decoupled Routes</span></div>
                <div class="point-desc-clean">Dynamic route registry allows independent module versioning and testing.</div>
              </div>
              <div style="font-family: var(--font-mono); font-size: 11.5px; color: var(--text-sage); margin-top: auto; padding-top: 14px;">Dart / Riverpod • Instant Hot Launch</div>
            </div>

            <div class="open-col gold reveal">
              <div class="col-header">
                <h3 class="col-title">Native Mobile SDK</h3>
                <span class="clean-tag gold">TIER 03</span>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Direct OEM Modules</span></div>
                <div class="point-desc-clean">Integrates iOS Swift and Android Kotlin frameworks for intensive processing.</div>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Hardware Access</span></div>
                <div class="point-desc-clean">Low-level hardware access for NFC chip reading, secure element, and Bluetooth.</div>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Execution Guards</span></div>
                <div class="point-desc-clean">Strict in-flight execution guards prevent crashes from propagating to host.</div>
              </div>
              <div style="font-family: var(--font-mono); font-size: 11.5px; color: var(--text-sage); margin-top: auto; padding-top: 14px;">Kotlin / Swift • NFC & Secure Enclave</div>
            </div>

            <div class="open-col gold reveal">
              <div class="col-header">
                <h3 class="col-title">External Deep Link</h3>
                <span class="clean-tag gold">TIER 04</span>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>App-to-App Handoff</span></div>
                <div class="point-desc-clean">Cryptographic single sign-on handoff to external bank and agency applications.</div>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Zero Binary Footprint</span></div>
                <div class="point-desc-clean">Adds zero megabytes to the core Super App package size.</div>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Verified Return URL</span></div>
                <div class="point-desc-clean">Cryptographically signed return callbacks verify transaction results.</div>
              </div>
              <div style="font-family: var(--font-mono); font-size: 11.5px; color: var(--text-sage); margin-top: auto; padding-top: 14px;">Custom URL Schemes • Universal Links</div>
            </div>
          </div>
        </div>
      </section>

      <!-- ==========================================
           SLIDE 06: 2.2 Core Features
           ========================================== -->
      <section class="slide" id="slide-6">
        <div class="slide-header">
          <div class="org-bar">
            <img src="assets/fsa_logo.png" alt="FSA Logo" class="org-logo">
            <span class="org-title">Fintech Center  •  General Secretariat of FSA</span>
          </div>
          <div class="slide-eyebrow">2.2 PLATFORM CAPABILITIES</div>
          <h2 class="slide-title">Core Platform Features & Architecture</h2>
          <p class="slide-subtitle">Engineered for high-volume citizen services, automated governance, and enterprise-grade performance.</p>
          <div class="slide-divider"></div>
        </div>

        <div class="content-area">
          <div class="open-grid-3x2">
            <div class="open-col reveal">
              <div class="col-header" style="margin-bottom: 12px;">
                <h3 class="col-title">Smart Size & Asset Cleaner</h3>
                <span class="clean-tag">OPTIMIZATION</span>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Binary Symbol Stripping</span></div>
                <div class="point-desc-clean">Strips unused symbols, duplicate assets, and debug metadata from release builds.</div>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Strict Size Enforcer</span></div>
                <div class="point-desc-clean">Blocks builds exceeding 15MB to ensure rapid citizen mobile app downloads.</div>
              </div>
            </div>

            <div class="open-col reveal">
              <div class="col-header" style="margin-bottom: 12px;">
                <h3 class="col-title">Dynamic Code Generator</h3>
                <span class="clean-tag">AUTOMATION</span>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Automated Routing</span></div>
                <div class="point-desc-clean">Generates Riverpod providers, route tables, and bridge wrappers dynamically.</div>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Zero Human Error</span></div>
                <div class="point-desc-clean">Eliminates manual integration boilerplate and prevents route collision issues.</div>
              </div>
            </div>

            <div class="open-col reveal">
              <div class="col-header" style="margin-bottom: 12px;">
                <h3 class="col-title">Multi-Tenant Backoffice RBAC</h3>
                <span class="clean-tag">GOVERNANCE</span>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Role-Based Isolation</span></div>
                <div class="point-desc-clean">Strict separation between FSA regulatory auditors, QA staff, and ministry developers.</div>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Audit Tracking</span></div>
                <div class="point-desc-clean">Logs every permission update, approval decision, and status modification.</div>
              </div>
            </div>

            <div class="open-col reveal">
              <div class="col-header" style="margin-bottom: 12px;">
                <h3 class="col-title">Live Web Sandbox Emulator</h3>
                <span class="clean-tag">TESTING</span>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>In-Browser Device Frame</span></div>
                <div class="point-desc-clean">Instant desktop simulation of mobile viewports, touch gestures, and bridge APIs.</div>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Hardware Mocking</span></div>
                <div class="point-desc-clean">Mocks camera feeds, GPS coordinates, and auth tokens without physical devices.</div>
              </div>
            </div>

            <div class="open-col reveal">
              <div class="col-header" style="margin-bottom: 12px;">
                <h3 class="col-title">Pre-Flight Security Scanner</h3>
                <span class="clean-tag pass">ZERO-TRUST</span>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot emerald">•</span><span>8 Automated Gates</span></div>
                <div class="point-desc-clean">Scans AST code, third-party SBOM packages, and SSRF network endpoints automatically.</div>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot emerald">•</span><span>Immediate Quarantine</span></div>
                <div class="point-desc-clean">Quarantines non-compliant commits before reaching staging and release builds.</div>
              </div>
            </div>

            <div class="open-col reveal">
              <div class="col-header" style="margin-bottom: 12px;">
                <h3 class="col-title">Git Multi-Branch & Nexus Sync</h3>
                <span class="clean-tag">DEVOPS</span>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Webhook Pipeline</span></div>
                <div class="point-desc-clean">Tracks dev, staging, and production branches with automated webhook builds.</div>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Nexus Enterprise Registry</span></div>
                <div class="point-desc-clean">Stores version-pinned, tamper-evident packages in private Nexus registry.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ==========================================
           SLIDE 07: 3.1 Partner Portal (Native Image Aspect)
           ========================================== -->
      <section class="slide" id="slide-7">
        <div class="slide-header">
          <div class="org-bar">
            <img src="assets/fsa_logo.png" alt="FSA Logo" class="org-logo">
            <span class="org-title">Fintech Center  •  General Secretariat of FSA</span>
          </div>
          <div class="slide-eyebrow">3.1 PARTNER ONBOARDING</div>
          <h2 class="slide-title">Partner Self-Service Portal & 6-Step Wizard</h2>
          <p class="slide-subtitle">Accelerating partner onboarding from months to minutes while enforcing strict architectural and security requirements.</p>
          <div class="slide-divider"></div>
        </div>

        <div class="content-area">
          <div class="open-grid-2" style="align-items: center;">
            <div class="open-col gold reveal">
              <div class="col-header">
                <h3 class="col-title">Structured 6-Step Developer Flow</h3>
                <span class="clean-tag gold">BACKOFFICE ONBOARDING</span>
              </div>

              <div class="clean-point">
                <div class="point-head-clean gold"><span class="point-dot">•</span><span>01  Metadata Registration</span></div>
                <div class="point-desc-clean">Application name, ministry category, localized descriptions, and official icons.</div>
              </div>

              <div class="clean-point">
                <div class="point-head-clean gold"><span class="point-dot">•</span><span>02  Integration Tier Selection</span></div>
                <div class="point-desc-clean">Select architectural tier: WebView, Flutter Module, Native SDK, or Deep Link.</div>
              </div>

              <div class="clean-point">
                <div class="point-head-clean gold"><span class="point-dot">•</span><span>03  Repository & Branch Sync</span></div>
                <div class="point-desc-clean">Configure GitLab/GitHub repository URL, deployment branch, and webhook credentials.</div>
              </div>

              <div class="clean-point">
                <div class="point-head-clean gold"><span class="point-dot">•</span><span>04  Capability & Permission Grants</span></div>
                <div class="point-desc-clean">Request explicit access to native Camera, Location, Storage, and CamDigiKey SSO.</div>
              </div>

              <div class="clean-point">
                <div class="point-head-clean gold"><span class="point-dot">•</span><span>05  Endpoint Reachability Probes</span></div>
                <div class="point-desc-clean">Automated SSRF validation and DNS health probing of partner server endpoints.</div>
              </div>

              <div class="clean-point">
                <div class="point-head-clean gold"><span class="point-dot">•</span><span>06  Policy Disclosure & Sign-Off</span></div>
                <div class="point-desc-clean">Digital legal acceptance of FSA platform guidelines, queuing the submission for review.</div>
              </div>
            </div>

            <div class="reveal" style="display: flex; flex-direction: column;">
              <div style="font-family: var(--font-mono); font-size: 12px; color: var(--gold); margin-bottom: 8px; text-transform: uppercase;">
                PRODUCTION BACKOFFICE WIZARD INTERFACE
              </div>
              <img src="assets/backoffice_wizard.png" alt="Backoffice Wizard" class="full-image-frame">
            </div>
          </div>
        </div>
      </section>

      <!-- ==========================================
           SLIDE 08: 3.2 8 Multi-Layered Security Gates
           ========================================== -->
      <section class="slide" id="slide-8">
        <div class="slide-header">
          <div class="org-bar">
            <img src="assets/fsa_logo.png" alt="FSA Logo" class="org-logo">
            <span class="org-title">Fintech Center  •  General Secretariat of FSA</span>
          </div>
          <div class="slide-eyebrow">3.2 ENTERPRISE SECURITY</div>
          <h2 class="slide-title">Multi-Layered Security Pipeline: 8 Pre-Flight Gates</h2>
          <p class="slide-subtitle">Continuous automated vulnerability scanning and policy enforcement protecting the super app ecosystem before release.</p>
          <div class="slide-divider"></div>
        </div>

        <div class="content-area">
          <div class="open-grid-2">
            <div class="open-col gold reveal">
              <div class="col-header">
                <h3 class="col-title">Static Code & Network Scanners</h3>
                <span class="clean-tag gold">GATES 01-04</span>
              </div>

              <div class="gate-row-clean">
                <div class="gate-text-clean">
                  <div class="gate-name-clean"><span class="point-dot">•</span><span>Gate 01: SSRF & Network Endpoint Probe</span></div>
                  <div class="gate-desc-clean">Validates endpoint reachability, blocks private RFC1918 subnets, and enforces HTTPS.</div>
                </div>
                <div class="gate-badge-clean">[ PASS ]</div>
              </div>

              <div class="gate-row-clean">
                <div class="gate-text-clean">
                  <div class="gate-name-clean"><span class="point-dot">•</span><span>Gate 02: Static AST Code Analysis</span></div>
                  <div class="gate-desc-clean">Scans source code for unauthorized APIs, hardcoded credentials, and unsafe eval().</div>
                </div>
                <div class="gate-badge-clean">[ PASS ]</div>
              </div>

              <div class="gate-row-clean">
                <div class="gate-text-clean">
                  <div class="gate-name-clean"><span class="point-dot">•</span><span>Gate 03: SBOM & Dependency CVE Audit</span></div>
                  <div class="gate-desc-clean">Audits all third-party libraries against national vulnerability registries and copyleft licenses.</div>
                </div>
                <div class="gate-badge-clean">[ PASS ]</div>
              </div>

              <div class="gate-row-clean">
                <div class="gate-text-clean">
                  <div class="gate-name-clean"><span class="point-dot">•</span><span>Gate 04: Capability & Manifest Alignment</span></div>
                  <div class="gate-desc-clean">Ensures declared mini app permissions strictly match iOS Info.plist & Android manifest entries.</div>
                </div>
                <div class="gate-badge-clean">[ PASS ]</div>
              </div>
            </div>

            <div class="open-col gold reveal">
              <div class="col-header">
                <h3 class="col-title">Runtime & Isolation Governance</h3>
                <span class="clean-tag gold">GATES 05-08</span>
              </div>

              <div class="gate-row-clean">
                <div class="gate-text-clean">
                  <div class="gate-name-clean"><span class="point-dot">•</span><span>Gate 05: Cryptographic Token Isolation</span></div>
                  <div class="gate-desc-clean">Enforces HttpOnly SameSite=Strict cookies; strictly prohibits tokens in localStorage.</div>
                </div>
                <div class="gate-badge-clean">[ PASS ]</div>
              </div>

              <div class="gate-row-clean">
                <div class="gate-text-clean">
                  <div class="gate-name-clean"><span class="point-dot">•</span><span>Gate 06: Native MethodChannel Guard</span></div>
                  <div class="gate-desc-clean">Validates payload schemas on all Flutter method channels to block injection attacks.</div>
                </div>
                <div class="gate-badge-clean">[ PASS ]</div>
              </div>

              <div class="gate-row-clean">
                <div class="gate-text-clean">
                  <div class="gate-name-clean"><span class="point-dot">•</span><span>Gate 07: Content Security Policy Enforcement</span></div>
                  <div class="gate-desc-clean">Restricts WebView origins, script sources, and forbids framing by unauthorized domains.</div>
                </div>
                <div class="gate-badge-clean">[ PASS ]</div>
              </div>

              <div class="gate-row-clean">
                <div class="gate-text-clean">
                  <div class="gate-name-clean"><span class="point-dot">•</span><span>Gate 08: Immutable Regulatory Audit Log</span></div>
                  <div class="gate-desc-clean">Records SHA-256 binary hash, operator approval, and gate logs in tamper-evident database.</div>
                </div>
                <div class="gate-badge-clean">[ PASS ]</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ==========================================
           SLIDE 09: 4.1 CI/CD (Flowchart on Left, Takeaways Right)
           ========================================== -->
      <section class="slide" id="slide-9">
        <div class="slide-header">
          <div class="org-bar">
            <img src="assets/fsa_logo.png" alt="FSA Logo" class="org-logo">
            <span class="org-title">Fintech Center  •  General Secretariat of FSA</span>
          </div>
          <div class="slide-eyebrow">4.1 CI/CD & NEXUS REGISTRY</div>
          <h2 class="slide-title">CI/CD Codegen Assembly & Nexus Registry</h2>
          <p class="slide-subtitle">Automating compilation, code generation, and package release in an air-gapped, verifiable DevOps pipeline.</p>
          <div class="slide-divider"></div>
        </div>

        <div class="content-area">
          <div style="display: flex; gap: 48px; align-items: center; height: 100%;">
            <div class="reveal" style="flex: 1.15;">
              <img src="assets/executive_flowchart_security_scan.jpg" alt="Security Scan Flowchart" class="full-image-frame" style="max-height: 500px;">
            </div>

            <div class="open-col reveal" style="flex: 0.85; border-top-color: var(--gold); padding-top: 14px;">
              <div class="col-header" style="margin-bottom: 12px;">
                <h3 class="col-title">DevOps Assembly Architecture</h3>
                <span class="clean-tag gold">PIPELINE CORE</span>
              </div>

              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Zero Remote Code Loading</span></div>
                <div class="point-desc-clean">Strict regulatory policy: zero remote uncompiled Dart/JS loading over the air. All executable code is inspected, compiled, and pinned at build time.</div>
              </div>

              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Nexus Enterprise Registry</span></div>
                <div class="point-desc-clean">Release bundles are versioned, signed, and hosted within a private Nexus CE repository, guaranteeing package authenticity and tamper evidence.</div>
              </div>

              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Automated Jenkins CI/CD</span></div>
                <div class="point-desc-clean">Dynamic code generation, symbol obfuscation, ProGuard/R8 shrinking, and signed APK/AAB release generation without manual developer intervention.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ==========================================
           SLIDE 10: 4.2 Dual-Environment QA (Both Show Full Native Aspect)
           ========================================== -->
      <section class="slide" id="slide-10">
        <div class="slide-header">
          <div class="org-bar">
            <img src="assets/fsa_logo.png" alt="FSA Logo" class="org-logo">
            <span class="org-title">Fintech Center  •  General Secretariat of FSA</span>
          </div>
          <div class="slide-eyebrow">4.2 DUAL-ENVIRONMENT QA</div>
          <h2 class="slide-title">Dual-Environment Testing & QA Verification</h2>
          <p class="slide-subtitle">Combining browser-based emulator agility with physical device hardware verification for zero-defect releases.</p>
          <div class="slide-divider"></div>
        </div>

        <div class="content-area">
          <div class="open-grid-2">
            <!-- Left: Web Sandbox (Desktop 16:9 Landscape) -->
            <div class="open-col reveal">
              <div class="col-header" style="margin-bottom: 12px;">
                <h3 class="col-title">Environment 1: In-Browser Web Sandbox</h3>
                <span class="clean-tag gold">RAPID QA</span>
              </div>
              <div class="clean-point" style="margin-bottom: 14px;">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Zero Device Overhead</span></div>
                <div class="point-desc-clean" style="padding-left: 0;">QA teams inspect UI layouts, touch response, and mock bridge APIs directly in Chrome/Edge without physical phones.</div>
              </div>
              <img src="assets/superapp_sandbox_preview.png" alt="Web Sandbox Preview" class="full-image-frame" style="max-height: 380px;">
            </div>

            <!-- Right: Physical Device Verification (Phone Portrait at True Aspect Ratio + Checklist) -->
            <div class="open-col reveal">
              <div class="col-header" style="margin-bottom: 12px;">
                <h3 class="col-title">Environment 2: Physical Device Verification</h3>
                <span class="clean-tag gold">HARDWARE QA</span>
              </div>
              <div class="clean-point" style="margin-bottom: 14px;">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Live QR Installation</span></div>
                <div class="point-desc-clean" style="padding-left: 0;">Auditors scan dynamic backoffice QR codes to test live biometric scanning and physical performance.</div>
              </div>

              <div style="display: flex; gap: 24px; align-items: center;">
                <img src="assets/mobile_preview.png" alt="Mobile Preview" class="phone-full-frame">
                <div style="display: flex; flex-direction: column; gap: 12px; flex: 1;">
                  <div class="clean-point">
                    <div class="point-head-clean"><span class="point-dot">•</span><span>Dynamic QR Code Install</span></div>
                    <div class="point-desc-clean" style="padding-left: 14px;">Instant over-the-air test builds on actual hardware.</div>
                  </div>
                  <div class="clean-point">
                    <div class="point-head-clean"><span class="point-dot">•</span><span>Live Biometric Auth</span></div>
                    <div class="point-desc-clean" style="padding-left: 14px;">Tests real fingerprint & face scanners with host bridge.</div>
                  </div>
                  <div class="clean-point">
                    <div class="point-head-clean"><span class="point-dot">•</span><span>Camera & GPS Sensors</span></div>
                    <div class="point-desc-clean" style="padding-left: 14px;">Validates hardware capture and geo-fencing policies.</div>
                  </div>
                  <div class="clean-point">
                    <div class="point-head-clean"><span class="point-dot">•</span><span>Fluid 60fps Experience</span></div>
                    <div class="point-desc-clean" style="padding-left: 14px;">Verifies frame rates, thermal profiles and battery health.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ==========================================
           SLIDE 11: 4.3 Current Operational Milestones
           ========================================== -->
      <section class="slide" id="slide-11">
        <div class="slide-header">
          <div class="org-bar">
            <img src="assets/fsa_logo.png" alt="FSA Logo" class="org-logo">
            <span class="org-title">Fintech Center  •  General Secretariat of FSA</span>
          </div>
          <div class="slide-eyebrow">4.3 OPERATIONAL STATUS</div>
          <h2 class="slide-title">Current Platform Milestones & Verification</h2>
          <p class="slide-subtitle">Proven technical capabilities operating end-to-end across backend microservices, backoffice portal, and mobile runtime.</p>
          <div class="slide-divider"></div>
        </div>

        <div class="content-area">
          <div class="open-grid-3">
            <div class="open-col emerald reveal">
              <div class="col-header">
                <h3 class="col-title">4 Tiers Fully Verified</h3>
                <span class="clean-tag pass">100% OPERATIONAL</span>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot emerald">•</span><span>Comprehensive Verification</span></div>
                <div class="point-desc-clean">WebView, Flutter Mini App, Native Android SDK, and Deep Link schemes have all completed end-to-end integration testing.</div>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot emerald">•</span><span>Bridge Protocol Stability</span></div>
                <div class="point-desc-clean">JavaScript bridge postMessage and native Flutter MethodChannels operating with sub-millisecond response latency.</div>
              </div>
            </div>

            <div class="open-col emerald reveal">
              <div class="col-header">
                <h3 class="col-title">8-Gate Security Pipeline</h3>
                <span class="clean-tag pass">ZERO-TRUST ACTIVE</span>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot emerald">•</span><span>Automated Pre-Flight Audits</span></div>
                <div class="point-desc-clean">AST code parser, SSRF network probe, and SBOM vulnerability checks fully integrated into backoffice submission queue.</div>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot emerald">•</span><span>Zero Hardcoded Capabilities</span></div>
                <div class="point-desc-clean">Dynamic capability registry synchronized with native iOS Info.plist and AndroidManifest files.</div>
              </div>
            </div>

            <div class="open-col emerald reveal">
              <div class="col-header">
                <h3 class="col-title">Production Stack Ready</h3>
                <span class="clean-tag pass">TIER-1 ARCHITECTURE</span>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot emerald">•</span><span>Modular Enterprise Core</span></div>
                <div class="point-desc-clean">Next.js 16 Backoffice BFF, NestJS Microservices, TypeORM transaction safety, and PostgreSQL containerized.</div>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot emerald">•</span><span>Scale-Ready Foundation</span></div>
                <div class="point-desc-clean">Built according to national regulatory standards to support dozens of ministry mini apps concurrently.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ==========================================
           SLIDE 12: 4.4 Strategic Roadmap
           ========================================== -->
      <section class="slide" id="slide-12">
        <div class="slide-header">
          <div class="org-bar">
            <img src="assets/fsa_logo.png" alt="FSA Logo" class="org-logo">
            <span class="org-title">Fintech Center  •  General Secretariat of FSA</span>
          </div>
          <div class="slide-eyebrow">4.4 STRATEGIC ROADMAP</div>
          <h2 class="slide-title">Next Integrations & Strategic Roadmap</h2>
          <p class="slide-subtitle">Expanding ecosystem capabilities with national identity, enterprise administration, and automated synchronization.</p>
          <div class="slide-divider"></div>
        </div>

        <div class="content-area">
          <div class="open-grid-3">
            <div class="open-col gold reveal">
              <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: var(--gold); margin-bottom: 8px;">HORIZON 01  •  Q1 2027</div>
              <h3 class="col-title" style="margin-bottom: 14px;">CamDigiKey National SSO</h3>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Single Digital Citizen Identity</span></div>
                <div class="point-desc-clean">Seamless integration with Cambodia's national identity authentication system for instant login across all mini apps.</div>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Biometric Authorization</span></div>
                <div class="point-desc-clean">Enables citizens to digitally sign financial and administrative documents using verified cryptographic keys.</div>
              </div>
            </div>

            <div class="open-col gold reveal">
              <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: var(--gold); margin-bottom: 8px;">HORIZON 02  •  Q2 2027</div>
              <h3 class="col-title" style="margin-bottom: 14px;">Flagship Enterprise HR App</h3>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>First Internal Ministry Mini App</span></div>
                <div class="point-desc-clean">Flagship showcase featuring employee profile management, digital attendance tracking, and leave workflow approval.</div>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Flutter Riverpod Blueprint</span></div>
                <div class="point-desc-clean">Establishes the gold-standard architectural template for all subsequent enterprise ministry applications.</div>
              </div>
            </div>

            <div class="open-col gold reveal">
              <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: var(--gold); margin-bottom: 8px;">HORIZON 03  •  Q3 2027</div>
              <h3 class="col-title" style="margin-bottom: 14px;">Automated Capability Sync</h3>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Automated Manifest Discovery</span></div>
                <div class="point-desc-clean">CI/CD crawler automatically discovers new native iOS/Android capabilities from mobile core and updates the backoffice registry.</div>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Zero Hardcoded Configuration</span></div>
                <div class="point-desc-clean">Maintains total zero-hardcode compliance by dynamically generating permission selectors and bridge adapters.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ==========================================
           SLIDE 13: Live Demonstration
           ========================================== -->
      <section class="slide" id="slide-13">
        <div class="slide-header">
          <div class="org-bar">
            <img src="assets/fsa_logo.png" alt="FSA Logo" class="org-logo">
            <span class="org-title">Fintech Center  •  General Secretariat of FSA</span>
          </div>
          <div class="slide-eyebrow">SYSTEM DEMO</div>
          <h2 class="slide-title">Live Platform Demonstration</h2>
          <p class="slide-subtitle">Walkthrough of the partner onboarding wizard, automated pre-flight security scan, and live mobile execution.</p>
          <div class="slide-divider"></div>
        </div>

        <div class="content-area">
          <div class="open-grid-3">
            <div class="open-col reveal">
              <div class="col-header">
                <h3 class="col-title">1. Partner Onboarding</h3>
                <span class="clean-tag">3-MIN FLOW</span>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Rapid Configuration</span></div>
                <div class="point-desc-clean">Registering a new ministry service, configuring GitLab repository hooks, and requesting camera and location permissions.</div>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Live Probing</span></div>
                <div class="point-desc-clean">Observing real-time SSRF and DNS endpoint validation before saving the partner profile.</div>
              </div>
            </div>

            <div class="open-col reveal">
              <div class="col-header">
                <h3 class="col-title">2. Pre-Flight Security</h3>
                <span class="clean-tag pass">AUDIT GATES</span>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot emerald">•</span><span>Instant Vulnerability Scan</span></div>
                <div class="point-desc-clean">Executing the 8 security scanners against the partner codebase and generating the executive compliance report.</div>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot emerald">•</span><span>Operator Sign-Off</span></div>
                <div class="point-desc-clean">Regulatory review in the live web sandbox emulator and promoting the build to staging.</div>
              </div>
            </div>

            <div class="open-col reveal">
              <div class="col-header">
                <h3 class="col-title">3. Mobile Runtime</h3>
                <span class="clean-tag">CITIZEN EXPERIENCE</span>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Seamless Launch</span></div>
                <div class="point-desc-clean">Scanning the dynamic QR code on a physical mobile device and launching the Flutter mini app with zero perceptible latency.</div>
              </div>
              <div class="clean-point">
                <div class="point-head-clean"><span class="point-dot">•</span><span>Native Bridge Execution</span></div>
                <div class="point-desc-clean">Testing real camera scanning, biometric authorization, and secure session management.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ==========================================
           SLIDE 14: Q&A / Conclusion
           ========================================== -->
      <section class="slide" id="slide-14">
        <div style="display: flex; flex-direction: column; justify-content: center; height: 100%; max-width: 1400px; margin: 0 auto; text-align: left;">
          <div class="reveal">
            <div class="org-bar" style="margin-bottom: 24px;">
              <img src="assets/fsa_logo.png" alt="FSA Logo" class="org-logo" style="width: 56px; height: 56px;">
              <div>
                <div class="org-title" style="font-size: 16px;">Fintech Center of General Secretariat of FSA</div>
                <div style="font-family: var(--font-mono); font-size: 12px; color: var(--text-sage);">Non-Bank Financial Services Authority</div>
              </div>
            </div>

            <div class="slide-eyebrow" style="margin-bottom: 16px; font-size: 14px;">EXECUTIVE DISCUSSION</div>
            <h1 class="slide-title" style="font-size: 60px; line-height: 1.1; margin-bottom: 20px;">Super App & Mini App Platform</h1>
            <p class="slide-subtitle" style="font-size: 22px; max-width: 1100px; margin-bottom: 40px; color: var(--text-muted);">
              Open for Strategic Guidance, Architectural Questions & Executive Direction.
            </p>

            <div style="display: flex; gap: 48px; border-top: 1px solid var(--border-line); padding-top: 28px;">
              <div>
                <div style="font-size: 18px; font-weight: 700; color: var(--gold); margin-bottom: 6px;">Sovereign Security</div>
                <div style="font-size: 14.5px; color: var(--text-sage); max-width: 340px;">Zero-trust architecture, bank-grade pre-flight gates, and national SSO integration.</div>
              </div>
              <div>
                <div style="font-size: 18px; font-weight: 700; color: var(--gold); margin-bottom: 6px;">Architectural Agility</div>
                <div style="font-size: 14.5px; color: var(--text-sage); max-width: 340px;">4 modular integration tiers supporting rapid public service scaling.</div>
              </div>
              <div>
                <div style="font-size: 18px; font-weight: 700; color: var(--gold); margin-bottom: 6px;">Regulatory Governance</div>
                <div style="font-size: 14.5px; color: var(--text-sage); max-width: 340px;">Centralized oversight, dynamic permission revocation, and immutable audit logs.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </main>
  </div>

  <nav class="deck-controls">
    <button class="deck-btn" id="prevBtn" title="Previous Slide (Left Arrow)">
      {svg("arrow-left", "currentColor", 16)}
    </button>
    <button class="deck-btn" id="tocBtn" title="Table of Contents (Agenda)">
      {svg("list", "currentColor", 16)}
    </button>
    <span class="slide-counter" id="slideCounter">01 / 14</span>
    <button class="deck-btn" id="nextBtn" title="Next Slide (Right Arrow / Space)">
      {svg("arrow-right", "currentColor", 16)}
    </button>
    <button class="deck-btn" id="fsBtn" title="Toggle Fullscreen (F)">
      {svg("maximize", "currentColor", 16)}
    </button>
  </nav>

  <div class="progress-bar" id="progressBar"></div>

  <script>
    class SlideDeck {{
      constructor() {{
        this.stage = document.getElementById('deckStage');
        this.slides = document.querySelectorAll('.slide');
        this.counter = document.getElementById('slideCounter');
        this.progressBar = document.getElementById('progressBar');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.tocBtn = document.getElementById('tocBtn');
        this.fsBtn = document.getElementById('fsBtn');

        this.currentIndex = 0;

        this.initScale();
        this.initEvents();
        this.goToSlide(0);
      }}

      initScale() {{
        const resize = () => {{
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const factor = Math.min(vw / 1920, vh / 1080);
          const x = (vw - 1920 * factor) / 2;
          const y = (vh - 1080 * factor) / 2;
          this.stage.style.transform = `translate(${{x}}px, ${{y}}px) scale(${{factor}})`;
        }};
        window.addEventListener('resize', resize);
        window.addEventListener('orientationchange', resize);
        resize();
      }}

      initEvents() {{
        window.addEventListener('keydown', (e) => {{
          if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown' || e.key === 'Enter') {{
            e.preventDefault();
            this.next();
          }} else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') {{
            e.preventDefault();
            this.prev();
          }} else if (e.key === 'Home') {{
            e.preventDefault();
            this.goToSlide(0);
          }} else if (e.key === 'End') {{
            e.preventDefault();
            this.goToSlide(this.slides.length - 1);
          }} else if (e.key === 'f' || e.key === 'F') {{
            this.toggleFullscreen();
          }}
        }});

        this.prevBtn.addEventListener('click', () => this.prev());
        this.nextBtn.addEventListener('click', () => this.next());
        this.tocBtn.addEventListener('click', () => this.goToSlide(1));
        this.fsBtn.addEventListener('click', () => this.toggleFullscreen());

        let startX = 0;
        window.addEventListener('touchstart', (e) => {{
          startX = e.touches[0].clientX;
        }}, {{ passive: true }});
        window.addEventListener('touchend', (e) => {{
          const diff = e.changedTouches[0].clientX - startX;
          if (diff < -50) this.next();
          else if (diff > 50) this.prev();
        }}, {{ passive: true }});
      }}

      goToSlide(index) {{
        if (index < 0 || index >= this.slides.length) return;

        this.slides[this.currentIndex].classList.remove('active');
        this.currentIndex = index;
        this.slides[this.currentIndex].classList.add('active');

        const cur = String(this.currentIndex + 1).padStart(2, '0');
        const tot = String(this.slides.length).padStart(2, '0');
        this.counter.textContent = `${{cur}} / ${{tot}}`;

        const pct = ((this.currentIndex + 1) / this.slides.length) * 100;
        this.progressBar.style.width = `${{pct}}%`;
      }}

      next() {{
        if (this.currentIndex < this.slides.length - 1) {{
          this.goToSlide(this.currentIndex + 1);
        }}
      }}

      prev() {{
        if (this.currentIndex > 0) {{
          this.goToSlide(this.currentIndex - 1);
        }}
      }}

      toggleFullscreen() {{
        if (!document.fullscreenElement) {{
          document.documentElement.requestFullscreen().catch(() => {{}});
        }} else {{
          document.exitFullscreen().catch(() => {{}});
        }}
      }}
    }}

    document.addEventListener('DOMContentLoaded', () => {{
      window.deck = new SlideDeck();
    }});
  </script>
</body>
</html>
'''

with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
    f.write(html_content)

print(f"Successfully generated clean executive HTML slide deck at: {OUTPUT_PATH}")
