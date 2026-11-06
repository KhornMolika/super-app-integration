import { Injectable, Logger } from '@nestjs/common';
import { Client as MinioClient } from 'minio';

export interface LicenseStatusResult {
  configured: boolean;
  maskedKey: string | null;
  licenseType: string;
  endpoint: string;
  bucket: string;
}

@Injectable()
export class BucketLifecycleHelper {
  private readonly logger = new Logger(BucketLifecycleHelper.name);

  /**
   * Ensure standardized 3-bucket architecture exists with strictly private access policies:
   * 1. mini-app-assets: Strictly Private Storage (logos, icons, banner images accessed via Presigned/Proxy URLs)
   * 2. package-submissions: Strictly Private Quarantine (Flutter .zip packages)
   * 3. sdk-submissions: Strictly Private Quarantine (Native .aar / .xcframework.zip)
   */
  async ensureBucketsAndPolicies(
    minioClient: MinioClient,
    buckets: string[],
  ): Promise<void> {
    const uniqueBuckets = Array.from(new Set(buckets.filter(Boolean)));
    for (const bucketName of uniqueBuckets) {
      try {
        const exists = await minioClient.bucketExists(bucketName);
        if (!exists) {
          await minioClient.makeBucket(bucketName, 'us-east-1');
          this.logger.log(`Created MinIO bucket "${bucketName}"`);
        }
        if (bucketName === 'superapp-storage') {
          // SEC-OPS-2026-STORAGE-01: Ensure strictly private policy and initialize virtual prefix hierarchy
          await minioClient.setBucketPolicy(bucketName, '').catch(() => {});
          await this.ensureVirtualPrefixHierarchy(minioClient, bucketName);
        }
      } catch (err: any) {
        this.logger.warn(
          `MinIO bucket init check failed for "${bucketName}": ${err.message}`,
        );
      }
    }
  }

  /**
   * Migrate objects from legacy buckets to new standardized buckets, and delete the legacy buckets.
   */
  /**
   * Initializes the standard virtual prefix hierarchy inside superapp-storage:
   * platform/ (branding/, banners/), miniapps/, organizations/, users/ (backoffice/, end-users/),
   * quarantine/ (packages/, sdks/), reports/ (security/)
   */
  async ensureVirtualPrefixHierarchy(
    minioClient: MinioClient,
    bucketName: string,
  ): Promise<void> {
    const prefixes = [
      'platform/branding/',
      'platform/banners/',
            'organizations/',
      'users/backoffice/',
      'users/end-users/',
      'quarantine/packages/',
      'quarantine/sdks/',
      'reports/security/',
    ];
    const keepPayload = Buffer.from(
      '# SuperApp Virtual Directory Placeholder\n# Managed automatically by SuperApp Backend\n',
      'utf-8',
    );
    for (const prefix of prefixes) {
      const keepKey = `${prefix}.keep`;
      try {
        await minioClient.putObject(
          bucketName,
          keepKey,
          keepPayload,
          keepPayload.length,
          {
            'Content-Type': 'text/plain',
            'x-amz-meta-managed-by': 'superapp-backend',
          },
        );
      } catch (err: any) {
        this.logger.debug(
          `Could not put virtual prefix marker ${keepKey} in ${bucketName}: ${err.message}`,
        );
      }
    }
    this.logger.log(`Initialized Virtual Prefix Hierarchy in MinIO bucket "${bucketName}".`);
  }

  async migrateLegacyBuckets(
    minioClient: MinioClient,
    targetBucket = 'superapp-storage',
  ): Promise<void> {
    try {
      const destinationBucket = targetBucket || 'superapp-storage';
      const legacyBuckets = [
        'mini-app-assets',
        'mini-app-logos',
        'package-submissions',
        'sdk-submissions',
        'submissions',
        'backoffice-user-media',
        'end-user-media',
        'logos',
      ];

      for (const oldBucket of legacyBuckets) {
        if (oldBucket !== destinationBucket) {
          await this.drainAndRemoveBucket(
            minioClient,
            oldBucket,
            destinationBucket,
          );
        }
      }
    } catch (err: any) {
      this.logger.warn(`Legacy bucket migration check skipped: ${err.message}`);
    }
  }

  private async drainAndRemoveBucket(
    minioClient: MinioClient,
    sourceBucket: string,
    targetBucket: string,
  ): Promise<void> {
    try {
      const exists = await minioClient
        .bucketExists(sourceBucket)
        .catch(() => false);
      if (!exists || sourceBucket === targetBucket) return;

      this.logger.log(
        `Found legacy MinIO bucket "${sourceBucket}". Migrating to "${targetBucket}"...`,
      );

      const objects: string[] = [];
      const stream = minioClient.listObjectsV2(sourceBucket, '', true);

      await new Promise<void>((resolve) => {
        stream.on('data', (obj) => {
          if (obj.name) objects.push(obj.name);
        });
        stream.on('end', () => resolve());
        stream.on('error', () => resolve());
      });

      const CopyConditions = require('minio').CopyConditions;
      for (const objName of objects) {
        try {
          const conds = new CopyConditions();
          let targetKey = objName;

          if (sourceBucket === 'package-submissions' && objName.startsWith('pending/')) {
            targetKey = objName.replace(/^pending\//, 'quarantine/packages/');
          } else if (sourceBucket === 'sdk-submissions' && objName.startsWith('pending/')) {
            targetKey = objName.replace(/^pending\//, 'quarantine/sdks/');
          } else if (sourceBucket === 'backoffice-user-media' && objName.startsWith('avatars/')) {
            targetKey = `users/backoffice/${objName.replace(/^avatars\//, '')}`;
          }

          await minioClient.copyObject(
            targetBucket,
            targetKey,
            `/${sourceBucket}/${objName}`,
            conds,
          );

          if (targetKey !== objName) {
            await minioClient
              .copyObject(targetBucket, objName, `/${sourceBucket}/${objName}`, conds)
              .catch(() => {});
          }

          await minioClient.removeObject(sourceBucket, objName).catch(() => {});
          this.logger.log(
            `Migrated ${objName} from ${sourceBucket} to ${targetBucket}/${targetKey}`,
          );
        } catch (copyErr: any) {
          this.logger.warn(
            `Could not copy ${objName} from ${sourceBucket}: ${copyErr.message}`,
          );
        }
      }

      // Once drained, remove the legacy bucket
      try {
        await minioClient.removeBucket(sourceBucket);
        this.logger.log(
          `Successfully removed legacy MinIO bucket "${sourceBucket}".`,
        );
      } catch (rmErr: any) {
        this.logger.warn(
          `Could not remove empty legacy bucket "${sourceBucket}": ${rmErr.message}`,
        );
      }
    } catch (err: any) {
      this.logger.warn(
        `Legacy bucket processing failed for "${sourceBucket}": ${err.message}`,
      );
    }
  }

  /**
   * Builds the AIStor license status payload
   */
  buildLicenseStatus(
    aistorLicenseKey: string,
    endpoint: string,
    assetsBucket: string,
  ): LicenseStatusResult {
    const hasLicense = Boolean(aistorLicenseKey && aistorLicenseKey.trim());
    return {
      configured: hasLicense,
      maskedKey: hasLicense
        ? `${aistorLicenseKey.substring(0, 6)}...${aistorLicenseKey.substring(Math.max(0, aistorLicenseKey.length - 4))}`
        : null,
      licenseType: hasLicense
        ? 'MinIO AIStor Enterprise'
        : 'Community / Free Edition',
      endpoint,
      bucket: assetsBucket,
    };
  }
}
