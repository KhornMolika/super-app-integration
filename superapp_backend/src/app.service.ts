import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo() {
    return {
      name: 'Super App Platform API Gateway',
      organization: 'FinTech Center General Secretariat of FSA',
      status: 'operational',
      health: '/health',
      liveness: '/health/liveness',
    };
  }
}
