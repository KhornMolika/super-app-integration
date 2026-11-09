import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../access-control/guards/rbac.guard';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { LocalBuildsGuard } from '../../common/guards/local-builds.guard';
import { PubspecInjectorService } from './pubspec-injector.service';
import { PubspecPrecheckService } from './pubspec-precheck.service';
import { SandboxBuildManagerService } from './sandbox-build-manager.service';
import {
  InjectDependencyDto,
  RemoveDependencyDto,
  ValidateDependencyDto,
  PrecheckConflictDto,
} from './dto/pubspec-injector.dto';
import { BypassTransform } from '../../common/decorators/bypass-transform.decorator';

@Controller([
  'pubspec',
  'api/pubspec',
  'integrations/pubspec',
  'api/integrations/pubspec',
])
// Previously unauthenticated: these routes rewrite the Super App's pubspec and
// trigger builds. Every route now needs a signed-in user with super_app rights.
@UseGuards(JwtAuthGuard, RbacGuard)
export class PubspecInjectorController {
  constructor(
    private readonly pubspecService: PubspecInjectorService,
    private readonly precheckService: PubspecPrecheckService,
    private readonly sandboxBuildManager: SandboxBuildManagerService,
  ) {}

  @Get('status')
  @RequirePermissions('super_app:read')
  async getStatus() {
    return this.pubspecService.getPubspecStatus();
  }

  @Get('package-constraints')
  @RequirePermissions('super_app:read')
  async getPackageConstraints() {
    return this.precheckService.getPackageConstraints();
  }

  @Post('precheck-conflicts')
  @RequirePermissions('super_app:read')
  @BypassTransform()
  @HttpCode(HttpStatus.OK)
  async precheckConflicts(@Body() dto: PrecheckConflictDto) {
    return this.precheckService.simulateCandidate(dto);
  }

  @Post('validate')
  @RequirePermissions('super_app:read')
  @HttpCode(HttpStatus.OK)
  async validate(@Body() dto: ValidateDependencyDto) {
    return this.pubspecService.validateDependencies(dto);
  }

  @Post('sync')
  @RequirePermissions('super_app:manage')
  @UseGuards(LocalBuildsGuard)
  @HttpCode(HttpStatus.OK)
  async syncApprovedMiniApps() {
    return this.pubspecService.syncAllApprovedMiniApps();
  }

  @Post('inject')
  @RequirePermissions('super_app:manage')
  @UseGuards(LocalBuildsGuard)
  @HttpCode(HttpStatus.OK)
  async injectDependency(@Body() dto: InjectDependencyDto) {
    return this.pubspecService.injectDependency(dto);
  }

  @Post('remove')
  @RequirePermissions('super_app:manage')
  @UseGuards(LocalBuildsGuard)
  @HttpCode(HttpStatus.OK)
  async removeDependency(@Body() dto: RemoveDependencyDto) {
    return this.pubspecService.removeDependency(dto.packageName);
  }

  @Post('restore-backup')
  @RequirePermissions('super_app:manage')
  @UseGuards(LocalBuildsGuard)
  @HttpCode(HttpStatus.OK)
  async restoreBackup() {
    return this.pubspecService.restoreBackup();
  }

  @Get('sandbox-build/status')
  @RequirePermissions('super_app:read')
  @BypassTransform()
  async getSandboxBuildStatus() {
    return this.sandboxBuildManager.getStatus();
  }

  @Post(['sandbox-build/trigger', 'trigger-sandbox-build'])
  @RequirePermissions('super_app:manage')
  @HttpCode(HttpStatus.OK)
  async triggerSandboxBuild(@Req() req?: any) {
    const actor =
      req?.user?.email || req?.user?.name || 'SuperApp Administrator';
    return this.sandboxBuildManager.triggerBuild(actor);
  }
}
