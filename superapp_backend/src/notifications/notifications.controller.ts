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
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../access-control/guards/rbac.guard';
import { RequirePermissions } from '../access-control/decorators/require-permissions.decorator';
import { QueryNotificationsDto } from './dto/query-notifications.dto';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller([
  'notifications',
  'mini-apps/notifications',
  'api/notifications',
])
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermissions('miniapp:read')
  getNotifications(@Query() query: QueryNotificationsDto, @Req() req: any) {
    return this.notificationsService.findByUserId(req?.user?.sub || '', query);
  }

  @Get('mine')
  @RequirePermissions('miniapp:read')
  getMyNotifications(@Query() query: QueryNotificationsDto, @Req() req: any) {
    return this.notificationsService.findByUserId(req?.user?.sub || '', query);
  }

  @Get(':id')
  @RequirePermissions('miniapp:read')
  async getNotification(@Param('id') id: string, @Req() req: any) {
    const notif = await this.notificationsService.findById(id, req?.user?.sub);
    if (!notif) {
      throw new NotFoundException(`Notification #${id} not found`);
    }
    return notif;
  }

  @Post('mark-all-read')
  @RequirePermissions('miniapp:read')
  markAllNotificationsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req?.user?.sub);
  }

  @Post('read-all')
  @RequirePermissions('miniapp:read')
  readAllNotifications(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req?.user?.sub);
  }

  @Delete('bulk')
  @RequirePermissions('miniapp:read')
  deleteBulkNotifications(@Body() body: { ids: string[] }, @Req() req: any) {
    return this.notificationsService.deleteBulk(
      body?.ids || [],
      req?.user?.sub,
    );
  }

  @Delete(':id')
  @RequirePermissions('miniapp:read')
  deleteNotification(@Param('id') id: string, @Req() req: any) {
    return this.notificationsService.delete(id, req?.user?.sub);
  }

  @Patch(':id/read')
  @RequirePermissions('miniapp:read')
  markNotificationRead(@Param('id') id: string, @Req() req: any) {
    return this.notificationsService.markAsRead(id, req?.user?.sub);
  }

  @Post(':id/mark-read')
  @RequirePermissions('miniapp:read')
  markNotificationReadPost(@Param('id') id: string, @Req() req: any) {
    return this.notificationsService.markAsRead(id, req?.user?.sub);
  }
}
