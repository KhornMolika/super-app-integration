# Agent Instructions & Guidelines

## Package Manager
- **Always use `pnpm`** for all commands, scripts, builds, and dependency management across all projects in this repository (never `npm` or `yarn`).
  - Example commands: `pnpm install`, `pnpm build`, `pnpm run build`, `pnpm dev`, `pnpm run lint`, `pnpm test`.

## UI / UX & Design Guidelines
- **Always use icons** across all UI components, buttons, interactive cards, status badges, action triggers, tables, form inputs, dialogs, notifications, and navigation elements to ensure a clear, modern, intuitive, and consistent visual experience.

## Git & Push Rules
- **Push code only if explicitly told to do so**: Never execute `git push` or push branches/commits to any remote repository unless the user specifically and explicitly commands you to do so. 

## Hardcode Credential Rule
- **Always check and remove hardcode credentials**: Never hardcode sensitive credentials, passwords, private keys, secrets, or API tokens in source code. Always use environment variables or secure configuration loaders.

## Code Modularity & Maintainability Rules

### 1. Backend Services (NestJS) — When to Extract into Helper / Utility Files
A Service should act strictly as an **orchestrator** (managing database transactions, repository queries, high-level workflow coordination, and NestJS dependency injection). Delegate specialized logic into dedicated helper files under a `helpers/` subfolder according to these rules:
- **File Size & God-Object Prevention**: If a service exceeds **400–600 lines** or handles more than 3 distinct domain responsibilities, extract domain sub-flows into helpers (e.g. `miniapp-lifecycle.helper.ts`, `miniapp-mutation.helper.ts`).
- **Pure Business Logic & Algorithmic Computations**: Any pure, deterministic logic without DB/HTTP dependencies must be extracted into standalone helper functions (e.g. `version-diff.helper.ts` for JSON diffing, `marker.ts` for template/comment replacements) for easy unit testing.
- **Deep Domain Parsing & Regex**: Complex string manipulation, AST code inspection, or bundle parsing must live in a helper (e.g. `permission-detector.helper.ts`).
- **Network / Infrastructure Probes**: Low-level network I/O, SSRF validation, DNS lookups, TLS probing, or SSH/crypto keys must be encapsulated in dedicated helpers (e.g. `url-probe.helper.ts`, `flutter-credential.helper.ts`).
- **Isolated Unit Testability**: Complex domain logic should be unit-testable directly via `*.helper.spec.ts` without needing heavy NestJS module mocking.

### 2. Back-Office (Next.js / React) — When to Modularize Components, Hooks & Validators
Avoid monolithic `page.tsx` files. Keep pages lightweight coordinators of modular components:
- **Tab & Section Separation**: Each major tab or section in a detail/settings page must be its own component under `components/<domain>/` or `components/forms/` (e.g. `<BasicInfoForm />`, `<TeamForm />`, `<IntegrationForm />`, `<PermissionsForm />`, `<ValidationReportTab />`, `<VersionHistoryTab />`).
- **Validation & Schema Separation**: Form schemas, field regex rules, URL security checks, and error calculators must be extracted to pure validator files in `lib/` (e.g. `miniapp-form.validator.ts`) rather than embedded in JSX.
- **Reusable Global Context & Hooks**: Cross-cutting states such as RBAC permission checks, active user, theme, or SSE/WebSocket log streaming must be encapsulated in custom hooks or context providers (e.g. `useAuth()`, `useMiniappActions()`).
- **Stateful Modals & Overlays**: Any modal dialog with its own multi-step workflow, submission logic, or diff viewer must be isolated in its own component (e.g. `<RevisionReviewModal />`, `<BuildProgressModal />`) to prevent parent component re-renders.
- **Constants & Formatters**: Badges, status mappings, organization definitions, and artifact URL builders must live in `lib/constants/` and `lib/utils/` as single sources of truth.

### 3. Mobile Super App (Flutter) — Code Modularity & Maintainability Rules
Follow Feature-Driven Architecture and strict separation of concerns across `lib/`:
- **Feature-First Structure (`lib/features/<feature>/`)**: Group related code by business domain (e.g., `auth`, `home`, `catalog`). Each feature directory encapsulates its own UI (`presentation/` or `screens/`, `widgets/`) and state providers (`providers/` or `controllers/`).
- **Core Infrastructure Layer (`lib/core/`)**: Keep platform plumbing completely decoupled from UI features:
  - `core/miniapp/`: Mini App registry, dispatcher, container hosting (`MiniAppHostScreen`), and sandboxed execution engines.
  - `core/native_sdk/`: Platform channel bridges (`MethodChannel`), vendor lifecycle bindings (`initialize`, `present`), and in-flight guard protection.
  - `core/network/`: Base HTTP/Dio client, auth interceptors, error parsers, and SSL pinning.
  - `core/storage/` & `core/session/`: Secure token storage, persistence wrappers, and active session manager.
- **Widget Granularity & Performance**:
  - Never allow `build()` methods to exceed **100 lines**. Extract nested widget subtrees into dedicated private helper classes or reusable components under `widgets/`.
  - Aggressively use `const` constructors to prevent unnecessary element tree rebuilds.
- **State Management Separation (Riverpod)**:
  - Keep business logic, API calls, and validation outside widgets inside dedicated Riverpod `NotifierProvider` / `AsyncNotifierProvider` classes.
  - Widgets should only watch (`ref.watch`) or trigger (`ref.read`) actions.
- **Mini App Sandbox & JS Bridge Safety**:
  - Mini App invocation must strictly route through `MiniAppDispatcher` rather than ad-hoc navigation.
  - WebView containers must enforce strict origin checks, HTTPS enforcement, and isolated JavaScript bridge communication.
