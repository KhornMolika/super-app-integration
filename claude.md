# DSP Super App Integration Platform (POC) - Claude Guide

Welcome to the Digital Public Service (DSP) Super App Integration Platform codebase. This document serves as a comprehensive reference for AI assistants and developers working on this repository.

---

## 1. Project Overview & Vision

The **DSP Super App Integration Platform** is an enterprise-grade Proof of Concept (POC) designed to govern, validate, test, assemble, and distribute third-party **Mini Apps** inside a unified national/enterprise **Super App** ecosystem.

### Core Objectives:
* **Developer Self-Service**: Partners register and configure Mini Apps with required metadata, permissions, and URLs.
* **Automated Pre-Integration Gates**: Jenkins pipelines automatically perform security scanning, domain reachability, and sandbox verification.
* **Two-Stage Build Workflow**:
  1. **Stage 1 (Test Build)**: Once approved for testing, Jenkins compiles a `debug` test build (`superapp-test-build`) and publishes it to Sonatype Nexus (`apk-test-builds`). SA Admins and Partners test manually via physical Android devices or the interactive Backoffice Sandbox.
  2. **Stage 2 (Release Build)**: Upon final production activation, Jenkins compiles an official `release` build and stores it in Nexus (`apk-releases`) for live distribution.
* **Multi-Platform Testing**: Interactive testing in the Backoffice using an embedded **Flutter Web** container (`/superapp-sandbox`) and physical device testing via **Universal Android APKs**.

---

## 2. Monorepo Directory Structure

```
dsp-poc/
├── dps_backend/                     # NestJS API Gateway & Business Engine (Port 3000)
│   ├── src/
│   │   ├── auth/                    # JWT, JWKS, Authentication & Roles
│   │   ├── miniapps/                # Mini App CRUD, State Machine & Permissions
│   │   ├── integrations/
│   │   │   ├── jenkins/             # Jenkins CI/CD Trigger Service
│   │   │   ├── release-assembly/    # Build stage callbacks & Nexus artifact resolution
│   │   │   └── webview/             # Domain verification & security scanning
│   │   └── issues/                  # Automated & manual issue tracker
│   └── ormconfig.ts                 # PostgreSQL TypeORM configuration
│
├── dps_webapp_backoffice/           # Next.js 16 Admin Backoffice Portal (Port 3002)
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/download-apk/    # Streaming proxy route for Nexus APK downloads
│   │   │   ├── miniapps/            # Mini App catalog, details & live polling
│   │   │   └── releases/            # Release history & build artifact catalog
│   │   ├── components/ui/
│   │   │   ├── PreviewModal.tsx     # Device simulator with JS Bridge inspector
│   │   │   └── IframePreviewEngine.tsx # Embedded webview preview runner
│   │   └── public/
│   │       └── superapp-sandbox/    # Compiled Flutter Web Super App container
│
├── dps_mobile_app/                  # Flutter Super App Mobile Container
│   ├── lib/
│   │   ├── app/
│   │   │   ├── config/api_config.dart # Dynamic LAN/Wi-Fi/Emulator host resolver
│   │   │   ├── modules/
│   │   │   │   ├── home/            # Super App OneHub UI (Wallet, Catalog, Featured App)
│   │   │   │   ├── login/           # Auth screen with runtime host configuration
│   │   │   │   └── miniapp/         # Native WebView container with JS Bridge
│   │   │   └── routes/              # GetX navigation routes
│   └── build/                       # Multi-arch APK & Web artifacts
│
├── dps_core_package/                # Shared Dart/Flutter library across packages
├── dsp_miniapp_trust_regulator/     # Example Flutter In-App Module Mini App
├── dps_webview_webapp_banking/      # Sample WebView Mini App: Banking (Port 3003)
├── dps_webview_webapp_insurance/    # Sample WebView Mini App: Insurance (Port 3004)
├── scripts/
│   ├── jenkins/
│   │   ├── Jenkinsfile.superapp-test-build # CI/CD pipeline for APK & Web builds
│   │   └── Jenkinsfile.webview-validation  # Automated security gate pipeline
│   ├── download-test-apk.ps1       # One-click Windows PowerShell download script
│   └── download-test-apk.sh        # Bash download script for Linux/macOS
└── doc/
    └── Mini_App_Integration_Architecture_v2.md # End-to-end architecture specification
```

---

## 3. Technology Stack & Key Dependencies

