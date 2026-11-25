import { MigrationInterface, QueryRunner } from 'typeorm';

interface CapabilitySeedRule {
  key: string;
  name: string;
  description: string;
  category: string;
  aliases: string[];
  detectionRules: {
    pubspecPackages: string[];
    androidPermissions: string[];
    iosPlistKeys: string[];
    jsBridgeKeywords: string[];
    defaultPurpose: string;
  };
  storeMapping: {
    iosKey: string;
    androidPermission: string;
    defaultAction: string;
  };
}

const DEFAULT_CAPABILITY_RULES: CapabilitySeedRule[] = [
  {
    key: 'take_photo',
    name: 'Camera & Document Capture',
    description:
      'Take photos and scan QR codes for identity verification and document uploads.',
    category: 'MEDIA_HARDWARE',
    aliases: [
      'camera',
      'photo',
      'camera_access',
      'camera & document capture',
      'camera & imaging',
    ],
    detectionRules: {
      pubspecPackages: ['camera', 'image_picker'],
      androidPermissions: ['android.permission.CAMERA'],
      iosPlistKeys: ['NSCameraUsageDescription'],
      jsBridgeKeywords: [
        'takephoto',
        'capturephoto',
        'opencamera',
        'pickimage',
        'chooseimage',
        'getusermedia',
      ],
      defaultPurpose: 'capture verification photos and upload documents',
    },
    storeMapping: {
      iosKey: 'NSCameraUsageDescription',
      androidPermission: 'android.permission.CAMERA',
      defaultAction: 'photograph evidence and upload policy/claim documents',
    },
  },
  {
    key: 'scan_qr_code',
    name: 'Scan QR Code',
    description:
      'Scan QR codes and barcodes for payments, identity checks, and quick actions.',
    category: 'MEDIA_HARDWARE',
    aliases: ['qr_scanner', 'scan_qr', 'qr', 'barcode', 'scan qr code'],
    detectionRules: {
      pubspecPackages: ['qr_code_scanner', 'mobile_scanner'],
      androidPermissions: ['android.permission.CAMERA'],
      iosPlistKeys: ['NSCameraUsageDescription'],
      jsBridgeKeywords: ['scanqrcode', 'scanqr', 'barcode'],
      defaultPurpose: 'scan QR codes and barcodes',
    },
    storeMapping: {
      iosKey: 'NSCameraUsageDescription',
      androidPermission: 'android.permission.CAMERA',
      defaultAction: 'scan QR codes and barcodes for verification',
    },
  },
  {
    key: 'get_location',
    name: 'Geolocation Services',
    description:
      'Find nearby service centers, verify local branches, and use map features.',
    category: 'LOCATION',
    aliases: [
      'location',
      'gps',
      'geolocation',
      'geolocation services',
      'location services',
      'geolocator',
    ],
    detectionRules: {
      pubspecPackages: ['geolocator', 'location', 'geoloc'],
      androidPermissions: [
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
      ],
      iosPlistKeys: [
        'NSLocationWhenInUseUsageDescription',
        'NSLocationAlwaysUsageDescription',
      ],
      jsBridgeKeywords: [
        'getlocation',
        'geolocation',
        'getcurrentposition',
        'watchposition',
      ],
      defaultPurpose: 'provide location-based services and map features',
    },
    storeMapping: {
      iosKey: 'NSLocationWhenInUseUsageDescription',
      androidPermission: 'android.permission.ACCESS_FINE_LOCATION',
      defaultAction: 'verify geographic location and display nearby branches',
    },
  },
  {
    key: 'biometric_auth',
    name: 'Biometric Authentication',
    description:
      'Log in and approve transactions quickly and securely using Face ID or fingerprint.',
    category: 'SECURITY',
    aliases: [
      'biometrics',
      'biometric',
      'face_id',
      'fingerprint',
      'local_auth',
      'biometric authentication',
    ],
    detectionRules: {
      pubspecPackages: ['local_auth', 'biometric'],
      androidPermissions: [
        'android.permission.USE_BIOMETRIC',
        'android.permission.USE_FINGERPRINT',
      ],
      iosPlistKeys: ['NSFaceIDUsageDescription'],
      jsBridgeKeywords: [
        'authenticatebiometric',
        'publickeycredential',
        'webauthn',
        'biometric',
        'faceid',
      ],
      defaultPurpose:
        'authenticate user identity and authorize transactions securely',
    },
    storeMapping: {
      iosKey: 'NSFaceIDUsageDescription',
      androidPermission: 'android.permission.USE_BIOMETRIC',
      defaultAction: 'authenticate securely using Face ID or fingerprint',
    },
  },
  {
    key: 'secure_storage',
    name: 'Secure Vault Storage',
    description:
      'Keep user login tokens and sensitive data safely encrypted on the device.',
    category: 'SECURITY',
    aliases: [
      'storage',
      'secure_vault',
      'get_secure_storage',
      'secure vault storage',
    ],
    detectionRules: {
      pubspecPackages: ['flutter_secure_storage', 'secure_storage', 'storage'],
      androidPermissions: ['android.permission.WRITE_EXTERNAL_STORAGE'],
      iosPlistKeys: ['NSPhotoLibraryUsageDescription'],
      jsBridgeKeywords: ['getsecurestorage', 'setsecurestorage', 'securestorage'],
      defaultPurpose:
        'securely store encrypted tokens, session data, and offline cache',
    },
    storeMapping: {
      iosKey: 'Keychain & NSPhotoLibraryUsageDescription',
      androidPermission: 'android.security.keystore & WRITE_EXTERNAL_STORAGE',
      defaultAction:
        'securely store encrypted tokens, offline cache, and user vault data',
    },
  },
  {
    key: 'webview_runtime',
    name: 'Sandboxed WebView Runtime',
    description:
      'Runs web-based MiniApps securely inside the SuperApp with native bridge support.',
    category: 'PLATFORM',
    aliases: ['webview', 'internet', 'sandboxed webview runtime'],
    detectionRules: {
      pubspecPackages: ['webview_flutter', 'flutter_inappwebview', 'webview'],
      androidPermissions: ['android.permission.INTERNET'],
      iosPlistKeys: ['NSAppTransportSecurity'],
      jsBridgeKeywords: ['fsasuperapp', 'superappjsbridge', '@fsasuperapp/sdk'],
      defaultPurpose:
        'host isolated web application runtime and process JS bridge communications',
    },
    storeMapping: {
      iosKey: 'NSAppTransportSecurity',
      androidPermission: 'android.permission.INTERNET',
      defaultAction:
        'host isolated web application runtime and process secure JS bridge communications',
    },
  },
];

