# Agent Instructions & Guidelines

## ⚡ Global Package Manager Policy
- **STRICTLY ALWAYS USE pnpm** for all commands, scripts, builds, and dependency management across all projects in this repository (never 
pm or yarn).
  - Example commands: pnpm install, pnpm add <pkg>, pnpm add -D <pkg>, pnpm build, pnpm dev, pnpm test.

## 🎨 UI / UX & Design Guidelines
- **Always use icons** across all UI components, buttons, interactive cards, status badges, action triggers, tables, form inputs, dialogs, notifications, and navigation elements to ensure a clear, modern, intuitive, and consistent visual experience.

## 🔒 Git & Security Rules
- **Push code only if explicitly told to do so**: Never execute git push or push branches/commits to any remote repository unless the user specifically and explicitly commands you to do so.
- **Always check and remove hardcode credentials**: Never hardcode sensitive credentials, passwords, private keys, secrets, or API tokens in source code. Always use environment variables or secure configuration loaders.

## 🛡️ Zero Hardcoded Data & Real Backend API Sourcing Rule
- **Always query real data from backend API / database registry**: All capabilities, permissions, system features, and integration bridge signatures MUST be queried dynamically from the real backend API (`GET /api/permissions/capabilities` on frontend) or the PostgreSQL database registry (`PermissionsService.getCapabilities()` on backend).
- **Strictly Zero Hardcoded & Zero Mock Data**: Never use static arrays, mock objects, or hardcoded capability lists (such as `['camera', 'location', ...]`). Both frontend and backend must maintain zero hardcoded capability definitions and reflect live data synchronized from GitLab (`Info.plist` and `AndroidManifest.xml`). Always refer to `.agents/rules/zero-hardcoded-capabilities.md`.

---

## 1. Backend: NestJS & TypeORM Architecture

* **Service as Orchestrator**: Services strictly orchestrate database transactions, repository queries, high-level workflow coordination, and dependency injection. Never write God Object services.
* **Extract Helpers into src/modules/<feat>/helpers/<name>.helper.ts when**:
  1. Service exceeds **400–600 lines** or handles $>3$ distinct domain workflows (e.g., miniapp-lifecycle.helper.ts, miniapp-mutation.helper.ts).
  2. Pure business math (pricing, taxes, commissions, version diffing via ersion-diff.helper.ts).
  3. Deep regex/parsing (AST code inspection, manifest parsing via permission-detector.helper.ts).
  4. Low-level probes (SSRF IP checks, DNS, crypto keys via url-probe.helper.ts, lutter-credential.helper.ts).
  5. Zero-mock unit testing (*.helper.spec.ts without mocking NestJS DI or TypeORM).
* **Pure Utilities**: Stateless, domain-agnostic functions in src/common/utils/<name>.util.ts.
* **TypeORM Safety & QueryBuilder Policy**:
  * **Strict Prohobition of Raw SQL Strings**: Never use raw SQL queries (`repository.query(...)`, `manager.query(...)`). Use TypeORM `QueryBuilder` (`createQueryBuilder()`) or repository methods for all queries and mutations to guarantee type safety, prevent schema drift, and support automatic escaping.
  * **Mandatory Database Transactions**: Multi-table writes, cascading deletes, or destructive data operations **must** use `dataSource.transaction(async (manager) => { ... })`. Never use `.catch(() => {})` to silently swallow errors. Refer to `.agents/rules/typeorm-querybuilder-transactions.md`.
  * **Zero Token Reassignment**: Revoke/delete auth tokens and credentials rather than reassigning foreign keys to other users.
  * Avoid N+1 queries (use `leftJoinAndSelect` / `relations`).
  * `synchronize: false` in production; all schema changes must go through TypeORM migrations (`pnpm migration:run`).
* **REST & DTOs**:
  * All inputs validated via DTOs and ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }).
  * Unified JSON response wrappers via TransformInterceptor and HttpExceptionFilter.
* **Security & Observability**:
  * Validate ConfigModule on boot using Joi/Zod to crash immediately if required secrets are absent.
  * Always enable helmet(), explicit CORS whitelist, and @nestjs/throttler on sensitive routes.
  * Implement liveness/readiness probes with @nestjs/terminus (TypeOrmHealthIndicator) and invoke pp.enableShutdownHooks().