| Component | Technology | Version / Tooling |
| :--- | :--- | :--- |
| **Backend API** | NestJS, TypeScript, TypeORM | Node 20+, PostgreSQL |
| **Backoffice Portal** | Next.js 16 (Turbopack), React 19, Tailwind CSS | pnpm |
| **Mobile Super App** | Flutter (Dart 3.12+), GetX, WebView Flutter | Android SDK 36, Gradle Kotlin DSL |
| **CI / CD** | Jenkins (Docker controller + Docker agent) | Fastlane, Docker in Docker |
| **Artifact Repository** | Sonatype Nexus OSS | Raw Repositories (`apk-test-builds`, `apk-releases`) |
| **Sample Mini Apps** | Next.js, Tailwind CSS, TypeScript | pnpm |

---

## 4. Key Workflows & Architectural Rules

### 4.1. Two-Stage Mini App Lifecycle
1. **DRAFT / SUBMITTED**: Partner submits Mini App metadata, URLs, and requested native permissions.
2. **SECURITY VALIDATION**: Jenkins runs automated domain validation and sandbox tests (`webview-validation`).
3. **APPROVED (Ready for Test)**: SA Admin approves the Mini App for testing.
4. **BUILDING**:
   * Backend triggers Jenkins pipeline `superapp-test-build` with parameter `BUILD_TYPE: debug`.
   * Fastlane packages the universal multi-architecture APK (`app-debug.apk`) and Flutter Web build.
   * Artifact is published to Sonatype Nexus under `apk-test-builds/superapp/v1.1.0/app-debug.apk`.
   * Jenkins sends build callback to `dps_backend`, which transitions the app to `TESTING`.
5. **TESTING (Manual Sandbox Testing Phase)**:
   * Mini App is featured on the Super App Home screen with a `TESTING` badge.
   * SA Admin and Partner test on physical Android devices or inside the Backoffice Sandbox (`Flutter Web`).
6. **ACTIVE (Production Release)**:
   * Final production approval triggers `superapp-test-build` with `BUILD_TYPE: release`.
   * Artifact is published to Nexus `apk-releases/superapp/v1.1.0/app-release.apk`.
   * App status transitions to `ACTIVE` in the public catalog.

### 4.2. Universal Android Architecture Rule
* Physical Android phones (Samsung, Xiaomi, Pixel) run on 64-bit ARM (`arm64-v8a`).
* **Never compile x86_64-only APKs** as real phones will fail with:
  `"App not installed as app isn't compatible with your phone"`.
* Always build universal multi-platform APKs supporting:
  `--target-platform android-arm,android-arm64,android-x64`.

### 4.3. Browser APK Streaming Route (`/api/download-apk`)
* Direct downloads from Sonatype Nexus raw repositories fail in Chromium browsers because Nexus transmits `Content-Security-Policy: sandbox ...` without `allow-downloads`.
* All download links in the Backoffice point to `/api/download-apk?type=test&version=v1.1.0`, which streams the file from Nexus with `Content-Disposition: attachment` and stripped CSP headers.

### 4.4. Host Resolution in Flutter (`ApiConfig`)
* Flutter uses `ApiConfig.resolveUrl(url)` to dynamically rewrite `localhost`, `10.0.2.2`, or `127.0.0.1` to the workstation's active LAN Wi-Fi IP so physical phones can reach backend and webview mini apps.

---

## 5. Development & Running Commands

### Package Manager
* **Strict Rule**: Always use **`pnpm`**, never `npm` or `yarn`.

### Starting Services

```bash
# 1. Backend API (Port 3000)
cd dps_backend
pnpm run start:dev

# 2. Backoffice Web Portal (Port 3002)
cd dps_webapp_backoffice
pnpm run dev

# 3. Sample Banking Mini App (Port 3003)
cd dps_webview_webapp_banking
pnpm run dev

# 4. Sample Insurance Mini App (Port 3004)
cd dps_webview_webapp_insurance
pnpm run dev

# 5. Build Flutter Super App APK (Universal)
cd dps_mobile_app
flutter build apk --debug --target-platform android-arm,android-arm64,android-x64

# 6. Build Flutter Web Super App Container
cd dps_mobile_app
flutter build web --base-href /superapp-sandbox/
```

### Download Helper Scripts
```powershell
# PowerShell (Windows)
powershell -ExecutionPolicy Bypass -File .\scripts\download-test-apk.ps1

# Bash (Linux / macOS)
bash ./scripts/download-test-apk.sh
```

---

## 6. Strict Development Conventions

1. **GIT POLICY**:
   * **DO NOT run `git push`** until the user explicitly requests it.
   * Keep all commits local on branch `molika`.
2. **UI & STYLING**:
   * Natural SVG vector icons only. **Never use emojis** in buttons, titles, or alerts.
   * Dark theme primary styling (`#080C14`, `#0F172A`, `#1E293B`) with emerald/cyan/brand accents.
3. **STATE SAFETY**:
   * In Dart/Flutter GetX controllers, do not mark dynamic route fields as `late final` to prevent `LateInitializationError` on re-navigation.
