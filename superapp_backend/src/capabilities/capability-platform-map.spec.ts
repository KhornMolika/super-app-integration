import {
  PLATFORM_CAPABILITIES,
  findPlatformCapability,
  normalizeCapabilityKey,
  remainingWork,
  handlerFor,
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

  it('remainingWork: nothing for built-in or standard-handler capabilities, otherwise implement + setup', () => {
    expect(remainingWork('webview_runtime', { builtIn: true, known: true })).toEqual([]);
    expect(remainingWork('secure_storage', { known: true })).toEqual([]);
    expect(remainingWork('get_location', { known: true })).toEqual([]);
    const push = findPlatformCapability('push_notifications')!;
    const pushSteps = remainingWork(push.key, { known: true, manualSteps: push.manualSteps });
    expect(pushSteps).toHaveLength(5);
    expect(pushSteps[0]).toContain(
      'Implement the bridge handler in lib/core/miniapp/bridge/handlers/push_notifications_handler.dart',
    );
    // A new handler also goes into the Mini App Contract, so the SDKs get typed calls
    expect(pushSteps[1]).toContain('packages/contract/capabilities.json');
    const unknown = remainingWork('teleport', { known: false });
    expect(unknown[0]).toMatch(/Decide which device permissions/);
    expect(unknown[1]).toContain('teleport_handler.dart');
  });

  it('handlerFor: the standard handler when one exists, else a generated skeleton name', () => {
    expect(handlerFor('gps')).toEqual({ className: 'GetLocationHandler', file: 'handlers/get_location_handler.dart', standard: true });
    expect(handlerFor('nfc reader').className).toBe('NfcHandler');
    expect(handlerFor('push_notifications')).toEqual({
      className: 'PushNotificationsHandler',
      file: 'handlers/push_notifications_handler.dart',
      standard: false,
    });
  });

  it('returns nothing for empty or unrelated input', () => {
    expect(suggestCapabilityKeys('', catalog)).toEqual([]);
    expect(suggestCapabilityKeys('zzzzqqq', catalog)).toEqual([]);
  });
});
