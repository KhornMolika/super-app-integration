import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { MailService } from './mail.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('test')
  @UseGuards(JwtAuthGuard)
  async sendTestEmail(
    @Req() req: any,
    @Body() body: { email?: string },
  ) {
    const targetEmail = body.email?.trim() || req.user?.email;
    if (!targetEmail) {
      throw new BadRequestException('Target email address is required');
    }

    const userName = req.user?.name || 'User';
    const result = await this.mailService.sendTestEmail(targetEmail, userName);
    if (!result.success) {
      throw new BadRequestException(result.message || 'Failed to send test email');
    }

    return result;
  }
}
