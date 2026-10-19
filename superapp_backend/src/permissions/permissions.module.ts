import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionDefinition } from './entities/permission-definition.entity';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { CapabilityCodeGeneratorService } from './capability-code-generator.service';
import { GitLabProvider } from '../integrations/git/providers/gitlab.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([PermissionDefinition]),
    AuthModule,
    ConfigModule,
  ],
  controllers: [PermissionsController],
  providers: [
    PermissionsService,
    CapabilityCodeGeneratorService,
    GitLabProvider,
  ],
  exports: [PermissionsService, CapabilityCodeGeneratorService],
})
export class PermissionsModule {}
