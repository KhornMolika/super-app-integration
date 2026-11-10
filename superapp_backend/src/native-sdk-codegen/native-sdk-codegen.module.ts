import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NativeSdkCodegenService } from './native-sdk-codegen.service';
import { GitlabMrService } from './gitlab-mr.service';
import { NativeSdkManifestController } from './native-sdk-manifest.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([MiniApp]),
    IntegrationsModule,
  ],
  controllers: [NativeSdkManifestController],
  providers: [NativeSdkCodegenService, GitlabMrService],
  exports: [NativeSdkCodegenService, GitlabMrService],
})
export class NativeSdkCodegenModule {}
