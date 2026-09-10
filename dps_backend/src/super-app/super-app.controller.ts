import { Controller, Get, Param } from '@nestjs/common';
import { SuperAppService } from './super-app.service';

@Controller('super-app')
export class SuperAppController {
  constructor(private readonly superAppService: SuperAppService) {}

  @Get('ecosystem-status')
  async getEcosystemStatus() {
    return this.superAppService.getEcosystemStatus();
  }

  @Get('capabilities')
  async getAllCapabilities() {
    return this.superAppService.findAllCapabilities();
  }

  @Get('capabilities/:version')
  async getCapabilities(@Param('version') version: string) {
    return this.superAppService.findCapabilitiesForVersion(version);
  }
}
