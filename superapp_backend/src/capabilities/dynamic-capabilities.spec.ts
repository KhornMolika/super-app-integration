import AdmZip from 'adm-zip';
import { CapabilityDefinition } from './entities/capability-definition.entity';
import {
  collectDefinitionKeys,
  findMatchingDefinition,
} from './capability-aliases';
import { evaluateAgainstCatalog } from './capability-gate.service';
import { CapabilityDetectorHelper } from '../miniapps/helpers/capability-detector.helper';

describe('Dynamic Database-Backed Capabilities', () => {
  const customNfcCapability: CapabilityDefinition = {
    id: 'cap-nfc-001',
    key: 'nfc_reader',
    name: 'NFC Smart Card Reader',
    description: 'Read contactless NFC tags and identity cards.',
    category: 'HARDWARE',
    isActive: true,
    isAllowed: true,
    isDeprecated: false,
    introducedInVersion: '1.0.0',
    deprecatedInVersion: null as any,
    minSuperAppVersion: '1.0.0',
    maxSuperAppVersion: null as any,
    aliases: ['nfc', 'contactless', 'smart_card'],
    detectionRules: {
      pubspecPackages: ['nfc_manager'],
      androidPermissions: ['android.permission.NFC'],
      iosPlistKeys: ['NFCReaderUsageDescription'],
      jsBridgeKeywords: ['nfcScan', 'readNfc'],
      defaultPurpose: 'scan contactless NFC tags',
    },
    storeMapping: {
      iosKey: 'NFCReaderUsageDescription',
      androidPermission: 'android.permission.NFC',
      defaultAction: 'scan contactless NFC tags',
    },
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('resolves newly created capabilities dynamically by alias', () => {
    const keys = collectDefinitionKeys(customNfcCapability);
    expect(keys).toEqual(
      expect.arrayContaining([
        'nfc_reader',
        'nfc smart card reader',
        'nfc',
        'contactless',
        'smart_card',
      ]),
    );

    const matched = findMatchingDefinition('contactless', [customNfcCapability]);
    expect(matched?.key).toBe('nfc_reader');
  });

  it('evaluates newly created capabilities dynamically in CapabilityGateService', () => {
    const byKey = new Map<string, CapabilityDefinition>();
    for (const k of collectDefinitionKeys(customNfcCapability)) {
      byKey.set(k, customNfcCapability);
    }

    const result = evaluateAgainstCatalog(
      [{ type: 'contactless', required: true }],
      { byKey, hostVersion: '1.2.0' },
    );

    expect(result.launchable).toBe(true);
    expect(result.capabilities).toHaveLength(1);
    expect(result.capabilities[0]).toMatchObject({
      key: 'nfc_reader',
      required: true,
      supported: true,
    });
  });

  it('detects newly created capabilities dynamically from pubspec.yaml and native artifacts', async () => {
    const mockCapabilitiesService = {
      getActiveDefinitions: jest.fn().mockResolvedValue([customNfcCapability]),
    } as any;

    const aarZip = new AdmZip();
    aarZip.addFile(
      'AndroidManifest.xml',
      Buffer.from(
        '<manifest><uses-permission android:name="android.permission.NFC" /></manifest>',
      ),
    );
    const ipaZip = new AdmZip();
    ipaZip.addFile(
      'Info.plist',
      Buffer.from('<plist><key>NFCReaderUsageDescription</key></plist>'),
    );

    const mockStorageService = {
      packageSubmissionsBucket: 'superapp-storage',
      getObjectBuffer: jest.fn().mockImplementation((_bucket: string, path: string) => {
        if (path.endsWith('.aar')) return Promise.resolve(aarZip.toBuffer());
        return Promise.resolve(ipaZip.toBuffer());
      }),
    } as any;

    const detector = new CapabilityDetectorHelper(
      undefined,
      undefined,
      mockStorageService,
      mockCapabilitiesService,
    );

    const fromPubspec = await detector.detectFromPubspecDependencies(
      { nfc_manager: '^3.3.0' },
      'Nova App',
    );
    expect(fromPubspec).toHaveLength(1);
    expect(fromPubspec[0].type).toBe('nfc_reader');
    expect(fromPubspec[0].source).toContain('nfc_manager');

    const fromNative = await detector.detect({
      name: 'Nova App',
      androidStoragePath: 'quarantine/sdks/nova.aar',
      iosStoragePath: 'quarantine/sdks/nova.xcframework.zip',
    });
    expect(fromNative.count).toBe(1);
    expect(fromNative.detected[0].type).toBe('nfc_reader');
    expect(fromNative.detected[0].source).toContain('android.permission.NFC');
  });
});
