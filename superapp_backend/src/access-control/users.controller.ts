import { isPlatformAdmin } from './helpers/platform-admin.helper';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from './guards/rbac.guard';
import { RequirePermissions } from './decorators/require-permissions.decorator';
import { AccessControlService } from './access-control.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';

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
    const user =
      await this.accessControlService.findByEmailWithPermissions(userEmail);
    if (!user) {
      throw new ForbiddenException('User record not found');
    }
    return this.accessControlService.updateUser(user.id, dto, req?.user);
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }),
  )
  async uploadMyAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const userEmail = req?.user?.email;
    if (!userEmail) {
      throw new ForbiddenException('User session not found');
    }
    const user =
      await this.accessControlService.findByEmailWithPermissions(userEmail);
    if (!user) {
      throw new ForbiddenException('User record not found');
    }
    return this.accessControlService.uploadUserAvatar(user.id, file, req?.user);
  }

  @Delete('me/avatar')
  async deleteMyAvatar(@Req() req: any) {
    const userEmail = req?.user?.email;
    if (!userEmail) {
      throw new ForbiddenException('User session not found');
    }
    const user =
      await this.accessControlService.findByEmailWithPermissions(userEmail);
    if (!user) {
      throw new ForbiddenException('User record not found');
    }
    return this.accessControlService.deleteUserAvatar(user.id, req?.user);
  }

  @Get()
  @RequirePermissions('organization:read')
  async findAll(@Query() query: QueryUsersDto, @Req() req: any) {
    const requester = req?.user;
    // SUPER_ADMIN lists every organization; anyone else (organization admins
    // included) only their own, whatever organizationId the query asks for
    if (!isPlatformAdmin(requester)) {
      const orgId = requester?.organizationId;
      if (!orgId) {
        throw new ForbiddenException(
          'You must belong to an organization to list members',
        );
      }
      query.organizationId = orgId;
    }

    return this.accessControlService.findAllUsers(query);
  }

  @Get('stats')
  @RequirePermissions('organization:read')
  async getStats(@Req() req: any) {
    return this.accessControlService.getUserStats(req?.user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const requester = req?.user;
    const isSelf = requester && (requester.id === id || requester.sub === id);
    if (!isSelf) {
      const userPerms = new Set<string>(requester?.permissions || []);
      if (!userPerms.has('user:read') && !isPlatformAdmin(requester)) {
        throw new ForbiddenException('Insufficient permissions');
      }
      await this.accessControlService.assertUserInScope(id, requester);
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
    const isSelfById =
      requester && (requester.id === id || requester.sub === id);
    if (!isSelfById) {
      await this.accessControlService.assertUserInScope(id, requester);
    }
    const targetUser = await this.accessControlService.findUserById(id);
    const isSelf =
      requester &&
      (requester.id === id ||
        requester.sub === id ||
        (requester.email &&
          requester.email.toLowerCase() === targetUser.email.toLowerCase()));

    if (!isSelf) {
      const userPerms = new Set<string>(requester?.permissions || []);
      if (!userPerms.has('user:manage') && !isPlatformAdmin(requester)) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    return this.accessControlService.updateUser(id, dto, requester);
  }

  @Post(':id/approve')
  @RequirePermissions('user:manage')
  async approve(
    @Param('id') id: string,
    @Body() body: { role?: string; roleName?: string; organizationId?: string },
    @Req() req: any,
  ) {
    return this.accessControlService.approveUser(
      id,
      body?.roleName || body?.role || 'MA_DEVELOPER',
      req?.user,
      body?.organizationId,
    );
  }

  @Post(':id/verify-email')
  @RequirePermissions('user:manage')
  async verifyEmail(@Param('id') id: string, @Req() req: any) {
    return this.accessControlService.manuallyVerifyEmail(id, req?.user);
  }

  @Delete(':id')
  @RequirePermissions('user:manage')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.accessControlService.deleteUser(id, req?.user);
  }

  @Post(':id/avatar')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }),
  )
  async uploadUserAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    await this.assertCanManageTargetUser(id, req?.user);
    return this.accessControlService.uploadUserAvatar(id, file, req?.user);
  }

  @Delete(':id/avatar')
  async deleteUserAvatar(@Param('id') id: string, @Req() req: any) {
    await this.assertCanManageTargetUser(id, req?.user);
    return this.accessControlService.deleteUserAvatar(id, req?.user);
  }

  private async assertCanManageTargetUser(
    targetId: string,
    requester: any,
  ): Promise<void> {
    if (!requester) {
      throw new ForbiddenException('Authentication required');
    }
    const isSelf = requester.id === targetId || requester.sub === targetId;
    if (isSelf) return;

    const userPerms = new Set<string>(requester?.permissions || []);
    if (!userPerms.has('user:manage') && !isPlatformAdmin(requester)) {
      throw new ForbiddenException(
        'Insufficient permissions to manage user media',
      );
    }
    await this.accessControlService.assertUserInScope(targetId, requester);
  }
}
