import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(body);
    if (result.success && result.access_token) {
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('auth_token', result.access_token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: result.expires_in * 1000,
      });
      if (result.refresh_token) {
        res.cookie('refresh_token', result.refresh_token, {
          httpOnly: true,
          secure: isProd,
          sameSite: 'lax',
          path: '/',
          maxAge: result.refresh_expires_in * 1000,
        });
      }
    }
    return result;
  }

  @Post('register')
  async register(
    @Body() body: { email: string; name: string; password?: string; organization?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(body);
    if (result.success && result.access_token) {
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('auth_token', result.access_token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: result.expires_in * 1000,
      });
      if (result.refresh_token) {
        res.cookie('refresh_token', result.refresh_token, {
          httpOnly: true,
          secure: isProd,
          sameSite: 'lax',
          path: '/',
          maxAge: result.refresh_expires_in * 1000,
        });
      }
    }
    return result;
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Body() body: { refresh_token?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken =
      body?.refresh_token ||
      (req as any).cookies?.['refresh_token'] ||
      (req as any).cookies?.['refresh_token_cookie'];

    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const result = await this.authService.refreshToken(refreshToken);
    if (result.success && result.access_token) {
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('auth_token', result.access_token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: result.expires_in * 1000,
      });
    }
    return result;
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('auth_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    return { success: true, message: 'Logged out successfully' };
  }

  @Get('jwks')
  getJwks() {
    return this.authService.getJwks();
  }

  @Get('sso/providers')
  getSsoProviders() {
    return this.authService.getSsoProviders();
  }
}
