import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSetting } from './entities/system-setting.entity';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { ArtifactRetentionService } from './artifact-retention.service';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([SystemSetting]),
    AuthModule,
  ],
  controllers: [SettingsController],
  providers: [SettingsService, ArtifactRetentionService],
  exports: [SettingsService, ArtifactRetentionService],
})
export class SettingsModule {}

