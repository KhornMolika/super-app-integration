import { CapabilitiesModule } from '../capabilities/capabilities.module';
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { StorageModule } from '../storage/storage.module';
import { AuthRateLimitGuard, AuthRateLimiter } from './auth-rate-limiter';
import {
  EndUserAuthGuard,
  OptionalEndUserAuthGuard,
} from './end-user-auth.guard';
import { AccountPurgeService } from './account-purge.service';
import { DemoUserSeeder } from './demo-user.seeder';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { Identity } from '../identities/entities/identity.entity';
import { StaffProfile } from '../staff/entities/staff-profile.entity';
import { ConsumerProfile } from '../consumers/entities/consumer-profile.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { MobileAccountService } from './mobile-account.service';
import { MobileAppConfigService } from './mobile-app-config.service';
import { MobileAvatarService } from './mobile-avatar.service';
import { MobileAuthService } from './mobile-auth.service';
import { MobileCatalogService } from './mobile-catalog.service';
import { MobileProfileService } from './mobile-profile.service';
import { MobileRegulatorsService } from './mobile-regulators.service';
import { Organization } from '../organizations/entities/organization.entity';
import { MobileController } from './mobile.controller';
import { MiniAppVersionsModule } from '../miniapps/versions/miniapp-versions.module';
import { PasswordService } from './password.service';

// MailService comes from the @Global NotificationsModule.
@Module({
  imports: [
    AuthModule,
    forwardRef(() => StorageModule),
    CapabilitiesModule,
    MiniAppVersionsModule,
    TypeOrmModule.forFeature([
      Identity,
      StaffProfile,
      ConsumerProfile,
      EmailVerificationToken,
      RefreshToken,
      MiniApp,
      Organization,
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
    MobileRegulatorsService,
    DemoUserSeeder,
  ],
})
export class MobileModule {}
