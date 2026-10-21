# Rule: Real Backend API Sourcing & Zero Hardcoded Capabilities

This rule is a **mandatory, non-negotiable architectural standard** across all services and applications in this monorepo (`superapp_backend`, `superapp_backoffice`, `super-app`, and documentation).

---

## 1. Core Principle: Zero Hardcoded & Zero Mock Data

* **Live Sourcing Only**: All SuperApp capabilities, permissions, system feature definitions, and integration bridge signatures **MUST** be queried dynamically from the real backend API or the PostgreSQL capability registry.
* **Prohibited**: Hardcoded string arrays, static mock capability lists (e.g., `['camera', 'location', 'biometrics']`), and simulated local JSON stubs for capabilities are **strictly prohibited**.
* **Single Source of Truth**:
  * **Backend**: `PermissionsService.getCapabilities()` querying the PostgreSQL `permission_definitions` table, dynamically synchronized from the native SuperApp repository on GitLab (`Info.plist` and `AndroidManifest.xml`).
  * **Frontend (Backoffice)**: `permissionsApi.getCapabilities()` hitting `GET /api/permissions/capabilities` or `GET /api/permissions/bridge-manifest`.
  * **Client MiniApp SDK**: `FSASuperApp.canIUse(capabilityKey)` calling the host shell's runtime introspection engine.

---

## 2. Backend Requirements (`superapp_backend`)

1. **Validation & Lifecycle Gates**:
   * Any capability check during MiniApp registration, submission (`submitForReview`), validation (`MiniappValidationHelper`), or approval (`approve`) must query `PermissionsService.getCapabilities()`.
   * Never hardcode allowed or whitelist capability arrays in validation helpers.
2. **Pre-Publish Hard Gate Enforcement**:
   * If a MiniApp requests a capability where `required !== false` and it is **not active** in the database registry, the backend must throw a hard `400 Bad Request` with error code `GATE_CAPABILITY_UNSUPPORTED`.
   * If `required === false` and unsupported, the backend permits submission in degraded runtime mode and automatically registers a capability proposal for the platform engineering team.
3. **Automated Synchronization (GitOps)**:
   * The platform synchronizes capabilities automatically from GitLab `main` branch. Capability changes committed to the host mobile repo are automatically reflected in the database without manual code changes or redeployments.

---

## 3. Frontend Requirements (`superapp_backoffice`)

1. **Dynamic Fetching on Mount**:
   * All pages, wizards, guidelines, and modals displaying capabilities (including `Section03SdkContract.tsx`, `Section05Capabilities.tsx`, `CapabilitiesForm.tsx`, and `CapabilitiesTab.tsx`) must fetch live data via `permissionsApi.getCapabilities()`.
2. **Category & Icon Resolution**:
   * Categories, visual tints, and Lucide icons must be resolved dynamically through automated keyword matching (`getCapabilityVisual()` in `src/lib/capability-visuals.tsx`), never hardcoded on a per-component basis.
3. **Transient Fallback Safeguard**:
   * A static fallback constant is strictly restricted to temporary offline network resilience. When activated, it must log a console warning and must never replace normal dynamic API resolution.

---

## 4. Mobile Runtime & Web SDK (`super-app` & `@fsasuperapp/sdk`)

1. **Introspection Contract (`canIUse`)**:
   * The host shell bridge must implement `window.FSASuperApp.canIUse(capabilityKey)` querying active capabilities.
2. **Standardized Rejection Payload**:
   * Invoking an unsupported optional capability must return the standard rejection payload:
     ```json
     {
       "code": "CAPABILITY_UNSUPPORTED",
       "capability": "nfc_reader",
       "message": "Host shell does not support capability: nfc_reader",
       "supportedCapabilities": ["camera", "location", "biometrics", "secure_storage", "payment"]
     }
     ```
   * The host shell must never crash or terminate when an unsupported capability is invoked.
