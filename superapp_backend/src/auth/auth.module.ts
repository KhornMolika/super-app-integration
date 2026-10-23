import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AccessControlModule } from '../access-control/access-control.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DeveloperToken } from '../access-control/entities/developer-token.entity';
import { AuthOtp } from './entities/auth-otp.entity';

@Module({
  imports: [
    forwardRef(() => AccessControlModule),
    forwardRef(() => NotificationsModule),
    JwtModule.register({}),
    TypeOrmModule.forFeature([DeveloperToken, AuthOtp]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [JwtAuthGuard, AuthService, JwtModule],
})
export class AuthModule {}
