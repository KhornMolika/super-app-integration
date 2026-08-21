import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { RunSecurityGate1Dto, SecurityGateReport } from './dto/security-gate.dto';
import { SecurityGateService } from './security-gate.service';

@Controller(['security/gate1', 'api/security/gate1'])
export class SecurityGateController {
  constructor(private readonly securityGateService: SecurityGateService) {}

  @Post('scan')
  @HttpCode(HttpStatus.OK)
  async scan(@Body() dto: RunSecurityGate1Dto): Promise<SecurityGateReport> {
    return this.securityGateService.runGate1Scan(dto);
  }
}
