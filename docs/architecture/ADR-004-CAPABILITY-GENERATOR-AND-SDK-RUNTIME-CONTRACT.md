# Architecture Decision Record (ADR-004)
# Capability Generator Flow, FSASuperApp SDK Runtime Contract & Rejection Protocol

| Metadata | Details |
| :--- | :--- |
| **Status** | **Accepted & Active Standard** |
| **Date** | 2026-10-22 |
| **Target Components** | `superapp_backend` (`CapabilityCodeGeneratorService`), `superapp_backoffice`, `packages/*-sdk`, `super-app` (Flutter Host Container) |
| **Context** | Enterprise SuperApp MiniApp governance, dynamic capability extension, and cross-platform native bridge security |

---

## 1. Executive Summary & Conceptual Distinction

In the **FSA SuperApp Platform**, **Capabilities** and the **FSASuperApp SDK** serve distinct but tightly coupled architectural roles:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                ARCHITECTURE TAXONOMY                                   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  1. CAPABILITY (Platform Entitlement & Host Resource)                                  │
│     • Definition: A native host OS permission or hardware entitlement (e.g. camera,    │
│       biometrics, secure storage, face scanner sync, push notifications).              │
│     • Governance: Defined in the BackOffice Capability Catalog, governed by RBAC,      │
│       and enforced by host container security policies and OS permission dialogs.      │
│     • Entity: Permission and PermissionProposal in superapp_backend.                   │
│                                                                                        │
│  2. FSASUPERAPP SDK (Client Bridge Library & Developer Interface)                     │
│     • Definition: The versioned client library imported by MiniApp developers          │
│       (@fsasuperapp/miniapp-web-sdk, fsa_superapp_miniapp_flutter_sdk, Native .aar).  │
│     • Role: Provides typed API wrappers (FSASuperApp.canIUse(), getAuthToken(), etc.)   │
│       that translate developer method calls into asynchronous platform IPC messages.   │
│     • Runtime: Runs strictly inside the MiniApp guest context (WebView or sub-module). │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Automated Capability Generator Flow

When a partner engineer requires a new native device feature or enterprise capability that is not yet cataloged in the SuperApp host shell, the platform executes an automated codegen and merge pipeline:

```mermaid
sequenceDiagram
    autonumber
    actor Dev as MiniApp Developer
    participant BO as BackOffice Portal
    participant API as Backend Gateway
    participant Gen as CapabilityCodeGenerator
    participant Git as Self-Hosted GitLab
    actor Admin as SuperApp Admin
    participant CI as Jenkins Build Stage 1
    participant SDK as FSASuperApp SDK Registry

    Dev->>BO: Submit Capability Proposal (/permission-proposals)
    BO->>API: POST /permission-proposals (metadata, rationale)
    API->>Admin: Real-time Review Alert (Telegram & Dashboard)
    Admin->>BO: Inspect Security Impact & Approve
    BO->>API: PATCH /permission-proposals/:id/review (APPROVED)
    
    rect rgb(240, 248, 255)
        Note over API,Gen: Automated Capability Generator Execution
        API->>Gen: generateCapabilityMr(proposal, targetBranch)
        Gen->>Gen: Resolve Android (AndroidManifest.xml uses-permission)
        Gen->>Gen: Resolve iOS (Info.plist usage description)
        Gen->>Gen: Resolve Flutter (pubspec.yaml dependencies)
        Gen->>Git: Create Branch capa/add-<key>-<timestamp> & Push
        Gen->>Git: Open GitLab Merge Request (MR) with side-by-side diff
    end

    Git->>CI: Trigger Build Stage 1 (Fastlane Verification)
    CI-->>API: Confirm Host Shell Compatibility
    API->>SDK: Generate/Extend Typed Contract in SDK (@fsasuperapp/sdk)
    SDK-->>Dev: Updated SDK Available for Download via Private Registry
```

### Technical Implementation (`CapabilityCodeGeneratorService`)
Located in `superapp_backend/src/permissions/capability-code-generator.service.ts`:
* **AndroidManifest Injection**: Formats and inserts `<uses-permission android:name="..." />` without breaking XML schema.
* **iOS Info.plist Injection**: Formats `<key>NS...UsageDescription</key>` with localized enterprise justification.
* **Flutter `pubspec.yaml` Resolution**: Injects audited, pinned pub dependencies (e.g. `mobile_scanner: ^5.2.3`, `local_auth: ^2.2.0`).
* **Branch Isolation & Rollback**: Backs up `.bak` files prior to mutation and pushes exclusively to dedicated feature branches (`capa/add-...`), ensuring zero mutations directly on `main` or `development`.

---

## 3. FSASuperApp SDK Runtime Contract

The client bridge is standardized across all four integration methods (`WebView`, `Flutter Package`, `Native SDK`, `Deep Link`).

### Official TypeScript Contract (`super-app/packages/fsa-superapp-miniapp-web-sdk/src/types.ts`)

