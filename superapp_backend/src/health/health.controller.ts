import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService, HealthCheckResult } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthCheckResult> {
    const result = await this.healthService.check();
    if (result.status === 'error') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }

  @Get('liveness')
  liveness(): { status: string; uptime: number } {
    return {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
    };
  }
}
