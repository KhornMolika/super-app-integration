import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { NexusIntegrationService } from './nexus-integration.service';

@Controller(['integrations/nexus', 'api/integrations/nexus'])
export class NexusIntegrationController {
  constructor(private readonly nexusService: NexusIntegrationService) {}

  @Get('packages/:name')
  getPackageInfo(@Param('name') name: string) {
    return this.nexusService.getPackageInfo(name);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validatePackage(@Body() body: { packageName: string }) {
    return this.nexusService.getPackageInfo(body.packageName);
  }

  @Post('snippet')
  @HttpCode(HttpStatus.OK)
  generateSnippet(@Body() body: { packageName: string; versionConstraint?: string }) {
    const snippet = this.nexusService.generateSnippet(body);
    return { snippet };
  }
}
