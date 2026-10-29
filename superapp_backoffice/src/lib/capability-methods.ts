export type IntegrationMethodOption =
  | 'ALL'
  | 'WEBVIEW'
  | 'FLUTTER_PACKAGE'
  | 'NATIVE_SDK'
  | 'DEEP_LINK';

export interface MethodSyntax {
  concise: string; // e.g. ".postMessage()", ".takePhoto()"
  full: string; // e.g. "FSASuperApp.postMessage(data)", "FSASuperApp.camera.takePhoto()"
  lang: string; // e.g. "JS / TS", "Dart", "Swift / Kotlin", "URI Scheme"
  badgeLabel: string; // e.g. "JS SDK", "Flutter", "Native", "Deep Link"
  badgeColor: {
    bg: string;
    text: string;
    border: string;
  };
  source?: 'database_metadata' | 'preset' | 'inferred';
  sampleSnippet?: string;
}

export const INTEGRATION_METHOD_CONFIGS: Record<
  Exclude<IntegrationMethodOption, 'ALL'>,
  {
    label: string;
    shortLabel: string;
    badgeLabel: string;
    lang: string;
    badgeColor: { bg: string; text: string; border: string };
  }
> = {
  WEBVIEW: {
    label: 'WebView (JS SDK)',
    shortLabel: 'WebView',
    badgeLabel: 'JS SDK',
    lang: 'JavaScript / TypeScript',
    badgeColor: {
      bg: 'bg-violet-50 dark:bg-violet-950/40',
      text: 'text-violet-700 dark:text-violet-300',
      border: 'border-violet-200/80 dark:border-violet-800/60',
    },
  },
  FLUTTER_PACKAGE: {
    label: 'Flutter Package (Dart)',
    shortLabel: 'Flutter',
    badgeLabel: 'Flutter',
    lang: 'Dart',
    badgeColor: {
      bg: 'bg-sky-50 dark:bg-sky-950/40',
      text: 'text-sky-700 dark:text-sky-300',
      border: 'border-sky-200/80 dark:border-sky-800/60',
    },
  },
  NATIVE_SDK: {
    label: 'Native SDK (iOS / Android)',
    shortLabel: 'Native SDK',
    badgeLabel: 'Native',
    lang: 'Swift / Kotlin',
    badgeColor: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200/80 dark:border-emerald-800/60',
    },
  },
  DEEP_LINK: {
    label: 'Deep Link (URI Protocol)',
    shortLabel: 'Deep Link',
    badgeLabel: 'Deep Link',
    lang: 'URI Protocol',
    badgeColor: {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200/80 dark:border-amber-800/60',
    },
  },
};

/**
 * Built-in Baseline Presets:
 * Provides tailored parameter hints for standard mobile hardware sensors.
 * For any newly added or custom capabilities, the Dynamic Universal Engine
 * resolves signatures dynamically from metadata or algorithmic inference.
 */
interface CapabilityMethodMapping {
  WEBVIEW: { concise: string; full: string };
  FLUTTER_PACKAGE: { concise: string; full: string };
  NATIVE_SDK: { concise: string; full: string };
  DEEP_LINK: { concise: string; full: string };
}