```typescript
export interface FSASuperAppNativeBridge {
  __initialized?: boolean;
  sdkVersion: string;
  hostVersion: string;
  _supportedCapabilities: string[];

  // 1. Dynamic Runtime Introspection
  canIUse(capabilityKey: string): Promise<boolean>;

  // 2. Staff Authentication & Single Sign-On
  getAuthToken(): Promise<AuthTokenResult>;
  getUserProfile(): Promise<UserProfileResult>;

  // 3. Capsule Lifecycle
  close(): void;

  // 4. Generic Capability Invocation
  requestCapability<T = any>(capabilityKey: string, params?: Record<string, any>): Promise<T>;

  // 5. High-Level Typed Convenience Bindings
  authenticateBiometric?(prompt?: string): Promise<BiometricResult>;
  scanQRCode?(): Promise<QRCodeResult>;
  getLocation?(options?: LocationOptions): Promise<GeoCoordinates>;
  getSecureStorage?(key: string): Promise<string | null>;
  setSecureStorage?(key: string, value: string): Promise<void>;
  removeSecureStorage?(key: string): Promise<void>;
}
```

### Official Dart Contract (`super-app/packages/fsa-superapp-miniapp-flutter-sdk/lib/src/miniapp_context.dart`)

```dart
abstract class MiniAppContext {
  SuperAppAuth get auth;
  String get hostVersion;
  List<String> get supportedCapabilities;

  Future<bool> canIUse(String capabilityKey);
  Future<T> requestCapability<T>(String capabilityKey, [Map<String, dynamic>? params]);
  Future<BiometricResult> authenticateBiometric([String? prompt]);
  Future<QRCodeResult> scanQRCode();
  void close();
}
```

---

## 4. Standardized Rejection Protocol

When a MiniApp attempts to invoke a capability that is unsupported, unwhitelisted, or denied, the SuperApp host native container **must never crash or silently hang**. It returns a standardized rejection payload conforming to the **FSA Rejection Protocol Envelope**:

### Rejection Envelope Specification

```json
{
  "code": "CAPABILITY_UNSUPPORTED",
  "capability": "biometrics",
  "message": "Host shell v1.0.0 does not support capability: biometrics. Minimum host version required: v1.4.0.",
  "hostVersion": "1.2.0",
  "supportedCapabilities": [
    "storage:secure",
    "staff:profile:read",
    "notification:push",
    "camera:qr"
  ]
}
```

### Standard Error Codes

| Error Code | Trigger Condition | Recommended MiniApp Handling |
| :--- | :--- | :--- |
| **`CAPABILITY_UNSUPPORTED`** | Host mobile shell lacks hardware driver or capability is not installed in current host version. | Fall back to manual input or alternative software flow (e.g. password instead of biometrics). |
| **`UNREGISTERED_SCOPE`** | MiniApp manifest did not declare this capability during BackOffice registration. | Show configuration alert: Developer must request capability in BackOffice. |
| **`PERMISSION_DENIED`** | End-user rejected the OS permission dialog (e.g. Camera permission denied). | Display non-blocking banner prompting user to enable permission in OS Settings. |
| **`SECURITY_VIOLATION`** | Caller domain or iframe is not in the whitelist of approved domains. | Terminate guest execution and log audit alert. |
| **`USER_CANCELLED`** | End-user dismissed biometric prompt or QR scanner without completing action. | Reset UI state gracefully; do not treat as fatal error. |

### Client SDK Error Wrapping (`CapabilityUnsupportedError`)

In `@fsasuperapp/miniapp-web-sdk`:
```typescript
try {
  const result = await FSASuperApp.authenticateBiometric("Confirm attendance clock-in");
} catch (error) {
  if (error instanceof CapabilityUnsupportedError) {
    console.warn("Device does not support biometrics. Available:", error.supportedCapabilities);
    // Graceful fallback to employee PIN or manual approval
    enablePinFallback();
  } else {
    showToast(error.message);
  }
}
```

In `fsa_superapp_miniapp_flutter_sdk`:
```dart
try {
  final bio = await context.authenticateBiometric("Verify identity");
} on CapabilityUnsupportedException catch (e) {
  debugPrint("Capability ${e.capability} not supported on host v${e.hostVersion}");
  // Graceful fallback
  showManualAttendanceDialog();
}
```

---

## 5. Registration Policy for Unsupported Capabilities (Graceful Degradation)

