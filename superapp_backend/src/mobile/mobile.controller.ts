import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpCode,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthRateLimitGuard, AuthRateLimiter, RateLimit, RateLimitedException } from './auth-rate-limiter';
import { EndUserAuthGuard, OptionalEndUserAuthGuard } from './end-user-auth.guard';
import { MobileAppConfigService } from './mobile-app-config.service';
import { AVATAR_MAX_BYTES, MobileAvatarService } from './mobile-avatar.service';
import { MobileAccountService } from './mobile-account.service';
import { MobileAuthService, isTokenResponse } from './mobile-auth.service';
import { MobileCatalogService } from './mobile-catalog.service';
import { MobileProfileService, toProfile } from './mobile-profile.service';
import {
  LoginDto,
  LogoutDto,
  RefreshDto,
  RegisterDto,
  VerifyEmailDto,
} from './dto/mobile-auth.dto';
import { ChangePasswordDto, DeleteAccountDto } from './dto/account.dto';
import { CatalogQueryDto } from './dto/catalog-query.dto';
import { UpdateProfileDto } from './dto/profile.dto';
import { EndUser } from './entities/end-user.entity';

@Controller(['mobile', 'api/mobile'])
export class MobileController {
  constructor(
    private readonly auth: MobileAuthService,
    private readonly catalog: MobileCatalogService,
    @InjectRepository(EndUser) private readonly users: Repository<EndUser>,
    private readonly limiter: AuthRateLimiter,
    private readonly appConfigService: MobileAppConfigService,
    private readonly profiles: MobileProfileService,
    private readonly avatars: MobileAvatarService,
    private readonly account: MobileAccountService,
  ) { }

  @Post('auth/register')
  @HttpCode(202)
  @UseGuards(AuthRateLimitGuard)
  @RateLimit({ scope: 'register', ipMax: 10, emailMax: 5 })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
    @Headers('user-agent') userAgent?: string,
  ) {
    try {
      const result = await this.auth.register(dto, userAgent);
      // 202: verification mail pending. 201: verification disabled, session issued.
      if (isTokenResponse(result)) res.status(201);
      return result;
    } catch (e) {
      if (e instanceof RateLimitedException) {
        res.setHeader('Retry-After', String(e.retryAfterSeconds));
      }
      throw e;
    }
  }

  @Post('auth/verify-email')
  @HttpCode(200)
  @UseGuards(AuthRateLimitGuard)
  @RateLimit({ scope: 'verify', ipMax: 10 })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.token, dto.password);
  }

  @Post('auth/login')
  @HttpCode(200)
  @UseGuards(AuthRateLimitGuard)
  @RateLimit({ scope: 'login', ipMax: 10, emailMax: 5 })
  login(@Body() dto: LoginDto, @Headers('user-agent') userAgent?: string) {
    return this.auth.login(dto, userAgent);
  }

  @Post('auth/refresh')
  @HttpCode(200)
  @UseGuards(AuthRateLimitGuard)
  @RateLimit({ scope: 'refresh', ipMax: 30 })
  refresh(@Body() dto: RefreshDto, @Headers('user-agent') userAgent?: string) {
    return this.auth.refresh(dto.refresh_token, userAgent);
  }

  @Post('auth/logout')
  @HttpCode(204)
  @UseGuards(AuthRateLimitGuard)
  @RateLimit({ scope: 'logout', ipMax: 30 })
  async logout(@Body() dto?: LogoutDto): Promise<void> {
    await this.auth.logout(dto?.refresh_token);
  }

  /** Public: force-update rules and legal URLs. Fails open (see sanitizeMobileAppConfig). */
  @Get('app-config')
  @Header('Cache-Control', 'public, max-age=300')
  getAppConfig() {
    return this.appConfigService.get();
  }

  @Get('me')
  @UseGuards(EndUserAuthGuard)
  me(@Req() req: Request) {
    return this.profiles.getProfile(req.endUser!.id);
  }

  @Patch('me')
  @UseGuards(EndUserAuthGuard)
  updateMe(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    return this.profiles.updateProfile(req.endUser!.id, dto);
  }

  @Post('me/password')
  @HttpCode(200)
  @UseGuards(EndUserAuthGuard, AuthRateLimitGuard)
  @RateLimit({ scope: 'change-password', ipMax: 10, userMax: 5 })
  changePassword(
    @Req() req: Request,
    @Body() dto: ChangePasswordDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.account.changePassword(req.endUser!.id, dto, userAgent);
  }

  @Post('me/delete')
  @HttpCode(202)
  @UseGuards(EndUserAuthGuard, AuthRateLimitGuard)
  @RateLimit({ scope: 'delete-account', ipMax: 10, userMax: 5 })
  deleteAccount(@Req() req: Request, @Body() dto: DeleteAccountDto) {
    return this.account.requestDeletion(req.endUser!.id, dto);
  }

  @Post('me/avatar')
  @HttpCode(200)
  @UseGuards(EndUserAuthGuard, AuthRateLimitGuard)
  @RateLimit({ scope: 'avatar', ipMax: 30, userMax: 10 })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: AVATAR_MAX_BYTES, files: 1 } }))
  async uploadAvatar(@Req() req: Request, @UploadedFile() file?: Express.Multer.File) {
    return toProfile(await this.avatars.upload(req.endUser!.id, file));
  }

  /** The caller's own avatar only; never a public or presigned URL. */
  @Get('me/avatar')
  @UseGuards(EndUserAuthGuard)
  async getAvatar(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile | undefined> {
    const ifNoneMatch = req.headers['if-none-match'];
    const a = await this.avatars.read(
      req.endUser!.id,
      typeof ifNoneMatch === 'string' ? ifNoneMatch : undefined,
    );
    res.setHeader('Cache-Control', 'private, no-cache');
    res.setHeader('ETag', a.etag);
    if (a.notModified) {
      res.status(304);
      return undefined;
    }
    return new StreamableFile(a.body, { type: a.contentType, length: a.body.length });
  }

  @Delete('me/avatar')
  @HttpCode(204)
  @UseGuards(EndUserAuthGuard)
  async deleteAvatar(@Req() req: Request): Promise<void> {
    await this.avatars.remove(req.endUser!.id);
  }

  @Get('mini-apps')
  @UseGuards(OptionalEndUserAuthGuard)
  miniApps(@Query() query: CatalogQueryDto, @Req() req: Request) {
    const rawHost = req.headers['x-forwarded-host'] || req.headers.host || req.hostname || 'localhost:3000';
    const clientHost = String(rawHost).split(':')[0];
    return this.catalog.list(query, clientHost);
  }

  @Get('auth/dev-reset-limits')
  @Post('auth/dev-reset-limits')
  @HttpCode(200)
  devResetLimits() {
    this.limiter.reset();
    return { ok: true, message: 'Mobile rate limits reset successfully' };
  }

  @Get('auth/sso/providers')
  @HttpCode(200)
  getSsoProviders() {
    return this.auth.getMobileSsoProviders();
  }

  @Post('auth/sso/callback')
  @HttpCode(200)
  @UseGuards(AuthRateLimitGuard)
  @RateLimit({ scope: 'login', ipMax: 15 })
  async ssoCallback(
    @Body() body: { provider: string; email: string; name?: string; externalId?: string },
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.auth.handleSsoLogin(body.provider, body, userAgent);
  }
}
