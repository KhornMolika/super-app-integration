import { Controller, Get, UseGuards } from '@nestjs/common';
import { CallbackTokenGuard } from '../integrations/release-assembly/callback-token.guard';
import { BypassTransform } from '../common/decorators/bypass-transform.decorator';
import { NativeSdkCodegenService } from './native-sdk-codegen.service';

/**
 * Read by the Super App build (Jenkins) before `flutter build`: which Native SDK
 * libraries to add. Machine-to-machine, so it uses the Jenkins callback token,
 * not a user login.
 */
@Controller(['release-assembly', 'api/release-assembly'])
export class NativeSdkManifestController {
  constructor(private readonly codegen: NativeSdkCodegenService) {}

  @Get('native-sdk-manifest')
  @UseGuards(CallbackTokenGuard)
  @BypassTransform()
  manifest() {
    return this.codegen.buildManifest();
  }
}
