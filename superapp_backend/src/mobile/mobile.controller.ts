import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthRateLimitGuard, RateLimit, RateLimitedException } from './auth-rate-limiter';
import { EndUserAuthGuard } from './end-user-auth.guard';
import { MobileAuthService } from './mobile-auth.service';
import { MobileCatalogService } from './mobile-catalog.service';
import { EndUser } from './entities/end-user.entity';
import {
  LoginDto,
  LogoutDto,
  RefreshDto,
  RegisterDto,
  VerifyEmailDto,
} from './dto/mobile-auth.dto';
import { CatalogQueryDto } from './dto/catalog-query.dto';

@Controller(['mobile', 'api/mobile'])
export class MobileController {
  constructor(
    private readonly auth: MobileAuthService,
    private readonly catalog: MobileCatalogService,
    @InjectRepository(EndUser) private readonly users: Repository<EndUser>,
  ) {}

  @Post('auth/register')
  @HttpCode(202)
  @UseGuards(AuthRateLimitGuard)
  @RateLimit({ scope: 'register', ipMax: 10, emailMax: 5 })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      return await this.auth.register(dto);
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

  @Get('me')
  @UseGuards(EndUserAuthGuard)
  async me(@Req() req: Request) {
    const user = await this.users.findOne({ where: { id: req.endUser!.id } });
    if (!user) throw new NotFoundException();
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: !!user.emailVerifiedAt,
      createdAt: user.createdAt,
    };
  }

  @Get('mini-apps')
  @UseGuards(EndUserAuthGuard)
  miniApps(@Query() query: CatalogQueryDto) {
    return this.catalog.list(query.q, query.limit, query.offset);
  }
}
