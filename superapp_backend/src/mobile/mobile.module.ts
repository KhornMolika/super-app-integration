import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { StorageModule } from '../storage/storage.module';
import { AuthRateLimitGuard, AuthRateLimiter } from './auth-rate-limiter';
import { EndUserAuthGuard, OptionalEndUserAuthGuard } from './end-user-auth.guard';
import { AccountPurgeService } from './account-purge.service';
import { DemoUserSeeder } from './demo-user.seeder';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { EndUser } from './entities/end-user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../access-control/entities/user.entity';
import { MobileAccountService } from './mobile-account.service';
import { MobileAppConfigService } from './mobile-app-config.service';
import { MobileAvatarService } from './mobile-avatar.service';
import { MobileAuthService } from './mobile-auth.service';
import { MobileCatalogService } from './mobile-catalog.service';
import { MobileProfileService } from './mobile-profile.service';
import { MobileController } from './mobile.controller';
import { PasswordService } from './password.service';

// MailService comes from the @Global NotificationsModule.
@Module({
  imports: [
    AuthModule,
    StorageModule,
    TypeOrmModule.forFeature([
      EndUser,
      EmailVerificationToken,
      RefreshToken,
      MiniApp,
      User,
    ]),
  ],
  controllers: [MobileController],
  providers: [
    PasswordService,
    AuthRateLimiter,
    AuthRateLimitGuard,
    EndUserAuthGuard,
    OptionalEndUserAuthGuard,
    MobileAuthService,
    MobileCatalogService,
    MobileAppConfigService,
    MobileProfileService,
    MobileAvatarService,
    MobileAccountService,
    AccountPurgeService,
    DemoUserSeeder,
  ],
})
export class MobileModule { }
