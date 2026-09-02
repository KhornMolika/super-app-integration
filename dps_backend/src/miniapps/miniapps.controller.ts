import { Controller, HttpException, BadRequestException, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe, UseGuards, Req } from '@nestjs/common';
import * as net from 'net';
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
      if (createData.isDomainVerified !== undefined) {
        dataToSave.isDomainVerified = createData.isDomainVerified;
      } else if (createData.integrationConfigWebView?.isDomainVerified !== undefined) {
        dataToSave.isDomainVerified = createData.integrationConfigWebView.isDomainVerified;
      }
      if (createData.domainVerifiedAt !== undefined) {
        dataToSave.domainVerifiedAt = createData.domainVerifiedAt;
      } else if (createData.integrationConfigWebView?.domainVerifiedAt !== undefined) {
        dataToSave.domainVerifiedAt = createData.integrationConfigWebView.domainVerifiedAt;
      }
      const token = createData.verificationToken || createData.integrationConfigWebView?.verificationToken;
      if (token) {
        dataToSave.verificationToken = token;
        if (dataToSave.integrationConfig) {
          dataToSave.integrationConfig.verificationToken = token;
        }
      }
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
    const dataToSave: any = { ...createData, status: MiniAppStatus.IN_REVIEW };
    
    // Assign the ownerId from the authenticated user token payload
    dataToSave.ownerId = req.user.sub;
    if (createData.integrationMethod === 'WEBVIEW') {
      dataToSave.integrationConfig = createData.integrationConfigWebView;
      if (createData.isDomainVerified !== undefined) {
        dataToSave.isDomainVerified = createData.isDomainVerified;
      } else if (createData.integrationConfigWebView?.isDomainVerified !== undefined) {
        dataToSave.isDomainVerified = createData.integrationConfigWebView.isDomainVerified;
      }
      if (createData.domainVerifiedAt !== undefined) {
        dataToSave.domainVerifiedAt = createData.domainVerifiedAt;
      } else if (createData.integrationConfigWebView?.domainVerifiedAt !== undefined) {
        dataToSave.domainVerifiedAt = createData.integrationConfigWebView.domainVerifiedAt;
      }
      const token = createData.verificationToken || createData.integrationConfigWebView?.verificationToken;
      if (token) {
        dataToSave.verificationToken = token;
        if (dataToSave.integrationConfig) {
          dataToSave.integrationConfig.verificationToken = token;
        }
      }
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


  private probeTcp(host: string, port: number, timeoutMs = 1200): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeoutMs);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      try {
        socket.connect(port, host);
      } catch {
        resolve(false);
      }
    });
  }

  @Get('check-url')
  async checkUrl(@Query('url') url: string) {
    if (!url) return { reachable: false, message: 'URL is required' };

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { reachable: false, message: 'Invalid URL format' };
    }
    
    // Skip git repository URLs as they often block simple HEAD/GET requests
    if (url.includes('github.com') || url.includes('gitlab.com') || url.includes('bitbucket.org') || url.endsWith('.git')) {
      return { reachable: true };
    }

    const port = parsed.port ? Number(parsed.port) : (parsed.protocol === 'https:' ? 443 : 80);
    const host = parsed.hostname;

    // Fast TCP probe (1200ms max timeout)
    const isPortOpen = await this.probeTcp(host, port, 1200);
    if (!isPortOpen) {
      return { reachable: false, message: `Could not connect to ${host}:${port} (server offline or unreachable)` };
    }

    return { reachable: true, host, port };
  }

  @Get('check-exists')
  @RequirePermissions('miniapp:read')
  checkExists(@Query('appId') appId?: string, @Query('name') name?: string, @Query('excludeId') excludeId?: string) {
    return this.miniappService.checkExists(appId, name, excludeId);
  }



  @Get('generate-token')
  @RequirePermissions('miniapp:create')
  generateToken() {
    return { token: this.miniappService.generateVerificationToken() };
  }

  @Post('verify-domain')
  @RequirePermissions('miniapp:create')
  verifyDomainStandalone(
    @Body() body: { productionUrl: string; appId: string; verificationToken: string }
  ) {
    if (!body?.productionUrl) {
      throw new BadRequestException('productionUrl is required.');
    }
    if (!body?.appId) {
      throw new BadRequestException('appId is required.');
    }
    if (!body?.verificationToken) {
      throw new BadRequestException('verificationToken is required.');
    }
    return this.miniappService.verifyDomainStandalone(
      body.productionUrl,
      body.appId,
      body.verificationToken
    );
  }

  @Post('detect-permissions')
  @RequirePermissions('miniapp:create')
  detectPermissions(
    @Body() body: { productionUrl?: string; category?: string; name?: string; appId?: string }
  ) {
    return this.miniappService.detectPermissions(body);
  }

  @Get('notifications')
  @RequirePermissions('miniapp:read')
  getNotifications(@Req() req: any) {
    return this.miniappService.getNotifications(req.user.sub);
  }

  @Post('notifications/mark-all-read')
  @RequirePermissions('miniapp:read')
  markAllNotificationsRead() {
    return this.miniappService.markAllNotificationsRead();
  }

  @Delete('notifications/:id')
  @RequirePermissions('miniapp:read')
  deleteNotification(@Param('id') id: string) {
    return this.miniappService.deleteNotification(id);
  }

  @Post(':id/mark-read')
  @RequirePermissions('miniapp:read')
  markNotificationRead(@Param('id') id: string) {
    return this.miniappService.markNotificationRead(id);
  }

  @Post(':id/verify-domain')
  @RequirePermissions('miniapp:update')
  verifyDomain(@Param('id', ParseUUIDPipe) id: string, @Body() body?: { productionUrl?: string }) {
    return this.miniappService.verifyDomain(id, body?.productionUrl);
  }

  @Post(':id/submit')
  @RequirePermissions('miniapp:update')
  submitForReview(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.miniappService.submitForReview(id, req.user.sub);
  }

  @Post(':id/rescan')
  @RequirePermissions('miniapp:update')
  rescan(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.miniappService.rescan(id, req.user?.sub);
  }

  @Post(':id/cancel-validation')
  @RequirePermissions('miniapp:update')
  cancelValidation(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.miniappService.cancelValidation(id, req.user?.sub);
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

  @Post(':id/request-changes')
  @RequirePermissions('miniapp:reject')
  requestChanges(@Param('id', ParseUUIDPipe) id: string, @Body('reason') reason: string, @Req() req: any) {
    return this.miniappService.requestChanges(id, reason, req.user.sub);
  }

  @Post(':id/start-testing')
  @RequirePermissions('miniapp:approve')
  startTesting(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.miniappService.startTesting(id, req.user.sub);
  }

  @Post(':id/activate')
  @RequirePermissions('miniapp:approve')
  activate(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.miniappService.activate(id, req.user.sub);
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
