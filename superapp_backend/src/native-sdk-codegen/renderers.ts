import { NativeSdkVendor } from './vendor.types';

/**
 * ---------------------------------------------------------------------------
 * MARKER REGIONS (Task 8 adds these to the mobile app by reading this file)
 * ---------------------------------------------------------------------------
 * `replaceMarkedRegion` (marker.ts) rewrites everything between a begin/end
 * pair. Each file below needs exactly ONE pair per region, using the comment
 * syntax of that file. Use `beginMarker()` / `endMarker()` (or the
 * NATIVE_SDK_MARKED_REGIONS table) to obtain the exact lines; the resulting
 * text is e.g. `// === GENERATED NATIVE SDK IMPORTS — DO NOT EDIT ===`.
 * All paths are relative to the mobile-super-app root.
 *
 * Target: ios/Podfile   (comment prefix `#`)
 *   SOURCES  top level, right after the `project 'Runner', { ... }` block
 *            (before `target 'Runner' do`). The region body is EMPTY (a Nexus raw
 *            repo is not a CocoaPods Specs source, so no `source` line is
 *            emitted for it). The markers stay for compatibility. The
 *            Podfile's `source 'https://cdn.cocoapods.org/'` lives OUTSIDE the
 *            region, just above it.
 *   PODS     inside `target 'Runner' do`, on the line after
 *            `flutter_install_all_ios_pods File.dirname(File.realpath(__FILE__))`
 *            and before `target 'RunnerTests' do`. Emits 2-space-indented
 *            `pod 'Name', :podspec => '<specsRepo>/Specs/Name/x.y.z/Name.podspec'`
 *            lines (the podspec the upload service PUT to Nexus).
 *
 * Target: android/app/build.gradle.kts   (comment prefix `//`)
 *   SOURCES  new top-level `repositories { ... }` block placed between the
 *            `kotlin { ... }` block and `flutter { ... }` — i.e. the markers
 *            go INSIDE that block:
 *              repositories {
 *                  // === GENERATED NATIVE SDK SOURCES — DO NOT EDIT ===
 *                  // === END GENERATED NATIVE SDK SOURCES ===
 *              }
 *            Emits 4-space-indented `maven { url = uri("...") }` blocks.
 *   DEPS     inside a new top-level `dependencies { ... }` block after
 *            `flutter { source = "../.." }` (same nesting, markers inside).
 *            Emits 4-space-indented `implementation("g:a:v")` lines.
 *
 * Target: ios/Runner/AppDelegate.swift   (comment prefix `//`)
 *   IMPORTS  after the existing `import UIKit` line (top level).
 *   HANDLERS inside `didInitializeImplicitFlutterEngine(_ engineBridge:)`,
 *            after `GeneratedPluginRegistrant.register(with: ...)`. Task 8
 *            must ALSO add, outside the regions and before the region is used:
 *              `let messenger = engineBridge.applicationRegistrar.messenger()`
 *                 (in that method, above the HANDLERS markers),
 *              `private var inFlight = Set<String>()` (class property),
 *              `func topPresenter() -> UIViewController?` (class method;
 *                 window?.rootViewController, falling back to
 *                 UIApplication.shared.windows key/first window).
 *            Emits 4-space-indented per-vendor `FlutterMethodChannel` blocks
 *            (channel `com.example.mobile_super_app/<appId identifier>`,
 *            method `present`), each self-contained.
 *
 * Target: android/app/src/main/kotlin/com/example/dsp_mobile/MainActivity.kt
 *   IMPORTS  after the existing `import io.flutter.embedding.android.FlutterActivity`
 *            line (top level). Task 8 must also add, outside the regions:
 *            `import io.flutter.embedding.engine.FlutterEngine` and
 *            `import io.flutter.plugin.common.MethodChannel`.
 *   HANDLERS inside `configureFlutterEngine(flutterEngine)` after
 *            `super.configureFlutterEngine(flutterEngine)`. Task 8 must ALSO
 *            add, outside the regions: the override itself,
 *            `val messenger = flutterEngine.dartExecutor.binaryMessenger`
 *            (above the markers) and a class property
 *            `private val inFlight = mutableSetOf<String>()`.
 *            Emits 8-space-indented per-vendor `MethodChannel(messenger, ...)`
 *            blocks (same channel names/method as iOS).
 *
 * Region names are not prefixes of one another (marker.ts matches by
 * substring), keep it that way when adding regions.
 * ---------------------------------------------------------------------------
 */

