import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CapabilityDefinition } from './entities/capability-definition.entity';
import { CapabilitiesController } from './capabilities.controller';
import { CapabilitiesService } from './capabilities.service';
import { CapabilityCodeGeneratorService } from './capability-code-generator.service';
import { GitLabProvider } from '../integrations/git/providers/gitlab.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([CapabilityDefinition]),
    forwardRef(() => AuthModule),
    ConfigModule,
  ],
  controllers: [CapabilitiesController],
  providers: [
    CapabilitiesService,
    CapabilityCodeGeneratorService,
    GitLabProvider,
  ],
  exports: [CapabilitiesService, CapabilityCodeGeneratorService],
})
export class CapabilitiesModule {}

// Backwards-compatible alias
export { CapabilitiesModule as PermissionsModule };