export const BUILTIN_CAPABILITY_PRESETS: Record<string, CapabilityMethodMapping> = {
  // 1. Sandboxed WebView Runtime / Post Message Bridge
  webview_runtime: {
    WEBVIEW: {
      concise: '.postMessage()',
      full: 'FSASuperApp.postMessage(data)',
    },
    FLUTTER_PACKAGE: {
      concise: '.postMessage()',
      full: 'FSASuperApp.postMessage(event)',
    },
    NATIVE_SDK: {
      concise: '.postMessage()',
      full: 'FSASuperApp.shared.postMessage(payload)',
    },
    DEEP_LINK: {
      concise: 'superapp://bridge/postMessage',
      full: 'superapp://bridge/postMessage?data={json}',
    },
  },

  // 2. Camera & Document Capture
  camera: {
    WEBVIEW: {
      concise: '.takePhoto()',
      full: 'FSASuperApp.takePhoto(options)',
    },
    FLUTTER_PACKAGE: {
      concise: '.camera.takePhoto()',
      full: 'await FSASuperApp.camera.takePhoto()',
    },
    NATIVE_SDK: {
      concise: '.takePhoto()',
      full: 'FSASuperApp.shared.takePhoto(callback)',
    },
    DEEP_LINK: {
      concise: 'superapp://camera/takePhoto',
      full: 'superapp://camera/takePhoto?quality=90',
    },
  },
  take_photo: {
    WEBVIEW: {
      concise: '.takePhoto()',
      full: 'FSASuperApp.takePhoto(options)',
    },
    FLUTTER_PACKAGE: {
      concise: '.camera.takePhoto()',
      full: 'await FSASuperApp.camera.takePhoto()',
    },
    NATIVE_SDK: {
      concise: '.takePhoto()',
      full: 'FSASuperApp.shared.takePhoto(callback)',
    },
    DEEP_LINK: {
      concise: 'superapp://camera/takePhoto',
      full: 'superapp://camera/takePhoto?quality=90',
    },
  },

  // 3. QR Code & Barcode Scanner
  scan_qr_code: {
    WEBVIEW: {
      concise: '.scanQRCode()',
      full: 'FSASuperApp.scanQRCode()',
    },
    FLUTTER_PACKAGE: {
      concise: '.camera.scanQRCode()',
      full: 'await FSASuperApp.camera.scanQRCode()',
    },
    NATIVE_SDK: {
      concise: '.scanQRCode()',
      full: 'FSASuperApp.shared.scanQRCode(callback)',
    },
    DEEP_LINK: {
      concise: 'superapp://camera/scanQRCode',
      full: 'superapp://camera/scanQRCode?callback=app://scan',
    },
  },

  // 4. Geolocation Services
  location: {
    WEBVIEW: {
      concise: '.getLocation()',
      full: 'FSASuperApp.getLocation(options)',
    },
    FLUTTER_PACKAGE: {
      concise: '.location.getLocation()',
      full: 'await FSASuperApp.location.getLocation()',
    },
    NATIVE_SDK: {
      concise: '.getLocation()',
      full: 'FSASuperApp.shared.getLocation(callback)',
    },
    DEEP_LINK: {
      concise: 'superapp://location/getLocation',
      full: 'superapp://location/getLocation?accuracy=high',
    },
  },
  get_location: {
    WEBVIEW: {
      concise: '.getLocation()',
      full: 'FSASuperApp.getLocation(options)',
    },
    FLUTTER_PACKAGE: {
      concise: '.location.getLocation()',
      full: 'await FSASuperApp.location.getLocation()',
    },
    NATIVE_SDK: {
      concise: '.getLocation()',
      full: 'FSASuperApp.shared.getLocation(callback)',
    },
    DEEP_LINK: {
      concise: 'superapp://location/getLocation',
      full: 'superapp://location/getLocation?accuracy=high',
    },
  },

  // 5. Biometric Authentication
  biometrics: {
    WEBVIEW: {
      concise: '.authenticateBiometric()',
      full: 'FSASuperApp.authenticateBiometric()',
    },
    FLUTTER_PACKAGE: {
      concise: '.biometrics.authenticate()',
      full: 'await FSASuperApp.biometrics.authenticate()',
    },
    NATIVE_SDK: {
      concise: '.authenticateBiometrics()',
      full: 'FSASuperApp.shared.authenticateBiometrics(callback)',
    },
    DEEP_LINK: {
      concise: 'superapp://biometrics/authenticate',
      full: 'superapp://biometrics/authenticate?prompt=Authorize',
    },
  },
  biometric_auth: {
    WEBVIEW: {
      concise: '.authenticateBiometric()',
      full: 'FSASuperApp.authenticateBiometric()',
    },
    FLUTTER_PACKAGE: {
      concise: '.biometrics.authenticate()',
      full: 'await FSASuperApp.biometrics.authenticate()',
    },
    NATIVE_SDK: {
      concise: '.authenticateBiometrics()',
      full: 'FSASuperApp.shared.authenticateBiometrics(callback)',
    },
    DEEP_LINK: {
      concise: 'superapp://biometrics/authenticate',
      full: 'superapp://biometrics/authenticate?prompt=Authorize',
    },
  },

  // 6. Secure Vault Storage
  storage: {
    WEBVIEW: {
      concise: '.getSecureStorage()',
      full: 'FSASuperApp.getSecureStorage(key)',
    },
    FLUTTER_PACKAGE: {
      concise: '.storage.getSecureStorage()',
      full: 'await FSASuperApp.storage.getSecureStorage(key)',
    },
    NATIVE_SDK: {
      concise: '.getSecureStorage()',
      full: 'FSASuperApp.shared.getSecureStorage(key)',
    },
    DEEP_LINK: {
      concise: 'superapp://storage/getSecureStorage',
      full: 'superapp://storage/getSecureStorage?key={key}',
    },
  },
  secure_storage: {
    WEBVIEW: {
      concise: '.getSecureStorage()',
      full: 'FSASuperApp.getSecureStorage(key)',
    },
    FLUTTER_PACKAGE: {
      concise: '.storage.getSecureStorage()',
      full: 'await FSASuperApp.storage.getSecureStorage(key)',
    },
    NATIVE_SDK: {
      concise: '.getSecureStorage()',
      full: 'FSASuperApp.shared.getSecureStorage(key)',
    },
    DEEP_LINK: {
      concise: 'superapp://storage/getSecureStorage',
      full: 'superapp://storage/getSecureStorage?key={key}',
    },
  },

  // 7. Microphone & Audio Capture
  microphone: {
    WEBVIEW: {
      concise: '.microphone()',
      full: 'FSASuperApp.microphone()',
    },
    FLUTTER_PACKAGE: {
      concise: '.audio.record()',
      full: 'await FSASuperApp.audio.record()',
    },
    NATIVE_SDK: {
      concise: '.startMicrophone()',
      full: 'FSASuperApp.shared.startMicrophone(callback)',
    },
    DEEP_LINK: {
      concise: 'superapp://microphone/record',
      full: 'superapp://microphone/record?duration=10',
    },
  },

  // 8. Near Field Communication (NFC)
  nfc: {
    WEBVIEW: {
      concise: '.readNfc()',
      full: 'FSASuperApp.readNfc()',
    },
    FLUTTER_PACKAGE: {
      concise: '.nfc.read()',
      full: 'await FSASuperApp.nfc.read()',
    },
    NATIVE_SDK: {
      concise: '.readNfcTag()',
      full: 'FSASuperApp.shared.readNfcTag(callback)',
    },
    DEEP_LINK: {
      concise: 'superapp://nfc/read',
      full: 'superapp://nfc/read?callback=app://nfc',
    },
  },

  // 9. Bluetooth Low Energy
  bluetooth: {
    WEBVIEW: {
      concise: '.connectBluetooth()',
      full: 'FSASuperApp.connectBluetooth()',
    },
    FLUTTER_PACKAGE: {
      concise: '.bluetooth.connect()',
      full: 'await FSASuperApp.bluetooth.connect()',
    },
    NATIVE_SDK: {
      concise: '.connectBluetooth()',
      full: 'FSASuperApp.shared.connectBluetooth(deviceId)',
    },
    DEEP_LINK: {
      concise: 'superapp://bluetooth/connect',
      full: 'superapp://bluetooth/connect?device={id}',
    },
  },
};

