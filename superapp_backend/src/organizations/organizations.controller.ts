import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../access-control/guards/rbac.guard';
import { RequirePermissions } from '../access-control/decorators/require-permissions.decorator';
import { OrganizationsService } from './organizations.service';
import {
  canActInOrg,
  isPlatformAdmin,
} from '../access-control/helpers/platform-admin.helper';

/** Fields that place an organization in the hierarchy: SUPER_ADMIN only. */
const STRUCTURAL_FIELDS = [
  'code',
  'parentId',
  'parentAuthority',
  'status',
] as const;

/**
 * organization:manage is held by SUPER_ADMIN (every organization) and by
 * organization admins (ADMIN), who may only edit their own organization's
 * profile: name, description, logo.
 */
function assertCanEditOrganization(user: any, id: string, data?: object) {
  if (isPlatformAdmin(user)) return;
  if (!canActInOrg(user, id)) {
    throw new ForbiddenException('You can only edit your own organization.');
  }
  const structural = STRUCTURAL_FIELDS.filter(
    (f) => data && (data as any)[f] !== undefined,
  );
  if (structural.length) {
    throw new ForbiddenException(
      `Only a Super Admin can change ${structural.join(', ')}.`,
    );
  }
}

function assertPlatformAdmin(user: any, action: string) {
  if (!isPlatformAdmin(user)) {
    throw new ForbiddenException(`Only a Super Admin can ${action}.`);
  }
}
import {
  Organization,
  OrganizationStatus,
} from './entities/organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { QueryOrganizationsDto } from './dto/query-organizations.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller(['organizations', 'api/organizations'])
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  async findAll(@Query() query: QueryOrganizationsDto) {
    return this.organizationsService.findAll(query);
  }

  @Get('stats')
  async getStats() {
    return this.organizationsService.getStats();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<any> {
    const org = await this.organizationsService.findOne(id);
    if (!org) {
      throw new NotFoundException(`Organization ${id} not found`);
    }
    return org;
  }

  @Post(':id/logo')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions('organization:manage')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @Param('id') id: string,
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Organization> {
    assertCanEditOrganization(req?.user, id);
    if (!file) {
      throw new BadRequestException('No logo file provided');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are permitted');
    }
    return this.organizationsService.uploadLogo(id, file);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions('organization:manage')
  async create(
    @Body() data: CreateOrganizationDto,
    @Req() req: any,
  ): Promise<Organization> {
    assertPlatformAdmin(req?.user, 'create organizations');
    return this.organizationsService.create(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions('organization:manage')
  async update(
    @Param('id') id: string,
    @Body() data: UpdateOrganizationDto,
    @Req() req: any,
  ): Promise<Organization> {
    assertCanEditOrganization(req?.user, id, data);
    return this.organizationsService.update(id, data, req?.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions('organization:manage')
  async remove(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<{ success: boolean }> {
    assertPlatformAdmin(req?.user, 'delete organizations');
    const success = await this.organizationsService.remove(id, req?.user);
    return { success };
  }
}
