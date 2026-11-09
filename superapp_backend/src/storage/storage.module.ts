import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageService } from './storage.service';
import {
  StorageController,
  PublicAssetProxyController,
} from './storage.controller';
import {
  ArchiveSanitizerHelper,
  BucketLifecycleHelper,
  PresignedUrlHelper,
  QuarantineStorageHelper,
} from './helpers';

@Module({
  imports: [forwardRef(() => AuthModule)],
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