/**
 * Backward compatibility alias
 */
export const CAPABILITY_METHOD_MAP = BUILTIN_CAPABILITY_PRESETS;

/**
 * Helper to parse a JS Bridge method string like:
 * "FSASuperApp.contacts.pick(filter)" -> { module: 'contacts', method: 'pick', params: 'filter' }
 * "FSASuperApp.takePhoto()" -> { module: '', method: 'takePhoto', params: '' }
 */
function parseJsBridgeString(jsBridge?: string): {
  module: string;
  method: string;
  params: string;
  fullCleanCall: string;
} {
  if (!jsBridge || typeof jsBridge !== 'string') {
    return { module: '', method: '', params: '', fullCleanCall: '' };
  }

  const trimmed = jsBridge.trim();
  // Strip "await " or "window." or trailing semicolons
  const clean = trimmed
    .replace(/^await\s+/, '')
    .replace(/^window\./, '')
    .replace(/;$/, '');

  // Extract namespace and call: FSASuperApp.module.method(args)
  const match = clean.match(/^(?:FSASuperApp\.)?([a-zA-Z0-9_.]+)(?:\((.*)\))?$/);
  if (!match) {
    return { module: '', method: clean, params: '', fullCleanCall: clean };
  }

  const fullPath = match[1];
  const params = match[2] !== undefined ? match[2].trim() : '';

  const parts = fullPath.split('.');
  if (parts.length > 1) {
    const method = parts.pop() || '';
    const moduleName = parts.join('.');
    return { module: moduleName, method, params, fullCleanCall: clean };
  }

  return { module: '', method: parts[0] || '', params, fullCleanCall: clean };
}

