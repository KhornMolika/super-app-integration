import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../access-control/guards/rbac.guard';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { NexusIntegrationService } from './nexus-integration.service';
import { NexusPackageDto, NexusSnippetDto } from './nexus-integration.dto';

@Controller(['integrations/nexus', 'api/integrations/nexus'])
// Previously open to anyone, including artifact deletion
@UseGuards(JwtAuthGuard, RbacGuard)
export class NexusIntegrationController {
  constructor(private readonly nexusService: NexusIntegrationService) {}

  @Get('packages/:name')
  getPackageInfo(@Param('name') name: string) {
    return this.nexusService.getPackageInfo(name);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validatePackage(@Body() body: NexusPackageDto) {
    return this.nexusService.getPackageInfo(body.packageName);
  }

  @Post('snippet')
  @HttpCode(HttpStatus.OK)
  generateSnippet(@Body() body: NexusSnippetDto) {
    const snippet = this.nexusService.generateSnippet(body);
    return { snippet };
  }

  @Get('repositories/:repo/components')
  listComponents(@Param('repo') repo: string) {
    return this.nexusService.listComponents(repo);
  }

  @Delete('components/:id')
  @RequirePermissions('super_app:manage')
  deleteComponent(@Param('id') id: string) {
    return this.nexusService.deleteComponent(id);
  }

  @Delete('assets/:id')
  @RequirePermissions('super_app:manage')
  deleteAsset(@Param('id') id: string) {
    return this.nexusService.deleteAsset(id);
  }

  @Delete('packages/:name')
  @RequirePermissions('super_app:manage')
  deletePubPackage(@Param('name') name: string) {
    return this.nexusService.deletePubPackage(name);
  }
}
