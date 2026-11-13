import {
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../access-control/guards/rbac.guard';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { JenkinsService } from '../jenkins/jenkins.service';
import { SandboxBuildManagerService } from '../flutter/sandbox-build-manager.service';
import { SuperAppService } from '../../super-app/super-app.service';
import { AuditService } from '../../audit/audit.service';
import { testApkBuildMode } from '../../common/utils/build-mode.util';

/**
 * On-demand Super App builds for Super Admins, e.g. after testing every case:
 *
 *   POST test  a new test build (APK and the web preview from the same source)
 *              with whatever the test build includes now (build-inclusion.ts:
 *              live, under test and building apps). No mini app changes stage.
 *   POST web   only the web preview (superapp-sandbox-build).
 */
@Controller(['super-app-builds', 'api/super-app-builds'])
@UseGuards(JwtAuthGuard, RbacGuard)
export class SuperAppBuildsController {
  private readonly logger = new Logger(SuperAppBuildsController.name);

  constructor(
    private readonly jenkins: JenkinsService,
    private readonly sandboxBuilds: SandboxBuildManagerService,
    private readonly superApp: SuperAppService,
    private readonly audit: AuditService,
  ) {}

  @Post('test')
  @RequirePermissions('super_app:manage')
  @HttpCode(HttpStatus.OK)
  async rebuildTestBuild(@Req() req: any) {
    const version = await this.superApp.getAndRegisterNextVersion();
    const result = await this.jenkins.triggerSuperAppBuild({
      releaseVersion: version,
      appName: 'superapp',
      buildType: testApkBuildMode(),
      miniAppSet: 'test',
    });
    await this.audit
      .log({
        actorId: req.user?.sub,
        action: 'SUPER_APP_TEST_BUILD_TRIGGERED',
        resourceType: 'SuperApp',
        resourceId: version,
        newValue: { version, success: result.success, message: result.message },
      })
      .catch((e) => this.logger.warn(`Audit log failed: ${e?.message}`));
    return { ...result, version };
  }

  @Post('web')
  @RequirePermissions('super_app:manage')
  @HttpCode(HttpStatus.OK)
  rebuildWebPreview(@Req() req: any) {
    return this.sandboxBuilds.triggerBuild(
      req?.user?.email || req?.user?.name || 'Super Admin',
    );
  }
}
