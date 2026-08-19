import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe, UseGuards, Req } from '@nestjs/common';
import { MiniappsService } from './miniapps.service';
import { CreateMiniAppDto } from './dto/create-miniapp.dto';
import { UpdateMiniAppDto } from './dto/update-miniapp.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../access-control/guards/rbac.guard';
import { RequirePermissions } from '../access-control/decorators/require-permissions.decorator';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('mini-apps')
export class MiniappsController {
  constructor(private readonly miniappService: MiniappsService) {}

  @Post()
  @RequirePermissions('miniapp:create')
  create(@Body() createData: CreateMiniAppDto, @Req() req: any) {
    const dataToSave: any = { ...createData };
    
    // Assign the ownerId from the authenticated user token payload
    dataToSave.ownerId = req.user.sub;
    if (createData.integrationMethod === 'WEBVIEW') {
      dataToSave.integrationConfig = createData.integrationConfigWebView;
    } else if (createData.integrationMethod === 'FLUTTER_PACKAGE') {
      dataToSave.integrationConfig = createData.integrationConfigFlutter;
    }
    
    // Clean up DTO specific fields
    delete dataToSave.integrationConfigWebView;
    delete dataToSave.integrationConfigFlutter;

    return this.miniappService.create(dataToSave);
  }

  @Get()
  @RequirePermissions('miniapp:read')
  findAll(@Query('status') status?: string) {
    const query = status ? { status } : {};
    return this.miniappService.findAll(query);
  }

  @Get('check-exists')
  @RequirePermissions('miniapp:read')
  checkExists(@Query('appId') appId?: string, @Query('name') name?: string, @Query('excludeId') excludeId?: string) {
    return this.miniappService.checkExists(appId, name, excludeId);
  }

  @Get('notifications')
  @RequirePermissions('miniapp:read')
  getNotifications(@Req() req: any) {
    return this.miniappService.getNotifications(req.user.sub);
  }

  @Post(':id/mark-read')
  @RequirePermissions('miniapp:read')
  markNotificationRead(@Param('id') id: string) {
    return this.miniappService.markNotificationRead(id);
  }

  
  
  

  @Get(':id')
  @RequirePermissions('miniapp:read')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.miniappService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('miniapp:update')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateData: UpdateMiniAppDto) {
    const dataToSave: any = { ...updateData };
    if (updateData.integrationMethod === 'WEBVIEW') {
      dataToSave.integrationConfig = updateData.integrationConfigWebView;
    } else if (updateData.integrationMethod === 'FLUTTER_PACKAGE') {
      dataToSave.integrationConfig = updateData.integrationConfigFlutter;
    }
    
    // Clean up DTO specific fields
    delete dataToSave.integrationConfigWebView;
    delete dataToSave.integrationConfigFlutter;

    return this.miniappService.update(id, dataToSave);
  }

  @Delete(':id')
  @RequirePermissions('miniapp:delete')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.miniappService.remove(id);
  }
}