export class AddDynamicRulesToCapabilityDefinitions1796500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "capability_definitions"
      ADD COLUMN IF NOT EXISTS "aliases" jsonb NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS "detectionRules" jsonb NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS "storeMapping" jsonb NOT NULL DEFAULT '{}'::jsonb;
    `);

    for (const cap of DEFAULT_CAPABILITY_RULES) {
      await queryRunner.query(
        `
        INSERT INTO "capability_definitions"
          ("key", "name", "description", "category", "isActive", "isAllowed", "isDeprecated", "aliases", "detectionRules", "storeMapping")
        VALUES
          ($1, $2, $3, $4, true, true, false, $5::jsonb, $6::jsonb, $7::jsonb)
        ON CONFLICT ("key") DO UPDATE SET
          "aliases" = CASE
            WHEN "capability_definitions"."aliases" IS NULL OR jsonb_array_length("capability_definitions"."aliases") = 0
            THEN EXCLUDED."aliases"
            ELSE "capability_definitions"."aliases"
          END,
          "detectionRules" = CASE
            WHEN "capability_definitions"."detectionRules" IS NULL OR "capability_definitions"."detectionRules" = '{}'::jsonb
            THEN EXCLUDED."detectionRules"
            ELSE "capability_definitions"."detectionRules"
          END,
          "storeMapping" = CASE
            WHEN "capability_definitions"."storeMapping" IS NULL OR "capability_definitions"."storeMapping" = '{}'::jsonb
            THEN EXCLUDED."storeMapping"
            ELSE "capability_definitions"."storeMapping"
          END;
        `,
        [
          cap.key,
          cap.name,
          cap.description,
          cap.category,
          JSON.stringify(cap.aliases),
          JSON.stringify(cap.detectionRules),
          JSON.stringify(cap.storeMapping),
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "capability_definitions"
      DROP COLUMN IF EXISTS "storeMapping",
      DROP COLUMN IF EXISTS "detectionRules",
      DROP COLUMN IF EXISTS "aliases";
    `);
  }
}
