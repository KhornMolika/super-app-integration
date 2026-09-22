import 'package:flutter/widgets.dart';

typedef MiniAppWidgetBuilder = Widget Function(BuildContext context, dynamic arguments);

/// Central dynamic registry mapping Mini App package names, identifiers, and aliases
/// to compiled Flutter widget builders.
class MiniAppRegistry {
  static final Map<String, MiniAppWidgetBuilder> _builders = {};

  /// Normalizes keys (lowercase, replacing hyphens with underscores).
  static String normalizeKey(String key) {
    return key.trim().toLowerCase().replaceAll('-', '_');
  }

  /// Registers a widget builder for a mini app package name or identifier.
  static void register(String key, MiniAppWidgetBuilder builder) {
    final normalized = normalizeKey(key);
    _builders[normalized] = builder;
  }

  /// Registers multiple alias keys for a single widget builder.
  static void registerAliases(List<String> keys, MiniAppWidgetBuilder builder) {
    for (final k in keys) {
      register(k, builder);
    }
  }

  /// Checks if a builder exists for the given key.
  static bool isRegistered(String key) {
    return _builders.containsKey(normalizeKey(key));
  }

  /// Resolves and builds a widget instance for the given key.
  static Widget? build(String key, BuildContext context, dynamic arguments) {
    final normalized = normalizeKey(key);
    return _builders[normalized]?.call(context, arguments);
  }

  /// Returns all currently registered keys.
  static List<String> get registeredKeys => _builders.keys.toList();
}
