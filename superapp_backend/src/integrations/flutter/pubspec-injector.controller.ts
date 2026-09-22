import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PubspecInjectorService } from './pubspec-injector.service';
import { PubspecPrecheckService } from './pubspec-precheck.service';
import { SandboxBuildManagerService } from './sandbox-build-manager.service';
import {
  InjectDependencyDto,
  RemoveDependencyDto,
  ValidateDependencyDto,
  PrecheckConflictDto,
} from './dto/pubspec-injector.dto';

@Controller(['pubspec', 'api/pubspec', 'integrations/pubspec', 'api/integrations/pubspec'])
export class PubspecInjectorController {
  constructor(
    private readonly pubspecService: PubspecInjectorService,
    private readonly precheckService: PubspecPrecheckService,
    private readonly sandboxBuildManager: SandboxBuildManagerService,
  ) {}

  @Get('status')
  async getStatus() {
    return this.pubspecService.getPubspecStatus();
  }

  @Get('package-constraints')
  async getPackageConstraints() {
    return this.precheckService.getPackageConstraints();
  }

  @Post('precheck-conflicts')
  @HttpCode(HttpStatus.OK)
  async precheckConflicts(@Body() dto: PrecheckConflictDto) {
    return this.precheckService.simulateCandidate(dto);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validate(@Body() dto: ValidateDependencyDto) {
    return this.pubspecService.validateDependencies(dto);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncApprovedMiniApps() {
    return this.pubspecService.syncAllApprovedMiniApps();
  }

  @Post('inject')
  @HttpCode(HttpStatus.OK)
  async injectDependency(@Body() dto: InjectDependencyDto) {
    return this.pubspecService.injectDependency(dto);
  }

  @Post('remove')
  @HttpCode(HttpStatus.OK)
  async removeDependency(@Body() dto: RemoveDependencyDto) {
    return this.pubspecService.removeDependency(dto.packageName);
  }

  @Post('restore-backup')
  @HttpCode(HttpStatus.OK)
  async restoreBackup() {
    return this.pubspecService.restoreBackup();
  }

  @Get('sandbox-build/status')
  async getSandboxBuildStatus() {
    return this.sandboxBuildManager.getStatus();
  }

  @Post(['sandbox-build/trigger', 'trigger-sandbox-build'])
  @HttpCode(HttpStatus.OK)
  async triggerSandboxBuild(@Req() req?: any) {
    const actor = req?.user?.email || req?.user?.name || 'Super App Administrator';
    return this.sandboxBuildManager.triggerBuild(actor);
  }
}
