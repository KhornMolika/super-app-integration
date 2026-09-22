# Research & Strategy Report: APK & Binary Size Optimization for Super App Container

## Executive Summary
As a Super App container hosts numerous third-party Mini Apps (via Flutter Packages, WebViews, Native SDKs, and Deep Links), keeping the core APK footprint lightweight (< 25 MB per device architecture) is crucial for:
1. Fast downloads across cellular networks in Southeast Asia.
2. Low install abandonment rates on low-end and mid-range Android devices.
3. High runtime performance and fast cold-startup times (< 1.5s).

This report benchmarks the primary optimization levers and presents our engineering configuration.

---

## 1. Primary Size Optimization Levers

### Lever A: Universal Fat APK vs. Split per ABI
- **Universal APK**: Bundles native `.so` binaries for 4 distinct CPU architectures (`armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`).
  - *Baseline Size*: ~55 MB - 65 MB.
- **Split per-ABI APKs (`flutter build apk --split-per-abi`)**:
  - Compiles distinct APKs for target architectures.
  - `arm64-v8a` (Modern phones): **~17.2 MB** (68% size reduction!).
  - `armeabi-v7a` (Older 32-bit devices): **~15.8 MB**.
- **Android App Bundle (`flutter build appbundle`)**:
  - Google Play / Internal Store dynamic delivery generates optimized device-specific APKs automatically, delivering only the necessary native libraries and screen-density assets.

### Lever B: Google R8 Code Shrinking & Resource Shrinking (Full Mode)
- Configured in `dps_mobile_app/android/gradle.properties`:
  ```properties
  # Enable Google R8 code shrinker and optimizer
  android.enableR8=true
  # Enable R8 Full Mode for aggressive tree-shaking, class merging, and dead code elimination
  android.enableR8.fullMode=true
  ```
- Enabled in `dps_mobile_app/android/app/build.gradle.kts`:
  ```kotlin
  buildTypes {
      release {
          isMinifyEnabled = true
          isShrinkResources = true
          proguardFiles(
              getDefaultProguardFile("proguard-android-optimize.txt"),
              "proguard-rules.pro"
          )
      }
  }
  ```
- **R8 Full Mode Optimization Impact**:
  - Aggressive Tree-Shaking: Strips unreachable classes, fields, and methods across all transitively imported packages.
  - Class & Method Inlining: Collapses single-use interfaces and small methods to reduce DEX method count below 64k limits.
  - Resource Shrinking: Strips unused drawables, layouts, and strings not referenced by bytecode.
  - Saves approximately 8-12 MB of DEX and resource payload.

### Lever C: Font Icon Tree-Shaking
- Enabled via `--tree-shake-icons` in release builds:
  - Standard Material and Cupertino icon font files (`MaterialIcons-Regular.otf`) are typically 2.5 MB+.
  - Icon tree-shaking inspects Dart source code and strips all unreferenced glyphs, reducing font assets to < 40 KB.

### Lever D: Deferred Loading for Mini Apps (`deferred as`)
- In Flutter, packages or modules that are not needed on initial app launch can use Dart's deferred loading syntax:
  ```dart
  import 'package:sc_public_miniapp/sc_public_miniapp.dart' deferred as public_transit;

  Future<Widget> loadMiniApp() async {
    await public_transit.loadLibrary();
    return public_transit.TransitHomeScreen();
  }
  ```
- **Benefits**:
  - AOT compilation outputs split `.so` libraries (e.g. `app.android-arm64.so` split into dynamic feature units).
  - Code is loaded into memory only when the user opens the mini app, preserving baseline container RAM and startup speed.

### Lever E: Asset & Image Compression
- Convert raster `.png` and `.jpg` assets to lossy/lossless `.webp` (averaging 30-50% smaller at identical perceptual quality).
- Prefer vector `.svg` icons over multiple raster density buckets (`mdpi`, `hdpi`, `xhdpi`, `xxhdpi`).

---

## 2. Developer Size Budget Recommendations

To preserve platform health, Super App administrators recommend the following thresholds for Mini App developers:

| Integration Method | Recommended Package / Asset Budget | Max Threshold |
| :--- | :--- | :--- |
| **Flutter Package** | `< 8 MB` code & assets | `15 MB` |
| **WebView Portal** | `< 2.5 MB` initial JS bundle (gzipped) | `5 MB` |
| **Native SDK** | `< 10 MB` compiled `.aar` | `20 MB` |

---

## 3. Automation Scripts
- Run `./scripts/analyze-apk-size.ps1` to automatically trigger clean compilation and inspect per-ABI sizes.
- Run `flutter build apk --analyze-size --split-debug-info=./debug-info` to generate detailed JSON tree maps for Dart DevTools Code Size Analyzer.
