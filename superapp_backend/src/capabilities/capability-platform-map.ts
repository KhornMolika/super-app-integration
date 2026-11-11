/**
 * Real Android/iOS settings for known capabilities. The code generator adds
 * exactly these to the Super App (AndroidManifest.xml, Info.plist,
 * pubspec.yaml), and the review screen previews them.
 *
 * A capability that is not listed here (and has no explicit platform fields in
 * its proposal metadata) is "unmapped": nothing is invented for it, and the
 * reviewer is told that its platform settings must be added by hand.
 */
export interface IosUsageEntry {
  /** Info.plist key, e.g. NSCameraUsageDescription */
  key: string;
  /** Text iOS shows when asking the user */
  description: string;
}

export interface PlatformCapability {
  key: string;
  name: string;
  /** Other names people use for it (lowercase, underscore form) */
  aliases: string[];
  /** Full Android permission names */
  android: string[];
  ios: IosUsageEntry[];
  /** pubspec dependency line, e.g. "mobile_scanner: ^6.0.0" */
  plugin?: string;
  /** Part of the Super App host itself: approving needs no work at all */
  builtIn?: boolean;
  /**
   * Standard bridge handler shipped in the Super App
   * (lib/core/miniapp/bridge/handlers/). Approving only registers it.
   * Without one, the generator adds a skeleton for a developer to implement.
   */
  handler?: { className: string; file: string };
  /**
   * Setup that cannot be generated safely (Xcode capabilities, entitlements,
   * Firebase files). Listed for the Super App team in the tracking issue.
   */
  manualSteps?: string[];
}

