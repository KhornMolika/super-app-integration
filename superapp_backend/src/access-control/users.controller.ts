import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from './guards/rbac.guard';
import { RequirePermissions } from './decorators/require-permissions.decorator';
import { AccessControlService } from './access-control.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller(['users', 'api/users'])
export class UsersController {
  constructor(private readonly accessControlService: AccessControlService) {}

  @Get('me')
  async getProfile(@Req() req: any) {
    const userEmail = req?.user?.email;
    if (!userEmail) return null;
    return this.accessControlService.findByEmailWithPermissions(userEmail);
  }

  @Put('me')
  async updateProfile(@Body() dto: UpdateUserDto, @Req() req: any) {
    const userEmail = req?.user?.email;
    if (!userEmail) {
      throw new ForbiddenException('User session not found');
    }
    const user = await this.accessControlService.findByEmailWithPermissions(userEmail);
    if (!user) {
      throw new ForbiddenException('User record not found');
    }
    return this.accessControlService.updateUser(user.id, dto, req?.user);
  }

  @Get()
  @RequirePermissions('user:read')
  async findAll() {
    return this.accessControlService.findAllUsers();
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const requester = req?.user;
    const isSelf = requester && (requester.id === id || requester.sub === id);
    if (!isSelf) {
      const userPerms = new Set<string>(requester?.permissions || []);
      const isSuperOrAdmin =
        requester?.email?.includes('superadmin') ||
        requester?.email?.includes('admin') ||
        (Array.isArray(requester?.roles) &&
          requester.roles.some((r: any) =>
            typeof r === 'string'
              ? r === 'SUPER_ADMIN' || r === 'ADMIN'
              : r?.name === 'SUPER_ADMIN' || r?.name === 'ADMIN',
          ));

      if (!userPerms.has('user:read') && !isSuperOrAdmin) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }
    return this.accessControlService.findUserById(id);
  }

  @Post()
  @RequirePermissions('user:manage')
  async create(@Body() dto: CreateUserDto, @Req() req: any) {
    return this.accessControlService.createUser(dto, req?.user);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: any,
  ) {
    const requester = req?.user;
    const targetUser = await this.accessControlService.findUserById(id);
    const isSelf =
      requester &&
      (requester.id === id ||
        requester.sub === id ||
        (requester.email &&
          requester.email.toLowerCase() === targetUser.email.toLowerCase()));

    if (!isSelf) {
      const userPerms = new Set<string>(requester?.permissions || []);
      const isSuperOrAdmin =
        requester?.email?.includes('superadmin') ||
        requester?.email?.includes('admin') ||
        (Array.isArray(requester?.roles) &&
          requester.roles.some((r: any) =>
            typeof r === 'string'
              ? r === 'SUPER_ADMIN' || r === 'ADMIN'
              : r?.name === 'SUPER_ADMIN' || r?.name === 'ADMIN',
          ));

      if (!userPerms.has('user:manage') && !isSuperOrAdmin) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    return this.accessControlService.updateUser(id, dto, requester);
  }

  @Delete(':id')
  @RequirePermissions('user:manage')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.accessControlService.deleteUser(id, req?.user);
  }
}
