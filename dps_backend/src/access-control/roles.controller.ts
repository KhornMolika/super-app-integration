import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessControlService } from './access-control.service';

@UseGuards(JwtAuthGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly accessControlService: AccessControlService) {}

  @Get()
  async findAll() {
    return this.accessControlService.findAllRoles();
  }

  @Get('permissions')
  async findAllPermissions() {
    return this.accessControlService.findAllPermissions();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.accessControlService.findRoleById(id);
  }

  @Post()
  async create(
    @Body()
    dto: {
      name: string;
      description?: string;
      permissions?: string[];
      permissionNames?: string[];
    },
  ) {
    return this.accessControlService.createRole(dto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    dto: {
      name?: string;
      description?: string;
      permissions?: string[];
      permissionNames?: string[];
      isActive?: boolean;
    },
  ) {
    return this.accessControlService.updateRole(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.accessControlService.deleteRole(id);
  }
}
