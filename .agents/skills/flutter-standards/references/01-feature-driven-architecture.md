# 01. Flutter Feature-Driven Architecture

This document defines directory structure and modularization guidelines for Flutter applications using Riverpod.

---

## 1. Feature-First Directory Layout (lib/features/)

Organize the app by functional business capabilities rather than grouping all screens or models together.

`	ext
lib/
├── app.dart                        # MaterialApp / App entry widget
├── main.dart                       # main() entry point & dependency initialization
│
├── core/                           # Decoupled singleton infrastructure
│   ├── network/                    # Dio client, SSL pinning, interceptors
│   ├── native_sdk/                 # MethodChannel bridges, vendor lifecycle
│   ├── storage/                    # FlutterSecureStorage, SharedPreferences
│   ├── routing/                    # GoRouter configuration
│   └── theme/                      # App theme, typography, color palettes
│
└── features/                       # Business capabilities
    ├── auth/                       # Authentication feature
    ├── home/                       # Dashboard & feed
    └── miniapp/                    # Mini App launcher & sandbox feature
        ├── data/                   # Repositories & DTOs
        ├── domain/                 # Pure domain models & failure classes
        ├── presentation/           # Screens & feature widgets
        │   ├── screens/
        │   │   ├── miniapp_catalog_screen.dart
        │   │   └── miniapp_host_screen.dart
        │   └── widgets/
        │       ├── miniapp_card.dart
        │       └── miniapp_permission_dialog.dart
        └── providers/              # Riverpod StateNotifier / Notifier providers
            ├── miniapp_catalog_provider.dart
            └── miniapp_launcher_provider.dart
`

---

## 2. Feature Isolation Rules

1. **No Cross-Feature Presentation Imports**:
   * A widget in eatures/home/presentation/ must **never** directly import an internal widget from eatures/auth/presentation/.
   * Coordinate cross-feature navigation strictly through the router (e.g., context.pushNamed('login')).
2. **Coordinated Through State Providers**:
   * Cross-feature state (e.g., current authenticated user, active session) lives in core/session/ or shared root providers and is consumed via ef.watch().
