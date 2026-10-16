# 04. Modern Riverpod Code Generation & AsyncNotifier Best Practices

This document establishes standards for managing state and asynchronous mutations using Riverpod with code generation (@riverpod).

---

## 1. The @riverpod Annotation & Code-Gen Mental Model

* **Code-Gen by Default**: Use iverpod_annotation and @riverpod for all providers. It provides compile-time safety, autoDispose by default, clean syntax, and automated family parameter generation.
* **AsyncNotifier as the Gold Standard**: Use AsyncNotifier for any state that fetches asynchronous data and supports mutations (create, update, delete). It replaces legacy StateNotifier and manual FutureProvider wrappers.

---

## 2. Standard AsyncNotifier Implementation

Follow this production pattern:
1. The **uild() method** returns a Future<T> and handles initial data fetching.
2. All mutation methods use **AsyncValue.guard()** to automatically catch errors and update the state to AsyncError with proper stack traces.
3. Action methods must use **ef.read()** to access other providers, preventing unwanted widget rebuilds.

`dart
// lib/features/todo/providers/todo_controller.dart
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../domain/todo.dart';
import '../data/todo_repository.dart';

part 'todo_controller.g.dart';

@riverpod
class TodoController extends _ {
  @override
  Future<List<Todo>> build() async {
    // Initial data fetch
    final repository = ref.read(todoRepositoryProvider);
    return await repository.fetchTodos();
  }

  /// Mutation using AsyncValue.guard
  Future<void> addTodo(String title) async {
    // Optional: set loading if list-level loader is desired
    // state = const AsyncValue.loading();

    state = await AsyncValue.guard(() async {
      final repository = ref.read(todoRepositoryProvider);
      final newTodo = await repository.createTodo(title);

      final current = state.valueOrNull ?? [];
      return [...current, newTodo];
    });
  }

  /// Deleting an item
  Future<void> removeTodo(String id) async {
    state = await AsyncValue.guard(() async {
      final repository = ref.read(todoRepositoryProvider);
      await repository.deleteTodo(id);

      final current = state.valueOrNull ?? [];
      return current.where((todo) => todo.id != id).toList();
    });
  }
}
`

---

## 3. UI Consumption with .when()

Consume the generated provider inside a ConsumerWidget:

`dart
// lib/features/todo/presentation/screens/todo_screen.dart
class TodoScreen extends ConsumerWidget {
  const TodoScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final todosAsync = ref.watch(todoControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Todo List')),
      body: todosAsync.when(
        data: (todos) => ListView.builder(
          itemCount: todos.length,
          itemBuilder: (context, index) {
            final todo = todos[index];
            return ListTile(
              title: Text(todo.title),
              trailing: IconButton(
                icon: const Icon(Icons.delete),
                onPressed: () => ref.read(todoControllerProvider.notifier).removeTodo(todo.id),
              ),
            );
          },
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: ')),
      ),
    );
  }
}
`

---

## 4. Code Generation Build Command

Run uild_runner to automatically generate *.g.dart files:

`ash
flutter pub run build_runner watch --delete-conflicting-outputs
`