/**
 * Converts any arbitrary key (e.g. "push_notifications", "smart-card", "sensorGyroscope")
 * into a clean camelCase identifier.
 */
function toCamelCase(str: string): string {
  if (!str) return 'invoke';
  return str
    .replace(/^cap[-_]/i, '') // strip "cap-" or "cap_" prefix if present
    .replace(/[-_ ]+([a-zA-Z0-9])/g, (_, c) => c.toUpperCase())
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}

/**
 * Universal Dynamic Capability Method Inference Engine
 *
 * Resolves capability method signatures and multi-language invocations
 * dynamically without requiring any manual hardcoding when new capabilities
 * are added to the GitLab repository or PostgreSQL database registry.
 *
 * Resolution Priority:
 * 1. Database Metadata Override (capability.metadata.integrationMethods[method])
 * 2. Decomposed JS Bridge Method extraction (e.g. FSASuperApp.module.method(args))
 * 3. Built-in Core Presets (for platform sensors with specialized payload options)
 * 4. Algorithmic Domain & Verb Inference (automatic camelCase, namespaces, async/callback, and deep links)
 */
export function getCapabilityMethodSyntax(
  capabilityKey: string,
  integrationMethod: IntegrationMethodOption,
  defaultJsBridge?: string,
  metadata?: any,
  category?: string
): MethodSyntax {
  const normKey = (capabilityKey || '').toLowerCase().trim();
  const effectiveMethod: Exclude<IntegrationMethodOption, 'ALL'> =
    integrationMethod === 'ALL' ? 'WEBVIEW' : integrationMethod;

  const config = INTEGRATION_METHOD_CONFIGS[effectiveMethod];

  // 1. Dynamic Database Metadata Override (Direct from PostgreSQL JSONB)
  // Allows admins or GitLab sync to declare custom multi-SDK signatures without changing any code.
  const metaMethods =
    metadata?.integrationMethods || metadata?.methods || metadata?.integration_methods;

  if (metaMethods && typeof metaMethods === 'object') {
    const custom = metaMethods[effectiveMethod] || metaMethods[effectiveMethod.toLowerCase()];
    if (custom && (custom.concise || custom.full)) {
      const concise = custom.concise || `.${toCamelCase(normKey)}()`;
      const full = custom.full || custom.signature || concise;
      return {
        concise,
        full,
        lang: config.lang,
        badgeLabel: config.badgeLabel,
        badgeColor: config.badgeColor,
        source: 'database_metadata',
      };
    }
  }

  // 2. Built-in Baseline Presets (for known host hardware capabilities)
  const preset = BUILTIN_CAPABILITY_PRESETS[normKey];
  if (preset && preset[effectiveMethod]) {
    const item = preset[effectiveMethod];
    return {
      concise: item.concise,
      full: item.full,
      lang: config.lang,
      badgeLabel: config.badgeLabel,
      badgeColor: config.badgeColor,
      source: 'preset',
    };
  }

  // 3. Dynamic Universal Algorithmic Inference Engine
  // For ANY new capability added to the database or GitLab repository:
  const parsedBridge = parseJsBridgeString(defaultJsBridge);
  const rawMethodName = parsedBridge.method || toCamelCase(normKey);
  const rawModule = parsedBridge.module || '';
  const rawParams = parsedBridge.params || '';

  // Determine sub-module/namespace (e.g. camera, scanner, auth, payments, storage)
  const inferredModule =
    rawModule ||
    (normKey.includes('camera') || normKey.includes('photo')
      ? 'camera'
      : normKey.includes('location') || normKey.includes('gps')
        ? 'location'
        : normKey.includes('auth') || normKey.includes('biometric')
          ? 'biometrics'
          : normKey.includes('storage') || normKey.includes('vault')
            ? 'storage'
            : normKey.includes('nfc') || normKey.includes('card')
              ? 'nfc'
              : normKey.includes('bluetooth') || normKey.includes('ble')
                ? 'bluetooth'
                : normKey.includes('audio') || normKey.includes('mic')
                  ? 'audio'
                  : '');

  const displayCall = rawModule
    ? `.${rawModule}.${rawMethodName}(${rawParams})`
    : `.${rawMethodName}(${rawParams})`;

  const uriModule = inferredModule || normKey.replace(/_/g, '-');
  const uriAction = rawMethodName || 'invoke';

  switch (effectiveMethod) {
    case 'FLUTTER_PACKAGE': {
      const flutterTarget = inferredModule
        ? `FSASuperApp.${inferredModule}.${rawMethodName}(${rawParams})`
        : `FSASuperApp.${rawMethodName}(${rawParams})`;
      return {
        concise: displayCall,
        full: `await ${flutterTarget}`,
        lang: config.lang,
        badgeLabel: config.badgeLabel,
        badgeColor: config.badgeColor,
        source: 'inferred',
      };
    }

    case 'NATIVE_SDK': {
      const nativeTarget = inferredModule
        ? `FSASuperApp.shared.${inferredModule}.${rawMethodName}`
        : `FSASuperApp.shared.${rawMethodName}`;
      const nativeArgs = rawParams ? `${rawParams}, callback` : 'callback';
      return {
        concise: displayCall,
        full: `${nativeTarget}(${nativeArgs})`,
        lang: config.lang,
        badgeLabel: config.badgeLabel,
        badgeColor: config.badgeColor,
        source: 'inferred',
      };
    }

    case 'DEEP_LINK': {
      const queryPart = rawParams ? `?${rawParams.replace(/[{}"'\s]/g, '')}=value` : '';
      return {
        concise: `superapp://${uriModule}/${uriAction}`,
        full: `superapp://${uriModule}/${uriAction}${queryPart}`,
        lang: config.lang,
        badgeLabel: config.badgeLabel,
        badgeColor: config.badgeColor,
        source: 'inferred',
      };
    }

    case 'WEBVIEW':
    default: {
      const webviewFull = defaultJsBridge
        ? defaultJsBridge
        : rawModule
          ? `FSASuperApp.${rawModule}.${rawMethodName}(${rawParams})`
          : `FSASuperApp.${rawMethodName}(${rawParams})`;

      return {
        concise: displayCall,
        full: webviewFull,
        lang: config.lang,
        badgeLabel: config.badgeLabel,
        badgeColor: config.badgeColor,
        source: 'inferred',
      };
    }
  }
}

