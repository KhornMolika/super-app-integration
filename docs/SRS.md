# Software Requirements Specification (SRS)
## FSA SuperApp Ecosystem & Governance Platform
**Document Version:** 1.0.0  
**Project:** FinTech Center FSA SuperApp Platform (POC & Staging)  
**Standard Compliance:** IEEE Std 830-1998 / ISO/IEC/IEEE 29148  
**Last Updated:** November 20, 2026  
**Lead Architect / Author:** Khorn Molika  
**Stakeholder / Project Sponsor:** Lok Kru & FinTech Center FSA Leadership  

---

## Table of Contents
1. [Introduction](#1-introduction)
   - 1.1 Purpose
   - 1.2 System Scope & Vision
   - 1.3 Definitions, Acronyms & Abbreviations
   - 1.4 Architectural Overview
2. [User Roles, Personas & Access Hierarchy](#2-user-roles-personas--access-hierarchy)
3. [System High-Level Architecture & Tech Stack](#3-system-high-level-architecture--tech-stack)
4. [Functional Requirements (FR-001 to FR-125)](#4-functional-requirements)
   - [Module 1: MiniApp Registration & Multi-Tier Onboarding (FR-001 to FR-016)](#module-1-miniapp-registration--multi-tier-onboarding)
   - [Module 2: CI/CD Pipeline, Automated Security Scanners & Nexus Artifact Management (FR-017 to FR-032)](#module-2-cicd-pipeline-automated-security-scanners--nexus-artifact-management)
   - [Module 3: Governance, Review Request Checklist & Instant Zero-Binary Rollback (FR-033 to FR-048)](#module-3-governance-review-request-checklist--instant-zero-binary-rollback)
   - [Module 4: SuperApp Marketing Banners Full-Stack System (FR-049 to FR-062)](#module-4-superapp-marketing-banners-full-stack-system)
   - [Module 5: Device Capabilities & Mini-App SDK Bridge - ADR-004 (FR-063 to FR-080)](#module-5-device-capabilities--mini-app-sdk-bridge---adr-004)
   - [Module 6: Mobile SuperApp Consumer Shell & Dynamic Engine (FR-081 to FR-096)](#module-6-mobile-superapp-consumer-shell--dynamic-engine)
   - [Module 7: Notifications, Developer Announcements & System Alerts (FR-097 to FR-110)](#module-7-notifications-developer-announcements--system-alerts)
   - [Module 8: User Management, Multi-Tenancy & Platform Governance (FR-111 to FR-125)](#module-8-user-management-multi-tenancy--platform-governance)
5. [Non-Functional Requirements (NFR-001 to NFR-025)](#5-non-functional-requirements)
   - 5.1 Security & Zero-Trust Isolation (NFR-001 to NFR-005)
   - 5.2 Performance, Throughput & Latency (NFR-006 to NFR-010)
   - 5.3 Reliability, Availability & Zero-Binary Rollback (NFR-011 to NFR-015)
   - 5.4 Usability, Responsiveness & Accessibility (NFR-016 to NFR-020)
   - 5.5 Testability, Quality Assurance & Auditability (NFR-021 to NFR-025)
6. [System Interfaces & Data Models](#6-system-interfaces--data-models)
7. [Requirements Traceability Matrix (RTM) Summary](#7-requirements-traceability-matrix-rtm-summary)

---

## 1. Introduction

### 1.1 Purpose
This document establishes the official Software Requirements Specification (SRS) for the **FSA SuperApp Ecosystem & Governance Platform**. It defines the complete inventory of Functional Requirements (FR) and Non-Functional Requirements (NFR) governing:
1. The **FSA Backoffice Administration Portal** (Next.js 16 App Router).
2. The **FSA SuperApp Core Backend API Gateway** (NestJS 10 REST & WebSocket microservices).
3. The **FSA Mobile SuperApp Consumer Shell** (Flutter 3.44+ multi-engine mobile runtime).
4. The **Mini-App SDKs & Device Capability Bridges** (Flutter SDK, Web Bridge, Native SDK).
5. The **Automated CI/CD, Containerized Security Scanner & Nexus Pipeline** (Jenkins Fastlane & Sonatype Nexus).

### 1.2 System Scope & Vision
The FSA SuperApp Platform empowers Cambodia's Non-Bank Financial Services Authority (FSA) and authorized partner entities (commercial banks, microfinance institutions, insurers, public utilities, transit operators) to deploy, govern, verify, and run sandboxed mini-applications inside a unified consumer mobile super-app.

The platform provides regulatory assurance through:
- Automated containerized security audits.
- Cryptographic domain ownership challenges.
- Hardware-backed permission gating.
- Zero-binary client-side rollback mechanisms that instantly revoke unapproved capabilities without mobile store recompilation.

### 1.3 Definitions, Acronyms & Abbreviations
| Term / Acronym | Full Definition |
| :--- | :--- |
| **FSA** | Non-Bank Financial Services Authority of Cambodia. |
| **ADR-004** | Architectural Decision Record 004 defining the Standardized Hardware Rejection Envelope Contract. |
| **JSBridge** | Bi-directional JavaScript-to-Native communication channel in WebView runtimes. |
| **Zero-Binary Rollback** | Dynamic client capability revocation and app version reversion without submitting new APKs/IPAs to App Stores. |
| **Nexus OSS** | Sonatype Nexus Repository Manager hosting raw artifacts and private Flutter packages. |
| **Harbor** | Enterprise-grade private Docker/OCI container registry for deployed microservices. |
| **RBAC** | Role-Based Access Control enforced at API gateway and UI navigation levels. |
| **JWT** | JSON Web Token signed with RSA/HMAC containing scoped capability authorizations. |

### 1.4 Architectural Overview
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 FSA SUPERAPP ECOSYSTEM                                 │
├─────────────────────────┬───────────────────────────────┬──────────────────────────────┤
│ 1. Backoffice Portal    │ 2. Backend API Gateway        │ 3. Mobile Shell & Runtimes   │
│ Next.js 16 App Router   │ NestJS 10 + TypeORM           │ Flutter 3.44 Multi-Engine    │
│ React 19, Tailwind CSS  │ PostgreSQL 16 + Redis 7       │ Riverpod 2.6 State           │
│ Lucide Vector UI        │ MinIO S3 + Resend Mail        │ Dart JSBridge & Platform Ch. │
├─────────────────────────┴───────────────────────────────┴──────────────────────────────┤
│ 4. CI/CD & Artifact Governance: Jenkins Fastlane + Sonatype Nexus 3.98 + Harbor Reg   │
│ 5. MiniApp Ecosystem: 6 Sample Mini-Apps across Web, Flutter, Native SDK, Deep Link    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. User Roles, Personas & Access Hierarchy

| Role ID | Role Name | Scope & Authority |
| :--- | :--- | :--- |
| **R-01** | `SUPER_ADMIN` | Full platform control. Approves mini-app promotions, initiates emergency version rollbacks, manages platform integration policies, and administers tenant organizations. |
| **R-02** | `FSA_ADMIN` / `OFFICER` | Regulatory reviewer. Inspects security validation reports, issues structured change requests, monitors compliance checklists, and views audit logs. |
| **R-03** | `PARTNER_ADMIN` | Organization administrator. Registers mini-apps under tenant organization, initiates domain challenges, requests device capabilities, and monitors CI builds. |
| **R-04** | `DEVELOPER` | Mini-app engineer. Submits Git repositories/ZIP packages, fixes remediation checklists, tests in sandbox preview, and receives direct system alerts. |
| **R-05** | `END_USER` | Consumer / Citizen. Discovers approved mini-apps, authenticates via phone/OTP, launches sandboxed apps, and grants hardware permissions. |

---

## 3. System High-Level Architecture & Tech Stack

- **Frontend Backoffice**: Next.js 16 (App Router), React 19, Tailwind CSS, Lucide Vector Icons, TypeScript 5.5.
- **Backend Services**: NestJS 10, TypeORM, PostgreSQL 16, Redis 7 (Rate Limiting & Caching), Multer (Multipart File Ingestion), MinIO S3 Private Storage.
- **Mobile Engine**: Flutter 3.44.4 (Dart 3.12.2), Riverpod 2.6, Dio HTTP Client, Webview Flutter, Flutter NFC Kit, Local Auth (Biometrics), Flutter Secure Storage.
- **CI/CD Infrastructure**: Jenkins 2.450 LTS (Fastlane Android/iOS Pipeline), Sonatype Nexus 3.98.2 (OpenJDK 21.0.13.1), Harbor OCI Registry, Git Subtree Multi-Repo Sync.

---

## 4. Functional Requirements

### Module 1: MiniApp Registration & Multi-Tier Onboarding

- **FR-001 (Five-Tier Architecture Support):** The system shall support 5 distinct mini-app integration tiers:
  1. `WEBVIEW`: Hosted web application running inside an isolated WebKit/Chromium container.
  2. `FLUTTER_PACKAGE`: Compiled Dart package pre-assembled into the native shell.
  3. `NATIVE_SDK`: Native Android (AAR/Maven) and iOS (Framework/CocoaPods) binaries.
  4. `GIT_SOURCE`: Direct Git repository clone compiled via automated Jenkins SCM pipelines.
  5. `DEEP_LINK`: Registered custom URI scheme and external native application delegation.
- **FR-002 (Multi-Step Registration Wizard):** The Backoffice shall provide a 6-step guided wizard enforcing mandatory field validations, category selection, and state progression.
- **FR-003 (Multilingual Validation):** Mini-app titles and descriptions shall validate support for both English (Latin) and Khmer (Unicode) character sets.
- **FR-004 (Media & Logo Upload):** The system shall accept PNG/JPEG/SVG icon assets (max 2MB), enforce square 1:1 aspect ratios, and upload assets into private MinIO storage (`superapp-storage`).
- **FR-005 (DNS TXT Verification):** The system shall verify WebView domain ownership by querying DNS TXT records for a backend-generated challenge string (`fsa-verify=<TOKEN>`).
- **FR-006 (HTML Meta Tag Verification):** The system shall verify WebView domains by fetching the target root URL and probing for `<meta name="fsa-superapp-verification" content="<TOKEN>">`.
- **FR-007 (Well-Known Token Verification):** The system shall verify WebView domains by probing `https://<DOMAIN>/.well-known/fsa-superapp-token`.
- **FR-008 (Cryptographic Token Generator):** The system shall issue HMAC-SHA256 signed pre-verification tokens bound to specific organization and application IDs.
- **FR-009 (Target Audience Scoping):** The system shall allow administrators to assign audience scopes: `PUBLIC` (all consumers), `ALL_FSA_STAFF` (internal officers), or `ORGANIZATION_ONLY` (tenant employees).
- **FR-010 (Native SDK Class Locking):** The Backoffice shall lock Maven coordinates and Android entry class names (`com.company.module.EntryActivity`) to prevent runtime instantiation errors.
- **FR-011 (Git Commit SHA Resolution):** The system shall connect to partner Git repositories via SSH deploy keys and automatically resolve the latest HEAD commit SHA on branch/tag change.
- **FR-012 (Deep Link Syntax Validation):** The system shall validate custom URI schemes against RFC 3986 syntax and prohibit reserved schemes (`http`, `https`, `file`, `javascript`).
- **FR-013 (Store Fallback Redirection):** For Deep Link mini-apps, the system shall require Apple App Store and Google Play URLs to redirect users when the target app is not installed.
- **FR-014 (Capability Proposal Engine):** Mini-app registrants shall select required hardware capabilities from a defined registry and supply detailed business justifications for each.
- **FR-015 (Interactive Web Sandbox Preview):** The Backoffice shall provide an embedded web preview runner (`/superapp-sandbox`) compiling Flutter Web containers with a simulated JSBridge inspector.
- **FR-016 (Nexus APK Download Proxy):** The Backoffice route `/api/download-apk` shall stream APK binaries from Nexus storage, stripping restrictive iframe sandbox CSP download headers.

---

### Module 2: CI/CD Pipeline, Automated Security Scanners & Nexus Artifact Management

- **FR-017 (Two-Stage Build Assembly):** The Jenkins pipeline shall enforce two discrete packaging phases:
  - *Stage 1 (Debug Build)*: Generated upon initial submission for automated scanning and reviewer inspection.
  - *Stage 2 (Release Build)*: Production signed APK assembled upon Super Admin final approval.
- **FR-018 (Dynamic Apps Fast-Track Pipeline):** The pipeline shall bypass binary Jenkins compilation for `WEBVIEW` and `DEEP_LINK` mini-apps, instantly promoting them from `APPROVED` to `TESTING`.
- **FR-019 (Fastlane Android Assembly):** Jenkins shall execute Fastlane tasks compiling both universal APKs and split architecture (`arm64-v8a`) binaries.
- **FR-020 (Containerized Security Audit):** Build jobs shall trigger isolated containerized security scanners probing mini-app bundles before reviewer handoff.
- **FR-021 (Secret Leakage Detection):** Scanners shall analyze source code and strings for exposed API keys, private keys, AWS tokens, and hardcoded credentials.
- **FR-022 (Vulnerability & Injection Probes):** Scanners shall verify input validation boundaries to detect SQL injection, command execution, and insecure HTTP network endpoints.
- **FR-023 (Sonatype Nexus Repository Hosting):** Compiled test and release artifacts shall upload automatically to Sonatype Nexus raw repositories (`apk-test-builds`).
- **FR-024 (SHA-256 Release Checksums):** Every compiled artifact must generate and record an immutable SHA-256 checksum in the release manifest.
- **FR-025 (Port 443 SSH Firewall Bypass):** Jenkins agent nodes shall route Git SCM requests over SSH port 443 (`ssh.github.com` / private GitLab) to bypass corporate egress firewall locks.
- **FR-026 (Webhook Callback Receiver):** The API Gateway endpoint `POST /integrations/jenkins/build-callback` shall authenticate Jenkins webhook tokens and advance mini-app states.
- **FR-027 (Intelligent Failure Classifier):** The build engine shall analyze console logs to distinguish between *Platform Infrastructure Defects* (network timeouts, disk exhaustion) and *Developer Code Defects* (compilation errors, lint failures).
- **FR-028 (Nexus Storage Retention Policy UI):** The Backoffice `/settings/retention` route shall provide controls to configure artifact expiration windows (days) and maximum retained versions per app.
- **FR-029 (Real-Time Telegram Build Cards):** The build engine shall dispatch Telegram bot notification cards displaying build status, commit SHA, and direct download links.
- **FR-030 (Transactional Resend Emails):** Developers shall receive transactional emails via Resend notifying them of scan completions, approvals, or review change requests.
- **FR-031 (Harbor Container Deployment Script):** The platform shall provide automated PowerShell scripts (`publish-containers-to-harbor.ps1 -Target all`) building and publishing OCI containers to Harbor registry.
- **FR-032 (Diagnostic Log Streaming):** Authorized reviewers shall view live and historical Jenkins build logs directly within the Backoffice mini-app detail drawer.

---

### Module 3: Governance, Review Request Checklist & Instant Zero-Binary Rollback

- **FR-033 (Finite State Machine):** Mini-apps must strictly transition across 8 deterministic states:
  $$\text{DRAFT} \longrightarrow \text{SUBMITTED} \longrightarrow \text{SCANNING} \longrightarrow \text{IN\_REVIEW} \longrightarrow \text{APPROVED} \longrightarrow \text{TESTING} \longrightarrow \text{ACTIVE}$$
  With branching transitions for `CHANGES_REQUESTED`, `SUSPENDED`, and `ROLLBACK`.
- **FR-034 (Structured Change Request Modal):** Reviewers shall return applications with structured change requests selecting from 6 standardized tags: Security, Compliance, UI/UX, Performance, Metadata, or Capabilities.
- **FR-035 (Remediation Quick-Fix Snippets):** The review modal shall provide pre-written regulatory guidance snippets that populate directly into developer feedback.
- **FR-036 (Gated Developer Resubmission):** In the partner portal, the "Resubmit for Review" action shall remain cryptographically and visually disabled until all checklist items are checked off.
- **FR-037 (Multi-Version Revision Tracking):** The database shall maintain an immutable revision ledger tracking each version bump (`v1.0.0` ➔ `v1.1.0`), recording granted permissions, code URLs, and release notes.
- **FR-038 (Backoffice Version History Tab):** The Backoffice shall feature a dedicated `VersionHistoryTab` displaying all past and active versions, author timestamps, and active status indicators.
- **FR-039 (Instant One-Click Rollback Endpoint):** Super Admins shall execute emergency rollbacks via `POST /miniapps/:id/rollback`, designating the target prior version.
- **FR-040 (Zero-Binary Client Revocation):** Rolling back an app shall instantly update the mobile catalog manifest, causing mobile clients to revoke unapproved hardware permissions immediately without native recompilation.
- **FR-041 (Version Diff Inspection):** Reviewers shall inspect side-by-side capability and configuration differences between the active version and previous versions.
- **FR-042 (Audit Ledger Logging):** Every state transition, change request, capability grant, and rollback must write an append-only audit record containing user ID, IP address, and payload diff.
- **FR-043 (MiniApp Suspension Controls):** Administrators shall instantly suspend an active mini-app, dropping it from consumer mobile feeds in real time.
- **FR-044 (Tenant Ownership Transfer):** The system shall allow Super Admins to transfer mini-app ownership across organizations while recalculating access privileges.
- **FR-045 (Cross-Organization Registration Gate):** Super Admins can register mini-apps on behalf of any approved organization, while Partner Admins are locked to their own tenant.
- **FR-046 (Reviewer Feedback Timeline):** The mini-app review drawer shall display a chronological history of all review rounds, comments, and reviewer identities.
- **FR-047 (Automated E2E Lifecycle Regression Suite):** The platform shall maintain automated Jest suites (`e2e-capability-version-lifecycle.spec.ts`) verifying version bumps, reviewer approvals, and rollback revocation.
- **FR-048 (Sandbox Warm-Up on Scan Pass):** The moment an app passes automated security scanning, the platform shall pre-compile its interactive web sandbox preview before reviewer inspection begins.

---

### Module 4: SuperApp Marketing Banners Full-Stack System

- **FR-049 (Dedicated Backoffice Banners Route):** The Backoffice shall provide a dedicated administrative route `/banners` for marketing and promotional carousel management.
- **FR-050 (Banner Asset Ingestion):** The banner modal shall accept 16:9 aspect ratio image assets (PNG, JPG, WebP up to 5MB) and upload them to private storage.
- **FR-051 (Drag-and-Drop Sequencing):** The Backoffice table shall support drag-and-drop reordering to adjust banner presentation priority on mobile devices.
- **FR-052 (Batch Reordering Endpoint):** The API Gateway endpoint `PATCH /banners/reorder` shall accept an array of `{ id, displayOrder }` pairs and persist ordering within an atomic database transaction.
- **FR-053 (Action Target Selector):** Each banner must be mapped to one of three target actions:
  - `MINIAPP`: Deep launches an approved mini-app within the mobile shell container.
  - `DEEPLINK`: Triggers an external or registered custom scheme deep link.
  - `EXTERNAL_URL`: Launches an external web page in a secure in-app browser sheet.
- **FR-054 (Temporal Scheduling Controls):** Banners shall support optional start date (`startDate`) and expiration date (`endDate`) controls, alongside an instant `isActive` toggle.
- **FR-055 (Mobile Screen Simulator):** The banner modal shall display a live mobile viewport preview rendering the banner exactly as it will appear in the consumer shell.
- **FR-056 (Admin Banner Querying):** The endpoint `GET /banners` shall allow administrators to query banners with pagination, search, active state, and audience filters.
- **FR-057 (Banner Creation API):** The endpoint `POST /banners` shall accept multipart/form-data or JSON payloads to register banners with audience scoping.
- **FR-058 (Banner Modification API):** The endpoints `PUT /banners/:id` and `PATCH /banners/:id` shall update banner metadata, re-upload assets, or adjust scheduling dates.
- **FR-059 (Banner Deletion API):** The endpoint `DELETE /banners/:id` shall remove the banner record and delete associated media objects from private storage.
- **FR-060 (Public Filtered Mobile Feed):** The endpoint `GET /mobile/banners` shall return only active, currently unexpired banners matching the caller's audience privileges (`PUBLIC` or `ALL_FSA_STAFF`).
- **FR-061 (Flutter Home Carousel Slider):** The Flutter SuperApp Home screen shall consume `bannersProvider` to render an animated auto-playing carousel slider (`HeroBannerSlider`).
- **FR-062 (Offline Banner Fallback):** When the mobile device is offline, the banner carousel shall render cached local fallback assets rather than displaying empty states.

---

### Module 5: Device Capabilities & Mini-App SDK Bridge (ADR-004)

- **FR-063 (Standard Hardware Rejection Envelope):** All device capability bridges must conform to ADR-004 specification, returning standardized rejection objects:
  ```json
  {
    "success": false,
    "error": {
      "code": "CAPABILITY_NOT_APPROVED | USER_REFUSED | TIMEOUT",
      "message": "Human-readable explanation",
      "userActionRequired": "SETTINGS | RETRY | NONE"
    }
  }
  ```
- **FR-064 (Cryptographic Capability Token):** Device hardware access shall require a backend-signed JWT launch token containing authorized capability scopes in its payload.
- **FR-065 (Runtime Permission Gate):** The mobile shell shall reject capability invocations if the calling mini-app's launch token lacks the required scope.
- **FR-066 (Hardware Availability Probe):** Mini-apps shall invoke `canIUse(capabilityKey)` to verify whether the host device supports a feature before invoking it.
- **FR-067 (Geolocation Bridge):** The `get_location` bridge shall query high-accuracy GPS coordinates, returning latitude, longitude, altitude, accuracy (meters), and ISO-8601 timestamp.
- **FR-068 (Biometric Authentication Bridge):** The `biometric_auth` bridge shall invoke device biometric prompts (Fingerprint, TouchID, FaceID, Device PIN), returning boolean success upon verification.
- **FR-069 (QR & Barcode Scanner Bridge):** The `scan_qr_code` bridge shall launch an integrated camera viewfinder, decode barcodes/QR codes, and return raw text payloads.
- **FR-070 (Camera Photo Capture Bridge):** The `take_photo` bridge shall capture photos from device cameras with configurable compression and aspect ratio constraints.
- **FR-071 (Photo Gallery Picker Bridge):** The `photo_library` bridge shall invoke system image pickers allowing users to select existing device photos.
- **FR-072 (Hardware Encrypted Secure Storage):** The `secure_storage` bridge shall provide sandboxed key-value storage backed by Android Keystore and iOS Keychain (`get`, `set`, `delete`).
- **FR-073 (NFC Contactless Card Reader):** The `nfc` bridge shall read NFC tags, contactless transit cards, and RFID badges, returning serial numbers and NDEF payloads.
- **FR-074 (Flutter SDK Distribution):** The platform shall publish `fsa_superapp_miniapp_flutter_sdk` (Contract v2.0.0) exposing typed wrappers for all 7 capabilities.
- **FR-075 (Banking Mini-App Playground):** The `ma_webview_banking` sample app shall test all 7 capabilities in Next.js 16, simulating fund transfers and ADR-004 error envelopes.
- **FR-076 (KYC Identity Mini-App SDK):** The `ma_flutter_kyc` sample app shall consume the Flutter SDK to capture National ID photos, verify face biometrics, and geocode addresses.
- **FR-077 (Insurance Claim Mini-App Bridge):** The `ma_webview_insurance` sample app shall capture vehicle damage photos, roadside GPS assistance, and biometric quote sign-offs.
- **FR-078 (HR Attendance Geofence Mini-App):** The `fsa_hr_miniapp` sample app shall enforce GPS geofencing (< 1,000m from FSA HQ: `11.5564, 104.9282`), biometric punch verification, and encrypted storage punch receipts.
- **FR-079 (Transit NFC Tap-to-Ride Mini-App):** The `ma_flutter_transit` sample app shall exercise `readNfc` turnstile tap-to-ride, QR gate scanning, and GPS nearest transit stop lookups.
- **FR-080 (Retail Loyalty Rewards Mini-App):** The `ma_flutter_loyalty` sample app shall exercise `scan_qr_code` for merchant rewards points and `secure_storage` for encrypted offline voucher vaults.

---

### Module 6: Mobile SuperApp Consumer Shell & Dynamic Engine

- **FR-081 (Dynamic Catalog Feed):** The endpoint `GET /mobile/catalog` shall deliver approved mini-apps grouped by category, filtered by user audience scopes.
- **FR-082 (Single Sign-On Launch Token):** The endpoint `GET /mobile/launch-token` shall issue cryptographic launch tokens enabling seamless mini-app entry without re-authentication.
- **FR-083 (Mobile Consumer Authentication):** The mobile shell shall support phone number and password authentication with OTP verification (`POST /mobile/auth/login`).
- **FR-084 (Consumer Registration):** The mobile shell shall allow new consumers to register with phone number, password, and SMS/Email verification (`POST /mobile/auth/register`).
- **FR-085 (Dynamic Mobile Configuration):** The endpoint `GET /mobile/config` shall provide minimum supported app versions, maintenance banners, and forced update flags.
- **FR-086 (Regulator Directory Feed):** The endpoint `GET /mobile/regulators` shall return official directory information for the Non-Bank Financial Services Authority.
- **FR-087 (Bidirectional WebView JSBridge):** The Flutter mobile shell shall embed WebView containers with a secure bidirectional JavaScript bridge routing messages to native platform channels.
- **FR-088 (Native SDK Platform Channels):** The mobile shell shall maintain MethodChannels invoking pre-compiled native Android/iOS SDK modules.
- **FR-089 (Deep Link Scheme Interception):** The shell shall intercept registered URL schemes, routing internal traffic to mini-app engines and external links to system browsers.
- **FR-090 (Dynamic Wi-Fi Host Resolution):** In development mode, the mobile app shall dynamically resolve host workstation IP addresses across local subnets.
- **FR-091 (Consumer Avatar Management):** Consumers shall upload profile avatars via `POST /mobile/me/avatar`, served securely via `GET /mobile/me/avatar` with ETag caching.
- **FR-092 (Consumer Account Deletion):** The mobile shell shall provide a self-service account deletion workflow adhering to App Store / Google Play privacy guidelines (`POST /mobile/me/delete`).
- **FR-093 (Global Connectivity Guard):** The mobile shell shall monitor real-time network connectivity, displaying non-intrusive offline banners when connectivity is lost.
- **FR-094 (Wallet Interface):** The mobile shell shall provide a digital wallet dashboard displaying simulated cash balances, loyalty points, and transaction history.
- **FR-095 (Material 3 Theme Engine):** The mobile UI shall adhere to Material Design 3 guidelines with seed color schemes (`#059669` emerald, `#0891B2` cyan).
- **FR-096 (Zero-Binary Cache Invalidation):** When a mini-app is updated or rolled back, the mobile catalog cache shall invalidate instantly upon next app foregrounding.

---

### Module 7: Notifications, Developer Announcements & System Alerts

- **FR-097 (Notification Listing):** The endpoint `GET /notifications` shall deliver paginated notifications for authenticated staff, including read states and timestamps.
- **FR-098 (Single Notification Read Receipt):** The endpoint `PATCH /notifications/:id/read` shall mark individual notification items as read.
- **FR-099 (Single Notification Deletion):** The endpoint `DELETE /notifications/:id` shall delete a specific notification item.
- **FR-100 (Multi-Notification Selection UI):** The Backoffice notification center shall provide checkboxes to select individual notifications or "Select All".
- **FR-101 (Bulk Notification Deletion API):** The endpoint `DELETE /notifications/bulk` shall accept an array of notification IDs and purge them within a single transaction.
- **FR-102 (Developer Direct Alert Modal):** The Backoffice shall provide a `SendAlertModal` allowing administrators to compose and dispatch technical notices directly to mini-app dev teams.
- **FR-103 (Developer Alert Dispatch API):** The endpoint `POST /miniapps/:id/notify-developer` shall validate administrative permissions and dispatch issue notices to registered team members.
- **FR-104 (Developer Announcements Feed):** The endpoint `GET /announcements` shall deliver platform-wide announcements for developer dashboards with audience filtering.
- **FR-105 (Developer Announcements Unread Counter):** The endpoint `GET /announcements/unread` shall return the count of unread announcements for the logged-in developer.
- **FR-106 (Real-Time WebSocket Notifications):** The backend shall maintain WebSocket gateways dispatching real-time notifications to the Backoffice bell indicator.
- **FR-107 (Notification Category Taxonomy):** Notifications shall categorize into `MINIAPP_UPDATE`, `SECURITY_ALERT`, `ANNOUNCEMENT`, and `ACTION_REQUIRED`.
- **FR-108 (Notification Deep Linking):** Clicking a notification in the Backoffice shall navigate directly to the affected mini-app review drawer or detail view.
- **FR-109 (System Event Logging):** Critical administrative actions (approvals, rollbacks, deletions) shall automatically dispatch audit notifications to platform administrators.
- **FR-110 (Automated Notification Pruning):** The backend shall run scheduled background tasks pruning read notifications older than 90 days.

---

### Module 8: User Management, Multi-Tenancy & Platform Governance

- **FR-111 (Multi-Tenancy Isolation):** The database shall enforce tenant isolation, ensuring partner organizations cannot access or modify each other's mini-apps.
- **FR-112 (Organization Profile CRUD):** Administrators shall create, view, edit, and deactivate organizations, storing business registration numbers and legal classifications.
- **FR-113 (Official Contact Email Binding):** Each organization must specify an official contact email utilized for regulatory notifications and domain verification.
- **FR-114 (Cascading Inactivation Warnings):** Deactivating or deleting an organization shall trigger a modal displaying the count of associated mini-apps and users that will be affected.
- **FR-115 (Role-Based Access Control):** The backend shall enforce `@RequirePermissions()` decorators combined with `JwtAuthGuard` and `RbacGuard` across all administrative endpoints.
- **FR-116 (Role & Permission Management UI):** The Backoffice `/roles` route shall allow Super Admins to define custom permission matrices for staff and partner roles.
- **FR-117 (Assigned Users Counter):** The roles table shall display real-time counters of users assigned to each role alongside active/inactive status toggles.
- **FR-118 (User Approval State Machine):** New user registrations shall enter a `PENDING_APPROVAL` state, requiring administrative verification before access is granted.
- **FR-119 (Single-Use Password Reset Tokens):** Password reset requests shall generate cryptographic single-use 6-digit OTP codes expiring within 15 minutes.
- **FR-120 (Auth Rate Limiting Guard):** The auth controller shall enforce rate limits (`AuthRateLimitGuard`) restricting consecutive failed login attempts by IP and email.
- **FR-121 (Nexus Artifact Retention Controls):** The Backoffice shall provide visual controls to configure automatic artifact pruning policies based on age and build counts.
- **FR-122 (Jenkins Timing Configuration):** The Backoffice shall allow Super Admins to configure pipeline execution timeouts and polling frequencies (`/settings/pipeline-timing`).
- **FR-123 (Platform Integration Methods Policy):** The endpoint `PUT /settings/integration-methods` shall enable/disable specific integration tiers platform-wide.
- **FR-124 (Tenant Integration Tier Overrides):** The endpoint `PUT /organizations/:id/methods` shall define organization-specific integration tier policies (e.g., forbidding Native SDK for unvetted partners).
- **FR-125 (Security Validation & CVE Ledger):** The Backoffice `/security` tab shall maintain a ledger of completed security scans, identified CVEs, and compliance remediation logs.

---

## 5. Non-Functional Requirements

### 5.1 Security & Zero-Trust Isolation
- **NFR-001 (Principle of Least Privilege):** Mini-apps running in the mobile shell or web sandbox shall have zero implicit access to device hardware APIs without explicit Backoffice capability grants.
- **NFR-002 (Cryptographic Token Signing):** Capability launch tokens must be cryptographically signed using RSA-256 or HMAC-SHA256 with ephemeral or rotating keys.
- **NFR-003 (Iframe Sandbox Hardening):** Web sandbox previews must run in sandboxed iframes restricting script execution, top-navigation, and popups (`sandbox="allow-scripts allow-same-origin"`).
- **NFR-004 (Artifact Tamper Proofing):** All binaries stored in Nexus and distributed to mobile clients must match their recorded SHA-256 cryptographic hashes.
- **NFR-005 (Input Sanitization):** All form submissions and REST endpoints must sanitize inputs against shared Zod/class-validator schemas, rejecting malformed requests with structured 400 Bad Request responses.

### 5.2 Performance, Throughput & Latency
- **NFR-006 (Backoffice Page Latency):** Backoffice pages shall render within 500ms on standard 4G broadband connections.
- **NFR-007 (Search Debounce Efficiency):** Client-side search and filtering inputs must be debounced by 300ms before dispatching remote network queries.
- **NFR-008 (Streaming Binary Proxying):** The APK streaming proxy (`/api/download-apk`) shall stream binaries directly from storage with chunked transfer encoding, avoiding memory exhaustion.
- **NFR-009 (Mobile Shell Startup):** The Flutter mobile shell shall complete cold startup and render the catalog home screen within 1.5 seconds on mid-range Android devices.
- **NFR-010 (Sub-50ms Token Verification):** Capability JWT verification at the mobile bridge platform channel must execute within 50 milliseconds.

### 5.3 Reliability, Availability & Zero-Binary Rollback
- **NFR-011 (Sub-Second Rollback Propagation):** Initiating a version rollback from the Backoffice must propagate to the mobile catalog within 1 second without server downtime.
- **NFR-012 (High Availability SLA):** Core backend services and API gateways shall maintain 99.9% uptime outside of scheduled maintenance windows.
- **NFR-013 (Atomic Transaction Safety):** All multi-entity state updates (reordering banners, rolling back versions, deleting organizations) must execute within PostgreSQL ACID transactions.
- **NFR-014 (Offline-First Mobile Shell):** When connectivity is lost, the Flutter mobile app must continue functioning in read-only mode using cached catalog and voucher data.
- **NFR-015 (Resilient WebSocket Reconnection):** Backoffice and mobile notification sockets must implement exponential backoff reconnection strategies upon network interruption.

### 5.4 Usability, Responsiveness & Accessibility
- **NFR-016 (Responsive Mobile Backoffice):** Backoffice layouts must adapt seamlessly to mobile viewports (< 640px), stacking table records into readable mobile cards.
- **NFR-017 (Standardized Vector Iconography):** The Backoffice and mobile applications must exclusively utilize Lucide/Material vector icons (zero emojis).
- **NFR-018 (WCAG 2.1 AA Contrast Compliance):** All user interface components and text labels must meet WCAG 2.1 Level AA color contrast standards (minimum 4.5:1 ratio).
- **NFR-019 (Form Hydration & Draft Persistence):** Unsubmitted multi-step wizard progress must save locally to prevent data loss upon accidental browser refresh.
- **NFR-020 (Clear Error Messaging):** Error dialogs must state actionable next steps (e.g., explaining why a domain verification challenge failed with remediation instructions).

### 5.5 Testability, Quality Assurance & Auditability
- **NFR-021 (100% Automated Test Pass Rate):** The backend codebase must pass 100% of automated unit and integration tests (154/154 suites, 1,494/1,494 tests passing).
- **NFR-022 (Zero Dart Analyzer Issues):** All Flutter mobile packages and mini-apps must compile with zero Dart analyzer errors or lint warnings.
- **NFR-023 (Immutable Audit Trails):** Audit logs must record timestamp, user ID, client IP, action type, and before/after payloads for all administrative operations.
- **NFR-024 (E2E Regression Traceability):** Every critical user journey (app registration, approval, capability grant, rollback) must have automated E2E test coverage.
- **NFR-025 (Automated Knowledge Graph Maintenance):** Codebase ASTs, dependencies, and community clusters must remain indexed and queryable via `graphify` knowledge graphs.

---

## 6. System Interfaces & Data Models

### 6.1 Database Entities (TypeORM / PostgreSQL)
1. `MiniApp`: Stores application metadata, current status, owner organization, and integration tier.
2. `MiniAppVersion`: Stores version numbers, build numbers, release notes, commit SHAs, and capability snapshots.
3. `Banner`: Stores marketing banner assets, display orders, audience scopes, and scheduling dates.
4. `Organization`: Stores tenant profiles, legal classifications, and integration tier policy overrides.
5. `User`: Stores administrative and partner user accounts, hashed credentials, and role bindings.
6. `Notification`: Stores user alerts, read receipts, category tags, and payload references.
7. `Announcement`: Stores developer broadcast updates and unread receipts.
8. `AuditLog`: Stores immutable administrative event logs and state transition history.

### 6.2 External System Interfaces
- **Sonatype Nexus 3.98**: REST API integration for uploading and querying compiled APKs and private Dart packages.
- **Jenkins 2.450 LTS**: Webhook integration for triggering Fastlane builds and receiving compilation callbacks.
- **Harbor Registry**: OCI container registry for microservice deployments.
- **Resend Email API**: Transactional SMTP/HTTP API for DKIM/SPF verified developer notification emails.
- **Telegram Bot API**: Webhook for broadcasting real-time security alerts and build completion cards.

---

## 7. Requirements Traceability Matrix (RTM) Summary

| Module ID | Module Name | FR Range | Total FRs | Implementation Files | Automated Test Suites |
| :---: | :--- | :---: | :---: | :--- | :--- |
| **M-01** | MiniApp Registration & Onboarding | FR-001 – FR-016 | 16 | `miniapps/`, `webview-verification/` | `miniapps.service.spec.ts` |
| **M-02** | CI/CD & Security Scanning | FR-017 – FR-032 | 16 | `integrations/jenkins/`, `settings/` | `jenkins.service.spec.ts` |
| **M-03** | Governance & Zero-Binary Rollback | FR-033 – FR-048 | 16 | `miniapps/status/`, `version/` | `e2e-capability-version-lifecycle.spec.ts` |
| **M-04** | SuperApp Banners Full-Stack | FR-049 – FR-062 | 14 | `banners/`, `mobile/banners` | `banners.service.spec.ts` |
| **M-05** | Device Capabilities (ADR-004) | FR-063 – FR-080 | 18 | `packages/fsa-superapp-miniapp-*-sdk` | `loyalty_test.dart`, `transit_test.dart` |
| **M-06** | Mobile Consumer Shell | FR-081 – FR-096 | 16 | `super-app/lib/features/` | `mobile.http.spec.ts`, `mobile-catalog.service.spec.ts` |
| **M-07** | Notifications & Announcements | FR-097 – FR-110 | 14 | `notifications/`, `announcements/` | `notifications.service.spec.ts` |
| **M-08** | Organizations & Governance | FR-111 – FR-125 | 15 | `organizations/`, `access-control/` | `organizations.service.spec.ts`, `rbac.guard.spec.ts` |
| **NFR** | Non-Functional Requirements | NFR-001 – NFR-025 | 25 | Platform-wide | 154 Passing Jest Suites (1,494 tests) |
| **TOTAL** | **Full System Scope** | **FR-001 – NFR-025** | **150** | **895 Source Files** | **1,494 Automated Unit & E2E Tests** |

---
*End of Software Requirements Specification (SRS v1.0.0)*
