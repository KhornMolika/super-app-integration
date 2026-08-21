import { Controller, HttpException, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe, UseGuards, Req } from '@nestjs/common';
import { MiniappsService } from './miniapps.service';
import { CreateMiniAppDto } from './dto/create-miniapp.dto';
import { MiniAppStatus } from './entities/miniapp.entity';
import { UpdateMiniAppDto } from './dto/update-miniapp.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../access-control/guards/rbac.guard';
import { RequirePermissions } from '../access-control/decorators/require-permissions.decorator';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('mini-apps')
export class MiniappsController {
  @Get('issues/all')
  @RequirePermissions('miniapp:read')
  getAllIssues() {
    return this.miniappService.findAllIssues();
  }

  constructor(private readonly miniappService: MiniappsService) {}

  @Post('draft')
  @RequirePermissions('miniapp:create')
  createDraft(@Body() createData: any, @Req() req: any) {
    const dataToSave: any = { ...createData, status: MiniAppStatus.DRAFT };
    dataToSave.ownerId = req.user.sub;
    if (createData.integrationMethod === 'WEBVIEW') {
      dataToSave.integrationConfig = createData.integrationConfigWebView;
    } else if (createData.integrationMethod === 'FLUTTER_PACKAGE') {
      dataToSave.integrationConfig = createData.integrationConfigFlutter;
    } else if (createData.integrationMethod === 'DEEP_LINK') {
      dataToSave.integrationConfig = createData.integrationConfigDeepLink;
    }
    delete dataToSave.integrationConfigWebView;
    delete dataToSave.integrationConfigFlutter;
    delete dataToSave.integrationConfigDeepLink;
    return this.miniappService.create(dataToSave, req.user.sub);
  }

  @Post()
  @RequirePermissions('miniapp:create')
  create(@Body() createData: CreateMiniAppDto, @Req() req: any) {
    const dataToSave: any = { ...createData, status: MiniAppStatus.PENDING_REVIEW };
    
    // Assign the ownerId from the authenticated user token payload
    dataToSave.ownerId = req.user.sub;
    if (createData.integrationMethod === 'WEBVIEW') {
      dataToSave.integrationConfig = createData.integrationConfigWebView;
    } else if (createData.integrationMethod === 'FLUTTER_PACKAGE') {
      dataToSave.integrationConfig = createData.integrationConfigFlutter;
    } else if (createData.integrationMethod === 'DEEP_LINK') {
      dataToSave.integrationConfig = createData.integrationConfigDeepLink;
    }
    
    // Clean up DTO specific fields
    delete dataToSave.integrationConfigWebView;
    delete dataToSave.integrationConfigFlutter;
    delete dataToSave.integrationConfigDeepLink;

    return this.miniappService.create(dataToSave, req.user.sub);
  }

  @Get()
  @RequirePermissions('miniapp:read')
  async findAll(@Query('status') status?: string) {
    const query = status ? { status } : {};
    try {
      return await this.miniappService.findAll(query);
    } catch (error: any) {
      console.error('FIND ALL ERROR:', error);
      throw new HttpException({ message: error?.message || 'Error', stack: error?.stack }, 500);
    }
  }


  @Get('check-url')
  async checkUrl(@Query('url') url: string) {
    if (!url) return { reachable: false };
    
    // Skip git repository URLs as they often block simple HEAD/GET requests
    if (url.includes('github.com') || url.includes('gitlab.com') || url.includes('bitbucket.org') || url.endsWith('.git')) {
      return { reachable: true };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok || (response.status >= 300 && response.status < 400)) return { reachable: true };
    } catch (error) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(url, { method: 'GET', signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok || (response.status >= 300 && response.status < 400)) return { reachable: true };
      } catch (e) {
        return { reachable: false };
      }
    }
    return { reachable: false };
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

  @Post(':id/submit')
  @RequirePermissions('miniapp:update')
  submitForReview(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.miniappService.submitForReview(id, req.user.sub);
  }

  @Post(':id/approve')
  @RequirePermissions('miniapp:approve')
  approve(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.miniappService.approve(id, req.user.sub);
  }

  @Post(':id/reject')
  @RequirePermissions('miniapp:reject')
  reject(@Param('id', ParseUUIDPipe) id: string, @Body('reason') reason: string, @Req() req: any) {
    return this.miniappService.reject(id, reason, req.user.sub);
  }

  @Post(':id/suspend')
  @RequirePermissions('miniapp:suspend')
  suspend(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.miniappService.suspend(id, req.user.sub);
  }

  @Get(':id/activities')
  @RequirePermissions('miniapp:read')
  async getActivities(@Param('id', ParseUUIDPipe) id: string) {
    return this.miniappService.getActivities(id);
  }

  @Get(':id')
  @RequirePermissions('miniapp:read')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.miniappService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('miniapp:update')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateData: UpdateMiniAppDto, @Req() req: any) {
    const dataToSave: any = { ...updateData };
    if (updateData.integrationMethod === 'WEBVIEW') {
      dataToSave.integrationConfig = updateData.integrationConfigWebView;
    } else if (updateData.integrationMethod === 'FLUTTER_PACKAGE') {
      dataToSave.integrationConfig = updateData.integrationConfigFlutter;
    } else if (updateData.integrationMethod === 'DEEP_LINK') {
      dataToSave.integrationConfig = (updateData as any).integrationConfigDeepLink;
    }
    
    // Clean up DTO specific fields
    delete dataToSave.integrationConfigWebView;
    delete dataToSave.integrationConfigFlutter;
    delete dataToSave.integrationConfigDeepLink;

    return this.miniappService.update(id, dataToSave, req.user.sub);
  }

  @Delete(':id')
  @RequirePermissions('miniapp:delete')
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.miniappService.remove(id, req.user.sub);
  }
}
