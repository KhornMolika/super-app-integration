# Code Modularity & Maintainability Rules

These rules govern how code should be structured, extracted, and maintained across both backend services and frontend applications in this repository. Always review and follow these patterns before writing or refactoring any code.

---

## 1. Backend Services (NestJS) — When to Extract into Helper Files

In NestJS, a **Service** must strictly function as a clean **orchestrator** (managing database transactions, repository queries, high-level workflow coordination, and dependency injection). It must never become a "God Object".

Extract logic into dedicated helper files under a `helpers/` directory within the module when:

1. **File Size & Complexity Threshold**:
   - The service exceeds **400–600 lines** or handles more than 3 distinct domain workflows.
   - *Example:* Split large operations into `miniapp-lifecycle.helper.ts` (state machine transitions) and `miniapp-mutation.helper.ts` (entity sanitization and updates).

2. **Pure Business Logic & Algorithmic Computations**:
   - Any stateless, deterministic logic that transforms data without requiring database or HTTP request context.
   - *Example:* `version-diff.helper.ts` (computing JSON/field diffs between releases) and `marker.ts` (comment template replacements).

3. **Deep Domain Parsing & Regex**:
   - AST code analysis, manifest inspections, or regex pattern matching.
   - *Example:* `permission-detector.helper.ts` (statically inspecting bundle code for SDK imports and native APIs).

4. **Network Probes & Low-Level Infrastructure**:
   - Operations handling raw TCP/DNS/TLS handshakes, SSRF IP blocking, or SSH key generation.
   - *Example:* `url-probe.helper.ts` (DNS checks, loopback IP protection, TLS validation) and `flutter-credential.helper.ts` (deploy key crypto).

5. **Isolated Unit Testability**:
   - Logic that requires thorough edge-case testing should be in a helper so it can be tested directly via `*.helper.spec.ts` without mocking NestJS dependency injection, repositories, or HTTP guards.

---

## 2. Back-Office (Next.js / React) — When to Modularize Components, Hooks & Validators

Never write monolithic `page.tsx` files. A page file should only act as a route coordinator that wires up state and layout.

Modularize code across the following boundaries:

1. **Tab & Section Separation (`components/<domain>/` or `components/forms/`)**:
   - When a page contains multiple tabs, accordion steps, or distinct visual sections, extract each into its own component.
   - *Example:* `<BasicInfoForm />`, `<TeamForm />`, `<IntegrationForm />`, `<PermissionsForm />`, `<ValidationReportTab />`, `<VersionHistoryTab />`.

2. **Validation & Schema Separation (`lib/` or `validators/`)**:
   - Form schemas, field regex rules, cross-field dependencies, and URL security formatters must be in pure TypeScript validator files, never mixed into React JSX.
   - *Example:* `miniapp-form.validator.ts`.

3. **Reusable Context & Custom Hooks (`hooks/` or `lib/`)**:
   - Cross-cutting logic such as RBAC authorization checks, authenticated user profiles, or SSE/WebSocket log streaming must be encapsulated in custom hooks.
   - *Example:* `useAuth()`, `useMiniappActions()`, `useConfirm()`.

4. **Stateful Modals & Overlays (`components/ui/` or `components/review/`)**:
   - Any modal or dialog that maintains its own multi-step input state, async submission, or diff inspector must be an isolated component to prevent unnecessary re-renders of the parent page.
   - *Example:* `<RevisionReviewModal />`, `<BuildProgressModal />`, `<PreviewModal />`.

5. **Constants & Utilities Single Source of Truth (`lib/constants/` & `lib/utils/`)**:
   - Status badges, category lists, department metadata, and URL builders must be extracted to shared constants.
   - *Example:* `fsa-organizations.ts`, `integration-utils.ts`.

---

## 3. Mobile Super App (Flutter) — When & How to Modularize

Follow Feature-Driven Architecture and strict separation of concerns across `lib/`:

1. **Feature-First Organization (`lib/features/<feature>/`)**:
   - Every business capability (e.g., `auth`, `home`, `catalog`, `services`) lives in its own directory containing `presentation/` (screens and feature-specific widgets) and `providers/` (Riverpod state controllers).
   - Features must never directly import another feature's internal presentation widgets; coordinate through global router/providers.

2. **Decoupled Core Infrastructure (`lib/core/`)**:
   - `core/miniapp/`: Dynamic mini app registry, launcher dispatcher, and sandboxed hosting screen (`MiniAppHostScreen`).
   - `core/native_sdk/`: Safe native bridge wrappers (`MethodChannel`), vendor lifecycle invocations (`initialize` & `present`), and in-flight execution guards.
   - `core/network/`: HTTP/Dio client, JWT refresh interceptors, SSL pinning, and error handlers.
   - `core/storage/` & `core/session/`: Hardware keystore/keychain access (`FlutterSecureStorage`), shared preferences, and session models.

3. **Widget Granularity & Performance**:
   - Keep `build()` methods short and readable (under **100 lines**). Extract complex subtrees into smaller, private or shared `StatelessWidget` / `ConsumerWidget` classes.
   - Use `const` constructors wherever parameters are compile-time constants to avoid unnecessary element rebuilding.

4. **State Management & Business Logic (Riverpod)**:
   - UI widgets must remain purely declarative. Business logic, asynchronous data fetching, and input validation must reside in Riverpod `NotifierProvider` / `AsyncNotifierProvider` classes.
   - Use `ref.watch()` for reactive UI updates and `ref.read()` inside event handlers/callbacks.

5. **Mini App Isolation & Sandbox Safety**:
   - Mini App launching must strictly route through `MiniAppDispatcher` rather than ad-hoc navigation.
   - WebView containers must enforce strict origin verification, HTTPS enforcement, and isolated JavaScript bridge communication.

