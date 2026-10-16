---
name: flutter-standards
description: >-
  Provides architectural guidelines for Flutter mobile applications, including Feature-Driven Architecture,
  Riverpod code generation (@riverpod, AsyncNotifier), widget granularity, declarative go_router, and unit testing.
---

# Flutter & Riverpod Architecture Standards

Use this skill when developing, refactoring, or reviewing mobile applications built with Flutter and Riverpod.

---

## 1. Core Architecture & Widget Rules

1. **Feature-First Layout (lib/features/<domain>/)**:
   * Every business capability has its own folder containing presentation/, providers/, data/, and domain/.
   * Never directly import another feature's internal presentation widgets; coordinate via router and providers.
2. **Decoupled Core Infrastructure (lib/core/)**:
   * Keep HTTP/Dio clients, native MethodChannel bridges, and secure hardware storage (FlutterSecureStorage) in core/.
3. **Widget Granularity (< 100 lines)**:
   * Keep uild() methods under **100 lines**. Extract layout blocks into dedicated StatelessWidget / ConsumerWidget classes (not private _buildHelper() methods) to optimize rebuilds.
   * Use const constructors aggressively.
4. **Riverpod Code Generation & AsyncNotifier**:
   * Use @riverpod annotations and AsyncNotifier for async state and mutations.
   * Use AsyncValue.guard(() => ...) for safe error handling without manual try/catch.
   * Read action methods via ef.read(); watch UI in build methods via ef.watch().
5. **Declarative Navigation (go_router)**:
   * Centralize auth guards and redirect logic in pp_router.dart. Use ShellRoute for persistent navigation bars.
6. **Zero-Widget Provider Unit Testing**:
   * Test business logic notifiers in pure Dart unit tests using ProviderContainer without pumping widgets.

---

## 2. In-Depth Reference Guides

For code samples and comprehensive guidelines:
* [01. Feature-Driven Architecture](./references/01-feature-driven-architecture.md)
* [02. Decoupled Core Infrastructure](./references/02-decoupled-core-infrastructure.md)
* [03. Widget Granularity & Riverpod Best Practices](./references/03-riverpod-and-widget-granularity.md)
* [04. Modern Riverpod Code Generation & AsyncNotifier](./references/04-modern-riverpod-code-generation.md)
* [05. Routing, Serialization & Provider Testing](./references/05-routing-serialization-and-testing.md)
