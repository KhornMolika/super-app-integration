import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../access-control/guards/rbac.guard';
import { RequirePermissions } from '../access-control/decorators/require-permissions.decorator';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller(['announcements', 'api/announcements'])
export class AnnouncementsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermissions('miniapp:read')
  async getAnnouncements() {
    return this.notificationsService.findAnnouncements();
  }

  @Get('unread')
  @RequirePermissions('miniapp:read')
  async getUnreadAnnouncements(@Req() req: any) {
    return this.notificationsService.findUnreadAnnouncements(
      req?.user?.sub || req?.user?.id || '',
    );
  }
}