export const PLATFORM_CAPABILITIES: PlatformCapability[] = [
  {
    key: 'scan_qr_code',
    handler: { className: 'ScanQrCodeHandler', file: 'handlers/scan_qr_code_handler.dart' },
    name: 'Scan QR Code',
    aliases: ['qr', 'qr_code', 'qr_scan', 'qr_scanner', 'scan_qr', 'barcode', 'barcode_scanner', 'scanner'],
    android: ['android.permission.CAMERA'],
    ios: [{ key: 'NSCameraUsageDescription', description: 'The camera is used to scan QR codes.' }],
    plugin: 'mobile_scanner: ^6.0.0',
  },
  {
    key: 'take_photo',
    handler: { className: 'TakePhotoHandler', file: 'handlers/image_handlers.dart' },
    name: 'Camera & Document Capture',
    aliases: ['camera', 'photo', 'take_picture', 'picture', 'document_capture', 'capture_document', 'selfie'],
    android: ['android.permission.CAMERA'],
    ios: [{ key: 'NSCameraUsageDescription', description: 'The camera is used to take photos and capture documents.' }],
    plugin: 'image_picker: ^1.1.2',
  },
  {
    key: 'photo_library',
    handler: { className: 'PhotoLibraryHandler', file: 'handlers/image_handlers.dart' },
    name: 'Photo Library',
    aliases: ['gallery', 'photos', 'image_library', 'pick_image', 'media_library'],
    android: ['android.permission.READ_MEDIA_IMAGES'],
    ios: [{ key: 'NSPhotoLibraryUsageDescription', description: 'Your photo library is used to choose images.' }],
    plugin: 'image_picker: ^1.1.2',
  },
  {
    key: 'get_location',
    handler: { className: 'GetLocationHandler', file: 'handlers/get_location_handler.dart' },
    name: 'Location',
    aliases: ['location', 'gps', 'geolocation', 'geo_location', 'geolocator', 'current_location', 'maps'],
    android: ['android.permission.ACCESS_FINE_LOCATION', 'android.permission.ACCESS_COARSE_LOCATION'],
    ios: [{ key: 'NSLocationWhenInUseUsageDescription', description: 'Your location is used while you use this service.' }],
    plugin: 'geolocator: ^13.0.0',
  },
  {
    key: 'biometric_auth',
    handler: { className: 'BiometricAuthHandler', file: 'handlers/biometric_auth_handler.dart' },
    name: 'Biometric Authentication',
    aliases: ['biometric', 'biometrics', 'fingerprint', 'face_id', 'faceid', 'touch_id', 'local_auth', 'face_unlock'],
    android: ['android.permission.USE_BIOMETRIC'],
    ios: [{ key: 'NSFaceIDUsageDescription', description: 'Face ID is used to confirm it is you.' }],
    plugin: 'local_auth: ^2.3.0',
  },
  {
    key: 'microphone',
    name: 'Microphone',
    aliases: ['mic', 'audio', 'record_audio', 'voice', 'voice_recording', 'audio_recording'],
    android: ['android.permission.RECORD_AUDIO'],
    ios: [{ key: 'NSMicrophoneUsageDescription', description: 'The microphone is used to record audio.' }],
  },
  {
    key: 'nfc',
    handler: { className: 'NfcHandler', file: 'handlers/nfc_handler.dart' },
    name: 'NFC',
    aliases: ['nfc_reader', 'nfc_read', 'nfc_tag', 'contactless', 'smart_card', 'nfc_smart_card'],
    android: ['android.permission.NFC'],
    ios: [{ key: 'NFCReaderUsageDescription', description: 'NFC is used to read cards and tags.' }],
    plugin: 'nfc_manager: ^3.5.0',
    manualSteps: ['Enable the "Near Field Communication Tag Reading" capability for the Runner target in Xcode.'],
  },
  {
    key: 'bluetooth',
    name: 'Bluetooth',
    aliases: ['ble', 'bluetooth_le', 'bluetooth_scanner', 'bluetooth_scan', 'bt'],
    android: ['android.permission.BLUETOOTH_SCAN', 'android.permission.BLUETOOTH_CONNECT'],
    ios: [{ key: 'NSBluetoothAlwaysUsageDescription', description: 'Bluetooth is used to connect to nearby devices.' }],
    plugin: 'flutter_blue_plus: ^1.31.0',
  },
  {
    key: 'contacts',
    name: 'Contacts',
    aliases: ['contact', 'address_book', 'read_contacts', 'phonebook'],
    android: ['android.permission.READ_CONTACTS'],
    ios: [{ key: 'NSContactsUsageDescription', description: 'Your contacts are used to pick a recipient.' }],
  },
  {
    key: 'push_notifications',
    name: 'Push Notifications',
    aliases: ['notifications', 'notification', 'push', 'push_notification'],
    android: ['android.permission.POST_NOTIFICATIONS'],
    // iOS asks for notification permission at runtime (no Info.plist text),
    // but needs project setup that cannot be generated safely:
    ios: [],
    plugin: 'firebase_messaging: ^15.1.0',
    manualSteps: [
      'Enable the "Push Notifications" capability for the Runner target in Xcode (aps-environment entitlement).',
      'Enable "Background Modes > Remote notifications" in Xcode (UIBackgroundModes: remote-notification).',
      'Add the Firebase config files: android/app/google-services.json and ios/Runner/GoogleService-Info.plist.',
    ],
  },
  {
    key: 'secure_storage',
    handler: { className: 'SecureStorageHandler', file: 'handlers/secure_storage_handler.dart' },
    name: 'Secure Storage',
    aliases: ['keychain', 'keystore', 'secure_store', 'encrypted_storage'],
    // Keychain / Keystore need no permission, only the package
    android: [],
    ios: [],
    plugin: 'flutter_secure_storage: ^9.2.2',
  },
  {
    key: 'webview_runtime',
    name: 'WebView Runtime',
    aliases: ['webview', 'web_view', 'browser'],
    android: [],
    ios: [],
    builtIn: true,
  },
];

/** Where the Super App keeps its bridge handlers, relative to the repo root. */
export const BRIDGE_DIR = 'lib/core/miniapp/bridge';
export const HANDLER_REGISTRY_FILE = `${BRIDGE_DIR}/capability_handlers.generated.dart`;

/** "nfc_reader" -> "NfcReaderHandler" */
export function handlerClassName(key: string): string {
  return (
    normalizeCapabilityKey(key)
      .split('_')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('') + 'Handler'
  );
}

/** The handler the generator registers: the standard one, or a generated skeleton. */
export function handlerFor(key: string): { className: string; file: string; standard: boolean } {
  const known = findPlatformCapability(key);
  if (known?.handler) return { ...known.handler, standard: true };
  const k = normalizeCapabilityKey(key);
  return { className: handlerClassName(k), file: `handlers/${k}_handler.dart`, standard: false };
}

