import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GitIntegrationController } from './git/git-integration.controller';
import { GitIntegrationService } from './git/git-integration.service';
import { GitHubProvider } from './git/providers/github.provider';
import { GitLabProvider } from './git/providers/gitlab.provider';
import { NexusIntegrationController } from './nexus/nexus-integration.controller';
import { NexusIntegrationService } from './nexus/nexus-integration.service';

import { SecurityGateController } from './security/security-gate.controller';
import { SecurityGateService } from './security/security-gate.service';
import { SecurityGate2Controller } from './security/security-gate2.controller';
import { SecurityGate2Service } from './security/security-gate2.service';

@Module({
  imports: [ConfigModule],
  controllers: [
    GitIntegrationController,
    NexusIntegrationController,
    SecurityGateController,
    SecurityGate2Controller,
  ],
  providers: [
    GitIntegrationService,
    GitHubProvider,
    GitLabProvider,
    NexusIntegrationService,
    SecurityGateService,
    SecurityGate2Service,
  ],
  exports: [
    GitIntegrationService,
    GitHubProvider,
    GitLabProvider,
    NexusIntegrationService,
    SecurityGateService,
    SecurityGate2Service,
  ],
})
export class IntegrationsModule {}