export const MARKER_BEGIN_PREFIX = 'GENERATED NATIVE SDK';
export const MARKER_END_PREFIX = 'END GENERATED NATIVE SDK';

export type CommentPrefix = '#' | '//';

export function beginMarker(commentPrefix: CommentPrefix, region: string) {
  return `${commentPrefix} === ${MARKER_BEGIN_PREFIX} ${region} — DO NOT EDIT ===`;
}

export function endMarker(commentPrefix: CommentPrefix, region: string) {
  return `${commentPrefix} === ${MARKER_END_PREFIX} ${region} ===`;
}

export const REGION_SOURCES = 'SOURCES';
export const REGION_PODS = 'PODS';
export const REGION_DEPS = 'DEPS';
export const REGION_IMPORTS = 'IMPORTS';
export const REGION_HANDLERS = 'HANDLERS';

const CHANNEL_PREFIX = 'com.example.dsp_mobile';

export const NATIVE_SDK_TARGET_FILES = {
  podfile: 'ios/Podfile',
  gradle: 'android/app/build.gradle.kts',
  appDelegate: 'ios/Runner/AppDelegate.swift',
  mainActivity:
    'android/app/src/main/kotlin/com/example/dsp_mobile/MainActivity.kt',
} as const;

export type NativeSdkTargetKey = keyof typeof NATIVE_SDK_TARGET_FILES;

/** The 8 marked regions, per target file (paths relative to the mobile-super-app root). */
export const NATIVE_SDK_MARKED_REGIONS: Record<
  NativeSdkTargetKey,
  { path: string; commentPrefix: CommentPrefix; regions: string[] }
> = {
  podfile: {
    path: NATIVE_SDK_TARGET_FILES.podfile,
    commentPrefix: '#',
    regions: [REGION_SOURCES, REGION_PODS],
  },
  gradle: {
    path: NATIVE_SDK_TARGET_FILES.gradle,
    commentPrefix: '//',
    regions: [REGION_SOURCES, REGION_DEPS],
  },
  appDelegate: {
    path: NATIVE_SDK_TARGET_FILES.appDelegate,
    commentPrefix: '//',
    regions: [REGION_IMPORTS, REGION_HANDLERS],
  },
  mainActivity: {
    path: NATIVE_SDK_TARGET_FILES.mainActivity,
    commentPrefix: '//',
    regions: [REGION_IMPORTS, REGION_HANDLERS],
  },
};