> [!NOTE]
> **Status: Proposed, implementation pending.** This section is the target behavior. The current code still marks the `capability_gate` stage as `FAILED` for any unsupported capability, and it only checks capability keys for Flutter Package submissions. See [Current vs Target Behavior](#current-vs-target-behavior).

### Principle
A Mini App that declares a capability the Super App host does not support yet is **not rejected at registration**. It registers normally, and the unsupported capability is **disabled** until a Super App release adds it. This mirrors the runtime rule in Section 4: the platform degrades gracefully instead of failing.

### How a Declared Capability Is Classified
Each capability a Mini App declares (`PermissionDto`: `type`, `purpose`, `termsUrl`, `required`) is checked against the `capability_definitions` catalog. It is **supported** only when all of these hold:
1. A catalog row exists with a matching `key` (case-insensitive).
2. `isActive = true` and `isDeprecated = false`.
3. The target Super App version is within `minSuperAppVersion` and `maxSuperAppVersion`, where set.

Otherwise it is **unsupported**. An unsupported capability that is not in the catalog at all is also offered as a capability proposal to the partner (Section 2).

### Policy Matrix

| Declared capability | Security gate (`capability_gate`) | Registration | Mobile runtime |
| :--- | :--- | :--- | :--- |
| **Supported** | Passes | Allowed | Enabled; bridge call works |
| **Unsupported, optional** (`required: false`) | Passes with a **WARNING** finding `CAP_UNSUPPORTED_<KEY>` | Allowed | **Disabled**: `canIUse(key)` returns `false`, and a call returns the `CAPABILITY_UNSUPPORTED` rejection envelope (Section 4). The Mini App must use its fallback flow. |
| **Unsupported, required** (`required: true`) | **Open decision**, see below | **Open decision**, see below | **Open decision**, see below |

### Automatic Enablement
The supported/disabled state is **computed when it is read, never stored** on the Mini App. The catalog syncs from the Super App source repository on every backend start (`CapabilitiesService`). When a later Super App release adds the capability, it becomes supported on the next sync. Every Mini App that declared it then gets it enabled automatically, without re-submission or manual approval. No database flag can go stale.

### API Contract Addition
Capability lists returned to the Backoffice and the mobile catalog keep their current shape, plus two read-only fields per item:

```json
{
  "type": "nfc",
  "purpose": "Read the staff ID card chip for attendance",
  "required": false,
  "supported": false,
  "availableFrom": null
}
```

* `supported`: result of the classification above.
* `availableFrom`: the `minSuperAppVersion` from the catalog when the capability exists but needs a newer host. It is `null` when the capability is not in the catalog yet.

### One Shared Check for All Integration Methods
All four integration methods (WEBVIEW, FLUTTER_PACKAGE, NATIVE_SDK, DEEP_LINK) use **one shared capability check** that implements this policy. No scanner keeps its own logic. This closes the current gap where WEBVIEW, NATIVE_SDK and DEEP_LINK submissions are not checked at all.

### Open Decision: Unsupported Required Capability
The partner marks a capability `required: true` when the Mini App cannot work without it. Two options:

| Option | Behavior | Trade-off |
| :--- | :--- | :--- |
| **A. Block** (current behavior) | Gate fails with a CRITICAL finding; the Mini App cannot proceed past validation. | Users never see a broken app, but the partner cannot test or prepare until the host ships the capability. |
| **B. Register disabled** | Gate passes with a WARNING. The Mini App can register, build and be tested in the sandbox, but is **not launchable** in the mobile catalog. It shows an *"Unavailable until Super App vX"* label (`availableFrom`) and becomes launchable automatically once the capability is supported. | Partners can work ahead of the host release, and users are still protected from an app that cannot work. Needs a "not launchable" state in the mobile catalog. |

**Recommendation: Option B.** It matches the "disable, don't fail" principle and still keeps a non-working app away from users. *Decision owner: Platform / SA Admin.*

### Current vs Target Behavior

| Aspect | Current code | Target (this ADR) |
| :--- | :--- | :--- |
| Optional unsupported capability | Gate `FAILED`, CRITICAL finding (Flutter Package only) | Gate passes, WARNING finding, capability disabled |
| Required unsupported capability | Gate `FAILED` (Flutter Package only) | Per the open decision above |
| `required` flag | Accepted by `PermissionDto` but ignored by the scanner | Drives the policy matrix |
| WEBVIEW / NATIVE_SDK / DEEP_LINK | Not checked against the catalog | Same shared check as Flutter Package |
| `supported` / `availableFrom` in API | Not returned | Returned per capability |

---

## 6. Security & Isolation Invariants

1. **Zero Raw Native Access**: MiniApps run in sandboxed processes or restricted WebViews. They cannot invoke arbitrary Android Java reflection or iOS Objective-C selectors.
2. **Pre-Flight Validation**: Static analysis (Semgrep Scanner #1) inspects MiniApp code at CI/CD submission time. Any calls to capabilities not declared in BackOffice fail Stage 1 immediately.
3. **Domain & Origin Whitelisting**: The host bridge injects `window.FSASuperApp` **only** into verified origins validated during domain verification.
4. **Token Isolation**: Staff session tokens returned by `getAuthToken()` are short-lived (15–60 mins) and restricted to the MiniApp's audience (`aud: miniapp_id`).

---

## 7. Document History

* **2026-10-22:** Initial approved specification of Capability Generator flow, Rejection Protocol, and unified SDK contracts across Web, Flutter, and Native.
* **2026-11-09:** Added Section 5, Registration Policy for Unsupported Capabilities (proposed): optional unsupported capabilities register disabled and enable automatically on catalog sync, one shared check covers all four integration methods, and the required-capability behavior is an open decision.