/**
 * Generates an end-to-end client code sample for the Capability Detail Page
 * dynamically tailored to the selected integration method.
 * Works for any newly added capability out-of-the-box.
 */
export function generateCapabilityCodeSample(
  capabilityKey: string,
  capabilityName: string,
  integrationMethod: Exclude<IntegrationMethodOption, 'ALL'>,
  defaultJsBridge?: string,
  metadata?: any,
  category?: string
): { filename: string; code: string; lang: string } {
  const syntax = getCapabilityMethodSyntax(
    capabilityKey,
    integrationMethod,
    defaultJsBridge,
    metadata,
    category
  );
  const key = capabilityKey || 'feature';
  const pascalKey = key
    .replace(/^cap[-_]/i, '')
    .split(/[-_ ]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');

  switch (integrationMethod) {
    case 'FLUTTER_PACKAGE':
      return {
        filename: `${key}_service.dart`,
        lang: 'dart',
        code: `// Flutter Package (Dart) Integration
import 'package:flutter/foundation.dart';
import 'package:fsa_superapp_sdk/fsa_superapp_sdk.dart';

class ${pascalKey}Service {
  /// Invokes ${capabilityName} within the SuperApp host shell
  static Future<dynamic> invoke${pascalKey}() async {
    try {
      // 1. Verify capability availability
      final isSupported = await FSASuperApp.canIUse('${key}');
      if (!isSupported) {
        throw UnsupportedError('Host shell does not support capability: ${key}');
      }

      // 2. Execute capability via SuperApp Dart client
      final result = ${syntax.full};
      debugPrint('[${pascalKey}Service] Success: $result');
      return result;
    } catch (e, stack) {
      debugPrint('[${pascalKey}Service] Execution error: $e');
      rethrow;
    }
  }
}`,
      };

    case 'NATIVE_SDK':
      return {
        filename: `${pascalKey}Bridge.swift`,
        lang: 'swift',
        code: `// Native SDK (Swift / Kotlin) Integration
import Foundation
import FSASuperAppKit

public class ${pascalKey}Bridge {
    /// Executes ${capabilityName} via the Native Host SDK
    public static func invoke(completion: @escaping (Result<Any, Error>) -> Void) {
        // 1. Verify native platform capability support
        guard FSASuperApp.shared.canIUse("${key}") else {
            completion(.failure(SuperAppError.unsupportedCapability("${key}")))
            return
        }

        // 2. Invoke native hardware / service bridge
        ${syntax.full}
    }
}`,
      };

    case 'DEEP_LINK':
      return {
        filename: `${key}_deeplink.txt`,
        lang: 'bash',
        code: `# Deep Link URI Protocol Specification
# Target Scheme: superapp://
# Capability: ${capabilityName} (${key})

# 1. Handoff Call:
${syntax.full}

# 2. Response Callback Format:
app://callback?status=success&capability=${key}&payload={"status":"ok"}

# 3. HTML / Web / Mobile Anchor Example:
<a href="${syntax.full}">
  Execute ${capabilityName} via SuperApp Deep Link
</a>`,
      };

    case 'WEBVIEW':
    default:
      return {
        filename: 'client-sdk-example.ts',
        lang: 'typescript',
        code: `// JavaScript / TypeScript WebView Bridge Invocation
import { FSASuperApp } from '@fsa/superapp-sdk';

async function invoke${pascalKey}Capability() {
  try {
    // 1. Verify capability availability in host shell
    const isSupported = await FSASuperApp.canIUse('${key}');
    if (!isSupported) {
      throw new Error('Host shell does not support "${key}"');
    }

    // 2. Invoke native bridge method
    const response = await ${syntax.full};
    console.log('[${capabilityName}] Capability response:', response);
    return response;
  } catch (error) {
    console.error('[${capabilityName}] Capability error:', error);
    throw error;
  }
}`,
      };
  }
}
