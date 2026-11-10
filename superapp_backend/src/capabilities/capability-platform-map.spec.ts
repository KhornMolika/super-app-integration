import {
  PLATFORM_CAPABILITIES,
  findPlatformCapability,
  normalizeCapabilityKey,
  remainingWork,
  suggestCapabilityKeys,
} from './capability-platform-map';

const catalog = [
  { key: 'scan_qr_code', name: 'Scan QR Code' },
  { key: 'take_photo', name: 'Camera & Document Capture' },
  { key: 'get_location', name: 'Location' },
  { key: 'biometric_auth', name: 'Biometric Authentication' },
  { key: 'nfc', name: 'NFC' },
];

describe('capability platform map', () => {
  it('normalizes what people type into the key format', () => {
    expect(normalizeCapabilityKey('  QR Scanner ')).toBe('qr_scanner');
    expect(normalizeCapabilityKey('nfc-reader')).toBe('nfc_reader');
    expect(normalizeCapabilityKey('Face ID')).toBe('face_id');
  });

  it('finds capabilities by key or by another name', () => {
    expect(findPlatformCapability('gps')?.key).toBe('get_location');
    expect(findPlatformCapability('Fingerprint')?.key).toBe('biometric_auth');
    expect(findPlatformCapability('teleport')).toBeUndefined();
  });

  it('only uses real, fully qualified Android permissions', () => {
    for (const c of PLATFORM_CAPABILITIES) {
      for (const p of c.android) expect(p).toMatch(/^android\.permission\.[A-Z_]+$/);
      for (const e of c.ios) expect(e.key).toMatch(/^(NS[A-Za-z]+UsageDescription|NFCReaderUsageDescription)$/);
    }
  });

  it('suggests the catalog key for other names and typos', () => {
    expect(suggestCapabilityKeys('gps', catalog)[0]).toMatchObject({ key: 'get_location', reason: 'similar' });
    expect(suggestCapabilityKeys('geoloc', catalog)[0].key).toBe('get_location');
    expect(suggestCapabilityKeys('fingerprint', catalog)[0].key).toBe('biometric_auth');
    expect(suggestCapabilityKeys('qr scaner', catalog)[0].key).toBe('scan_qr_code');
    expect(suggestCapabilityKeys('nfc_readr', catalog)[0].key).toBe('nfc');
  });

  it('says when the exact key already exists, or is known but not in the catalog yet', () => {
    expect(suggestCapabilityKeys('get_location', catalog)[0]).toMatchObject({ key: 'get_location', reason: 'exists' });
    expect(suggestCapabilityKeys('microphone', catalog)[0]).toMatchObject({ key: 'microphone', reason: 'known' });
  });

  it('remainingWork: bridge steps for every capability not built in, plus its manual setup', () => {
    expect(remainingWork('webview_runtime', { builtIn: true, known: true })).toEqual([]);
    const storage = remainingWork('secure_storage', { known: true });
    expect(storage).toHaveLength(2);
    expect(storage[0]).toMatch(/bridge method/);
    expect(storage[1]).toMatch(/_supportedCapabilities/);
    const push = findPlatformCapability('push_notifications')!;
    expect(remainingWork(push.key, { known: true, manualSteps: push.manualSteps })).toHaveLength(5);
    expect(remainingWork('teleport', { known: false })[0]).toMatch(/Decide which device permissions/);
  });

  it('returns nothing for empty or unrelated input', () => {
    expect(suggestCapabilityKeys('', catalog)).toEqual([]);
    expect(suggestCapabilityKeys('zzzzqqq', catalog)).toEqual([]);
  });
});
