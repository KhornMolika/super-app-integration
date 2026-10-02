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
   * 1. mini-app-assets: Strictly Private Storage (logos, icons, banner images accessed via Presigned URLs)
   * 2. package-submissions: Strictly Private Quarantine (Flutter .zip packages)
   * 3. sdk-submissions: Strictly Private Quarantine (Native .aar / .xcframework)
   */
  async ensureBucketsAndPolicies(
    minioClient: MinioClient,
    buckets: string[],
  ): Promise<void> {
    for (const bucketName of buckets) {
      try {
        const exists = await minioClient.bucketExists(bucketName);
        if (!exists) {
          await minioClient.makeBucket(bucketName, 'us-east-1');
          this.logger.log(`Created MinIO bucket "${bucketName}"`);
        }
        if (bucketName === 'mini-app-assets') {
          const policy = {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: { AWS: ['*'] },
                Action: ['s3:GetBucketLocation', 's3:ListBucket'],
                Resource: [`arn:aws:s3:::${bucketName}`],
              },
              {
                Effect: 'Allow',
                Principal: { AWS: ['*'] },
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${bucketName}/*`],
              },
            ],
          };
          await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy)).catch(() => {});
        }
      } catch (err: any) {
        this.logger.warn(
          `MinIO bucket init check failed for "${bucketName}": ${err.message}`,
        );
      }
    }
  }

  /**
   * Migrate objects from legacy buckets to new standardized buckets if present
   */
  async migrateLegacyBuckets(
    minioClient: MinioClient,
    assetsBucket: string,
    packageSubmissionsBucket: string,
  ): Promise<void> {
    try {
      // 1. Check legacy mini-app-logos
      const hasLegacyLogos = await minioClient
        .bucketExists('mini-app-logos')
        .catch(() => false);
      if (hasLegacyLogos && assetsBucket !== 'mini-app-logos') {
        const stream = minioClient.listObjectsV2('mini-app-logos', '', true);
        stream.on('data', async (obj) => {
          if (obj.name) {
            try {
              const conds = new (require('minio').CopyConditions)();
              await minioClient.copyObject(
                assetsBucket,
                obj.name,
                `/mini-app-logos/${obj.name}`,
                conds,
              );
              this.logger.log(
                `Migrated ${obj.name} from mini-app-logos to ${assetsBucket}`,
              );
            } catch (_) {}
          }
        });
      }

      // 2. Check legacy submissions
      const hasLegacySubmissions = await minioClient
        .bucketExists('submissions')
        .catch(() => false);
      if (hasLegacySubmissions && packageSubmissionsBucket !== 'submissions') {
        const stream = minioClient.listObjectsV2('submissions', '', true);
        stream.on('data', async (obj) => {
          if (obj.name) {
            try {
              const conds = new (require('minio').CopyConditions)();
              await minioClient.copyObject(
                packageSubmissionsBucket,
                obj.name,
                `/submissions/${obj.name}`,
                conds,
              );
              this.logger.log(
                `Migrated ${obj.name} from submissions to ${packageSubmissionsBucket}`,
              );
            } catch (_) {}
          }
        });
      }
    } catch (err: any) {
      this.logger.warn(`Legacy bucket migration check skipped: ${err.message}`);
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
    const hasLicense = Boolean(
      aistorLicenseKey && aistorLicenseKey.trim(),
    );
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
