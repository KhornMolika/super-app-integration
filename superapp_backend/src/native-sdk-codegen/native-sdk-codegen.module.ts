import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NativeSdkCodegenService } from './native-sdk-codegen.service';
import { GitlabMrService } from './gitlab-mr.service';
import { NativeSdkManifestController } from './native-sdk-manifest.controller';
import { BuildGitCredentialsService } from './build-git-credentials.service';
import { BuildMiniAppsService } from './build-miniapps.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([MiniApp]),
    IntegrationsModule,
  ],
  controllers: [NativeSdkManifestController],
  providers: [NativeSdkCodegenService, GitlabMrService, BuildGitCredentialsService, BuildMiniAppsService],
  exports: [NativeSdkCodegenService, GitlabMrService],
})
export class NativeSdkCodegenModule {}
