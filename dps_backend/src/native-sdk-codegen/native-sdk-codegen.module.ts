import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NativeSdkCodegenService } from './native-sdk-codegen.service';
import { GithubPrService } from './github-pr.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([MiniApp]), IntegrationsModule],
  providers: [NativeSdkCodegenService, GithubPrService],
  exports: [NativeSdkCodegenService, GithubPrService],
})
export class NativeSdkCodegenModule {}