/**
 * Work the Super App team must do by hand after approval. The bridge wiring
 * (registering the handler, supported-capability lists) is generated; what
 * remains is writing handler logic that does not exist yet, deciding the
 * permissions of an unknown capability, and project setup that cannot be
 * edited safely as text (Xcode capabilities, Firebase files).
 */
export function remainingWork(
  key: string,
  opts: { builtIn?: boolean; known: boolean; manualSteps?: string[] },
): string[] {
  if (opts.builtIn) return [];
  const handler = handlerFor(key);
  return [
    ...(opts.known ? [] : [`Decide which device permissions and packages "${key}" needs, if any, and add them.`]),
    ...(handler.standard
      ? []
      : [
          `Implement the bridge handler in ${BRIDGE_DIR}/${handler.file} (a skeleton was generated), then change "implemented" to true so mini apps can use it.`,
          `Describe "${normalizeCapabilityKey(key)}" (params, result, example) in packages/contract/capabilities.json and run "node packages/contract/generate.mjs", so the Web and Flutter SDKs get typed calls for it (the Super App tests fail until the contract and the handlers match).`,
        ]),
    ...(opts.manualSteps ?? []),
  ];
}

/** "QR Scanner" / "qr-scanner" / " QR_scanner " -> "qr_scanner" */
export function normalizeCapabilityKey(input: string): string {
  return (input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** The known capability for a key or one of its aliases. */
export function findPlatformCapability(input: string): PlatformCapability | undefined {
  const k = normalizeCapabilityKey(input);
  if (!k) return undefined;
  return PLATFORM_CAPABILITIES.find((c) => c.key === k || c.aliases.includes(k));
}

/** Edit distance (insert/delete/replace), for catching typos like "nfc_readr". */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

export interface KeySuggestion {
  key: string;
  name: string;
  /** exists: already in the catalog; known: the generator knows it; similar: close spelling or another name */
  reason: 'exists' | 'known' | 'similar';
}

/**
 * Suggests catalog keys for what someone typed. `catalog` is the active
 * capability catalog (key + name); platform-known keys are added on top.
 */
export function suggestCapabilityKeys(
  input: string,
  catalog: Array<{ key: string; name?: string | null }>,
  limit = 5,
): KeySuggestion[] {
  const q = normalizeCapabilityKey(input);
  if (!q) return [];

  const catalogKeys = new Set(catalog.map((c) => normalizeCapabilityKey(c.key)));
  const nameOf = (key: string) =>
    catalog.find((c) => normalizeCapabilityKey(c.key) === key)?.name ||
    PLATFORM_CAPABILITIES.find((p) => p.key === key)?.name ||
    key;

  // Every candidate key with the strings it can be matched against
  const candidates = new Map<string, string[]>();
  for (const c of catalog) {
    const key = normalizeCapabilityKey(c.key);
    candidates.set(key, [key, normalizeCapabilityKey(c.name || '')].filter(Boolean));
  }
  for (const p of PLATFORM_CAPABILITIES) {
    const list = candidates.get(p.key) || [p.key];
    candidates.set(p.key, [...list, normalizeCapabilityKey(p.name), ...p.aliases]);
  }

  const scored: Array<{ key: string; score: number; reason: KeySuggestion['reason'] }> = [];
  for (const [key, terms] of candidates) {
    const reasonIfExact: KeySuggestion['reason'] = catalogKeys.has(key) ? 'exists' : 'known';
    if (key === q) {
      scored.push({ key, score: 0, reason: reasonIfExact });
      continue;
    }
    let best = Infinity;
    for (const t of terms) {
      if (!t) continue;
      if (t === q) best = Math.min(best, 0.5); // another name for it
      else if (q.length >= 3 && (t.startsWith(q) || q.startsWith(t))) best = Math.min(best, 1);
      else if (q.length >= 3 && t.includes(q)) best = Math.min(best, 1.5);
      else {
        const d = editDistance(q, t);
        const allowed = q.length <= 4 ? 1 : 2;
        if (d <= allowed) best = Math.min(best, 1 + d);
      }
    }
    if (best !== Infinity) scored.push({ key, score: best, reason: 'similar' });
  }

  return scored
    .sort((a, b) => a.score - b.score || a.key.localeCompare(b.key))
    .slice(0, limit)
    .map((s) => ({ key: s.key, name: nameOf(s.key), reason: s.reason }));
}
