/**
 * Canonical capability alias groups so UI/scanner keys (e.g. "Camera", "Location",
 * "Biometrics") resolve cleanly to database CapabilityDefinition keys (e.g.
 * "take_photo", "scan_qr_code", "get_location", "biometric_auth").
 */
const CAPABILITY_ALIAS_GROUPS: string[][] = [
  [
    'camera',
    'take_photo',
    'scan_qr_code',
    'qr_scanner',
    'scan_qr',
    'photo',
    'camera & document capture',
    'camera & imaging',
  ],
  [
    'location',
    'get_location',
    'gps',
    'geolocation',
    'geolocation services',
    'location services',
  ],
  [
    'biometrics',
    'biometric',
    'biometric_auth',
    'face_id',
    'fingerprint',
    'biometric authentication',
  ],
  [
    'storage',
    'secure_storage',
    'get_secure_storage',
    'secure vault storage',
  ],
  [
    'microphone',
    'record',
    'audio',
    'microphone & audio',
  ],
  [
    'webview_runtime',
    'webview',
    'internet',
    'sandboxed webview runtime',
  ],
];

/** Returns all lowercase alias keys (including the normalized input) for lookup. */
export function resolveCapabilityAliases(rawKey: string): string[] {
  const lower = (rawKey || '').toLowerCase().trim();
  if (!lower) return [];
  for (const group of CAPABILITY_ALIAS_GROUPS) {
    if (group.includes(lower)) {
      return group;
    }
  }
  return [lower];
}
