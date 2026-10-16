# 03. Flutter Widget Granularity & Riverpod Best Practices

This document establishes performance guidelines for widget decomposition and state management using Flutter Riverpod.

---

## 1. Widget Granularity & Rebuild Optimization

Never write giant, monolithic uild() methods.

* **100-Line Limit**: Keep uild() methods short and readable—target **under 100 lines**.
* **Extract Subtrees into Independent Classes**:
  * Extract complex layout blocks into separate StatelessWidget or ConsumerWidget classes rather than private helper methods like _buildHeader().
  * *Why:* Dedicated classes allow Flutter's element tree to skip rebuilding unmodified children. Helper methods rebuild every time the parent rebuilds.
* **Aggressive const Usage**:
  * Always use const constructors wherever widget parameters are compile-time constants to avoid unnecessary element rebuilding.

---

## 2. Riverpod State Management Rules

Keep UI widgets strictly declarative; business logic belongs in Riverpod providers.

| Scenario | Correct Usage | Anti-Pattern to Avoid |
| :--- | :--- | :--- |
| **Reading state to build UI** | ef.watch(myProvider) | ❌ ef.read(myProvider) in uild() (stops UI from updating) |
| **Triggering actions in callbacks** | ef.read(myProvider.notifier).action() | ❌ ef.watch() inside onPressed or event handlers |
| **Async data fetching** | AsyncNotifierProvider or FutureProvider | ❌ StatefulWidget with manual setState() and async loops |

### Example: Clean ConsumerWidget & AsyncNotifier
`dart
// features/miniapp/presentation/screens/miniapp_catalog_screen.dart
class MiniappCatalogScreen extends ConsumerWidget {
  const MiniappCatalogScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final catalogAsync = ref.watch(miniappCatalogProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Mini Apps')),
      body: catalogAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Failed: ')),
        data: (miniapps) => ListView.builder(
          itemCount: miniapps.length,
          itemBuilder: (context, index) => MiniappCard(app: miniapps[index]),
        ),
      ),
    );
  }
}
`
