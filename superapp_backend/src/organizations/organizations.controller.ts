import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../access-control/guards/rbac.guard';
import { RequirePermissions } from '../access-control/decorators/require-permissions.decorator';
import { OrganizationsService } from './organizations.service';
import { Organization, OrganizationStatus } from './entities/organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Controller('organizations')
@UseGuards(JwtAuthGuard, RbacGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @RequirePermissions('organization:read')
  async findAll(@Query('status') status?: OrganizationStatus): Promise<Organization[]> {
    return this.organizationsService.findAll(status);
  }

  @Get(':id')
  @RequirePermissions('organization:read')
  async findOne(@Param('id') id: string): Promise<any> {
    const org = await this.organizationsService.findOne(id);
    if (!org) {
      throw new NotFoundException(`Organization ${id} not found`);
    }
    return org;
  }

  @Post()
  @RequirePermissions('organization:manage')
  async create(@Body() data: CreateOrganizationDto): Promise<Organization> {
    return this.organizationsService.create(data);
  }

  @Patch(':id')
  @RequirePermissions('organization:manage')
  async update(
    @Param('id') id: string,
    @Body() data: UpdateOrganizationDto,
  ): Promise<Organization> {
    return this.organizationsService.update(id, data);
  }

  @Delete(':id')
  @RequirePermissions('organization:manage')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    const success = await this.organizationsService.remove(id);
    return { success };
  }
}
