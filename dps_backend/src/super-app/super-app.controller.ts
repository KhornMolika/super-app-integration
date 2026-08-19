import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAppService } from './super-app.service';

@UseGuards(JwtAuthGuard)
@Controller('super-app')
export class SuperAppController {
  constructor(private readonly superAppService: SuperAppService) {}

  @Get('capabilities/:version')
  async getCapabilities(@Param('version') version: string) {
    return this.superAppService.findCapabilitiesForVersion(version);
  }
}
