import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { parseBuildType } from './build-inclusion';
import { CallbackTokenGuard } from '../integrations/release-assembly/callback-token.guard';
import { BypassTransform } from '../common/decorators/bypass-transform.decorator';
import { NativeSdkCodegenService } from './native-sdk-codegen.service';
import { BuildGitCredentialsService } from './build-git-credentials.service';
import { BuildMiniAppsService } from './build-miniapps.service';

/**
 * Read by the Super App build (Jenkins) before `flutter build`. Jenkins passes
 * ?buildType=debug|release: a release build bundles ACTIVE apps only (see
 * build-inclusion.ts); without it, the test-build list is returned. Machine-to-machine,
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
  manifest(@Query('buildType') buildType?: string) {
    return this.codegen.buildManifest(parseBuildType(buildType));
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
  buildMiniApps(@Query('buildType') buildType?: string) {
    return this.miniApps.plan(parseBuildType(buildType));
  }

  /**
   * The deploy key or token for each private mini app repository in the build
   * (secrets: the build keeps them in a temporary folder only).
   */
  @Get('build-git-credentials')
  @UseGuards(CallbackTokenGuard)
  @BypassTransform()
  @Header('Cache-Control', 'no-store')
  buildGitCredentials(@Query('buildType') buildType?: string) {
    return this.gitCredentials.list(parseBuildType(buildType));
  }
}
