import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { AuthRateLimitGuard, AuthRateLimiter } from './auth-rate-limiter';
import { EndUserAuthGuard } from './end-user-auth.guard';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { EndUser } from './entities/end-user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { MobileAuthService } from './mobile-auth.service';
import { MobileCatalogService } from './mobile-catalog.service';
import { MobileController } from './mobile.controller';
import { PasswordService } from './password.service';

// MailService comes from the @Global NotificationsModule.
@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      EndUser,
      EmailVerificationToken,
      RefreshToken,
      MiniApp,
    ]),
  ],
  controllers: [MobileController],
  providers: [
    PasswordService,
    AuthRateLimiter,
    AuthRateLimitGuard,
    EndUserAuthGuard,
    MobileAuthService,
    MobileCatalogService,
  ],
})
export class MobileModule {}
