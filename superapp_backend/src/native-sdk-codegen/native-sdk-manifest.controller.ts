import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { CallbackTokenGuard } from '../integrations/release-assembly/callback-token.guard';
import { BypassTransform } from '../common/decorators/bypass-transform.decorator';
import { NativeSdkCodegenService } from './native-sdk-codegen.service';
import { BuildGitCredentialsService } from './build-git-credentials.service';
import { BuildMiniAppsService } from './build-miniapps.service';

/**
 * Read by the Super App build (Jenkins) before `flutter build`. Machine-to-machine,
 * so it uses the Jenkins callback token, not a user login.
 */
@Controller(['release-assembly', 'api/release-assembly'])
export class NativeSdkManifestController {
  constructor(
    private readonly codegen: NativeSdkCodegenService,
    private readonly gitCredentials: BuildGitCredentialsService,
    private readonly miniApps: BuildMiniAppsService,
  ) {}

  /** Which Native SDK libraries to add (archived with the build: no secrets). */
  @Get('native-sdk-manifest')
  @UseGuards(CallbackTokenGuard)
  @BypassTransform()
  manifest() {
    return this.codegen.buildManifest();
  }

  /**
   * The Flutter mini apps in the build: pubspec.yaml dependencies and the
   * generated registry, which the build writes into the Super App before
   * pub get (no secrets).
   */
  @Get('build-miniapps')
  @UseGuards(CallbackTokenGuard)
  @BypassTransform()
  @Header('Cache-Control', 'no-store')
  buildMiniApps() {
    return this.miniApps.plan();
  }

  /**
   * The deploy key or token for each private mini app repository in the build
   * (secrets: the build keeps them in a temporary folder only).
   */
  @Get('build-git-credentials')
  @UseGuards(CallbackTokenGuard)
  @BypassTransform()
  @Header('Cache-Control', 'no-store')
  buildGitCredentials() {
    return this.gitCredentials.list();
  }
}
