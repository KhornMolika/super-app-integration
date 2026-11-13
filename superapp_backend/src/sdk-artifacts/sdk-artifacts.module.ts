import { MiniAppAccessModule } from '../miniapps/access/miniapp-access.module';
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { StorageModule } from '../storage/storage.module';
import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { ArtifactScannerService } from './artifact-scanner.service';
import { SdkArtifactUploadService } from './sdk-artifact-upload.service';
import { sdkUploadMulterOptions } from './sdk-upload-multer.options';
import { SdkArtifactsController } from './sdk-artifacts.controller';
import { SdkRegistryProxyController } from './sdk-registry-proxy.controller';
import { PubRegistryProxyController } from './pub-registry-proxy.controller';

@Module({
  imports: [
    ConfigModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: sdkUploadMulterOptions,
    }),
    TypeOrmModule.forFeature([MiniApp]),
    MiniAppAccessModule,
    AuthModule,
    IntegrationsModule,
    forwardRef(() => StorageModule),
  ],
  controllers: [
    SdkArtifactsController,
    SdkRegistryProxyController,
    PubRegistryProxyController,
  ],
  providers: [ArtifactScannerService, SdkArtifactUploadService],
  exports: [SdkArtifactUploadService],
})
export class SdkArtifactsModule {}
