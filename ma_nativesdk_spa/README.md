# Lotus Spa & Wellness Mini App (`ma_nativesdk_spa`)

Sample **Native SDK** Mini App designed for high-performance native experiences within the Super App platform.

## Architecture

This Mini App utilizes **The Universal Native Mini App Launcher**:
- **Android Entry Point**: `com.fintech.vendor.spa.SpaBookingActivity`
- **iOS Entry Point**: `SpaBookingViewController`
- **Zero Regex Code Generation**: The Super App dispatches directly to the vendor entry point via reflection (`Class.forName` on Android and `@objc` class lookup on iOS).
- **Session Bridge**: Receives `EXTRA_USER_ID`, `EXTRA_AUTH_TOKEN`, and dynamic launch parameters directly from the host container.
