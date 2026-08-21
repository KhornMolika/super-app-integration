import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SecurityGate2Service } from './security-gate2.service';
import { VerifyAndAssembleReleaseDto, Gate2AuditResult } from './dto/security-gate2.dto';

@Controller(['security/gate2', 'api/security/gate2'])
export class SecurityGate2Controller {
  constructor(private readonly securityGate2Service: SecurityGate2Service) {}

  @Post('verify-and-assemble')
  @HttpCode(HttpStatus.OK)
  async verifyAndAssembleRelease(@Body() dto: VerifyAndAssembleReleaseDto): Promise<Gate2AuditResult> {
    return this.securityGate2Service.verifyAndAssembleRelease(dto);
  }
}
