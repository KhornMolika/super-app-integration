import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController, PublicAssetProxyController } from './storage.controller';
import {
  ArchiveSanitizerHelper,
  BucketLifecycleHelper,
  PresignedUrlHelper,
  QuarantineStorageHelper,
} from './helpers';

@Module({
  controllers: [StorageController, PublicAssetProxyController],
  providers: [
    StorageService,
    ArchiveSanitizerHelper,
    BucketLifecycleHelper,
    PresignedUrlHelper,
    QuarantineStorageHelper,
  ],
  exports: [
    StorageService,
    ArchiveSanitizerHelper,
    BucketLifecycleHelper,
    PresignedUrlHelper,
    QuarantineStorageHelper,
  ],
})
export class StorageModule {}
