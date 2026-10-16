# 05. Flutter Routing, Serialization & Provider Testing

This document defines architectural standards for declarative routing, JSON serialization with Freezed, and unit testing Riverpod providers.

---

## 1. Declarative Routing with go_router

Use go_router to handle deep links, auth redirects, and bottom navigation:

* **Top-Level Auth Guards (edirect)**: Centralize login/logout redirects at the router configuration level rather than inside screen lifecycle methods.
* **ShellRoute for Persistent UI**: Use ShellRoute to maintain bottom navigation bars or side drawers while sub-routes change.

`dart
// lib/core/routing/app_router.dart
final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authNotifierProvider);

  return GoRouter(
    initialLocation: '/home',
    redirect: (context, state) {
      final isLoggedIn = authState.valueOrNull != null;
      final isLoggingIn = state.matchedLocation == '/login';

      if (!isLoggedIn && !isLoggingIn) return '/login';
      if (isLoggedIn && isLoggingIn) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      ShellRoute(
        builder: (context, state, child) => MainScaffold(child: child),
        routes: [
          GoRoute(path: '/home', builder: (context, state) => const HomeScreen()),
          GoRoute(path: '/catalog', builder: (context, state) => const CatalogScreen()),
        ],
      ),
    ],
  );
});
`

---

## 2. Immutable Data Models with Freezed

Never write manual copyWith or == overrides. Use reezed and json_serializable:

`dart
// lib/features/todo/domain/todo.dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'todo.freezed.dart';
part 'todo.g.dart';

@freezed
class Todo with _ {
  const factory Todo({
    required String id,
    required String title,
    @Default(false) bool completed,
    DateTime? createdAt,
  }) = _Todo;

  factory Todo.fromJson(Map<String, dynamic> json) => _(json);
}
`

---

## 3. Zero-Widget Provider Unit Testing (ProviderContainer)

Riverpod allows testing state notifiers in pure Dart unit tests without pumping widgets:

`dart
// test/features/todo/todo_controller_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mocktail/mocktail.dart';

class MockTodoRepository extends Mock implements TodoRepository {}

void main() {
  test('TodoController fetches initial todos on build', () async {
    final mockRepo = MockTodoRepository();
    when(() => mockRepo.fetchTodos()).thenAnswer((_) async => [
      Todo(id: '1', title: 'Test Todo'),
    ]);

    // Create an isolated container with overrides
    final container = ProviderContainer(
      overrides: [
        todoRepositoryProvider.overrideWithValue(mockRepo),
      ],
    );
    addTearDown(container.dispose);

    // Initial state is loading
    expect(container.read(todoControllerProvider), const AsyncLoading<List<Todo>>());

    // Await completion of future
    await container.read(todoControllerProvider.future);

    // State matches expected list
    expect(
      container.read(todoControllerProvider).value,
      [Todo(id: '1', title: 'Test Todo')],
    );
  });
}
`