// --- Input validation -------------------------------------------------------
// Vendor strings end up verbatim in Gradle/Swift/Kotlin/Ruby source that is
// compiled or executed at build time, so every field is checked against an
// allow-list and the renderer THROWS (naming the field) instead of escaping.
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const DOTTED_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;
const MAVEN_COORD = /^[A-Za-z0-9_.-]+$/;
const VERSION = /^[A-Za-z0-9_.+-]+$/;
const HTTP_URL = /^https?:\/\/[^\s"'`\\$]+$/;

function check(
  pattern: RegExp,
  field: string,
  value: unknown,
  appId: string,
): string {
  if (typeof value !== 'string' || value === '' || !pattern.test(value)) {
    throw new Error(
      `Invalid native SDK vendor "${appId}": field "${field}" ${
        typeof value === 'string' && value !== ''
          ? `has an unsafe value ${JSON.stringify(value)}`
          : 'is missing'
      } (must match ${pattern})`,
    );
  }
  return value;
}

function assertUniqueIdentifiers(vendors: NativeSdkVendor[]): void {
  const seen = new Map<string, string>();
  for (const v of vendors) {
    const id = identifierFor(v.appId);
    const prior = seen.get(id);
    if (prior !== undefined) {
      throw new Error(
        `Native SDK vendors "${prior}" and "${v.appId}" both map to identifier "${id}"; appIds must stay distinct after non-alphanumerics are replaced`,
      );
    }
    seen.set(id, v.appId);
  }
}

const DEFAULT_POD_VERSION = '1.0.0';

export function identifierFor(appId: string): string {
  return appId.replace(/[^A-Za-z0-9]/g, '_');
}

/** Escapes a value for a Gradle Kotlin-DSL double-quoted string literal. */
export function escapeLiteral(value: string): string {
  return value.replace(/[\\"$]/g, (m) => `\\${m}`);
}

/** Single-quoted Ruby string content. */
export function escapeRubySingle(value: string): string {
  return value.replace(/[\\']/g, (m) => `\\${m}`);
}

function withTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

function uniq(values: string[]): string[] {
  return [...new Set(values)];
}

/**
 * iOS pod version: explicit field, else parsed from the zip URL that
 * SdkArtifactUploadService wrote (`.../<name>/<version>/<name>.xcframework.zip`),
 * else 1.0.0 (the upload default).
 */
export function podVersionFor(vendor: NativeSdkVendor): string {
  const m = vendor.iosNexusZipUrl?.match(/\/([^/]+)\/[^/]+\.xcframework\.zip$/);
  const version = vendor.iosVersion || (m ? m[1] : DEFAULT_POD_VERSION);
  return check(VERSION, 'iosVersion', version, vendor.appId);
}

function channelFor(vendor: NativeSdkVendor): string {
  return `${CHANNEL_PREFIX}/${identifierFor(vendor.appId)}`;
}

export function renderIosImports(vendors: NativeSdkVendor[]): string {
  return vendors
    .map(
      (v) =>
        `import ${check(IDENTIFIER, 'iosModuleName', v.iosModuleName, v.appId)}`,
    )
    .join('\n');
}

export function renderAndroidImports(vendors: NativeSdkVendor[]): string {
  return vendors
    .map(
      (v) =>
        `import ${check(DOTTED_IDENTIFIER, 'androidPackageName', v.androidPackageName, v.appId)}.${check(IDENTIFIER, 'androidObjectName', v.androidObjectName, v.appId)}`,
    )
    .join('\n');
}

/**
 * The Podfile SOURCES region is intentionally EMPTY. A Nexus raw repo is not a
 * CocoaPods Specs source, so a `source '<nexus>'` line could never resolve a
 * pod; vendor pods are instead pinned by `:podspec =>` URL (see
 * renderPodfileLines). The region markers are kept for compatibility; the
 * Podfile's CDN source stays outside the region.
 */
export function renderPodfileSources(vendors: NativeSdkVendor[]): string {
  // Still validate the URL so a bad vendor fails loudly at the same point.
  vendors.forEach((v) =>
    check(HTTP_URL, 'cocoapodsSpecsUrl', v.cocoapodsSpecsUrl, v.appId),
  );
  return '';
}

/**
 * URL of the podspec SdkArtifactUploadService PUT to the Nexus raw specs repo:
 * `<specsRepo>/Specs/<Module>/<version>/<Module>.podspec`.
 */
export function podspecUrlFor(vendor: NativeSdkVendor): string {
  const base = withTrailingSlash(
    check(
      HTTP_URL,
      'cocoapodsSpecsUrl',
      vendor.cocoapodsSpecsUrl,
      vendor.appId,
    ),
  );
  const mod = check(
    IDENTIFIER,
    'iosModuleName',
    vendor.iosModuleName,
    vendor.appId,
  );
  return `${base}Specs/${mod}/${podVersionFor(vendor)}/${mod}.podspec`;
}

export function renderPodfileLines(vendors: NativeSdkVendor[]): string {
  return vendors
    .map(
      (v) =>
        `  pod '${escapeRubySingle(check(IDENTIFIER, 'iosModuleName', v.iosModuleName, v.appId))}', :podspec => '${escapeRubySingle(podspecUrlFor(v))}'`,
    )
    .join('\n');
}

/**
 * Kotlin-DSL `maven { }` blocks, de-duplicated across vendors. Gradle refuses
 * plain-http repositories unless explicitly allowed, so http URLs (the
 * on-prem Nexus default) get `isAllowInsecureProtocol = true`.
 */
export function renderGradleSources(vendors: NativeSdkVendor[]): string {
  return uniq(
    vendors.map((v) =>
      withTrailingSlash(
        check(HTTP_URL, 'mavenRepoUrl', v.mavenRepoUrl, v.appId),
      ),
    ),
  )
    .map((url) => {
      const insecure = url.startsWith('http://')
        ? '\n        isAllowInsecureProtocol = true'
        : '';
      return `    maven {\n        url = uri("${escapeLiteral(url)}")${insecure}\n    }`;
    })
    .join('\n');
}

export function renderGradleLines(vendors: NativeSdkVendor[]): string {
  return vendors
    .map(
      (v) =>
        `    implementation("${check(MAVEN_COORD, 'androidMavenGroupId', v.androidMavenGroupId, v.appId)}:${check(MAVEN_COORD, 'androidMavenArtifactId', v.androidMavenArtifactId, v.appId)}:${check(VERSION, 'androidMavenVersion', v.androidMavenVersion, v.appId)}")`,
    )
    .join('\n');
}

/**
 * Per-vendor self-contained iOS channel registration. Vendor SDK contract:
 * `<Type>.initialize(userId:jwtToken:)` then `<Type>.present(from:completion)`.
 * Needs `messenger`, `inFlight` and `topPresenter()` from the AppDelegate
 * (see the header comment).
 */
export function renderIosHandlers(vendors: NativeSdkVendor[]): string {
  assertUniqueIdentifiers(vendors);
  return vendors
    .map((v) => {
      check(IDENTIFIER, 'iosTypeName', v.iosTypeName, v.appId);
      const id = identifierFor(v.appId);
      const channel = channelFor(v);
      return `    let channel_${id} = FlutterMethodChannel(
      name: "${channel}",
      binaryMessenger: messenger
    )
    channel_${id}.setMethodCallHandler { [weak self] call, result in
      guard call.method == "present" else {
        result(FlutterMethodNotImplemented)
        return
      }
      guard self?.inFlight.contains("${channel}") != true else {
        result(["status": "error", "error": "already in progress"])
        return
      }
      guard let args = call.arguments as? [String: Any],
            let userId = args["userId"] as? String,
            let jwtToken = args["jwtToken"] as? String else {
        result(["status": "error", "error": "missing identity"])
        return
      }
      guard let presenter = self?.topPresenter() else {
        result(["status": "error", "error": "no presenter"])
        return
      }
      self?.inFlight.insert("${channel}")
      ${v.iosTypeName}.initialize(userId: userId, jwtToken: jwtToken)
      ${v.iosTypeName}.present(from: presenter) {
        self?.inFlight.remove("${channel}")
        result(["status": "completed"])
      }
    }`;
    })
    .join('\n\n');
}

/** Android counterpart; needs `messenger` and `inFlight` from MainActivity. */
export function renderAndroidHandlers(vendors: NativeSdkVendor[]): string {
  assertUniqueIdentifiers(vendors);
  return vendors
    .map((v) => {
      check(IDENTIFIER, 'androidObjectName', v.androidObjectName, v.appId);
      const channel = channelFor(v);
      return `        MethodChannel(messenger, "${channel}").setMethodCallHandler { call, result ->
            if (call.method != "present") {
                result.notImplemented()
            } else if (inFlight.contains("${channel}")) {
                result.success(mapOf("status" to "error", "error" to "already in progress"))
            } else {
                val userId = call.argument<String>("userId")
                val jwtToken = call.argument<String>("jwtToken")
                if (userId == null || jwtToken == null) {
                    result.success(mapOf("status" to "error", "error" to "missing identity"))
                } else {
                    inFlight.add("${channel}")
                    ${v.androidObjectName}.initialize(userId, jwtToken)
                    ${v.androidObjectName}.present(this) {
                        inFlight.remove("${channel}")
                        result.success(mapOf("status" to "completed"))
                        kotlin.Unit
                    }
                }
            }
        }`;
    })
    .join('\n\n');
}
