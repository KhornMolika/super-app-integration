import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller(['telegram', 'api/telegram'])
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Req() req: any) {
    const botInfo = this.telegramService.getBotInfo();
    const userId = req.user?.sub || req.user?.id;
    const dbUser = userId ? await this.telegramService.getUser(userId) : null;

    return {
      ...botInfo,
      user: {
        id: dbUser?.id || userId,
        email: dbUser?.email || req.user?.email,
        name: dbUser?.name || req.user?.name,
        telegramChatId: dbUser?.telegramChatId || null,
        telegramUsername: dbUser?.telegramUsername || null,
        telegramConnectedAt: dbUser?.telegramConnectedAt || null,
        teamTelegramChatId: dbUser?.teamTelegramChatId || null,
        isConnected: !!dbUser?.telegramChatId,
      },
    };
  }

  @Get('connect-url')
  @UseGuards(JwtAuthGuard)
  async getConnectUrl(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID not found');
    }

    return {
      url: this.telegramService.getDeepLinkUrl(userId),
    };
  }

  @Get('recent-groups')
  @UseGuards(JwtAuthGuard)
  async getRecentGroups(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const groups = await this.telegramService.getRecentGroups(userId);
    return { groups };
  }

  @Get('user-groups')
  @UseGuards(JwtAuthGuard)
  async getUserGroups(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const groups = await this.telegramService.getUserTelegramGroups(userId);
    return { groups };
  }

  @Get('validate-chat')
  @UseGuards(JwtAuthGuard)
  async validateChat(@Query('chatId') chatId: string) {
    if (!chatId?.trim()) {
      throw new BadRequestException('chatId query parameter is required');
    }
    return this.telegramService.validateChat(chatId.trim());
  }

  @Post('check-sync')
  @UseGuards(JwtAuthGuard)
  async checkSync(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID not found');
    }

    const result = await this.telegramService.checkAndSyncUserUpdates(userId);
    return result;
  }

  @Post('manual-connect')
  @UseGuards(JwtAuthGuard)
  async manualConnect(
    @Req() req: any,
    @Body() body: { chatId: string; username?: string },
  ) {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) throw new BadRequestException('User ID not found');
    if (!body.chatId?.trim()) throw new BadRequestException('Chat ID is required');

    const user = await this.telegramService.linkTelegramAccount(
      userId,
      body.chatId.trim(),
      body.username?.replace('@', '').trim(),
      req.user?.name,
    );

    return { success: true, user };
  }

  @Post('save-team-chat')
  @UseGuards(JwtAuthGuard)
  async saveTeamChat(
    @Req() req: any,
    @Body() body: { teamTelegramChatId?: string },
  ) {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) throw new BadRequestException('User ID not found');

    const user = await this.telegramService.saveUserTeamChatId(
      userId,
      body.teamTelegramChatId?.trim() || null,
    );

    return { success: true, teamTelegramChatId: user?.teamTelegramChatId || null };
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  async disconnect(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) throw new BadRequestException('User ID not found');

    const success = await this.telegramService.unlinkTelegramAccount(userId);
    return { success };
  }

  @Post('test-user')
  @UseGuards(JwtAuthGuard)
  async testUserAlert(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const dbUser = userId ? await this.telegramService.getUser(userId) : null;
    const chatId = dbUser?.telegramChatId || req.user?.telegramChatId;
    if (!chatId) {
      throw new BadRequestException('Telegram is not connected for this user');
    }

    const name = dbUser?.name || req.user?.name || 'User';
    const email = dbUser?.email || req.user?.email || 'N/A';
    const result = await this.telegramService.sendMessageWithDetails(
      `<b>⚡ Test Notification: Personal Direct Alert</b>\n\nHello <b>${name}</b>, this is a verified test notification from the Super App Backoffice.\n\nYour account (<code>${email}</code>) is receiving direct updates.`,
      chatId,
    );

    return result;
  }

  @Post('test-team')
  @UseGuards(JwtAuthGuard)
  async testTeamAlert(
    @Req() req: any,
    @Body() body: { chatId?: string; miniAppName?: string; message?: string },
  ) {
    const userId = req.user?.sub || req.user?.id;
    const dbUser = userId ? await this.telegramService.getUser(userId) : null;
    const targetChat = body.chatId?.trim() || dbUser?.teamTelegramChatId;

    if (!targetChat) {
      throw new BadRequestException('Team Telegram Chat ID is required');
    }

    const appName = body.miniAppName || 'Platform Ops & Dev Team Channel';
    const msgText =
      body.message ||
      `<b>🏢 Test Notification: Team Channel Alert</b>\n\n<b>Channel:</b> <code>${targetChat}</code>\n<b>Target:</b> <b>${appName}</b>\n\nThis group channel is connected to receive automated security scan results, review status updates, and CI/CD test build APK alerts from the Super App Gateway.`;

    const result = await this.telegramService.sendMessageWithDetails(
      msgText,
      targetChat,
    );

    return result;
  }

  @Post('reassign-group')
  @UseGuards(JwtAuthGuard)
  async reassignGroup(
    @Req() req: any,
    @Body() body: { oldChatId: string; newChatId?: string | null },
  ) {
    const userId = req.user?.sub || req.user?.id;
    if (!body.oldChatId?.trim()) {
      throw new BadRequestException('oldChatId is required');
    }

    return this.telegramService.reassignTelegramGroup(
      body.oldChatId.trim(),
      body.newChatId?.trim() || null,
      userId,
    );
  }

  @Post('assign-app-group')
  @UseGuards(JwtAuthGuard)
  async assignAppGroup(
    @Req() req: any,
    @Body() body: { miniAppId: string; newChatId?: string | null },
  ) {
    const userId = req.user?.sub || req.user?.id;
    if (!body.miniAppId?.trim()) {
      throw new BadRequestException('miniAppId is required');
    }

    return this.telegramService.assignMiniAppToGroup(
      body.miniAppId.trim(),
      body.newChatId?.trim() || null,
      userId,
    );
  }

  @Post('cleanup-inactive')
  @UseGuards(JwtAuthGuard)
  async cleanupInactive(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.telegramService.cleanupInactiveGroups(userId);
  }
}
