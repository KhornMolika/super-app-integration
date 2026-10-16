# 02. Flutter Decoupled Core Infrastructure

Low-level infrastructure, network protocols, native platform bridges, and secure hardware storage must be completely decoupled from UI feature screens.

---

## 1. Core Modules Breakdown (lib/core/)

1. **core/network/**:
   * Dio HTTP client configured with base URLs, timeout policies, and SSL pinning.
   * Interceptors for JWT authorization headers, automatic token refresh, and network failure logging.
2. **core/native_sdk/**:
   * Safe native bridge wrappers using Flutter MethodChannel.
   * Vendor SDK lifecycle invocations (initialize, presentPayment, iometricAuth).
   * In-flight execution guards to prevent double-tap native crashes.
3. **core/storage/ & core/session/**:
   * Secure hardware storage using lutter_secure_storage (iOS Keychain / Android Keystore) for access tokens and sensitive session credentials.
   * shared_preferences for non-sensitive local settings (e.g., dark mode toggle, language preference).
4. **core/miniapp/**:
   * Dynamic mini-app registry, launcher dispatcher, and sandboxed hosting screens (MiniAppHostScreen).
   * Strict origin verification, HTTPS enforcement, and isolated JavaScript bridge communication.
