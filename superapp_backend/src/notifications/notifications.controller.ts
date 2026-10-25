import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
@Controller(['notifications', 'mini-apps/notifications'])
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
  async getNotification(@Param('id') id: string) {
    const notif = await this.notificationsService.findById(id);
    if (!notif) {
      throw new NotFoundException(`Notification #${id} not found`);
    }
    return notif;
  }

  @Post('mark-all-read')
  @RequirePermissions('miniapp:read')
  markAllNotificationsRead() {
    return this.notificationsService.markAllAsRead();
  }

  @Post('read-all')
  @RequirePermissions('miniapp:read')
  readAllNotifications() {
    return this.notificationsService.markAllAsRead();
  }

  @Delete(':id')
  @RequirePermissions('miniapp:read')
  deleteNotification(@Param('id') id: string) {
    return this.notificationsService.delete(id);
  }

  @Patch(':id/read')
  @RequirePermissions('miniapp:read')
  markNotificationRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Post(':id/mark-read')
  @RequirePermissions('miniapp:read')
  markNotificationReadPost(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }
}