---

## 2. Web: Next.js & React Architecture

* **Security BFF (Backend for Frontend)**:
  * ❌ **NEVER** store JWT access or refresh tokens in localStorage or JavaScript-readable cookies (XSS vulnerability).
  * Store tokens in encrypted **HttpOnly, Secure, SameSite=Strict** cookies in Next.js Server Actions or Route Handlers.
  * Next.js server unwraps the cookie and attaches Authorization: Bearer <token> to private downstream NestJS calls.
  * Keep all third-party private API keys (Stripe, OpenAI, AWS) on the server runtime; never expose with NEXT_PUBLIC_.
* **Pages as Route Coordinators**: Keep page.tsx under **100–150 lines**. A page sets up layouts and metadata, but delegates rendering to domain components (e.g. <BasicInfoForm />, <TeamForm />, <IntegrationForm />, <PermissionsForm />).
* **RSC First**: Keep pages and layouts as React Server Components. Push 'use client' down to the leaves (interactive buttons, dropdowns, inputs).
* **Data Fetching & Caching**:
  * Data fetching is dynamic by default. Use use cache or unstable_cache for explicit caching.
  * Trigger on-demand revalidation (
evalidateTag(), 
evalidatePath()) in Server Actions.
  * Unwrap promises in Client Components using React's native use() hook without heavy client fetch libraries.
* **Schema Separation**: Form validation schemas live in pure TypeScript validator files (src/lib/validators/<domain>.validator.ts e.g. miniapp-form.validator.ts) using Zod. Never inline validation rules in JSX. Always re-parse input using safeParse() in Server Actions.
* **Stateful Modal Isolation**: Modals maintaining multi-step input or async state (e.g. <RevisionReviewModal />, <BuildProgressModal />) must be separate components or use Intercepting/Parallel routes (@modal).
* **Custom Hooks**: Encapsulate cross-cutting logic (RBAC checks, confirmation dialogs, SSE streams e.g. useAuth(), useMiniappActions()) in src/hooks/.
* **Performance & Core Web Vitals**: Zero layout shift with 
ext/font/google; always set priority and sizes on 
ext/image.

---

## 3. Mobile Super App: Flutter & Riverpod Architecture

* **Feature-First Layout**: Group code under lib/features/<domain>/ with presentation/ (screens and widgets) and providers/. Never directly import internal presentation widgets across features.
* **Decoupled Core Infrastructure**:
  * core/miniapp/: Mini App registry, launcher dispatcher, and sandboxed hosting screen (MiniAppHostScreen).
  * core/native_sdk/: Safe native bridge wrappers (MethodChannel), vendor lifecycle bindings (initialize, present), and in-flight execution guards.
  * core/network/: Base HTTP/Dio client, JWT refresh interceptors, SSL pinning, and error handlers.
  * core/storage/ & core/session/: Secure token storage (FlutterSecureStorage), shared preferences, and session models.
* **Riverpod Code Generation & AsyncNotifier**:
  * Use @riverpod annotations and AsyncNotifier for async state and mutations.
  * Always use AsyncValue.guard(() => ...) for automatic error catching.
  * Read providers in mutation callbacks via 
ef.read(); watch state in uild() via 
ef.watch().
* **Declarative Routing (go_router)**: Centralize auth guards and redirect logic in pp_router.dart. Use ShellRoute for persistent bottom navigation.
* **Widget Granularity**: Keep uild() methods under **100 lines**. Extract layout blocks into dedicated StatelessWidget / ConsumerWidget classes (not private _buildHelper() methods) to optimize rebuilds. Use const constructors aggressively.
* **Zero-Widget Unit Testing**: Test business logic notifiers in pure Dart unit tests using ProviderContainer without pumping widgets.
* **Mini App Sandbox & JS Bridge Safety**:
  * Mini App invocation must strictly route through MiniAppDispatcher rather than ad-hoc navigation.
  * WebView containers must enforce strict origin checks, HTTPS enforcement, and isolated JavaScript bridge communication.

---

## 4. How to Update Guidelines
When new patterns, performance improvements, or architectural decisions are made:
* Update the corresponding skill in .agents/skills/.
* Update this AGENTS.md file to keep all rules synchronized.
