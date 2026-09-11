import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
    const success = await this.telegramService.sendMessage(
      `<b>Test Notification: Personal Direct Alert</b>\n\nHello ${name}, this is a verified test notification from the DPS Super App Backoffice.\n\nYour account (<code>${email}</code>) is receiving direct updates.`,
      chatId,
    );

    return { success };
  }

  @Post('test-team')
  @UseGuards(JwtAuthGuard)
  async testTeamAlert(
    @Body() body: { chatId: string; miniAppName?: string },
  ) {
    if (!body.chatId?.trim()) {
      throw new BadRequestException('Team Telegram Chat ID is required');
    }

    const appName = body.miniAppName || 'Mini App';
    const success = await this.telegramService.sendMessage(
      `<b>Test Notification: Team Channel Alert</b>\n\n<b>Mini App:</b> ${appName}\n<b>Channel:</b> <code>${body.chatId}</code>\n\nThis channel is configured to receive automated security scan results, CI/CD test builds, and production release announcements.`,
      body.chatId.trim(),
    );

    return { success };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() update: any) {
    const msg = update?.message;
    if (msg && msg.text) {
      const text = msg.text.trim();
      if (text.startsWith('/start ')) {
        const userId = text.split(' ')[1]?.trim();
        const chatId = msg.chat?.id;
        const username = msg.from?.username;
        const firstName = msg.from?.first_name;

        if (userId && chatId) {
          await this.telegramService.linkTelegramAccount(
            userId,
            chatId,
            username,
            firstName,
          );
        }
      }
    }
    return { ok: true };
  }
}
