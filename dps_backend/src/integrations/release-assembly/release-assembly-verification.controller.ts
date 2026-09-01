import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ReleaseAssemblyVerificationService } from './release-assembly-verification.service';
import {
  VerifyAndAssembleReleaseDto,
  ReleaseAssemblyAuditResult,
} from './dto/release-assembly-verification.dto';

@Controller('release-assembly')
export class ReleaseAssemblyVerificationController {
  constructor(private readonly releaseService: ReleaseAssemblyVerificationService) {}

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(@Body() dto: VerifyAndAssembleReleaseDto): Promise<ReleaseAssemblyAuditResult> {
    return this.releaseService.verifyAndAssembleRelease(dto);
  }
}
