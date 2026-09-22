import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ReleaseAssemblyVerificationService } from './release-assembly-verification.service';
import {
  VerifyAndAssembleReleaseDto,
  ReleaseAssemblyAuditResult,
  BuildStageUpdateDto,
  BuildCallbackDto,
} from './dto/release-assembly-verification.dto';
import { CallbackTokenGuard } from './callback-token.guard';

@Controller(['release-assembly', 'api/release-assembly'])
export class ReleaseAssemblyVerificationController {
  constructor(
    private readonly releaseService: ReleaseAssemblyVerificationService,
  ) {}

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(
    @Body() dto: VerifyAndAssembleReleaseDto,
  ): Promise<ReleaseAssemblyAuditResult> {
    return this.releaseService.verifyAndAssembleRelease(dto);
  }

  @Post('stage')
  @HttpCode(HttpStatus.OK)
  async stageUpdate(@Body() body: any) {
    return this.releaseService.handleStageUpdate(body);
  }

  @Post('build-stage-update')
  @UseGuards(CallbackTokenGuard)
  @HttpCode(HttpStatus.OK)
  async buildStageUpdate(@Body() dto: BuildStageUpdateDto) {
    return this.releaseService.handleBuildStageUpdate(dto);
  }

  @Post('build-callback')
  @UseGuards(CallbackTokenGuard)
  @HttpCode(HttpStatus.OK)
  async buildCallback(@Body() dto: BuildCallbackDto) {
    return this.releaseService.handleBuildCallback(dto);
  }
}
