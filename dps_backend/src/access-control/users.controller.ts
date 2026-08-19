import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessControlService } from './access-control.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly accessControlService: AccessControlService) {}

  @Get()
  async findAll() {
    return this.accessControlService.findAllUsers();
  }
}
