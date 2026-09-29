import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
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
  generateSnippet(
    @Body() body: { packageName: string; versionConstraint?: string },
  ) {
    const snippet = this.nexusService.generateSnippet(body);
    return { snippet };
  }

  @Get('repositories/:repo/components')
  listComponents(@Param('repo') repo: string) {
    return this.nexusService.listComponents(repo);
  }

  @Delete('components/:id')
  deleteComponent(@Param('id') id: string) {
    return this.nexusService.deleteComponent(id);
  }

  @Delete('assets/:id')
  deleteAsset(@Param('id') id: string) {
    return this.nexusService.deleteAsset(id);
  }

  @Delete('packages/:name')
  deletePubPackage(@Param('name') name: string) {
    return this.nexusService.deletePubPackage(name);
  }
}
