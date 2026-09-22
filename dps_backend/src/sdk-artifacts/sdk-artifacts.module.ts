import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    ConfigModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: sdkUploadMulterOptions,
    }),
    TypeOrmModule.forFeature([MiniApp]),
    AuthModule,
    IntegrationsModule,
    StorageModule,
  ],
  controllers: [SdkArtifactsController],
  providers: [ArtifactScannerService, SdkArtifactUploadService],
  exports: [SdkArtifactUploadService],
})
export class SdkArtifactsModule {}
