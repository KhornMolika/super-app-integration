import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  CreateAccessTokenDto,
  ChangePasswordDto,
  RequestOtpDto,
  VerifyOtpDto,
  ResetPasswordDto,
} from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(body);
    if (!result.success) {
      throw new UnauthorizedException(
        result.message || 'Invalid credentials or user not found',
      );
    }
    if ('access_token' in result && result.access_token) {
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
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Body() body: RefreshTokenDto,
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
    if (result.success && 'access_token' in result && result.access_token) {
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
          maxAge: (result.refresh_expires_in || 7 * 24 * 60 * 60) * 1000,
        });
      }
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

  // @Get('sso/providers')
  // getSsoProviders() {
  //   return this.authService.getSsoProviders();
  // }

  @Get(['access-tokens', 'personal-access-tokens', 'developer-tokens'])
  @UseGuards(JwtAuthGuard)
  async listAccessTokens(@Req() req: Request) {
    const user = (req as any).user;
    const userId = user?.sub || user?.id;
    if (!userId) throw new UnauthorizedException();
    const tokens = await this.authService.listAccessTokens(userId);
    return { success: true, tokens };
  }

  @Post(['access-tokens', 'personal-access-tokens', 'developer-tokens'])
  @UseGuards(JwtAuthGuard)
  async createAccessToken(
    @Req() req: Request,
    @Body() body: CreateAccessTokenDto,
  ) {
    const user = (req as any).user;
    const userId = user?.sub || user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.authService.createAccessToken(
      userId,
      body.name,
      body.expirationDays,
      body.scopes,
    );
  }

  @Delete([
    'access-tokens/:id',
    'personal-access-tokens/:id',
    'developer-tokens/:id',
  ])
  @UseGuards(JwtAuthGuard)
  async revokeAccessToken(@Req() req: Request, @Param('id') tokenId: string) {
    const user = (req as any).user;
    const userId = user?.sub || user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.authService.revokeAccessToken(userId, tokenId);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Req() req: Request, @Body() body: ChangePasswordDto) {
    const user = (req as any).user;
    const userId = user?.sub || user?.id;
    if (!userId) throw new UnauthorizedException('Authentication required');
    return this.authService.changePassword(userId, body);
  }

  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body() body: RequestOtpDto) {
    return this.authService.requestOtp(body);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyOtp(body);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }
}
