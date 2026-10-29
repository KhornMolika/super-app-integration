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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../access-control/guards/rbac.guard';
import { RequirePermissions } from '../access-control/decorators/require-permissions.decorator';
import { OrganizationsService } from './organizations.service';
import {
  Organization,
  OrganizationStatus,
} from './entities/organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { QueryOrganizationsDto } from './dto/query-organizations.dto';

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

  @Post()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions('organization:manage')
  async create(@Body() data: CreateOrganizationDto): Promise<Organization> {
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
    return this.organizationsService.update(id, data, req?.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions('organization:manage')
  async remove(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<{ success: boolean }> {
    const success = await this.organizationsService.remove(id, req?.user);
    return { success };
  }
}
